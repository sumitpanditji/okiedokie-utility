import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { Server } from 'socket.io';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { ApiResponse, FileConverterConfig, FileConverterResult } from '../types/index.js';

const router = express.Router();

// Get Socket.IO instance
let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, path.join(uploadDir, 'files'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `file-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, RTF, and ODT files are allowed.'));
    }
  }
});

// Convert single file
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      } as ApiResponse);
    }

    const config: FileConverterConfig = req.body;

    if (!config.outputFormat) {
      return res.status(400).json({
        success: false,
        error: 'Output format is required'
      } as ApiResponse);
    }

    const result = await convertFile(req.file, config);

    // Clean up uploaded file
    await fs.remove(req.file.path);

    return res.json({
      success: true,
      data: result,
      message: 'File converted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error converting file:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert file'
    } as ApiResponse);
  }
});

// Convert multiple files
router.post('/convert-bulk', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      } as ApiResponse);
    }

    const config: FileConverterConfig = req.body;

    if (!config.outputFormat) {
      return res.status(400).json({
        success: false,
        error: 'Output format is required'
      } as ApiResponse);
    }

    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not initialized'
      } as ApiResponse);
    }

    const jobId = `file-convert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start bulk conversion in background
    convertBulkFiles(files, config, jobId, io);

    return res.json({
      success: true,
      data: { jobId },
      message: 'Bulk file conversion started'
    } as ApiResponse);

  } catch (error) {
    console.error('Error starting bulk file conversion:', error);
    
    // Clean up uploaded files if they exist
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        await fs.remove(file.path).catch(console.error);
      }
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start bulk conversion'
    } as ApiResponse);
  }
});

// Download converted file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
    const filePath = path.join(downloadDir, 'converted-files', filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Converted file not found'
      } as ApiResponse);
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    if (ext === '.doc') contentType = 'application/msword';
    if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === '.txt') contentType = 'text/plain';
    if (ext === '.rtf') contentType = 'application/rtf';
    if (ext === '.odt') contentType = 'application/vnd.oasis.opendocument.text';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming converted file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      } as ApiResponse);
    });

    return; // Explicit return for the streaming response

  } catch (error) {
    console.error('Download converted file error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
});

// Convert file function
async function convertFile(
  file: Express.Multer.File,
  config: FileConverterConfig
): Promise<FileConverterResult> {
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const convertedDir = path.join(downloadDir, 'converted-files');
  await fs.ensureDir(convertedDir);

  // Get original file stats
  const originalStats = await fs.stat(file.path);
  const originalExt = path.extname(file.originalname).toLowerCase();
  const originalFormat = getFileFormat(originalExt);

  // Generate output filename
  const timestamp = Date.now();
  const baseName = path.basename(file.originalname, originalExt);
  const outputExt = getFileExtension(config.outputFormat);
  const filename = `${baseName}_converted_${timestamp}${outputExt}`;
  const outputPath = path.join(convertedDir, filename);

  // Perform conversion based on formats
  const success = await performConversion(file.path, outputPath, originalFormat, config.outputFormat, config);

  if (!success) {
    throw new Error(`Failed to convert from ${originalFormat} to ${config.outputFormat}`);
  }

  // Get converted file stats
  const convertedStats = await fs.stat(outputPath);
  const compressionRatio = ((originalStats.size - convertedStats.size) / originalStats.size) * 100;

  return {
    id: `convert-${timestamp}`,
    status: 'success',
    message: 'File converted successfully',
    originalFileName: file.originalname,
    convertedFileName: filename,
    originalSize: originalStats.size,
    convertedSize: convertedStats.size,
    compressionRatio: Math.max(0, compressionRatio),
    timestamp: new Date().toISOString()
  };
}

// Perform file conversion
async function performConversion(
  inputPath: string,
  outputPath: string,
  inputFormat: string,
  outputFormat: string,
  config: FileConverterConfig
): Promise<boolean> {
  try {
    // For this example, we'll implement basic text-based conversions
    // In a real application, you'd use libraries like:
    // - LibreOffice for document conversions
    // - Pandoc for markdown conversions
    // - ImageMagick for image conversions
    // - FFmpeg for media conversions

    if (inputFormat === 'txt' && outputFormat === 'pdf') {
      return await convertTextToPdf(inputPath, outputPath);
    }
    
    if (inputFormat === 'txt' && outputFormat === 'docx') {
      return await convertTextToDocx(inputPath, outputPath);
    }
    
    if (inputFormat === 'pdf' && outputFormat === 'txt') {
      return await convertPdfToText(inputPath, outputPath);
    }

    // For unsupported conversions, copy the file (placeholder)
    await fs.copy(inputPath, outputPath);
    return true;

  } catch (error) {
    console.error('Conversion error:', error);
    return false;
  }
}

// Convert text to PDF (simplified implementation)
async function convertTextToPdf(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const text = await fs.readFile(inputPath, 'utf-8');
    
    // This is a simplified implementation
    // In a real application, you'd use a proper PDF generation library
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${text.length + 50}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${text.replace(/[()\\]/g, '\\$&')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + text.length}
%%EOF`;

    await fs.writeFile(outputPath, pdfContent);
    return true;
  } catch (error) {
    console.error('Text to PDF conversion error:', error);
    return false;
  }
}

// Convert text to DOCX (simplified implementation)
async function convertTextToDocx(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const text = await fs.readFile(inputPath, 'utf-8');
    
    // This is a simplified implementation
    // In a real application, you'd use a proper DOCX generation library
    const docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${text.replace(/[<>&]/g, (match) => {
          switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            default: return match;
          }
        })}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

    await fs.writeFile(outputPath, docxContent);
    return true;
  } catch (error) {
    console.error('Text to DOCX conversion error:', error);
    return false;
  }
}

// Convert PDF to text (simplified implementation)
async function convertPdfToText(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    // This is a simplified implementation
    // In a real application, you'd use a proper PDF parsing library like pdf-parse
    const text = 'PDF to text conversion would require a proper PDF parsing library.\nThis is a placeholder implementation.';
    
    await fs.writeFile(outputPath, text);
    return true;
  } catch (error) {
    console.error('PDF to text conversion error:', error);
    return false;
  }
}

// Get file format from extension
function getFileFormat(extension: string): string {
  const formatMap: { [key: string]: string } = {
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.txt': 'txt',
    '.rtf': 'rtf',
    '.odt': 'odt'
  };
  
  return formatMap[extension] || 'unknown';
}

// Get file extension from format
function getFileExtension(format: string): string {
  const extensionMap: { [key: string]: string } = {
    'pdf': '.pdf',
    'doc': '.doc',
    'docx': '.docx',
    'txt': '.txt',
    'rtf': '.rtf',
    'odt': '.odt'
  };
  
  return extensionMap[format] || '.txt';
}

// Convert bulk files
async function convertBulkFiles(
  files: Express.Multer.File[],
  config: FileConverterConfig,
  jobId: string,
  socketIO: Server
): Promise<void> {
  try {
    const results: FileConverterResult[] = [];
    const total = files.length;

    // Emit start event
    emitProgress(socketIO, jobId, 'file-converter:start', {
      jobId,
      total,
      config,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (!file) {
          throw new Error('File is undefined');
        }
        const result = await convertFile(file, config);
        results.push(result);

        // Clean up uploaded file
        await fs.remove(file.path);

        // Emit progress update
        emitProgress(socketIO, jobId, 'file-converter:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        // Clean up uploaded file
        if (file) {
          await fs.remove(file.path).catch(console.error);
        }

        const errorResult: FileConverterResult = {
          id: `convert-${i}`,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Failed to convert file',
          error: error instanceof Error ? error.message : 'Unknown error',
          originalFileName: file?.originalname || 'unknown',
          convertedFileName: '',
          originalSize: 0,
          convertedSize: 0,
          compressionRatio: 0,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);

        emitProgress(socketIO, jobId, 'file-converter:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result: errorResult,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create ZIP archive with all converted files
    const zipPath = await createConvertedFilesZip(jobId, results);

    // Emit completion event
    emitCompletion(socketIO, jobId, 'file-converter:complete', {
      jobId,
      totalProcessed: results.filter(r => r.status === 'success').length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      zipPath,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk file conversion:', error);
    
    // Clean up any remaining uploaded files
    for (const file of files) {
      await fs.remove(file.path).catch(console.error);
    }
    
    emitError(socketIO, jobId, 'file-converter:error', error);
  }
}

// Create ZIP archive with converted files
async function createConvertedFilesZip(jobId: string, results: FileConverterResult[]): Promise<string> {
  const archiver = await import('archiver');
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const zipPath = path.join(downloadDir, `converted-files_${jobId}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver.default('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`📦 Converted files ZIP archive created: ${archive.pointer()} total bytes`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all successful converted files to the archive
    for (const result of results) {
      if (result.status === 'success' && result.convertedFileName) {
        const filePath = path.join(downloadDir, 'converted-files', result.convertedFileName);
        
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: result.convertedFileName });
        }
      }
    }

    archive.finalize();
  });
}

export default router;

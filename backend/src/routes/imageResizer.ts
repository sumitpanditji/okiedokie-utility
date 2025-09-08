import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import { Server } from 'socket.io';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { ApiResponse, ImageResizerConfig, ImageResizerResult } from '../types/index.js';

const router = express.Router();

// Get Socket.IO instance
let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, path.join(uploadDir, 'images'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `image-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Resize single image
router.post('/resize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      } as ApiResponse);
    }

    const config: ImageResizerConfig = req.body;
    
    // Parse numeric values
    if (config.width) config.width = parseInt(config.width as any);
    if (config.height) config.height = parseInt(config.height as any);
    if (config.quality) config.quality = parseInt(config.quality as any);

    const result = await resizeImage(req.file, config);

    // Clean up uploaded file
    await fs.remove(req.file.path);

    return res.json({
      success: true,
      data: result,
      message: 'Image resized successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error resizing image:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resize image'
    } as ApiResponse);
  }
});

// Resize multiple images
router.post('/resize-bulk', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files uploaded'
      } as ApiResponse);
    }

    const config: ImageResizerConfig = req.body;
    
    // Parse numeric values
    if (config.width) config.width = parseInt(config.width as any);
    if (config.height) config.height = parseInt(config.height as any);
    if (config.quality) config.quality = parseInt(config.quality as any);

    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not initialized'
      } as ApiResponse);
    }

    const jobId = `img-resize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start bulk resizing in background
    resizeBulkImages(files, config, jobId, io);

    return res.json({
      success: true,
      data: { jobId },
      message: 'Bulk image resizing started'
    } as ApiResponse);

  } catch (error) {
    console.error('Error starting bulk image resizing:', error);
    
    // Clean up uploaded files if they exist
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        await fs.remove(file.path).catch(console.error);
      }
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start bulk resizing'
    } as ApiResponse);
  }
});

// Download resized image
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
    const filePath = path.join(downloadDir, 'resized-images', filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Resized image file not found'
      } as ApiResponse);
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.webp') contentType = 'image/webp';
    if (ext === '.avif') contentType = 'image/avif';
    if (ext === '.gif') contentType = 'image/gif';
    if (ext === '.tiff') contentType = 'image/tiff';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming resized image file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      } as ApiResponse);
    });

    return; // Explicit return for the streaming response

  } catch (error) {
    console.error('Download resized image error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
});

// Resize image function
async function resizeImage(
  file: Express.Multer.File,
  config: ImageResizerConfig
): Promise<ImageResizerResult> {
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const resizedDir = path.join(downloadDir, 'resized-images');
  await fs.ensureDir(resizedDir);

  // Get original image metadata
  const originalMetadata = await sharp(file.path).metadata();
  const originalStats = await fs.stat(file.path);

  // Generate output filename
  const timestamp = Date.now();
  const ext = config.format || 'jpeg';
  const filename = `resized-${timestamp}.${ext}`;
  const outputPath = path.join(resizedDir, filename);

  // Create Sharp instance
  let sharpInstance = sharp(file.path);

  // Apply resizing
  if (config.width || config.height) {
    const resizeOptions: any = {};
    
    if (config.width) resizeOptions.width = config.width;
    if (config.height) resizeOptions.height = config.height;
    
    resizeOptions.fit = config.fit || 'cover';
    resizeOptions.withoutEnlargement = true;

    sharpInstance = sharpInstance.resize(resizeOptions);
  }

  // Apply format conversion and quality
  switch (config.format || 'jpeg') {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ 
        quality: config.quality || 90,
        progressive: true
      });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ 
        quality: config.quality || 90,
        progressive: true
      });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ 
        quality: config.quality || 90
      });
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({ 
        quality: config.quality || 90
      });
      break;
  }

  // Process the image
  await sharpInstance.toFile(outputPath);

  // Get resized image metadata
  const resizedMetadata = await sharp(outputPath).metadata();
  const resizedStats = await fs.stat(outputPath);

  const compressionRatio = ((originalStats.size - resizedStats.size) / originalStats.size) * 100;

  return {
    id: `img-${timestamp}`,
    status: 'success',
    message: 'Image resized successfully',
    originalFileName: file.originalname,
    resizedFileName: filename,
    originalSize: {
      width: originalMetadata.width || 0,
      height: originalMetadata.height || 0,
      fileSize: originalStats.size
    },
    resizedSize: {
      width: resizedMetadata.width || 0,
      height: resizedMetadata.height || 0,
      fileSize: resizedStats.size
    },
    compressionRatio: Math.max(0, compressionRatio),
    timestamp: new Date().toISOString()
  };
}

// Resize bulk images
async function resizeBulkImages(
  files: Express.Multer.File[],
  config: ImageResizerConfig,
  jobId: string,
  socketIO: Server
): Promise<void> {
  try {
    const results: ImageResizerResult[] = [];
    const total = files.length;

    // Emit start event
    emitProgress(socketIO, jobId, 'image-resizer:start', {
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
        const result = await resizeImage(file, config);
        results.push(result);

        // Clean up uploaded file
        await fs.remove(file.path);

        // Emit progress update
        emitProgress(socketIO, jobId, 'image-resizer:progress', {
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

        const errorResult: ImageResizerResult = {
          id: `img-${i}`,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Failed to resize image',
          error: error instanceof Error ? error.message : 'Unknown error',
          originalFileName: file?.originalname || 'unknown',
          resizedFileName: '',
          originalSize: { width: 0, height: 0, fileSize: 0 },
          resizedSize: { width: 0, height: 0, fileSize: 0 },
          compressionRatio: 0,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);

        emitProgress(socketIO, jobId, 'image-resizer:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result: errorResult,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create ZIP archive with all resized images
    const zipPath = await createResizedImagesZip(jobId, results);

    // Emit completion event
    emitCompletion(socketIO, jobId, 'image-resizer:complete', {
      jobId,
      totalProcessed: results.filter(r => r.status === 'success').length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      zipPath,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk image resizing:', error);
    
    // Clean up any remaining uploaded files
    for (const file of files) {
      await fs.remove(file.path).catch(console.error);
    }
    
    emitError(socketIO, jobId, 'image-resizer:error', error);
  }
}

// Create ZIP archive with resized images
async function createResizedImagesZip(jobId: string, results: ImageResizerResult[]): Promise<string> {
  const archiver = await import('archiver');
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const zipPath = path.join(downloadDir, `resized-images_${jobId}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver.default('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`📦 Resized images ZIP archive created: ${archive.pointer()} total bytes`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all successful resized images to the archive
    for (const result of results) {
      if (result.status === 'success' && result.resizedFileName) {
        const filePath = path.join(downloadDir, 'resized-images', result.resizedFileName);
        
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: result.resizedFileName });
        }
      }
    }

    archive.finalize();
  });
}

export default router;

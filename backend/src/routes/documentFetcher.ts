import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { Server } from 'socket.io';
import { processExcelFile } from '../services/documentFetcherService.js';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { ApiResponse, DocumentFetcherConfig, StudentRecord } from '../types/index.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `excel-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
    }
  }
});

// Get Socket.IO instance (we'll need to pass this from the main server)
let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// Parse Excel file endpoint
router.post('/parse-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      } as ApiResponse);
    }

    const filePath = req.file.path;
    const parsedData = await parseExcelFile(filePath);

    // Clean up uploaded file
    await fs.remove(filePath);

    return res.json({
      success: true,
      data: parsedData,
      message: 'Excel file parsed successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error parsing Excel file:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Excel file'
    } as ApiResponse);
  }
});

// Process documents endpoint
router.post('/process-documents', async (req, res) => {
  try {
    const { data, config }: { 
      data: StudentRecord[], 
      config: DocumentFetcherConfig 
    } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format'
      } as ApiResponse);
    }

    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not initialized'
      } as ApiResponse);
    }

    // Generate job ID
    const jobId = `doc-fetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start processing in background
    processDocumentsInBackground(data, config, jobId, io);

    return res.json({
      success: true,
      data: { jobId },
      message: 'Document processing started'
    } as ApiResponse);

  } catch (error) {
    console.error('Error starting document processing:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start processing'
    } as ApiResponse);
  }
});

// Get processing status endpoint
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // In a real application, you'd store job status in a database
    // For now, we'll return a simple response
    res.json({
      success: true,
      data: {
        jobId,
        status: 'processing',
        message: 'Job status endpoint - implement with database storage'
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get job status'
    } as ApiResponse);
  }
});

// Download ZIP file endpoint
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
    const zipPath = path.join(downloadDir, `documents_${jobId}.zip`);

    // Check if file exists
    if (!await fs.pathExists(zipPath)) {
      return res.status(404).json({
        success: false,
        error: 'ZIP file not found'
      } as ApiResponse);
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="documents_${jobId}.zip"`);

    // Stream the file
    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming ZIP file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      } as ApiResponse);
    });

    return; // Explicit return for the streaming response

  } catch (error) {
    console.error('Download ZIP error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
});

// Background processing function
async function processDocumentsInBackground(
  data: StudentRecord[],
  config: DocumentFetcherConfig,
  jobId: string,
  socketIO: Server
): Promise<void> {
  try {
    // Emit start event
    emitProgress(socketIO, jobId, 'document-fetcher:start', {
      jobId,
      totalRecords: data.length,
      config,
      timestamp: new Date().toISOString()
    });

    // Process the documents
    const result = await processExcelFile(data, config, jobId, socketIO);

    // Emit completion event
    emitCompletion(socketIO, jobId, 'document-fetcher:complete', {
      jobId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in background processing:', error);
    
    // Emit error event
    emitError(socketIO, jobId, 'document-fetcher:error', error);
  }
}

// Simple Excel parser (you can enhance this with a proper library)
async function parseExcelFile(filePath: string): Promise<any> {
  // This is a simplified version - in a real application, you'd use a proper Excel parser
  // like 'xlsx' library
  
  const fileContent = await fs.readFile(filePath);
  
  // For now, return mock data structure
  return {
    records: [
      {
        'Reg No': '001',
        'Student Photo': 'https://drive.google.com/file/d/example1/view',
        'Student Signature': 'https://drive.google.com/file/d/example2/view',
        '12th Marksheet': 'https://drive.google.com/file/d/example3/view',
        'Migration Certificate': 'https://drive.google.com/file/d/example4/view'
      }
    ],
    columns: ['Reg No', 'Student Photo', 'Student Signature', '12th Marksheet', 'Migration Certificate'],
    totalRows: 1,
    validRows: 1
  };
}

export default router;

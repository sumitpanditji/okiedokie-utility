import express from 'express';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs-extra';
import { Server } from 'socket.io';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { ApiResponse, QRCodeConfig, QRCodeResult } from '../types/index.js';

const router = express.Router();

// Get Socket.IO instance
let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// Generate single QR code
router.post('/generate', async (req, res) => {
  try {
    const config: QRCodeConfig = req.body;

    if (!config.content || !config.type) {
      return res.status(400).json({
        success: false,
        error: 'Content and type are required'
      } as ApiResponse);
    }

    const result = await generateQRCode(config);

    return res.json({
      success: true,
      data: result,
      message: 'QR code generated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate QR code'
    } as ApiResponse);
  }
});

// Generate multiple QR codes
router.post('/generate-bulk', async (req, res) => {
  try {
    const { configs, jobId }: { 
      configs: QRCodeConfig[], 
      jobId?: string 
    } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        error: 'Configs array is required'
      } as ApiResponse);
    }

    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not initialized'
      } as ApiResponse);
    }

    const finalJobId = jobId || `qr-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start bulk generation in background
    generateBulkQRCodes(configs, finalJobId, io);

    return res.json({
      success: true,
      data: { jobId: finalJobId },
      message: 'Bulk QR code generation started'
    } as ApiResponse);

  } catch (error) {
    console.error('Error starting bulk QR code generation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start bulk generation'
    } as ApiResponse);
  }
});

// Download QR code
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
    const filePath = path.join(downloadDir, 'qr-codes', filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'QR code file not found'
      } as ApiResponse);
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png';
    
    if (ext === '.svg') contentType = 'image/svg+xml';
    if (ext === '.pdf') contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming QR code file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      } as ApiResponse);
    });

    return; // Explicit return for the streaming response

  } catch (error) {
    console.error('Download QR code error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
});

// Generate QR code function
async function generateQRCode(config: QRCodeConfig): Promise<QRCodeResult> {
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const qrDir = path.join(downloadDir, 'qr-codes');
  await fs.ensureDir(qrDir);

  const timestamp = Date.now();
  const filename = `qr-${timestamp}.png`;
  const filePath = path.join(qrDir, filename);

  // Prepare QR code options
  const qrOptions = {
    width: config.size || 256,
    margin: config.margin || 4,
    color: config.color || {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M' as const
  };

  // Generate content based on type
  let content = config.content;
  
  switch (config.type) {
    case 'wifi':
      content = generateWifiQR(config.content);
      break;
    case 'contact':
      content = generateContactQR(config.content);
      break;
    case 'email':
      content = `mailto:${config.content}`;
      break;
    case 'sms':
      content = `sms:${config.content}`;
      break;
    case 'url':
      if (!config.content.startsWith('http')) {
        content = `https://${config.content}`;
      }
      break;
  }

  // Generate QR code
  await QRCode.toFile(filePath, content, qrOptions);

  const stats = await fs.stat(filePath);
  const downloadUrl = `/api/qr-code/download/${filename}`;

  return {
    id: `qr-${timestamp}`,
    status: 'success',
    message: 'QR code generated successfully',
    qrCodeUrl: downloadUrl,
    downloadUrl,
    size: qrOptions.width,
    format: 'png',
    timestamp: new Date().toISOString()
  };
}

// Generate bulk QR codes
async function generateBulkQRCodes(
  configs: QRCodeConfig[],
  jobId: string,
  socketIO: Server
): Promise<void> {
  try {
    const results: QRCodeResult[] = [];
    const total = configs.length;

    // Emit start event
    emitProgress(socketIO, jobId, 'qr-code:start', {
      jobId,
      total,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      
      try {
        if (!config) {
          throw new Error('Config is undefined');
        }
        const result = await generateQRCode(config);
        results.push(result);

        // Emit progress update
        emitProgress(socketIO, jobId, 'qr-code:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const errorResult: QRCodeResult = {
          id: `qr-${i}`,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Failed to generate QR code',
          error: error instanceof Error ? error.message : 'Unknown error',
          qrCodeUrl: '',
          downloadUrl: '',
          size: 0,
          format: 'png',
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);

        emitProgress(socketIO, jobId, 'qr-code:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result: errorResult,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create ZIP archive with all QR codes
    const zipPath = await createQRCodeZip(jobId, results);

    // Emit completion event
    emitCompletion(socketIO, jobId, 'qr-code:complete', {
      jobId,
      totalProcessed: results.filter(r => r.status === 'success').length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      zipPath,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk QR code generation:', error);
    emitError(socketIO, jobId, 'qr-code:error', error);
  }
}

// Generate WiFi QR code content
function generateWifiQR(wifiConfig: string): string {
  // Expected format: "SSID:password:security"
  const parts = wifiConfig.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid WiFi configuration format. Expected: SSID:password:security');
  }

  const ssid = parts[0];
  const password = parts[1];
  const security = parts[2] || 'WPA';

  return `WIFI:T:${security};S:${ssid};P:${password};H:false;;`;
}

// Generate contact QR code content (vCard format)
function generateContactQR(contactConfig: string): string {
  // Expected format: "name:phone:email:organization"
  const parts = contactConfig.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid contact configuration format. Expected: name:phone:email:organization');
  }

  const name = parts[0];
  const phone = parts[1];
  const email = parts[2] || '';
  const organization = parts[3] || '';

  return `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
ORG:${organization}
END:VCARD`;
}

// Create ZIP archive with QR codes
async function createQRCodeZip(jobId: string, results: QRCodeResult[]): Promise<string> {
  const archiver = await import('archiver');
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const zipPath = path.join(downloadDir, `qr-codes_${jobId}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver.default('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`📦 QR codes ZIP archive created: ${archive.pointer()} total bytes`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all successful QR codes to the archive
    for (const result of results) {
      if (result.status === 'success' && result.downloadUrl) {
        const filename = path.basename(result.downloadUrl);
        const filePath = path.join(downloadDir, 'qr-codes', filename);
        
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: filename });
        }
      }
    }

    archive.finalize();
  });
}

export default router;

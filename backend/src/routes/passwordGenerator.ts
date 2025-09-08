import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Server } from 'socket.io';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { ApiResponse, PasswordConfig, PasswordResult } from '../types/index.js';

const router = express.Router();

// Get Socket.IO instance
let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

// Generate single password
router.post('/generate', async (req, res) => {
  try {
    const config: PasswordConfig = req.body;

    if (!config.length || config.length < 4 || config.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Password length must be between 4 and 128 characters'
      } as ApiResponse);
    }

    const result = await generatePassword(config);

    return res.json({
      success: true,
      data: result,
      message: 'Password generated successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Error generating password:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate password'
    } as ApiResponse);
  }
});

// Generate multiple passwords
router.post('/generate-bulk', async (req, res) => {
  try {
    const { config, jobId }: { 
      config: PasswordConfig, 
      jobId?: string 
    } = req.body;

    if (!config || !config.count || config.count < 1 || config.count > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Count must be between 1 and 1000'
      } as ApiResponse);
    }

    if (!io) {
      return res.status(500).json({
        success: false,
        error: 'Socket.IO not initialized'
      } as ApiResponse);
    }

    const finalJobId = jobId || `pwd-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start bulk generation in background
    generateBulkPasswords(config, finalJobId, io);

    return res.json({
      success: true,
      data: { jobId: finalJobId },
      message: 'Bulk password generation started'
    } as ApiResponse);

  } catch (error) {
    console.error('Error starting bulk password generation:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start bulk generation'
    } as ApiResponse);
  }
});

// Download passwords as file
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
    const filePath = path.join(downloadDir, 'passwords', filename);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Password file not found'
      } as ApiResponse);
    }

    // Set appropriate content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'text/plain';
    
    if (ext === '.csv') contentType = 'text/csv';
    if (ext === '.json') contentType = 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming password file:', error);
      res.status(500).json({
        success: false,
        error: 'Error downloading file'
      } as ApiResponse);
    });

    return; // Explicit return for the streaming response

  } catch (error) {
    console.error('Download password file error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    } as ApiResponse);
  }
});

// Generate password function
async function generatePassword(config: PasswordConfig): Promise<PasswordResult> {
  const password = createPassword(config);
  const strength = analyzePasswordStrength(password);
  const entropy = calculateEntropy(password);

  return {
    id: `pwd-${Date.now()}`,
    status: 'success',
    message: 'Password generated successfully',
    password,
    strength,
    entropy,
    timestamp: new Date().toISOString()
  };
}

// Create password based on configuration
function createPassword(config: PasswordConfig): string {
  let charset = '';
  
  if (config.includeLowercase) {
    charset += 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (config.includeUppercase) {
    charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (config.includeNumbers) {
    charset += '0123456789';
  }
  
  if (config.includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (config.customChars) {
    charset += config.customChars;
  }

  if (charset === '') {
    throw new Error('At least one character type must be selected');
  }

  // Remove similar characters if requested
  if (config.excludeSimilar) {
    charset = charset.replace(/[il1Lo0O]/g, '');
  }

  // Remove ambiguous characters if requested
  if (config.excludeAmbiguous) {
    charset = charset.replace(/[{}[\]()\/\\~,;.<>]/g, '');
  }

  let password = '';
  const array = new Uint8Array(config.length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < config.length; i++) {
    const arrayValue = array[i];
    if (arrayValue !== undefined) {
      const index = arrayValue % charset.length;
      if (charset[index]) {
        password += charset[index];
      }
    }
  }

  return password;
}

// Analyze password strength
function analyzePasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');

  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 1;
  else feedback.push('Avoid repeating characters');

  if (!/123|abc|qwe|asd|zxc/i.test(password)) score += 1;
  else feedback.push('Avoid common sequences');

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  if (score <= 3) level = 'weak';
  else if (score <= 5) level = 'fair';
  else if (score <= 7) level = 'good';
  else if (score <= 9) level = 'strong';
  else level = 'very-strong';

  return { score, level, feedback };
}

// Calculate password entropy
function calculateEntropy(password: string): number {
  const charsetSize = new Set(password).size;
  return Math.log2(Math.pow(charsetSize, password.length));
}

// Generate bulk passwords
async function generateBulkPasswords(
  config: PasswordConfig,
  jobId: string,
  socketIO: Server
): Promise<void> {
  try {
    const results: PasswordResult[] = [];
    const total = config.count;

    // Emit start event
    emitProgress(socketIO, jobId, 'password-generator:start', {
      jobId,
      total,
      config,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < config.count; i++) {
      try {
        const result = await generatePassword(config);
        results.push(result);

        // Emit progress update
        emitProgress(socketIO, jobId, 'password-generator:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const errorResult: PasswordResult = {
          id: `pwd-${i}`,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Failed to generate password',
          error: error instanceof Error ? error.message : 'Unknown error',
          password: '',
          strength: { score: 0, level: 'weak', feedback: [] },
          entropy: 0,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);

        emitProgress(socketIO, jobId, 'password-generator:progress', {
          jobId,
          current: i + 1,
          total,
          progress: ((i + 1) / total) * 100,
          result: errorResult,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Create downloadable files
    const files = await createPasswordFiles(jobId, results, config);

    // Emit completion event
    emitCompletion(socketIO, jobId, 'password-generator:complete', {
      jobId,
      totalProcessed: results.filter(r => r.status === 'success').length,
      totalFailed: results.filter(r => r.status === 'failed').length,
      files,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk password generation:', error);
    emitError(socketIO, jobId, 'password-generator:error', error);
  }
}

// Create downloadable files
async function createPasswordFiles(
  jobId: string,
  results: PasswordResult[],
  config: PasswordConfig
): Promise<{ txt: string; csv: string; json: string }> {
  const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';
  const passwordDir = path.join(downloadDir, 'passwords');
  await fs.ensureDir(passwordDir);

  const timestamp = Date.now();
  const baseFilename = `passwords_${jobId}_${timestamp}`;

  // Create TXT file
  const txtPath = path.join(passwordDir, `${baseFilename}.txt`);
  const txtContent = results
    .filter(r => r.status === 'success')
    .map(r => r.password)
    .join('\n');
  await fs.writeFile(txtPath, txtContent);

  // Create CSV file
  const csvPath = path.join(passwordDir, `${baseFilename}.csv`);
  const csvContent = [
    'Password,Strength Score,Strength Level,Entropy,Generated At',
    ...results
      .filter(r => r.status === 'success')
      .map(r => `"${r.password}",${r.strength.score},"${r.strength.level}",${r.entropy.toFixed(2)},"${r.timestamp}"`)
  ].join('\n');
  await fs.writeFile(csvPath, csvContent);

  // Create JSON file
  const jsonPath = path.join(passwordDir, `${baseFilename}.json`);
  const jsonContent = {
    metadata: {
      jobId,
      config,
      generatedAt: new Date().toISOString(),
      totalPasswords: results.filter(r => r.status === 'success').length
    },
    passwords: results.filter(r => r.status === 'success')
  };
  await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));

  return {
    txt: `/api/password-generator/download/${path.basename(txtPath)}`,
    csv: `/api/password-generator/download/${path.basename(csvPath)}`,
    json: `/api/password-generator/download/${path.basename(jsonPath)}`
  };
}

export default router;

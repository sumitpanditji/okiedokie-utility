import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import archiver from 'archiver';
import { Server } from 'socket.io';
import { emitProgress, emitCompletion, emitError } from '../socket/socketHandlers.js';
import { StudentRecord, DocumentFetcherConfig, DocumentFetcherResult } from '../types/index.js';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || 'downloads';
const MAX_CONCURRENT_DOWNLOADS = 20;
const DOWNLOAD_TIMEOUT = 30000;

export async function processExcelFile(
  data: StudentRecord[],
  config: DocumentFetcherConfig,
  jobId: string,
  io: Server
): Promise<DocumentFetcherResult[]> {
  const results: DocumentFetcherResult[] = [];
  const downloadQueue: Array<() => Promise<void>> = [];
  let totalTasks = 0;
  let completedTasks = 0;
  let skippedTasks = 0;

  // Create base directory
  await fs.ensureDir(DOWNLOAD_DIR);

  // Clean up old files before starting
  await cleanupOldFiles();

  // Calculate total tasks first
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const regNo = row['Reg No'] || row['regNo'] || row['REG NO'];

    if (!regNo) {
      skippedTasks++;
      continue;
    }

    // Count valid tasks for each column
    for (const [colName] of Object.entries(config.columnMapping || {})) {
      const link = row[colName];
      if (link && typeof link === 'string' && isValidGoogleDriveLink(link)) {
        totalTasks++;
      } else {
        skippedTasks++;
      }
    }
  }

  // Emit start event with accurate totals
  console.log(`📡 Emitting document-fetcher:start to room ${jobId}`);
  console.log(`📊 Total tasks: ${totalTasks}, Skipped: ${skippedTasks}, Students: ${data.length}`);

  emitProgress(io, jobId, 'document-fetcher:start', {
    jobId,
    totalRecords: data.length,
    totalTasks,
    skippedTasks,
    downloadTasks: totalTasks,
    timestamp: new Date().toISOString()
  });

  try {
    // Process each student record
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const regNo = row['Reg No'] || row['regNo'] || row['REG NO'];

      if (!regNo) {
        results.push({
          id: `row-${i + 1}`,
          regNo: `Row ${i + 1}`,
          column: 'N/A',
          status: 'skipped',
          message: 'No registration number found',
          timestamp: new Date().toISOString()
        });
        continue;
      }

      // Process each column for the student
      for (const [colName, folderName] of Object.entries(config.columnMapping || {})) {
        const link = row[colName];

        if (!link || typeof link !== 'string') {
          results.push({
            id: `${regNo}-${colName}`,
            regNo,
            column: colName,
            status: 'skipped',
            message: 'No link provided',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        if (!isValidGoogleDriveLink(link)) {
          results.push({
            id: `${regNo}-${colName}`,
            regNo,
            column: colName,
            status: 'skipped',
            message: 'Invalid Google Drive link',
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // Add to download queue with progress tracking
        downloadQueue.push(async () => {
          const result = await processDocument(regNo, colName, folderName, link, jobId, io);
          results.push(result);
          completedTasks++;

          // Emit progress update
          emitProgress(io, jobId, 'document-fetcher:progress', {
            jobId,
            current: completedTasks,
            total: totalTasks,
            progress: (completedTasks / totalTasks) * 100,
            result,
            timestamp: new Date().toISOString()
          });
        });
      }
    }

    // Process downloads with concurrency control
    console.log(`🚀 Starting download queue with ${downloadQueue.length} tasks`);
    await processDownloadQueue(downloadQueue, config.maxConcurrent || MAX_CONCURRENT_DOWNLOADS);

    // Create ZIP archive
    console.log(`📦 Creating ZIP archive for job ${jobId}`);
    const zipPath = await createZipArchive(jobId, results);

    // Emit completion event
    emitCompletion(io, jobId, 'document-fetcher:complete', {
      jobId,
      totalProcessed: completedTasks,
      totalSkipped: skippedTasks,
      zipPath,
      results,
      timestamp: new Date().toISOString()
    });

    return results;

  } catch (error) {
    console.error('Error processing documents:', error);
    emitError(io, jobId, 'document-fetcher:error', error);
    throw error;
  }
}

async function processDownloadQueue(
  queue: Array<() => Promise<void>>,
  maxConcurrent: number
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < queue.length; i += maxConcurrent) {
    chunks.push(queue.slice(i, i + maxConcurrent));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk) {
      await Promise.all(chunk.map(task => task()));
      console.log(`Completed chunk ${i + 1}/${chunks.length}`);
    }
  }
}

async function processDocument(
  regNo: string,
  columnName: string,
  folderName: string,
  link: string,
  jobId: string,
  io: Server
): Promise<DocumentFetcherResult> {
  try {
    const fileId = extractFileId(link);
    if (!fileId) {
      return {
        id: `${regNo}-${columnName}`,
        regNo,
        column: columnName,
        status: 'failed',
        message: 'Invalid Google Drive link',
        timestamp: new Date().toISOString()
      };
    }

    // Create folder structure
    const folderPath = path.join(DOWNLOAD_DIR, folderName);
    await fs.ensureDir(folderPath);

    // Download file with progress tracking
    const fileName = `${regNo}_${columnName.replace(/\s+/g, '_')}`;
    const filePath = path.join(folderPath, fileName);

    const success = await downloadFileWithProgress(fileId, filePath, link, jobId, io, regNo, columnName);

    if (success.success && success.filePath) {
      const stats = await fs.stat(success.filePath);
      return {
        id: `${regNo}-${columnName}`,
        regNo,
        column: columnName,
        status: 'success',
        message: 'Downloaded successfully',
        filePath: success.filePath,
        fileName: success.fileName || 'unknown',
        fileSize: stats.size,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        id: `${regNo}-${columnName}`,
        regNo,
        column: columnName,
        status: 'failed',
        message: success.error || 'Download failed',
        error: success.error || 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }

  } catch (error) {
    return {
      id: `${regNo}-${columnName}`,
      regNo,
      column: columnName,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

function extractFileId(driveUrl: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/file\/d\/([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = driveUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

function isValidGoogleDriveLink(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'drive.google.com' && 
           (url.includes('/file/d/') || url.includes('/open?id=') || url.includes('/uc?'));
  } catch {
    return false;
  }
}

async function downloadFileWithProgress(
  fileId: string,
  filePath: string,
  originalUrl: string,
  jobId: string,
  io: Server,
  regNo: string,
  columnName: string
): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> {
  try {
    // Convert to direct download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    // Emit download start event
    emitProgress(io, jobId, 'document-fetcher:download-start', {
      jobId,
      regNo,
      column: columnName,
      url: downloadUrl,
      timestamp: new Date().toISOString()
    });

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Get file extension from content type or URL
    const contentType = response.headers['content-type'] || '';
    const extension = getFileExtension(contentType, originalUrl);
    const finalFilePath = filePath + extension;

    const writer = fs.createWriteStream(finalFilePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        emitProgress(io, jobId, 'document-fetcher:download-complete', {
          jobId,
          regNo,
          column: columnName,
          filePath: finalFilePath,
          timestamp: new Date().toISOString()
        });

        resolve({
          success: true,
          filePath: finalFilePath,
          fileName: path.basename(finalFilePath)
        });
      });

      writer.on('error', (error) => {
        emitProgress(io, jobId, 'document-fetcher:download-error', {
          jobId,
          regNo,
          column: columnName,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        resolve({
          success: false,
          error: error.message
        });
      });
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    
    emitProgress(io, jobId, 'document-fetcher:download-error', {
      jobId,
      regNo,
      column: columnName,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

function getFileExtension(contentType: string, originalUrl: string): string {
  if (contentType.includes('pdf')) return '.pdf';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('image')) return '.jpg';
  
  // Try to guess from URL
  if (originalUrl.toLowerCase().includes('.jpg') || originalUrl.toLowerCase().includes('.jpeg')) {
    return '.jpg';
  }
  if (originalUrl.toLowerCase().includes('.png')) {
    return '.png';
  }
  
  return '.pdf'; // Default
}

async function createZipArchive(jobId: string, results: DocumentFetcherResult[]): Promise<string> {
  const zipPath = path.join(DOWNLOAD_DIR, `documents_${jobId}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`📦 ZIP archive created: ${archive.pointer()} total bytes`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add all downloaded files to the archive
    for (const result of results) {
      if (result.status === 'success' && result.filePath) {
        const fileName = path.basename(result.filePath);
        const folderName = path.basename(path.dirname(result.filePath));
        archive.file(result.filePath, { name: `${folderName}/${fileName}` });
      }
    }

    archive.finalize();
  });
}

async function cleanupOldFiles(): Promise<void> {
  try {
    const files = await fs.readdir(DOWNLOAD_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = path.join(DOWNLOAD_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.remove(filePath);
        console.log(`🗑️ Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

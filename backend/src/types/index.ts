// Common types used across the application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ProcessingResult {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  message: string;
  progress?: number;
  filePath?: string;
  error?: string;
  timestamp?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  current: number;
  results: ProcessingResult[];
  startTime: string;
  endTime?: string;
  error?: string;
}

// Document Fetcher Types
export interface StudentRecord {
  [key: string]: any;
  'Reg No'?: string;
  'regNo'?: string;
  'REG NO'?: string;
  'Student Photo'?: string;
  'Student Signature'?: string;
  '12th Marksheet'?: string;
  'Migration Certificate'?: string;
}

export interface DocumentFetcherConfig {
  maxConcurrent: number;
  timeout: number;
  autoOrganize: boolean;
  columnMapping?: { [key: string]: string };
}

export interface DocumentFetcherResult extends ProcessingResult {
  regNo: string;
  column: string;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
}

// File Converter Types
export interface FileConverterConfig {
  inputFormat: string;
  outputFormat: string;
  quality?: number;
  compression?: number;
}

export interface FileConverterResult extends ProcessingResult {
  originalFileName: string;
  convertedFileName: string;
  originalSize: number;
  convertedSize: number;
  compressionRatio?: number;
}

// QR Code Types
export interface QRCodeConfig {
  type: 'url' | 'text' | 'wifi' | 'contact' | 'email' | 'sms';
  content: string;
  size?: number;
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
  logo?: {
    enabled: boolean;
    url?: string;
    size?: number;
  };
}

export interface QRCodeResult extends ProcessingResult {
  qrCodeUrl: string;
  downloadUrl: string;
  size: number;
  format: 'png' | 'svg' | 'pdf';
  error?: string;
}

// Password Generator Types
export interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  customChars?: string;
  count: number;
}

export interface PasswordResult extends ProcessingResult {
  password: string;
  strength: {
    score: number;
    level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
  };
  entropy: number;
}

// Image Resizer Types
export interface ImageResizerConfig {
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  quality: number;
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ImageResizerResult extends ProcessingResult {
  originalFileName: string;
  resizedFileName: string;
  originalSize: {
    width: number;
    height: number;
    fileSize: number;
  };
  resizedSize: {
    width: number;
    height: number;
    fileSize: number;
  };
  compressionRatio: number;
}

// Socket.IO Event Types
export interface SocketEvents {
  // Connection events
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
  
  // Job management
  'join:job': (jobId: string) => void;
  'leave:job': (jobId: string) => void;
  'joined:job': (data: { jobId: string; message: string }) => void;
  
  // Test events
  'test': (data: any) => void;
  'test:response': (data: any) => void;
  
  // Server status
  'server:status': (data: {
    connectedClients: number;
    timestamp: string;
    uptime: number;
  }) => void;
  
  // Document Fetcher events
  'document-fetcher:start': (data: any) => void;
  'document-fetcher:progress': (data: any) => void;
  'document-fetcher:complete': (data: any) => void;
  'document-fetcher:error': (data: any) => void;
  
  // File Converter events
  'file-converter:start': (data: any) => void;
  'file-converter:progress': (data: any) => void;
  'file-converter:complete': (data: any) => void;
  'file-converter:error': (data: any) => void;
  
  // QR Code events
  'qr-code:start': (data: any) => void;
  'qr-code:progress': (data: any) => void;
  'qr-code:complete': (data: any) => void;
  'qr-code:error': (data: any) => void;
  
  // Password Generator events
  'password-generator:start': (data: any) => void;
  'password-generator:progress': (data: any) => void;
  'password-generator:complete': (data: any) => void;
  'password-generator:error': (data: any) => void;
  
  // Image Resizer events
  'image-resizer:start': (data: any) => void;
  'image-resizer:progress': (data: any) => void;
  'image-resizer:complete': (data: any) => void;
  'image-resizer:error': (data: any) => void;
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

// Error types
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  maxFileSize: string;
  uploadDir: string;
  downloadDir: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// Utility types
export type SupportedImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';
export type SupportedDocumentFormat = 'pdf' | 'doc' | 'docx' | 'txt' | 'rtf' | 'odt';
export type SupportedArchiveFormat = 'zip' | 'rar' | '7z' | 'tar' | 'gz';

export interface FileTypeInfo {
  extension: string;
  mimeType: string;
  category: 'image' | 'document' | 'archive' | 'other';
  supported: boolean;
}

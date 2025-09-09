import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import documentFetcherRoutes from './routes/documentFetcher.js';
import fileConverterRoutes from './routes/fileConverter.js';
import qrCodeRoutes from './routes/qrCode.js';
import passwordGeneratorRoutes from './routes/passwordGenerator.js';
import imageResizerRoutes from './routes/imageResizer.js';

// Import socket handlers
import { setupSocketHandlers } from './socket/socketHandlers.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure CORS
const allowedOrigins = [
  'https://okiedokie-utility.web.app',
  'https://okiedokie-utility.firebaseapp.com',
  'http://localhost:5173', // Development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
const server = createServer(app);

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ["http://localhost:5173", "https://okiedokie-utility.web.app"];

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '50mb' }));

// Create necessary directories
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const downloadDir = process.env.DOWNLOAD_DIR || 'downloads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../../', uploadDir)));
app.use('/downloads', express.static(path.join(__dirname, '../../', downloadDir)));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      server: 'running',
      socket: io.engine.clientsCount > 0 ? 'connected' : 'disconnected'
    }
  });
});

// Initialize Socket.IO for all routes
if ('setSocketIO' in documentFetcherRoutes) {
  (documentFetcherRoutes as any).setSocketIO(io);
}
if ('setSocketIO' in fileConverterRoutes) {
  (fileConverterRoutes as any).setSocketIO(io);
}
if ('setSocketIO' in qrCodeRoutes) {
  (qrCodeRoutes as any).setSocketIO(io);
}
if ('setSocketIO' in passwordGeneratorRoutes) {
  (passwordGeneratorRoutes as any).setSocketIO(io);
}
if ('setSocketIO' in imageResizerRoutes) {
  (imageResizerRoutes as any).setSocketIO(io);
}

// API Routes
app.use('/api/document-fetcher', documentFetcherRoutes);
app.use('/api/file-converter', fileConverterRoutes);
app.use('/api/qr-code', qrCodeRoutes);
app.use('/api/password-generator', passwordGeneratorRoutes);
app.use('/api/image-resizer', imageResizerRoutes);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
} else {
  // Development fallback
  app.get('*', (req, res) => {
    res.json({ 
      message: 'OKIEDOKIE-UTILITY Backend is running!',
      frontend: 'Please start the frontend server with npm run dev:frontend',
      endpoints: [
        '/api/health',
        '/api/document-fetcher',
        '/api/file-converter',
        '/api/qr-code',
        '/api/password-generator',
        '/api/image-resizer'
      ]
    });
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field',
      message: 'The uploaded file field name is not expected.'
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found.'
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 OKIEDOKIE-UTILITY Backend running on port ${PORT}`);
  console.log(`📱 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Backend: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  console.log(`📁 Download directory: ${downloadDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;

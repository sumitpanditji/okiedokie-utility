# OKIEDOKIE-UTILITY Backend

Node.js backend server for the OKIEDOKIE-UTILITY application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Running

#### Option 1: Using the start script
```bash
# Windows
start.bat

# Linux/Mac
chmod +x start.sh
./start.sh
```

#### Option 2: Manual commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/             # API routes
│   │   ├── documentFetcher.ts
│   │   ├── fileConverter.ts
│   │   ├── qrCode.ts
│   │   ├── passwordGenerator.ts
│   │   └── imageResizer.ts
│   ├── services/           # Business logic
│   │   └── documentFetcherService.ts
│   ├── socket/             # Socket.IO handlers
│   │   └── socketHandlers.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   └── index.ts            # Main server file
├── uploads/                # File uploads (auto-created)
├── downloads/              # Generated files (auto-created)
├── package.json
├── tsconfig.json
└── env.example
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server (http://localhost:3001)
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory

## 🔧 Configuration

Copy `env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=50MB
UPLOAD_DIR=uploads
DOWNLOAD_DIR=downloads
```

## 📡 API Endpoints

### Document Fetcher
- `POST /api/document-fetcher/parse-excel` - Parse Excel file
- `POST /api/document-fetcher/process-documents` - Process documents
- `GET /api/document-fetcher/download/:jobId` - Download ZIP

### File Converter
- `POST /api/file-converter/convert` - Convert single file
- `POST /api/file-converter/convert-bulk` - Convert multiple files
- `GET /api/file-converter/download/:filename` - Download converted file

### QR Code Generator
- `POST /api/qr-code/generate` - Generate single QR code
- `POST /api/qr-code/generate-bulk` - Generate multiple QR codes
- `GET /api/qr-code/download/:filename` - Download QR code

### Password Generator
- `POST /api/password-generator/generate` - Generate single password
- `POST /api/password-generator/generate-bulk` - Generate multiple passwords
- `GET /api/password-generator/download/:filename` - Download passwords

### Image Resizer
- `POST /api/image-resizer/resize` - Resize single image
- `POST /api/image-resizer/resize-bulk` - Resize multiple images
- `GET /api/image-resizer/download/:filename` - Download resized image

### Health Check
- `GET /api/health` - Server health status

## 🔌 Socket.IO Events

The server emits real-time events for all processing operations:

- `document-fetcher:start` - Document processing started
- `document-fetcher:progress` - Processing progress update
- `document-fetcher:complete` - Processing completed
- `document-fetcher:error` - Processing error

Similar events for other utilities: `file-converter:*`, `qr-code:*`, `password-generator:*`, `image-resizer:*`

## 🔒 Security Features

- **Rate Limiting** - Prevents abuse
- **File Type Validation** - Only allows supported file types
- **Size Limits** - Configurable file size limits
- **CORS Protection** - Configured for frontend origin
- **Input Validation** - All inputs are validated
- **Automatic Cleanup** - Old files are automatically removed

## 📊 Features

- **Real-time Updates** via Socket.IO
- **File Upload/Download** with progress tracking
- **Concurrent Processing** with configurable limits
- **Error Handling** with detailed error messages
- **Type Safety** with full TypeScript support
- **Modular Architecture** for easy expansion

# OKIEDOKIE-UTILITY Frontend

React frontend for the OKIEDOKIE-UTILITY application.

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
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── layout/         # Layout components
│   │   └── theme-toggle.tsx
│   ├── pages/              # Page components
│   │   ├── dashboard.tsx
│   │   ├── document-fetcher.tsx
│   │   ├── file-converter.tsx
│   │   ├── qr-code-generator.tsx
│   │   ├── password-generator.tsx
│   │   ├── image-resizer.tsx
│   │   └── not-found.tsx
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Main app component
│   └── main.tsx            # App entry point
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Features

- **React 18** with TypeScript
- **Tailwind CSS** + **shadcn/ui** for beautiful UI
- **Socket.IO Client** for real-time updates
- **React Router** for navigation
- **Dark/Light Mode** theme support
- **Responsive Design** for all devices
- **Real-time Progress Tracking** for all utilities

## 🔧 Development

The frontend runs on port **5173** and automatically proxies API requests to the backend on port **3001**.

Make sure the backend is running for full functionality.

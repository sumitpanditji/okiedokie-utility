import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Dashboard } from '@/pages/dashboard'
import { DocumentFetcher } from '@/pages/document-fetcher'
import { FileConverter } from '@/pages/file-converter'
import { QRCodeGenerator } from '@/pages/qr-code-generator'
import { PasswordGenerator } from '@/pages/password-generator'
import { ImageResizer } from '@/pages/image-resizer'
import { NotFound } from '@/pages/not-found'

function App() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/document-fetcher" element={<DocumentFetcher />} />
            <Route path="/file-converter" element={<FileConverter />} />
            <Route path="/qr-code-generator" element={<QRCodeGenerator />} />
            <Route path="/password-generator" element={<PasswordGenerator />} />
            <Route path="/image-resizer" element={<ImageResizer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
        
        <Toaster />
        <Sonner />
        <ThemeToggle />
      </div>
    </TooltipProvider>
  )
}

export default App

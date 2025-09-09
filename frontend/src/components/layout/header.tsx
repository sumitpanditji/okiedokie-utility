import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  FileSpreadsheet, 
  RefreshCw, 
  QrCode, 
  Key, 
  Image,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ApiStatus } from '@/components/api-status'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Document Fetcher', href: '/document-fetcher', icon: FileSpreadsheet },
  { name: 'File Converter', href: '/file-converter', icon: RefreshCw },
  { name: 'QR Code Generator', href: '/qr-code-generator', icon: QrCode },
  { name: 'Password Generator', href: '/password-generator', icon: Key },
  { name: 'Image Resizer', href: '/image-resizer', icon: Image },
]

export function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <span className="text-sm font-bold text-primary-foreground">O</span>
            </div>
            <span className="text-xl font-bold gradient-text">OKIEDOKIE-UTILITY</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <nav className="flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                    className={cn(
                      "transition-colors",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Link to={item.href} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </Button>
                )
              })}
            </nav>
            <ApiStatus />
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-muted-foreground">API Status:</span>
              <ApiStatus />
            </div>
            <nav className="flex flex-col space-y-1 py-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                    className={cn(
                      "justify-start transition-colors",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to={item.href} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

import { Link } from 'react-router-dom'
import { Github, Heart, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <span className="text-sm font-bold text-primary-foreground">O</span>
              </div>
              <span className="text-lg font-bold gradient-text">OKIEDOKIE-UTILITY</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A comprehensive utility website with multiple useful tools for everyday tasks.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/document-fetcher" className="text-muted-foreground hover:text-foreground transition-colors">
                  Document Fetcher
                </Link>
              </li>
              <li>
                <Link to="/file-converter" className="text-muted-foreground hover:text-foreground transition-colors">
                  File Converter
                </Link>
              </li>
              <li>
                <Link to="/qr-code-generator" className="text-muted-foreground hover:text-foreground transition-colors">
                  QR Code Generator
                </Link>
              </li>
              <li>
                <Link to="/password-generator" className="text-muted-foreground hover:text-foreground transition-colors">
                  Password Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* Tools */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Tools</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/image-resizer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Image Resizer
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com/okiedokie/okiedokie-utility" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
                >
                  <span>GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="text-sm text-muted-foreground">
              Built with React, TypeScript, and Node.js. 
              Open source and free to use.
            </p>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>by OKIEDOKIE</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2024 OKIEDOKIE-UTILITY. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/okiedokie/okiedokie-utility" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

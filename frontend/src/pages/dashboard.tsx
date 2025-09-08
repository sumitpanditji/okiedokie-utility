import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileSpreadsheet, 
  RefreshCw, 
  QrCode, 
  Key, 
  Image,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

const utilities = [
  {
    name: 'Document Link Fetcher',
    description: 'Batch download documents from Google Drive links stored in Excel files with real-time progress tracking.',
    href: '/document-fetcher',
    icon: FileSpreadsheet,
    color: 'bg-blue-500',
    features: ['Excel Processing', 'Real-time Progress', 'Auto Organization', 'ZIP Packaging'],
    status: 'active'
  },
  {
    name: 'File Converter',
    description: 'Convert between various file formats including PDF, DOC, DOCX, TXT, and more with high quality output.',
    href: '/file-converter',
    icon: RefreshCw,
    color: 'bg-green-500',
    features: ['Multiple Formats', 'Batch Conversion', 'High Quality', 'Progress Tracking'],
    status: 'active'
  },
  {
    name: 'QR Code Generator',
    description: 'Generate QR codes for URLs, text, WiFi credentials, contact info with customizable design.',
    href: '/qr-code-generator',
    icon: QrCode,
    color: 'bg-purple-500',
    features: ['Multiple Types', 'Custom Design', 'Bulk Generation', 'Export Options'],
    status: 'active'
  },
  {
    name: 'Password Generator',
    description: 'Generate secure passwords with customizable criteria and strength analysis.',
    href: '/password-generator',
    icon: Key,
    color: 'bg-orange-500',
    features: ['Customizable Criteria', 'Strength Analysis', 'Bulk Generation', 'Export Options'],
    status: 'active'
  },
  {
    name: 'Image Resizer',
    description: 'Resize images while maintaining quality with batch processing and multiple output formats.',
    href: '/image-resizer',
    icon: Image,
    color: 'bg-pink-500',
    features: ['Quality Preservation', 'Batch Processing', 'Multiple Formats', 'Preset Templates'],
    status: 'active'
  }
]

const features = [
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'Live progress updates with Socket.IO for all operations'
  },
  {
    icon: Shield,
    title: 'Secure & Safe',
    description: 'All files are processed securely with automatic cleanup'
  },
  {
    icon: Clock,
    title: 'Fast & Efficient',
    description: 'Optimized algorithms for quick processing of large files'
  },
  {
    icon: Users,
    title: 'User Friendly',
    description: 'Intuitive interface designed for ease of use'
  }
]

export function Dashboard() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-4 bg-gradient-primary rounded-2xl shadow-medium">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold gradient-text">
            OKIEDOKIE-UTILITY
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A comprehensive collection of powerful utilities designed to streamline your workflow. 
          From document processing to file conversion, we've got you covered.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="success" className="text-sm">
            <Shield className="w-3 h-3 mr-1" />
            Secure
          </Badge>
          <Badge variant="default" className="text-sm">
            <Zap className="w-3 h-3 mr-1" />
            Fast
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Users className="w-3 h-3 mr-1" />
            Free
          </Badge>
        </div>
      </div>

      {/* Utilities Grid */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Available Utilities</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose from our collection of powerful tools designed to make your tasks easier and more efficient.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {utilities.map((utility) => (
            <Link key={utility.name} to={utility.href}>
              <Card className="utility-card group h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 rounded-xl text-white shadow-medium",
                      utility.color
                    )}>
                      <utility.icon className="w-6 h-6" />
                    </div>
                    <Badge 
                      variant={utility.status === 'active' ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {utility.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{utility.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {utility.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {utility.features.map((feature) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Why Choose OKIEDOKIE-UTILITY?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built with modern technology and user experience in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <CardContent className="pt-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl w-fit mx-auto mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary mb-2">5+</div>
            <p className="text-sm text-muted-foreground">Utility Tools</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary mb-2">100%</div>
            <p className="text-sm text-muted-foreground">Free to Use</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose any utility from above and start streamlining your workflow today. 
          All tools are free to use and require no registration.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/document-fetcher">
            <Card className="utility-card group w-48">
              <CardContent className="pt-6 text-center">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-semibold">Document Fetcher</h3>
                <p className="text-xs text-muted-foreground">Most Popular</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/qr-code-generator">
            <Card className="utility-card group w-48">
              <CardContent className="pt-6 text-center">
                <QrCode className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-semibold">QR Generator</h3>
                <p className="text-xs text-muted-foreground">Quick & Easy</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

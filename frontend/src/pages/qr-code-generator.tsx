import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  QrCode, 
  ArrowLeft,
  Download,
  Copy,
  CheckCircle,
  Loader2,
  Wifi,
  User,
  Mail,
  MessageSquare,
  Link as LinkIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/utils'
import { buildApiUrl, API_CONFIG } from '@/config/api'
import { DebugInfo } from '@/components/debug-info'

interface QRCodeConfig {
  type: 'url' | 'text' | 'wifi' | 'contact' | 'email' | 'sms'
  content: string
  size?: number
  margin?: number
  color?: {
    dark: string
    light: string
  }
}

export function QRCodeGenerator() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [config, setConfig] = useState<QRCodeConfig>({
    type: 'url',
    content: '',
    size: 256,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)

  const qrTypes = [
    { value: 'url', label: 'URL', icon: LinkIcon, description: 'Generate QR code for a website URL' },
    { value: 'text', label: 'Text', icon: MessageSquare, description: 'Generate QR code for plain text' },
    { value: 'wifi', label: 'WiFi', icon: Wifi, description: 'Generate QR code for WiFi credentials' },
    { value: 'contact', label: 'Contact', icon: User, description: 'Generate QR code for contact information' },
    { value: 'email', label: 'Email', icon: Mail, description: 'Generate QR code for email address' },
    { value: 'sms', label: 'SMS', icon: MessageSquare, description: 'Generate QR code for SMS message' }
  ]

  const handleGenerate = async () => {
    if (!config.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter content for the QR code",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.QR_CODE.GENERATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        // Check if response is HTML (error page)
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Backend server is not available. Please check if the server is running.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server returned invalid response. Please check if the server is running.')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate QR code')
      }

      setQrCodeUrl(result.data.qrCodeUrl)
      
      toast({
        title: "QR Code Generated",
        description: "Your QR code has been generated successfully",
      })
    } catch (err) {
      let errorMessage = 'Failed to generate QR code'
      
      if (err instanceof Error) {
        errorMessage = err.message
      }
      
      // Check for network errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Cannot connect to the server. Please check your internet connection and try again.'
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!qrCodeUrl) return

    try {
      await copyToClipboard(qrCodeUrl)
      setIsCopied(true)
      toast({
        title: "Copied",
        description: "QR code URL copied to clipboard",
      })
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  const handleDownload = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `qr-code-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download Started",
      description: "QR code is being downloaded",
    })
  }

  const getPlaceholder = () => {
    switch (config.type) {
      case 'url':
        return 'https://example.com'
      case 'text':
        return 'Enter your text here...'
      case 'wifi':
        return 'SSID:password:security (e.g., MyWiFi:mypassword:WPA)'
      case 'contact':
        return 'name:phone:email:organization (e.g., John Doe:+1234567890:john@example.com:Company)'
      case 'email':
        return 'email@example.com'
      case 'sms':
        return '+1234567890:Your message here'
      default:
        return 'Enter content...'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">QR Code Generator</h1>
            <p className="text-muted-foreground">
              Generate QR codes for URLs, text, WiFi credentials, and more
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code Type */}
            <div className="space-y-3">
              <Label>QR Code Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {qrTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={config.type === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setConfig(prev => ({ ...prev, type: type.value as any }))}
                    className="h-auto p-3 flex flex-col items-start"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <type.icon className="w-4 h-4" />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      {type.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Input
                id="content"
                placeholder={getPlaceholder()}
                value={config.content}
                onChange={(e) => setConfig(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label htmlFor="size">Size (pixels)</Label>
              <Input
                id="size"
                type="number"
                min="100"
                max="1000"
                value={config.size}
                onChange={(e) => setConfig(prev => ({ ...prev, size: parseInt(e.target.value) || 256 }))}
              />
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <Label htmlFor="margin">Margin</Label>
              <Input
                id="margin"
                type="number"
                min="0"
                max="10"
                value={config.margin}
                onChange={(e) => setConfig(prev => ({ ...prev, margin: parseInt(e.target.value) || 4 }))}
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="darkColor">Dark Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="darkColor"
                    type="color"
                    value={config.color?.dark || '#000000'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      color: { ...prev.color!, dark: e.target.value }
                    }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={config.color?.dark || '#000000'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      color: { ...prev.color!, dark: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lightColor">Light Color</Label>
                <div className="flex space-x-2">
                  <Input
                    id="lightColor"
                    type="color"
                    value={config.color?.light || '#FFFFFF'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      color: { ...prev.color!, light: e.target.value }
                    }))}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={config.color?.light || '#FFFFFF'}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      color: { ...prev.color!, light: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !config.content.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {qrCodeUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <img 
                      src={qrCodeUrl} 
                      alt="Generated QR Code" 
                      className="max-w-full h-auto"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>QR Code URL</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={qrCodeUrl} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleCopy}
                    >
                      {isCopied ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleDownload} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No QR Code Generated</h3>
                <p className="text-muted-foreground">
                  Configure your settings and click "Generate QR Code" to create one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Info - Remove this after fixing the issue */}
      <DebugInfo />

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">URL</h4>
              <p className="text-sm text-muted-foreground">https://example.com</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">WiFi</h4>
              <p className="text-sm text-muted-foreground">MyWiFi:mypassword:WPA</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Contact</h4>
              <p className="text-sm text-muted-foreground">John Doe:+1234567890:john@example.com:Company</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Email</h4>
              <p className="text-sm text-muted-foreground">contact@example.com</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">SMS</h4>
              <p className="text-sm text-muted-foreground">+1234567890:Hello World!</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Text</h4>
              <p className="text-sm text-muted-foreground">Any plain text message</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

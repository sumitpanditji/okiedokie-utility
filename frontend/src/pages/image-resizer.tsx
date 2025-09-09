import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Image, 
  ArrowLeft,
  Upload,
  Download,
  XCircle,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface ImageResizerConfig {
  width?: number
  height?: number
  maintainAspectRatio: boolean
  quality: number
  format: 'jpeg' | 'png' | 'webp' | 'avif'
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

export function ImageResizer() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [file, setFile] = useState<File | null>(null)
  const [config, setConfig] = useState<ImageResizerConfig>({
    maintainAspectRatio: true,
    quality: 90,
    format: 'jpeg',
    fit: 'cover'
  })
  const [isResizing, setIsResizing] = useState(false)
  const [resizedFile, setResizedFile] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showConfig, setShowConfig] = useState(false)

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
      'image/gif': ['.gif'],
      'image/tiff': ['.tiff']
    },
    multiple: false,
    disabled: isResizing
  })

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError('')
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile)
    
    // Load image to get dimensions
    const img = new window.Image()
    img.onload = () => {
      setConfig(prev => ({
        ...prev,
        width: img.width,
        height: img.height
      }))
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const handleResize = async () => {
    if (!file) return

    setIsResizing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('width', config.width?.toString() || '')
      formData.append('height', config.height?.toString() || '')
      formData.append('maintainAspectRatio', config.maintainAspectRatio.toString())
      formData.append('quality', config.quality.toString())
      formData.append('format', config.format)
      formData.append('fit', config.fit)

      const response = await fetch('/api/image-resizer/resize', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to resize image')
      }

      setResizedFile(result.data.resizedFileName)
      
      toast({
        title: "Image Resized",
        description: "Your image has been resized successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resize image'
      setError(errorMessage)
      toast({
        title: "Resize Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsResizing(false)
    }
  }

  const handleDownload = () => {
    if (!resizedFile) return

    const downloadUrl = `/api/image-resizer/download/${resizedFile}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = resizedFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download Started",
      description: "Resized image is being downloaded",
    })
  }

  const handleReset = () => {
    setFile(null)
    setConfig({
      maintainAspectRatio: true,
      quality: 90,
      format: 'jpeg',
      fit: 'cover'
    })
    setResizedFile('')
    setError('')
  }

  const presetSizes = [
    { name: 'Thumbnail', width: 150, height: 150 },
    { name: 'Small', width: 300, height: 300 },
    { name: 'Medium', width: 600, height: 600 },
    { name: 'Large', width: 1200, height: 1200 },
    { name: 'HD', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Image Resizer</h1>
            <p className="text-muted-foreground">
              Resize images while maintaining quality with batch processing
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowConfig(!showConfig)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {showConfig ? 'Hide' : 'Show'} Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!file ? (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer",
                  "hover:border-primary hover:bg-primary/5",
                  isDragActive && "border-primary bg-primary/5 scale-[1.02]",
                  isResizing && "opacity-50 cursor-not-allowed"
                )}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center space-y-4">
                  <div className={cn(
                    "p-4 rounded-full transition-all duration-300",
                    isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
                  )}>
                    {isDragActive ? (
                      <Image className="w-8 h-8" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {isDragActive ? "Drop your image here" : "Upload Image"}
                    </h3>
                    <p className="text-muted-foreground">
                      Drag & drop your image or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supported: JPG, PNG, WebP, AVIF, GIF, TIFF
                    </p>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="lg"
                    disabled={isResizing}
                    type="button"
                  >
                    {isResizing ? "Resizing..." : "Choose Image"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                  <Image className="w-8 h-8 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>

                {/* Image Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium">Preview</h4>
                  <div className="flex justify-center">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="max-w-full h-auto max-h-48 rounded-lg shadow-sm"
                    />
                  </div>
                </div>

                {/* Preset Sizes */}
                <div className="space-y-3">
                  <h4 className="font-medium">Quick Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {presetSizes.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => setConfig(prev => ({ 
                          ...prev, 
                          width: preset.width, 
                          height: preset.height 
                        }))}
                        className="h-auto p-2 flex flex-col items-center space-y-1"
                      >
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.width}×{preset.height}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleResize} 
                  disabled={isResizing}
                  className="w-full"
                >
                  {isResizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resizing...
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4 mr-2" />
                      Resize Image
                    </>
                  )}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration & Result */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration & Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {file && (
              <div className="space-y-4">
                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={config.width || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, width: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={config.height || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, height: parseInt(e.target.value) || undefined }))}
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintainAspectRatio"
                      checked={config.maintainAspectRatio}
                      onChange={(e) => setConfig(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="maintainAspectRatio">Maintain aspect ratio</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quality">Quality: {config.quality}%</Label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={config.quality}
                      onChange={(e) => setConfig(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Output Format</Label>
                    <select
                      id="format"
                      value={config.format}
                      onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="jpeg">JPEG</option>
                      <option value="png">PNG</option>
                      <option value="webp">WebP</option>
                      <option value="avif">AVIF</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Result */}
            {resizedFile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Resize Successful!</p>
                    <p className="text-sm text-green-700">
                      Image resized to {config.width}×{config.height}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Download Resized Image</h4>
                  <Button onClick={handleDownload} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download {resizedFile}
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleReset} className="w-full">
                    Resize Another Image
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Image className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Image Resized</h3>
                <p className="text-muted-foreground">
                  Upload an image and configure settings to start resizing.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <Image className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Quality Preservation</h4>
              <p className="text-sm text-muted-foreground">Maintain image quality during resize</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium">Batch Processing</h4>
              <p className="text-sm text-muted-foreground">Process multiple images at once</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Multiple Formats</h4>
              <p className="text-sm text-muted-foreground">Support for various image formats</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-medium">Preset Templates</h4>
              <p className="text-sm text-muted-foreground">Quick size presets for common needs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

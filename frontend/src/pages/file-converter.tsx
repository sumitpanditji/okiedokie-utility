import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  ArrowLeft,
  Upload,
  Download,
  FileText,
  XCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'

interface FileConverterConfig {
  inputFormat: string
  outputFormat: string
  quality?: number
  compression?: number
}

export function FileConverter() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [file, setFile] = useState<File | null>(null)
  const [config, setConfig] = useState<FileConverterConfig>({
    inputFormat: '',
    outputFormat: '',
    quality: 90
  })
  const [isConverting, setIsConverting] = useState(false)
  const [convertedFile, setConvertedFile] = useState<string>('')
  const [error, setError] = useState<string>('')

  const supportedFormats = [
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'doc', label: 'DOC', icon: '📝' },
    { value: 'docx', label: 'DOCX', icon: '📝' },
    { value: 'txt', label: 'TXT', icon: '📄' },
    { value: 'rtf', label: 'RTF', icon: '📄' },
    { value: 'odt', label: 'ODT', icon: '📝' }
  ]

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'application/vnd.oasis.opendocument.text': ['.odt']
    },
    multiple: false,
    disabled: isConverting
  })

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError('')
    
    // Auto-detect input format
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (extension) {
      setConfig(prev => ({ ...prev, inputFormat: extension }))
    }
  }

  const handleConvert = async () => {
    if (!file) return

    setIsConverting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('outputFormat', config.outputFormat)
      formData.append('quality', config.quality?.toString() || '90')

      const response = await fetch('/api/file-converter/convert', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to convert file')
      }

      setConvertedFile(result.data.convertedFileName)
      
      toast({
        title: "File Converted",
        description: "Your file has been converted successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert file'
      setError(errorMessage)
      toast({
        title: "Conversion Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
    }
  }

  const handleDownload = () => {
    if (!convertedFile) return

    const downloadUrl = `/api/file-converter/download/${convertedFile}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = convertedFile
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Download Started",
      description: "Converted file is being downloaded",
    })
  }

  const handleReset = () => {
    setFile(null)
    setConfig({
      inputFormat: '',
      outputFormat: '',
      quality: 90
    })
    setConvertedFile('')
    setError('')
  }

  const getFileIcon = (format: string) => {
    const formatInfo = supportedFormats.find(f => f.value === format)
    return formatInfo?.icon || '📄'
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
            <h1 className="text-3xl font-bold">File Converter</h1>
            <p className="text-muted-foreground">
              Convert between various file formats with high quality output
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!file ? (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer",
                  "hover:border-primary hover:bg-primary/5",
                  isDragActive && "border-primary bg-primary/5 scale-[1.02]",
                  isConverting && "opacity-50 cursor-not-allowed"
                )}
              >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center space-y-4">
                  <div className={cn(
                    "p-4 rounded-full transition-all duration-300",
                    isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
                  )}>
                    {isDragActive ? (
                      <FileText className="w-8 h-8" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {isDragActive ? "Drop your file here" : "Upload File"}
                    </h3>
                    <p className="text-muted-foreground">
                      Drag & drop your file or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supported: PDF, DOC, DOCX, TXT, RTF, ODT
                    </p>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    size="lg"
                    disabled={isConverting}
                    type="button"
                  >
                    {isConverting ? "Converting..." : "Choose File"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
                  <span className="text-2xl">{getFileIcon(config.inputFormat)}</span>
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)} • {config.inputFormat.toUpperCase()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>

                {/* Output Format Selection */}
                <div className="space-y-3">
                  <h4 className="font-medium">Convert to:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {supportedFormats
                      .filter(format => format.value !== config.inputFormat)
                      .map((format) => (
                        <Button
                          key={format.value}
                          variant={config.outputFormat === format.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setConfig(prev => ({ ...prev, outputFormat: format.value }))}
                          className="h-auto p-3 flex flex-col items-center space-y-1"
                        >
                          <span className="text-lg">{format.icon}</span>
                          <span className="text-xs">{format.label}</span>
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Quality Setting */}
                {config.outputFormat && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Quality: {config.quality}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={config.quality}
                      onChange={(e) => setConfig(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                )}

                <Button 
                  onClick={handleConvert} 
                  disabled={isConverting || !config.outputFormat}
                  className="w-full"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Convert File
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

        {/* Conversion Result */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Result</CardTitle>
          </CardHeader>
          <CardContent>
            {convertedFile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Conversion Successful!</p>
                    <p className="text-sm text-green-700">
                      File converted to {config.outputFormat.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Download Converted File</h4>
                  <Button onClick={handleDownload} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download {convertedFile}
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleReset} className="w-full">
                    Convert Another File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RefreshCw className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No File Converted</h3>
                <p className="text-muted-foreground">
                  Upload a file and select output format to start conversion.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {supportedFormats.map((format) => (
              <div key={format.value} className="text-center space-y-2">
                <div className="text-3xl">{format.icon}</div>
                <div>
                  <p className="font-medium">{format.label}</p>
                  <Badge variant="outline" className="text-xs">
                    {format.value.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn, formatBytes } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import { io, Socket } from 'socket.io-client'

interface ProcessingResult {
  regNo: string
  column: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  filePath?: string
  fileName?: string
  fileSize?: number
}

interface ProcessingConfig {
  maxConcurrent: number
  timeout: number
  autoOrganize: boolean
}

export function DocumentFetcher() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [socket, setSocket] = useState<Socket | null>(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [validRows, setValidRows] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<ProcessingConfig>({
    maxConcurrent: 20,
    timeout: 30,
    autoOrganize: true
  })
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [isZipReady, setIsZipReady] = useState(false)

  // Socket.IO connection
  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id)
      setSocketConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason)
      setSocketConnected(false)
    })

    newSocket.on('document-fetcher:start', (data) => {
      console.log('🎯 Processing started:', data)
      setJobId(data.jobId)
      setTotal(data.downloadTasks || data.totalRecords)
      setIsProcessing(true)
      setError('')
      setResults([])
      setCurrent(0)
      setProgress(0)
    })

    newSocket.on('document-fetcher:progress', (data) => {
      console.log('📈 Processing progress:', data)
      setCurrent(data.current)
      setTotal(data.total)
      setProgress(Math.min(data.progress || (data.current / data.total) * 100, 100))
      
      if (data.result) {
        setResults(prev => [...prev, data.result])
      }
    })

    newSocket.on('document-fetcher:complete', (data) => {
      console.log('✅ Processing complete:', data)
      setIsProcessing(false)
      setProgress(100)
      setCurrent(data.totalProcessed || data.total)
      setIsZipReady(true)
      
      toast({
        title: "Processing Complete",
        description: `Successfully processed ${data.totalProcessed} documents`,
      })
    })

    newSocket.on('document-fetcher:error', (data) => {
      console.log('❌ Processing error:', data)
      setError(data.error)
      setIsProcessing(false)
      
      toast({
        title: "Processing Error",
        description: data.error,
        variant: "destructive",
      })
    })

    return () => {
      newSocket.close()
      setSocket(null)
      setSocketConnected(false)
    }
  }, [toast])

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled: isLoading
  })

  const handleFileSelect = async (selectedFile: File) => {
    setIsLoading(true)
    setError('')
    setFile(selectedFile)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/document-fetcher/parse-excel', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse Excel file')
      }

      setData(result.data.records)
      setColumns(result.data.columns)
      setTotal(result.data.totalRows)
      setValidRows(result.data.validRows)
      
      toast({
        title: "File Parsed Successfully",
        description: `Found ${result.data.validRows} valid records with ${result.data.columns.length} columns`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse file'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!data.length) return

    // Check if socket is connected
    if (!socket || !socketConnected) {
      setError('Socket.IO not connected. Please wait a moment and try again.')
      toast({
        title: "Connection Error",
        description: "Socket.IO not connected. Please wait a moment and try again.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/document-fetcher/process-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          config
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to start processing')
      }

      setJobId(result.data.jobId)
      
      toast({
        title: "Processing Started",
        description: `Job ID: ${result.data.jobId}`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing'
      setError(errorMessage)
      setIsProcessing(false)
      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDownloadZip = async () => {
    if (!jobId) return

    try {
      const downloadUrl = `/api/document-fetcher/download/${jobId}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `documents_${jobId}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Download Started",
        description: "Your ZIP file is being downloaded",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download ZIP file",
        variant: "destructive",
      })
    }
  }

  const handleReset = () => {
    setFile(null)
    setData([])
    setColumns([])
    setTotal(0)
    setValidRows(0)
    setError('')
    setIsProcessing(false)
    setProgress(0)
    setCurrent(0)
    setTotal(0)
    setResults([])
    setJobId(null)
    setIsZipReady(false)
  }

  const getStatusIcon = (status: ProcessingResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: ProcessingResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="success" className="text-xs">Success</Badge>
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>
      case 'skipped':
        return <Badge variant="secondary" className="text-xs">Skipped</Badge>
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const skippedCount = results.filter(r => r.status === 'skipped').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">Document Link Fetcher</h1>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  socketConnected ? "bg-green-500" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  socketConnected ? "text-green-600" : "text-red-600"
                )}>
                  {socketConnected ? "Connected" : "Connecting..."}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Batch download documents from Google Drive links in Excel files
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

      {/* Configuration Panel */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxConcurrent">Max Concurrent Downloads</Label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxConcurrent}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxConcurrent: parseInt(e.target.value) || 20 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Download Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min="10"
                  max="120"
                  value={config.timeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      {!file && (
        <Card>
          <CardContent className="p-8">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 cursor-pointer",
                "hover:border-primary hover:bg-primary/5",
                isDragActive && "border-primary bg-primary/5 scale-[1.02]",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center space-y-4">
                <div className={cn(
                  "p-4 rounded-full transition-all duration-300",
                  isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
                )}>
                  {isDragActive ? (
                    <FileSpreadsheet className="w-8 h-8" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {isDragActive ? "Drop your Excel file here" : "Upload Excel File"}
                  </h3>
                  <p className="text-muted-foreground">
                    Drag & drop your Excel file (.xlsx, .xls) or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    File should contain: Registration numbers and Google Drive links
                  </p>
                </div>
                
                <Button 
                  variant="secondary" 
                  size="lg"
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? "Processing..." : "Choose File"}
                </Button>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Preview */}
      {file && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>File Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(file.size)} • {validRows} valid rows • {columns.length} columns
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button 
                  onClick={handleProcess} 
                  disabled={!data.length || !socketConnected}
                  title={!socketConnected ? "Waiting for Socket.IO connection..." : ""}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {!socketConnected ? "Connecting..." : "Process Documents"}
                </Button>
              </div>
            </div>

            {data.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Sample Data:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(data.slice(0, 2), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-center text-sm text-muted-foreground">
                {current} of {total} documents processed
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-green-700">Success</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
                <div className="text-sm text-yellow-700">Skipped</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.regNo}</p>
                      <p className="text-sm text-muted-foreground">{result.column}</p>
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download ZIP */}
      {isZipReady && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Processing Complete!</h3>
                <p className="text-muted-foreground">
                  {successCount} documents were successfully downloaded and organized.
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={handleReset}>
                  Process Another File
                </Button>
                <Button onClick={handleDownloadZip}>
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

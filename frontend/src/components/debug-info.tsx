import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { API_CONFIG, buildApiUrl } from '@/config/api'

export function DebugInfo() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [backendUrl, setBackendUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setBackendUrl(API_CONFIG.BASE_URL)
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    setBackendStatus('checking')
    setError('')
    
    try {
      const healthUrl = buildApiUrl('/api/health')
      console.log('Checking backend health at:', healthUrl)
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Backend health response:', data)
        setBackendStatus('online')
      } else {
        console.error('Backend health check failed:', response.status, response.statusText)
        setBackendStatus('offline')
        setError(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Backend health check error:', err)
      setBackendStatus('offline')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const getStatusIcon = () => {
    switch (backendStatus) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusBadge = () => {
    switch (backendStatus) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>
      case 'online':
        return <Badge variant="default" className="bg-green-500">Backend Online</Badge>
      case 'offline':
        return <Badge variant="destructive">Backend Offline</Badge>
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Backend Connection Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Configuration:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Backend URL:</strong> 
              <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                {backendUrl || 'Not configured'}
              </code>
            </div>
            <div>
              <strong>Environment:</strong> 
              <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                {import.meta.env.DEV ? 'Development' : 'Production'}
              </code>
            </div>
            <div>
              <strong>VITE_API_URL:</strong> 
              <code className="ml-2 bg-gray-100 px-2 py-1 rounded">
                {import.meta.env.VITE_API_URL || 'Not set'}
              </code>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Status:</h4>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkBackendHealth}
              disabled={backendStatus === 'checking'}
            >
              Retry
            </Button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">Test URLs:</h4>
          <div className="space-y-1 text-sm">
            <div>
              <strong>Health Check:</strong>{' '}
              <a 
                href={buildApiUrl('/api/health')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {buildApiUrl('/api/health')}
              </a>
            </div>
            <div>
              <strong>QR Code API:</strong>{' '}
              <a 
                href={buildApiUrl('/api/qr-code/generate')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {buildApiUrl('/api/qr-code/generate')}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

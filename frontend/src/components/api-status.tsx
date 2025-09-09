import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ApiStatusProps {
  className?: string
}

export function ApiStatus({ className }: ApiStatusProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          setStatus('online')
        } else {
          setStatus('offline')
        }
      } catch (error) {
        setStatus('offline')
      }
    }

    checkApiHealth()
    
    // Check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-3 h-3 animate-spin" />
      case 'online':
        return <CheckCircle className="w-3 h-3" />
      case 'offline':
        return <XCircle className="w-3 h-3" />
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'checking':
        return (
          <Badge variant="secondary" className="text-xs">
            {getStatusIcon()}
            <span className="ml-1">Checking...</span>
          </Badge>
        )
      case 'online':
        return (
          <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
            {getStatusIcon()}
            <span className="ml-1">API Online</span>
          </Badge>
        )
      case 'offline':
        return (
          <Badge variant="destructive" className="text-xs">
            {getStatusIcon()}
            <span className="ml-1">API Offline</span>
          </Badge>
        )
    }
  }

  return (
    <div className={className}>
      {getStatusBadge()}
    </div>
  )
}

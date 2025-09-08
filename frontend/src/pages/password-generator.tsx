import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Key, 
  ArrowLeft,
  Copy,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { copyToClipboard } from '@/lib/utils'

interface PasswordConfig {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeSimilar: boolean
  excludeAmbiguous: boolean
  count: number
}

export function PasswordGenerator() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [config, setConfig] = useState<PasswordConfig>({
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
    count: 1
  })
  
  const [passwords, setPasswords] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/password-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate password')
      }

      setPasswords([result.data.password])
      
      toast({
        title: "Password Generated",
        description: "Your secure password has been generated",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate password'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (password: string, index: number) => {
    try {
      await copyToClipboard(password)
      setCopiedIndex(index)
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
      })
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy password",
        variant: "destructive",
      })
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
            <h1 className="text-3xl font-bold">Password Generator</h1>
            <p className="text-muted-foreground">
              Generate secure passwords with customizable criteria
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Password Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Length */}
            <div className="space-y-2">
              <Label htmlFor="length">Password Length: {config.length}</Label>
              <Input
                id="length"
                type="range"
                min="4"
                max="128"
                value={config.length}
                onChange={(e) => setConfig(prev => ({ ...prev, length: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Character Types */}
            <div className="space-y-4">
              <Label>Character Types</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="uppercase"
                    checked={config.includeUppercase}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeUppercase: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="uppercase">Uppercase letters (A-Z)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="lowercase"
                    checked={config.includeLowercase}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeLowercase: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="lowercase">Lowercase letters (a-z)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="numbers"
                    checked={config.includeNumbers}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeNumbers: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="numbers">Numbers (0-9)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="symbols"
                    checked={config.includeSymbols}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeSymbols: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="symbols">Symbols (!@#$%^&*)</Label>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <Label>Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="excludeSimilar"
                    checked={config.excludeSimilar}
                    onChange={(e) => setConfig(prev => ({ ...prev, excludeSimilar: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="excludeSimilar">Exclude similar characters (il1Lo0O)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="excludeAmbiguous"
                    checked={config.excludeAmbiguous}
                    onChange={(e) => setConfig(prev => ({ ...prev, excludeAmbiguous: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="excludeAmbiguous">Exclude ambiguous characters (&#123; &#125; &#91; &#93; &#40; &#41; &#47; &#92; &#126; &#44; &#59; &#46; &#60; &#62;)</Label>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || (!config.includeUppercase && !config.includeLowercase && !config.includeNumbers && !config.includeSymbols)}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Generate Password
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Passwords */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Passwords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwords.length > 0 ? (
              <div className="space-y-4">
                {passwords.map((password, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={password} 
                        readOnly 
                        className="flex-1 font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleCopy(password, index)}
                      >
                        {copiedIndex === index ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Length: {password.length}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Entropy: {Math.log2(Math.pow(94, password.length)).toFixed(1)} bits
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Key className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Password Generated</h3>
                <p className="text-muted-foreground">
                  Configure your settings and click "Generate Password" to create one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Password Security Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Strong Password Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use at least 12 characters</li>
                <li>• Include uppercase and lowercase letters</li>
                <li>• Include numbers and symbols</li>
                <li>• Avoid common words or patterns</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use unique passwords for each account</li>
                <li>• Consider using a password manager</li>
                <li>• Enable two-factor authentication</li>
                <li>• Regularly update your passwords</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

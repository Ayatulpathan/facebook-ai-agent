import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('adminpassword123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await api.login(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050811] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white">Local Admin Access</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Privacy-First Facebook Page AI Automation System
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Input
                label="Admin Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
              isLoading={isLoading}
            >
              Sign In to Local Dashboard
            </Button>
          </form>

          {/* Local environment note & default credentials reminder */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-[11px] text-slate-400 font-medium">
              🔒 Bound to localhost (127.0.0.1) • Zero Cloud API Costs
            </p>
            <div className="p-2 rounded bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400">
              Default admin: <span className="text-blue-400 font-mono">admin</span> | Password: <span className="text-blue-400 font-mono">adminpassword123</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

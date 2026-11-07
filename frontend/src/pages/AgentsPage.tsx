import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  Cpu,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Play,
  Clock,
  ShieldCheck,
  Check,
  HardDrive
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const AgentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [testTopic, setTestTopic] = useState('How AI simplifies local business workflows')
  const [testLanguage, setTestLanguage] = useState('both')
  const [testOutput, setTestOutput] = useState<any>(null)

  const { data: status, refetch: refetchStatus, isFetching: statusFetching } = useQuery({
    queryKey: ['agentsStatus'],
    queryFn: () => api.getAgentsStatus(),
    refetchInterval: 12000
  })

  const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ['agentRuns'],
    queryFn: () => api.getAgentRuns(15),
    refetchInterval: 15000
  })

  // Switch Model mutation
  const switchMutation = useMutation({
    mutationFn: (modelName: string) => api.switchModel(modelName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentsStatus'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  // Playground test post generation
  const testMutation = useMutation({
    mutationFn: () => api.generatePost({
      topic: testTopic,
      language: testLanguage,
      post_type: 'promotional',
      save_as_draft: false
    }),
    onSuccess: (data) => {
      setTestOutput(data)
      refetchRuns()
    }
  })

  const isOnline = status?.connection?.status === 'online'
  const activeModel = status?.active_model || 'qwen2.5:1.5b'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-blue-500" />
            AI Agent Master Orchestrator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control the 11 local AI agents running on Ollama with strict memory caps and zero cloud costs.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetchStatus(); refetchRuns(); }}
          disabled={statusFetching}
          className="border-slate-800 bg-slate-900/80 text-xs text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${statusFetching ? 'animate-spin' : ''}`} />
          Check Ollama
        </Button>
      </div>

      {/* Top Status & Hardware Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Engine Status */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Ollama Daemon (127.0.0.1:11434)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs py-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connection State:</span>
              <Badge variant={isOnline ? 'success' : 'warning'}>
                {isOnline ? 'Online (Local)' : 'Offline / Standby'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Context Window Cap:</span>
              <span className="font-mono text-slate-200">2048 tokens</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Zero-Cost Policy:</span>
              <Badge variant="success">Strictly Enforced</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Model Switcher */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Active Local Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMutation.mutate('qwen2.5:1.5b')}
                disabled={switchMutation.isPending}
                className={`p-2 rounded-lg border text-left transition-all ${
                  activeModel.includes('1.5b')
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>qwen2.5:1.5b</span>
                  {activeModel.includes('1.5b') && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Default (~1.2 GB VRAM)</p>
              </button>

              <button
                type="button"
                onClick={() => switchMutation.mutate('qwen2.5:0.5b')}
                disabled={switchMutation.isPending}
                className={`p-2 rounded-lg border text-left transition-all ${
                  activeModel.includes('0.5b')
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>qwen2.5:0.5b</span>
                  {activeModel.includes('0.5b') && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Ultra-Light (~350 MB)</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Hardware Budget & Safety */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Hardware Compatibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-[11px] text-slate-400 py-2">
            <p>• Optimized for 8 GB RAM / 4 GB GPU</p>
            <p>• Single-model execution prevents memory spikes</p>
            <p>• Automatic fallback guarantees zero service crash</p>
          </CardContent>
        </Card>
      </div>

      {/* Offline Instructions Banner if Ollama is not running */}
      {!isOnline && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            Local Ollama Engine Notice (Fallback Mode Active)
          </div>
          <p className="text-slate-300 leading-relaxed">
            The local Ollama daemon is currently not running at <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">127.0.0.1:11434</code>. 
            The system is using local deterministic template generators. To activate full generative neural intelligence:
          </p>
          <div className="p-2.5 rounded bg-slate-950/80 font-mono text-[11px] text-emerald-400 border border-slate-800">
            1. Open PowerShell &gt; Run: <span className="text-white">ollama run qwen2.5:1.5b</span><br />
            2. Return here & click "Check Ollama"
          </div>
        </div>
      )}

      {/* Interactive Agent Test Playground */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Writing Agent & Quality Control Playground
          </CardTitle>
          <CardDescription className="text-xs">
            Test prompt generation in Bangla & English with live anti-hallucination and boundary checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Topic or Offer Concept"
                value={testTopic}
                onChange={(e) => setTestTopic(e.target.value)}
                placeholder="e.g. 3 Quick Windows productivity hacks"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                Output Language
              </label>
              <select
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both (Bangla & English)</option>
                <option value="bn">Bangla (বাংলা) Only</option>
                <option value="en">English Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => testMutation.mutate()}
              isLoading={testMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Generate Post with Quality Check
            </Button>
          </div>

          {/* Test Generation Results */}
          {testOutput && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-semibold text-sm text-white">{testOutput.title}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={testOutput.quality_check?.passed ? 'success' : 'warning'}>
                    QC Score: {testOutput.quality_check?.score * 100}%
                  </Badge>
                  {testOutput.is_offline_fallback && (
                    <Badge variant="outline">Template Fallback</Badge>
                  )}
                </div>
              </div>

              {testOutput.caption_bn && (
                <div>
                  <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                    Bangla Caption (বাংলা):
                  </p>
                  <p className="text-xs text-slate-200 whitespace-pre-line bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                    {testOutput.caption_bn}
                  </p>
                </div>
              )}

              {testOutput.caption_en && (
                <div>
                  <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                    English Caption:
                  </p>
                  <p className="text-xs text-slate-200 whitespace-pre-line bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                    {testOutput.caption_en}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="text-slate-400 font-semibold">Hashtags: </span>
                  <span className="text-blue-400">{testOutput.hashtags}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Call to Action: </span>
                  <span className="text-emerald-400">{testOutput.call_to_action}</span>
                </div>
              </div>

              {/* Quality check notes */}
              {testOutput.quality_check && (
                <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400">
                  <p className="font-semibold text-slate-300">Quality Control Audit:</p>
                  <p>{testOutput.quality_check.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Run Telemetry Log Table */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Agent Run Telemetry
          </CardTitle>
          <CardDescription className="text-xs">
            Latency, token consumption, and status of recent local agent tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {runsLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading telemetry history...</div>
          ) : runs && runs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">Model</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Tokens (P/O)</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {runs.map((run: any) => (
                    <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-200">{run.agent_name}</td>
                      <td className="px-6 py-3 font-mono text-slate-400 text-[11px]">{run.model_used}</td>
                      <td className="px-6 py-3 font-mono text-slate-300">{run.duration_ms} ms</td>
                      <td className="px-6 py-3 font-mono text-slate-400 text-[11px]">
                        {run.prompt_tokens} / {run.output_tokens}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={run.status === 'success' ? 'success' : 'info'}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(run.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No local agent runs logged yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

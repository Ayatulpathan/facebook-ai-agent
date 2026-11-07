import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Database,
  ShieldAlert,
  Server,
  HardDrive,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Terminal,
  RefreshCw,
  Lock,
  PauseCircle,
  PlayCircle
} from 'lucide-react'
import { api, SystemSettings, BackupItem } from '../services/api'
import { Button } from '../components/ui/Button'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [copiedScript, setCopiedScript] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Fetch settings
  const { data: sysSettings } = useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: () => api.getSystemSettings()
  })

  // Fetch backups
  const { data: backups = [], isLoading: isBackupsLoading } = useQuery<BackupItem[]>({
    queryKey: ['systemBackups'],
    queryFn: () => api.getBackups()
  })

  // Global pause mutation
  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) => api.setGlobalPause(paused),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setFeedback({
        text: data ? 'Emergency Global Pause activated. All operations halted.' : 'Global Pause deactivated. Scheduled tasks resumed.',
        type: data ? 'error' : 'success'
      })
      setTimeout(() => setFeedback(null), 4000)
    }
  })

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: () => api.createBackup(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemBackups'] })
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] })
      setFeedback({ text: `Backup ${data.filename} created successfully.`, type: 'success' })
      setTimeout(() => setFeedback(null), 4000)
    }
  })

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (filename: string) => api.restoreBackup(filename),
    onSuccess: () => {
      queryClient.invalidateQueries()
      setFeedback({ text: 'Database restored successfully from backup.', type: 'success' })
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: any) => {
      setFeedback({ text: err.message || 'Failed to restore database.', type: 'error' })
    }
  })

  const handleCopyScript = () => {
    if (sysSettings?.scheduler_instructions.powershell_command) {
      navigator.clipboard.writeText(sysSettings.scheduler_instructions.powershell_command)
      setCopiedScript(true)
      setTimeout(() => setCopiedScript(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-blue-600" />
          Settings, Backups & Automation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Zero-cost local configuration, automated SQLite backups, Windows Task Scheduler scripts, and emergency kill-switches.
        </p>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          <ShieldAlert className="h-4 w-4" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Emergency Global Pause Card */}
      <div className={`p-6 rounded-2xl border transition-all ${
        sysSettings?.global_pause
          ? 'bg-rose-50/60 border-rose-300 dark:bg-rose-950/20 dark:border-rose-900'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-xl ${sysSettings?.global_pause ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Emergency Global Pause Kill-Switch
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                When activated, all automated background actions, publishing queue jobs, and outgoing Messenger/comment replies are instantly blocked.
              </p>
            </div>
          </div>

          <Button
            variant={sysSettings?.global_pause ? 'danger' : 'outline'}
            onClick={() => pauseMutation.mutate(!sysSettings?.global_pause)}
            isLoading={pauseMutation.isPending}
            className="flex items-center space-x-2"
          >
            {sysSettings?.global_pause ? (
              <>
                <PlayCircle className="h-4 w-4" />
                <span>Resume Operations</span>
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4 text-rose-600" />
                <span>Activate Global Pause</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* System Infrastructure Telemetry */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Server className="h-5 w-5 text-blue-600" />
          <span>Local System Environment & Privacy Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium">Local Database Path (WAL Mode)</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
              {sysSettings?.database_path}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium">Ollama AI Daemon Binding</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
              {sysSettings?.ollama_base_url} ({sysSettings?.default_model})
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium">Backup Storage Directory</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 truncate">
              {sysSettings?.backup_dir}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium">Zero-Cost Compliance</span>
            <div className="font-semibold text-emerald-600 flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Strict localhost isolation • 0 Paid Cloud Dependencies</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automated SQLite Backups Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Database className="h-5 w-5 text-indigo-600" />
              <span>ACID SQLite Database Backups</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Online non-blocking hot backups. Can be restored instantly with zero data loss.
            </p>
          </div>

          <Button
            onClick={() => createBackupMutation.mutate()}
            isLoading={createBackupMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Backup Now</span>
          </Button>
        </div>

        {isBackupsLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-xl">
            No backups created yet. Click "Create Backup Now" to create your first backup.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            {backups.map((b) => (
              <div key={b.filename} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className="flex items-center space-x-3 truncate">
                  <HardDrive className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="font-mono font-bold text-slate-900 dark:text-white block truncate">
                      {b.filename}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {b.size_kb} KB • {new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Restore database from ${b.filename}? Current state will be replaced with this backup.`)) {
                      restoreBackupMutation.mutate(b.filename)
                    }
                  }}
                  isLoading={restoreBackupMutation.isPending}
                  className="flex items-center space-x-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Windows Task Scheduler Setup Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-400">
            <Terminal className="h-5 w-5" />
            <h3 className="font-bold text-white text-base">Windows Task Scheduler Automated Setup</h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyScript}
            className="text-white border-slate-700 hover:bg-slate-800 flex items-center space-x-1.5 text-xs"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedScript ? 'Copied Script!' : 'Copy PowerShell Command'}</span>
          </Button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          To run automated daily backups at 3:00 AM completely free without any third-party background services,
          open Windows PowerShell as Administrator and run the command below:
        </p>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
          {sysSettings?.scheduler_instructions.powershell_command}
        </pre>

        <span className="text-[11px] text-slate-400 block">
          * {sysSettings?.scheduler_instructions.zero_cost_note}
        </span>
      </div>
    </div>
  )
}

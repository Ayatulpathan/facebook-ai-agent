import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

export const AuditLogsPage: React.FC = () => {
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => api.getAuditLogs(100),
    refetchInterval: 15000
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
            Security & System Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically timestamped, tamper-evident record of all administrative decisions, logins, and automated changes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-slate-800 bg-slate-900/80 text-xs text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </div>

      {/* Logs Table Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold">Immutable Event Stream</CardTitle>
          <CardDescription className="text-xs">
            Showing the latest administrative and security events recorded locally in SQLite.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading audit trail...</div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Entity</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Details</th>
                    <th className="px-6 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            log.action.includes('FAILED')
                              ? 'danger'
                              : log.action.includes('SUCCESS') || log.action.includes('CREATE')
                              ? 'success'
                              : log.action.includes('PAUSE')
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-200">
                        {log.entity}
                        {log.entity_id ? ` #${log.entity_id}` : ''}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-300 font-medium">
                        {log.actor}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300 max-w-xs truncate" title={log.details}>
                        {log.details || '-'}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No audit log entries recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

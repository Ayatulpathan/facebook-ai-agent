import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  RefreshCw,
  Filter
} from 'lucide-react'
import { api, NotificationItem } from '../services/api'
import { Button } from '../components/ui/Button'

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [unreadOnly, setUnreadOnly] = useState(false)

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.getNotifications(unreadOnly)
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-500" />
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getSeverityBorder = (sev: string, isRead: boolean) => {
    if (isRead) return 'border-slate-200 dark:border-slate-800'
    switch (sev) {
      case 'warning':
        return 'border-amber-300 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10'
      case 'error':
        return 'border-rose-300 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/10'
      case 'success':
        return 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10'
      default:
        return 'border-blue-300 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/10'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-blue-600" />
            Notifications & System Alerts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time reminders for pending human approvals, delayed posts, token warnings, and security events.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex items-center space-x-2 text-xs ${unreadOnly ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40' : ''}`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{unreadOnly ? 'Showing Unread' : 'All Alerts'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
            className="flex items-center space-x-2 text-xs"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All Read</span>
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Bell className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {unreadOnly ? 'No unread notifications' : 'No notifications found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You're all caught up! New approval requests or system warnings will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 shadow-sm ${getSeverityBorder(
                n.severity,
                n.is_read
              )}`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="mt-0.5 flex-shrink-0">
                  {getSeverityIcon(n.severity)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {n.title}
                    </h3>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    {n.message}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                    <span>
                      {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    {n.link && (
                      <Link
                        to={n.link}
                        className="text-blue-600 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <span>Open Details</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => markReadMutation.mutate(n.id)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors whitespace-nowrap px-2 py-1"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

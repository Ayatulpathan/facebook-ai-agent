import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Clock,
  Layers,
  Calendar as CalendarIcon,
  Pencil,
  CheckCircle2
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [rescheduleItem, setRescheduleItem] = useState<any>(null)
  const [newScheduleTime, setNewScheduleTime] = useState<string>('')
  const [notice, setNotice] = useState<string | null>(null)

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => api.getCalendarEvents()
  })

  const rescheduleMutation = useMutation({
    mutationFn: () => api.reschedulePost(rescheduleItem.id, new Date(newScheduleTime).toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setRescheduleItem(null)
      setNotice("Post rescheduled successfully.")
      setTimeout(() => setNotice(null), 3500)
    }
  })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Published':
        return 'success'
      case 'Pending Approval':
      case 'Quality Check':
        return 'warning'
      case 'Failed':
      case 'Rejected':
        return 'danger'
      case 'Scheduled':
      case 'Publishing':
        return 'info'
      default:
        return 'outline'
    }
  }

  const handleOpenReschedule = (item: any) => {
    setRescheduleItem(item)
    if (item.scheduled_for) {
      const dt = new Date(item.scheduled_for)
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setNewScheduleTime(localIso)
    } else {
      setNewScheduleTime('')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-500" />
            Content Publishing Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize scheduled social campaigns across your local time zone with 11-stage workflow tracking.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Monthly Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Timeline Schedule
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Events List / Timeline */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading calendar events...</div>
      ) : events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((item: any) => {
            const dateObj = new Date(item.scheduled_for)
            return (
              <Card key={item.id} className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 shrink-0">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.title}</span>
                        <Badge variant={getStatusBadgeVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          {item.niche}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReschedule(item)}
                      className="text-xs border-slate-700 text-slate-300 hover:text-white"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Reschedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed border-slate-800 py-16 text-center bg-slate-950/30">
          <CalendarDays className="w-12 h-12 mx-auto text-slate-600 mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-white">No Scheduled Posts Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Schedule posts from the AI Content Studio to visualize your upcoming social pipeline here.
          </p>
        </Card>
      )}

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <Modal
          isOpen={Boolean(rescheduleItem)}
          onClose={() => setRescheduleItem(null)}
          title={`Reschedule Post: ${rescheduleItem.title}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="New Publishing Date & Time (Local Computer Time)"
              type="datetime-local"
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={rescheduleMutation.isPending}
                disabled={!newScheduleTime}
                onClick={() => rescheduleMutation.mutate()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

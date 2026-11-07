import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Layers,
  RotateCcw,
  Trash2,
  Pencil,
  Check
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Textarea } from '../components/ui/Input'

export const ApprovalCenterPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'queue' | 'history'>('pending')
  
  // Modals state
  const [approveItem, setApproveItem] = useState<any>(null)
  const [approveNote, setApproveNote] = useState<string>('All anti-hallucination and brand guidelines verified.')
  const [rejectItem, setRejectItem] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState<string>('')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // 1. Pending Approvals Query
  const { data: pendingItems, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: () => api.getPendingApprovals(),
    refetchInterval: 10000
  })

  // 2. Queue Query
  const { data: queueItems, isLoading: queueLoading } = useQuery({
    queryKey: ['publishingQueue'],
    queryFn: () => api.getPublishingQueue(),
    refetchInterval: 10000
  })

  // 3. History Query
  const { data: historyItems, isLoading: historyLoading } = useQuery({
    queryKey: ['approvalHistory'],
    queryFn: () => api.getApprovalHistory(50),
    refetchInterval: 15000
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => api.approveContent(approveItem.content_id, approveItem.version_num, approveNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['publishingQueue'] })
      queryClient.invalidateQueries({ queryKey: ['approvalHistory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setApproveItem(null)
      setActionSuccess("Content post approved! Staged into the local publishing queue.")
      setTimeout(() => setActionSuccess(null), 4000)
    }
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectContent(rejectItem.content_id, rejectItem.version_num, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
      queryClient.invalidateQueries({ queryKey: ['approvalHistory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setRejectItem(null)
      setRejectReason('')
      setActionSuccess("Post rejected. Rejection reason recorded in audit log.")
      setTimeout(() => setActionSuccess(null), 4000)
    }
  })

  const cancelQueueMutation = useMutation({
    mutationFn: (id: number) => api.cancelQueueJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishingQueue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  const retryQueueMutation = useMutation({
    mutationFn: (id: number) => api.retryQueueJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishingQueue'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Approval Center & Human-in-the-Loop Barrier
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            <strong>MANDATORY HUMAN APPROVAL RULE:</strong> AI cannot publish or reply automatically. Only authorized human administrators can approve.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({pendingItems?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Publishing Queue ({queueItems?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Audit History
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="py-16 text-center text-slate-500 text-xs">Loading items awaiting review...</div>
          ) : pendingItems && pendingItems.length > 0 ? (
            pendingItems.map((item: any) => (
              <Card key={item.approval_id} className="border-amber-500/30 bg-slate-900/80 overflow-hidden shadow-lg">
                <CardHeader className="py-3.5 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-white">{item.title}</span>
                      <Badge variant="warning">Awaiting Approval</Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        v{item.version_num}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Niche: <strong>{item.niche}</strong></span>
                      {item.scheduled_for && (
                        <span>Scheduled: {new Date(item.scheduled_for).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Quality Control Audit Pill */}
                  {item.version?.quality_notes && (
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Anti-Hallucination & QC:</strong> {item.version.quality_notes}</span>
                      </div>
                      <Badge variant="success">
                        QC Score: {Math.round(item.version.quality_score * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* Captions Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {item.version?.caption_bn && (
                      <div className="space-y-1">
                        <p className="font-bold text-[11px] text-blue-400 uppercase tracking-wide">
                          Bangla Caption (বাংলা)
                        </p>
                        <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-200 whitespace-pre-line leading-relaxed">
                          {item.version.caption_bn}
                        </p>
                      </div>
                    )}

                    {item.version?.caption_en && (
                      <div className="space-y-1">
                        <p className="font-bold text-[11px] text-blue-400 uppercase tracking-wide">
                          English Caption
                        </p>
                        <p className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-200 whitespace-pre-line leading-relaxed">
                          {item.version.caption_en}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="text-slate-400">
                      <strong>Hashtags:</strong> <span className="text-blue-400">{item.version?.hashtags || '-'}</span>
                    </div>
                    <div className="text-slate-400">
                      <strong>CTA:</strong> <span className="text-emerald-400">{item.version?.call_to_action || '-'}</span>
                    </div>
                  </div>

                  {/* Administrator Action Bar */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                    <Link to="/studio">
                      <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white">
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Edit in Studio
                      </Button>
                    </Link>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setRejectItem(item)}
                      className="text-xs font-semibold px-4"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Reject
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setApproveItem(item)}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-5"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Approve & Enqueue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-slate-800 py-16 text-center bg-slate-950/30">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-white">Pending Approval Queue is Clear</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No content items currently require review. Posts submitted from AI Content Studio will appear here for verification.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: PUBLISHING QUEUE */}
      {activeTab === 'queue' && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">Publishing Execution Queue</CardTitle>
            <CardDescription className="text-xs">
              Approved posts waiting for local background scheduler execution with idempotency protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {queueLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading queue...</div>
            ) : queueItems && queueItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3">Job ID</th>
                      <th className="px-6 py-3">Content Title</th>
                      <th className="px-6 py-3">Approved Ver</th>
                      <th className="px-6 py-3">Scheduled Time</th>
                      <th className="px-6 py-3">State</th>
                      <th className="px-6 py-3">Idempotency Key</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {queueItems.map((job: any) => (
                      <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-slate-400 text-[11px]">#{job.id}</td>
                        <td className="px-6 py-3 font-medium text-slate-200">{job.content_title}</td>
                        <td className="px-6 py-3 font-mono text-blue-400">v{job.approved_version_id}</td>
                        <td className="px-6 py-3 text-slate-300 font-mono text-[11px]">
                          {new Date(job.scheduled_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              job.state === 'PUBLISHED'
                                ? 'success'
                                : job.state === 'QUEUED'
                                ? 'info'
                                : job.state === 'FAILED'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {job.state}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 font-mono text-slate-500 text-[10px] truncate max-w-xs" title={job.idempotency_key}>
                          {job.idempotency_key}
                        </td>
                        <td className="px-6 py-3 flex items-center gap-2">
                          {job.state === 'FAILED' || job.state === 'DELAYED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryQueueMutation.mutate(job.id)}
                              className="h-7 text-xs border-slate-700 text-slate-300"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Retry
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelQueueMutation.mutate(job.id)}
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No active jobs currently in the publishing queue.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: APPROVAL AUDIT HISTORY */}
      {activeTab === 'history' && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold">Approval Decision Audit Log</CardTitle>
            <CardDescription className="text-xs">
              Immutable trail of all human administrator reviews, approvals, rejections, and version invalidations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading audit history...</div>
            ) : historyItems && historyItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3">Timestamp</th>
                      <th className="px-6 py-3">Post Title</th>
                      <th className="px-6 py-3">Ver</th>
                      <th className="px-6 py-3">Decision</th>
                      <th className="px-6 py-3">Reviewer</th>
                      <th className="px-6 py-3">Notes / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {historyItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 font-mono text-slate-400 text-[11px]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-200">{item.content_title}</td>
                        <td className="px-6 py-3 font-mono text-blue-400">v{item.version_num}</td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              item.status === 'APPROVED'
                                ? 'success'
                                : item.status === 'REJECTED'
                                ? 'danger'
                                : item.status === 'INVALIDATED'
                                ? 'warning'
                                : 'outline'
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-300 font-semibold">{item.reviewer}</td>
                        <td className="px-6 py-3 text-slate-400 max-w-sm truncate" title={item.decision_notes}>
                          {item.decision_notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                No historical approval records recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approve Modal */}
      {approveItem && (
        <Modal
          isOpen={Boolean(approveItem)}
          onClose={() => setApproveItem(null)}
          title={`Approve Post: ${approveItem.title}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              You are authorizing <strong>Post #{approveItem.content_id} (Version {approveItem.version_num})</strong> for local automated execution.
            </p>
            <Textarea
              label="Administrator Decision Notes"
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              placeholder="Record approval rationale or compliance note..."
              rows={2}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setApproveItem(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Confirm Approval & Enqueue
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <Modal
          isOpen={Boolean(rejectItem)}
          onClose={() => setRejectItem(null)}
          title={`Reject Post: ${rejectItem.title}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              State the reason for rejecting <strong>Post #{rejectItem.content_id}</strong>. This feedback will be recorded in the audit history.
            </p>
            <Textarea
              label="Rejection Reason & Required Changes"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Tone is too aggressive, price does not match catalog..."
              rows={3}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectItem(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={rejectMutation.isPending}
                disabled={!rejectReason.trim()}
                onClick={() => rejectMutation.mutate()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

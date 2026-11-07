import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Send,
  User,
  ShieldCheck,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react'
import { api, CommentItem } from '../services/api'
import { Button } from '../components/ui/Button'

export const CommentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [editingReply, setEditingReply] = useState<{ [id: number]: string }>({})

  // Fetch comments
  const { data: comments = [], isLoading, isFetching } = useQuery<CommentItem[]>({
    queryKey: ['facebookComments', selectedCategory, selectedStatus, searchQuery],
    queryFn: () => api.getComments(
      selectedCategory === 'all' ? undefined : selectedCategory,
      selectedStatus === 'all' ? undefined : selectedStatus,
      searchQuery || undefined
    )
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api.syncComments(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebookComments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  // Approve & send mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, text }: { id: number; text?: string }) => api.approveCommentReply(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebookComments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.rejectCommentReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebookComments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Price Inquiry':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200'
      case 'Product Inquiry':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200'
      case 'Positive Feedback':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
      case 'Complaint':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200'
      case 'Spam':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300'
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock className="w-3 h-3 mr-1" /> Pending Approval
          </span>
        )
      case 'SENT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Replied & Sent
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageCircle className="h-7 w-7 text-blue-600" />
            Comment Management & Response Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Classify customer comments, draft suggested replies with verified pricing, and require explicit human sign-off before posting.
          </p>
        </div>

        <Button
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending || isFetching}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync from Facebook</span>
        </Button>
      </div>

      {/* Human Gatekeeper Invariant Warning */}
      <div className="bg-blue-50/70 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 rounded-xl p-4 flex items-center space-x-3 text-xs text-blue-900 dark:text-blue-300">
        <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div>
          <span className="font-semibold block">Strict Human Authorization Enforced</span>
          The agent automatically drafts helpful replies and scans for customer leads, but <strong>never</strong> posts replies to Facebook without your manual approval.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Category:</span>
          </div>
          {['all', 'Price Inquiry', 'Product Inquiry', 'General Question', 'Positive Feedback', 'Complaint', 'Spam'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="SENT">Sent</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <div className="relative w-full md:w-64">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search comments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <MessageCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No comments found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Click "Sync from Facebook" to fetch incoming visitor comments from your Page posts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {c.sender_name}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(c.category)}`}>
                    <Tag className="w-3 h-3 inline mr-1" />
                    {c.category}
                  </span>

                  {c.is_lead && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ★ Qualified Lead
                    </span>
                  )}

                  {getStatusBadge(c.reply_status)}
                </div>
              </div>

              {/* Original Comment */}
              <div className="py-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 mt-3 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Visitor Comment:
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  "{c.comment_text}"
                </p>
              </div>

              {/* Proposed Response Section */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Proposed Response</span>
                  </span>
                  {c.reply_status === 'SENT' && (
                    <span className="text-[11px] text-slate-400">
                      Sent at: {c.sent_at ? new Date(c.sent_at).toLocaleTimeString() : ''}
                    </span>
                  )}
                </div>

                {c.reply_status === 'PENDING' ? (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={editingReply[c.id] !== undefined ? editingReply[c.id] : c.suggested_reply}
                      onChange={(e) => setEditingReply({ ...editingReply, [c.id]: e.target.value })}
                      placeholder="Type custom reply or keep suggested reply..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectMutation.mutate(c.id)}
                        isLoading={rejectMutation.isPending}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject Reply
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({
                          id: c.id,
                          text: editingReply[c.id] !== undefined ? editingReply[c.id] : c.suggested_reply
                        })}
                        isLoading={approveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Approve & Post Reply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                    <p className="text-xs text-slate-800 dark:text-slate-200">
                      {c.approved_reply_text || c.suggested_reply}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

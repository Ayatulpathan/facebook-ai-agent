import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react'
import { api, ConversationSummary, ConversationDetail } from '../services/api'
import { Button } from '../components/ui/Button'

export const MessengerPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [editedDraft, setEditedDraft] = useState<string>('')
  const [feedback, setFeedback] = useState<string | null>(null)

  // Fetch conversation list
  const { data: conversations = [], isLoading: isListLoading, isFetching: isListFetching } = useQuery<ConversationSummary[]>({
    queryKey: ['messengerConversations'],
    queryFn: async () => {
      const data = await api.getMessengerConversations()
      if (data.length > 0 && activeConvId === null) {
        setActiveConvId(data[0].id)
      }
      return data
    }
  })

  // Fetch active thread
  const { data: threadData, isLoading: isThreadLoading } = useQuery<ConversationDetail>({
    queryKey: ['messengerThread', activeConvId],
    queryFn: async () => {
      if (!activeConvId) throw new Error('No active conversation')
      const res = await api.getMessengerThread(activeConvId)
      if (res.pending_draft) {
        setEditedDraft(res.pending_draft.suggested_reply)
      } else {
        setEditedDraft('')
      }
      return res
    },
    enabled: !!activeConvId
  })

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api.syncMessenger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messengerConversations'] })
      queryClient.invalidateQueries({ queryKey: ['messengerThread'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setFeedback('Synced latest customer messages.')
      setTimeout(() => setFeedback(null), 3000)
    }
  })

  // Approve draft mutation
  const approveMutation = useMutation({
    mutationFn: ({ draftId, text }: { draftId: number; text?: string }) =>
      api.approveMessengerDraft(draftId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messengerConversations'] })
      queryClient.invalidateQueries({ queryKey: ['messengerThread', activeConvId] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setFeedback('Message approved and sent to customer.')
      setTimeout(() => setFeedback(null), 3000)
    }
  })

  // Reject draft mutation
  const rejectMutation = useMutation({
    mutationFn: (draftId: number) => api.rejectMessengerDraft(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messengerConversations'] })
      queryClient.invalidateQueries({ queryKey: ['messengerThread', activeConvId] })
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
      setFeedback('Suggested response rejected.')
      setTimeout(() => setFeedback(null), 3000)
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquare className="h-7 w-7 text-blue-600" />
            Facebook Messenger Reply Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official Messenger platform integration with zero-hallucination verified price replies and mandatory human approval.
          </p>
        </div>

        <Button
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending || isListFetching}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Messenger</span>
        </Button>
      </div>

      {feedback && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Two-Pane Chat Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[620px]">
        {/* Left Pane: Threads List */}
        <div className="border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Conversations ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isListLoading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active conversations found. Click "Sync Messenger" to retrieve customer messages.
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeConvId === c.id
                      ? 'bg-blue-50/60 dark:bg-blue-950/20 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {c.sender_name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                    {c.latest_message || 'No messages yet'}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    {c.has_pending_approval ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        Reply Pending
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Up to date</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread Transcript & Response Box */}
        <div className="md:col-span-2 flex flex-col justify-between h-[620px]">
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 font-bold">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {threadData?.conversation.sender_name || 'Select a Conversation'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Facebook Messenger Customer
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Human Approval Gate Active</span>
            </div>
          </div>

          {/* Transcript Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20">
            {isThreadLoading ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-blue-600" />
                Loading messages...
              </div>
            ) : !threadData || threadData.messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                No message history available for this thread.
              </div>
            ) : (
              threadData.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender_type === 'page' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      m.sender_type === 'page'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm'
                    }`}
                  >
                    {m.message_text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Proposed Response & Approval Gate */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {threadData?.pending_draft ? (
              <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Proposed AI Reply Draft (Intent: {threadData.pending_draft.detected_intent})</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                    Pending Approval
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  placeholder="Review or edit reply before sending..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    * Reply will only be transmitted after you click Approve.
                  </span>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => threadData.pending_draft && rejectMutation.mutate(threadData.pending_draft.id)}
                      isLoading={rejectMutation.isPending}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject Draft
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => threadData.pending_draft && approveMutation.mutate({
                        draftId: threadData.pending_draft.id,
                        text: editedDraft
                      })}
                      isLoading={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Approve & Send
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-400 flex items-center justify-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>All customer inquiries in this conversation have been reviewed and answered.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Calendar,
  Send,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { api } from '../services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

export const DashboardPage: React.FC = () => {
  const { data: overview, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 10000
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          Loading dashboard metrics...
        </div>
      </div>
    )
  }

  const counts = overview?.post_counts || {
    total_posts: 0,
    draft: 0,
    generating: 0,
    quality_check: 0,
    pending_approval: 0,
    approved: 0,
    scheduled: 0,
    publishing: 0,
    published: 0,
    rejected: 0,
    failed: 0,
    delayed: 0
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section with Refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Command Center</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status of multi-niche content generation, approval gates, and Facebook page activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
          <Link to="/studio">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs font-medium">
              Create New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{overview?.pending_approvals_count ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Requires human review</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Posts */}
        <Card className="border-blue-500/30 bg-blue-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Scheduled Posts</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{counts.scheduled}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Ready in local queue</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Published Posts */}
        <Card className="border-emerald-500/30 bg-emerald-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Published Posts</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{counts.published}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Live on Facebook</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Send className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Messages / Replies */}
        <Card className="border-purple-500/30 bg-purple-950/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Pending Replies</p>
              <h3 className="text-2xl font-extrabold text-white mt-1">{overview?.pending_messages_count ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Messenger AI drafts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <MessageSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Workflow Pipeline Grid (All 11 Statuses) */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Content Lifecycle Pipeline</CardTitle>
              <CardDescription className="text-xs">
                Every piece of content progresses through these strict states before reaching Meta.
              </CardDescription>
            </div>
            <Badge variant="info">Total Posts: {counts.total_posts}</Badge>
          </div>
        </CardHeader>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">1. Draft</p>
              <p className="text-xl font-bold text-white mt-1">{counts.draft}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">2. Generating</p>
              <p className="text-xl font-bold text-blue-400 mt-1">{counts.generating}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">3. Quality Check</p>
              <p className="text-xl font-bold text-indigo-400 mt-1">{counts.quality_check}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-center">
              <p className="text-xs text-amber-300 font-medium">4. Pending Review</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{counts.pending_approval}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-center">
              <p className="text-xs text-emerald-300 font-medium">5. Approved</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{counts.approved}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">6. Scheduled</p>
              <p className="text-xl font-bold text-cyan-400 mt-1">{counts.scheduled}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">7. Publishing</p>
              <p className="text-xl font-bold text-blue-400 mt-1">{counts.publishing}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-center">
              <p className="text-xs text-emerald-400 font-medium">8. Published</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">{counts.published}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">9. Rejected</p>
              <p className="text-xl font-bold text-slate-300 mt-1">{counts.rejected}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-center">
              <p className="text-xs text-red-300 font-medium">10. Failed</p>
              <p className="text-xl font-bold text-red-400 mt-1">{counts.failed}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-950/30 border border-orange-800/50 text-center">
              <p className="text-xs text-orange-300 font-medium">11. Delayed</p>
              <p className="text-xl font-bold text-orange-400 mt-1">{counts.delayed}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-medium">New Leads</p>
              <p className="text-xl font-bold text-purple-400 mt-1">{overview?.new_leads_count ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Upcoming Queue & System Health Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Queue / Tasks */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Publishing Queue</CardTitle>
              <CardDescription className="text-xs">
                Next items scheduled for automated execution by the local scheduler.
              </CardDescription>
            </div>
            <Link to="/calendar" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View Calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="py-2">
            {overview?.upcoming_tasks && overview.upcoming_tasks.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {overview.upcoming_tasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">Post #{task.content_id}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Scheduled for: {new Date(task.scheduled_time).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="info">{task.state}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                No approved posts currently scheduled in queue.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Local Hardware & Zero-Cost Telemetry */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="py-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Local Engine Status
            </CardTitle>
            <CardDescription className="text-xs">
              Hardware budget and local services check.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Engine:</span>
                <Badge variant="success">SQLite (WAL Mode)</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Local LLM:</span>
                <span className="font-mono text-slate-200 font-semibold">{overview?.local_ai_model}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Ollama Daemon:</span>
                <Badge variant={overview?.ai_status === 'online' ? 'success' : 'warning'}>
                  {overview?.ai_status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Meta Graph API:</span>
                <Badge variant={overview?.facebook_status === 'connected' ? 'success' : 'outline'}>
                  {overview?.facebook_status}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <p className="font-semibold text-slate-300">Zero-Cost Compliance</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ✓ 0 External Paid APIs<br />
                ✓ 100% Local Inference<br />
                ✓ Mandatory Human Approval Barrier<br />
                ✓ Windows 8GB RAM Budgeted
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

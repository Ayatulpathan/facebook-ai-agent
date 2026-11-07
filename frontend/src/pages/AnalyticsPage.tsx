import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Download,
  Users,
  Eye,
  Heart,
  Video,
  Share2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { api, AnalyticsOverview } from '../services/api'
import { Button } from '../components/ui/Button'

export const AnalyticsPage: React.FC = () => {
  const [days, setDays] = useState<number>(30)

  const { data: analytics, isFetching } = useQuery<AnalyticsOverview>({
    queryKey: ['pageAnalytics', days],
    queryFn: () => api.getAnalyticsOverview(days)
  })

  const handleExportCsv = () => {
    window.open(api.getAnalyticsCsvDownloadUrl(days), '_blank')
  }

  // Calculate max values for SVG bar chart scaling
  const maxImp = Math.max(...(analytics?.daily_trends.map(d => d.impressions) || [100]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Page Performance & Insights Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ground-truth reach, impressions, post engagements, and audience interaction metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex items-center space-x-2 text-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Zero-Fabrication Disclaimer */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>
            <strong>Zero-Fabrication Guarantee:</strong> Analytics metrics are directly queried from the{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{analytics?.data_source}</span>.
          </span>
        </div>
        {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />}
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Impressions</span>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.total_impressions.toLocaleString() ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Total views</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Engagements</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.post_engagements.toLocaleString() ?? 0}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1 block">
            {analytics?.metrics.engagement_rate_pct ?? 0}% Rate
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Engaged Users</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.engaged_users.toLocaleString() ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Unique accounts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Video Views</span>
            <Video className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.video_views.toLocaleString() ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Reels & Clips</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Posts</span>
            <Share2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.total_published_posts ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Published</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Followers</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.metrics.followers_count.toLocaleString() ?? 0}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Page Audience</span>
        </div>
      </div>

      {/* Daily Trends Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Daily Audience Impressions Trend</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily distribution of content reach over the last {days} days.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-600" />
              <span className="text-slate-700 dark:text-slate-300">Impressions</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span className="text-slate-700 dark:text-slate-300">Engagements</span>
            </div>
          </div>
        </div>

        {/* Scaled Bar Visualizer */}
        <div className="h-48 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          {analytics?.daily_trends.map((item, idx) => {
            const heightPct = Math.max(10, Math.round((item.impressions / maxImp) * 100))
            const engPct = Math.max(8, Math.round((item.engagements / maxImp) * 100))
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                  <div className="font-bold">{item.date}</div>
                  <div>Views: {item.impressions} | Eng: {item.engagements}</div>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[12px] bg-blue-500/80 hover:bg-blue-600 rounded-t-sm transition-all"
                  />
                  <div
                    style={{ height: `${engPct}%` }}
                    className="w-full max-w-[12px] bg-rose-500/80 hover:bg-rose-600 rounded-t-sm transition-all"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Published Posts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recently Published Posts Performance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified posts delivered to your Facebook Page with permalinks.
            </p>
          </div>
        </div>

        {analytics?.recent_posts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No published posts found yet. Approve and publish content from the Approval Center to see post metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Post Title</th>
                  <th className="py-3 px-4">Meta Post ID</th>
                  <th className="py-3 px-4">Estimated Reach</th>
                  <th className="py-3 px-4">Reactions</th>
                  <th className="py-3 px-4">Published At</th>
                  <th className="py-3 px-4">Facebook Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics?.recent_posts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                      {p.title}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {p.meta_post_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {p.estimated_reach.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-600">
                      {p.estimated_reactions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(p.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      {p.permalink_url ? (
                        <a
                          href={p.permalink_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          View Post <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

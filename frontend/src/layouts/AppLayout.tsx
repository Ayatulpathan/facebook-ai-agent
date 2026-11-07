import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Layers,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  MessageCircle,
  Users2,
  BarChart3,
  Image as ImageIcon,
  Bot,
  Bell,
  Settings,
  ShieldAlert,
  Film,
  Palette,
  Lightbulb,
  Compass,
  LogOut,
  Cpu,
  Share2,
  PauseCircle,
  PlayCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Button } from '../components/ui/Button'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

export const AppLayout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Fetch overview & health periodically
  const { data: overview } = useQuery({
    queryKey: ['dashboardOverview'],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 10000
  })

  // Global pause mutation
  const pauseMutation = useMutation({
    mutationFn: (newPausedState: boolean) => api.setGlobalPause(newPausedState),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] })
    }
  })

  const handleLogout = () => {
    api.logout()
    navigate('/login')
  }

  const navGroups: NavGroup[] = [
    {
      group: "Core Operation",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Brand Profile", href: "/brand", icon: Building2 },
        { name: "Niches", href: "/niches", icon: Layers },
        {
          name: "Approval Center",
          href: "/approvals",
          icon: CheckCircle2,
          badge: overview?.pending_approvals_count ? String(overview.pending_approvals_count) : undefined
        },
        { name: "Content Calendar", href: "/calendar", icon: CalendarDays }
      ]
    },
    {
      group: "AI Studios & Creative",
      items: [
        { name: "Research Agent", href: "/research", icon: Compass },
        { name: "Content Strategy", href: "/strategy", icon: Lightbulb },
        { name: "AI Content Studio", href: "/studio", icon: Sparkles },
        { name: "Graphic Studio", href: "/graphics", icon: Palette },
        { name: "Reels Studio", href: "/reels", icon: Film },
        { name: "Media Library", href: "/media-library", icon: ImageIcon }
      ]
    },
    {
      group: "Audience & Engagement",
      items: [
        {
          name: "Facebook Inbox",
          href: "/inbox",
          icon: MessageSquare,
          badge: overview?.pending_messages_count ? String(overview.pending_messages_count) : undefined
        },
        { name: "Comments", href: "/comments", icon: MessageCircle },
        { name: "Leads", href: "/leads", icon: Users2, badge: overview?.new_leads_count ? String(overview.new_leads_count) : undefined },
        { name: "Analytics", href: "/analytics", icon: BarChart3 }
      ]
    },
    {
      group: "System & Administration",
      items: [
        { name: "AI Agents", href: "/agents", icon: Bot },
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
        { name: "Settings", href: "/settings", icon: Settings }
      ]
    }
  ]

  const isPaused = overview?.global_pause_enabled ?? false

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-800/80 bg-slate-950 transition-all duration-300 z-30 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
              FB
            </div>
            {isSidebarOpen && (
              <div className="truncate">
                <h1 className="font-bold text-sm tracking-tight text-white leading-tight">AI Page Manager</h1>
                <p className="text-[11px] text-emerald-400 font-medium">Local & Zero-Cost</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs hidden md:block"
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {isSidebarOpen && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    title={!isSidebarOpen ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {isSidebarOpen && <span className="truncate flex-1">{item.name}</span>}
                    {isSidebarOpen && item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0">
                  AD
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200">Administrator</p>
                  <p className="text-[10px] text-slate-500">127.0.0.1 (Local)</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-200 capitalize">
              {location.pathname.replace('/', '') || 'Dashboard'}
            </span>
          </div>

          {/* Status indicators and Global Pause */}
          <div className="flex items-center gap-3">
            {/* Global Pause Kill-Switch */}
            <Button
              variant={isPaused ? "danger" : "outline"}
              size="sm"
              className={isPaused ? "bg-red-600 hover:bg-red-700 font-semibold" : "border-slate-700 text-slate-300"}
              onClick={() => pauseMutation.mutate(!isPaused)}
              isLoading={pauseMutation.isPending}
            >
              {isPaused ? (
                <>
                  <PauseCircle className="w-4 h-4 mr-1.5 animate-pulse text-white" />
                  PAUSED: All Actions Halted
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Global Pause (Active)
                </>
              )}
            </Button>

            {/* AI Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Local AI:</span>
              <span className={`font-medium ${overview?.ai_status === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overview?.local_ai_model || 'qwen2.5:1.5b'} ({overview?.ai_status || 'offline'})
              </span>
            </div>

            {/* Facebook Status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Meta API:</span>
              <span className={`font-medium ${overview?.facebook_status === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`}>
                {overview?.facebook_status || 'disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Global Pause Banner Alert */}
        {isPaused && (
          <div className="bg-red-950/80 border-b border-red-800/80 px-6 py-2 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>
                <strong>GLOBAL PAUSE IS ENGAGED:</strong> All scheduled posts, outgoing comments, and Messenger replies are strictly halted. No actions will be sent to Facebook.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs border-red-700 bg-red-900/50 hover:bg-red-800 text-white"
              onClick={() => pauseMutation.mutate(false)}
            >
              Resume System
            </Button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#080d1a]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BrandProfilePage } from './pages/BrandProfilePage'
import { NichesPage } from './pages/NichesPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { AgentsPage } from './pages/AgentsPage'
import { ResearchPage } from './pages/ResearchPage'
import { StrategyPage } from './pages/StrategyPage'
import { ContentStudioPage } from './pages/ContentStudioPage'
import { GraphicStudioPage } from './pages/GraphicStudioPage'
import { ReelsStudioPage } from './pages/ReelsStudioPage'
import { MediaLibraryPage } from './pages/MediaLibraryPage'
import { CalendarPage } from './pages/CalendarPage'
import { ApprovalCenterPage } from './pages/ApprovalCenterPage'
import { FacebookPage } from './pages/FacebookPage'
import { CommentsPage } from './pages/CommentsPage'
import { MessengerPage } from './pages/MessengerPage'
import { LeadsPage } from './pages/LeadsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Core Phase 1 Foundation Pages */}
            <Route index element={<DashboardPage />} />
            <Route path="brand" element={<BrandProfilePage />} />
            <Route path="niches" element={<NichesPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />

            {/* Phase 4: Approval Center */}
            <Route path="approvals" element={<ApprovalCenterPage />} />

            {/* Phase 5: Facebook Page Integration */}
            <Route path="facebook" element={<FacebookPage />} />

            {/* Phase 3: Content Studios & Media */}
            <Route path="studio" element={<ContentStudioPage />} />
            <Route path="graphics" element={<GraphicStudioPage />} />
            <Route path="reels" element={<ReelsStudioPage />} />
            <Route path="media-library" element={<MediaLibraryPage />} />
            <Route path="calendar" element={<CalendarPage />} />

            {/* Phase 2: Local AI & Specialized Agents */}
            <Route path="research" element={<ResearchPage />} />
            <Route path="strategy" element={<StrategyPage />} />
            <Route path="agents" element={<AgentsPage />} />

            {/* Remaining Modules Roadmap */}

            {/* Phase 6: Audience & Engagement */}
            <Route path="inbox" element={<MessengerPage />} />
            <Route path="comments" element={<CommentsPage />} />
            <Route path="leads" element={<LeadsPage />} />

            {/* Phase 7: Analytics, Notifications & Settings */}
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

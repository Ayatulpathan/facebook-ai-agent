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
import { PlaceholderPage } from './pages/PlaceholderPage'

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

            <Route
              path="inbox"
              element={
                <PlaceholderPage
                  title="Facebook Inbox & Messenger"
                  phase="Phase 6"
                  description="Official Messenger platform integration with draft replies requiring approval."
                  highlights={[
                    "Permitted Messenger conversation retrieval",
                    "Intent recognition & inquiry categorization",
                    "AI draft replies generated locally via Ollama",
                    "Mandatory human approval before message transmission"
                  ]}
                />
              }
            />

            <Route
              path="comments"
              element={
                <PlaceholderPage
                  title="Comment Management"
                  phase="Phase 6"
                  description="Comment classification (Questions, Inquiries, Complaints, Feedback, Spam) and reply drafting."
                  highlights={[
                    "Automatic classification into 7 distinct categories",
                    "Suggested response drafting",
                    "Side-by-side comment and proposed reply view",
                    "Strict human approval prior to publishing replies"
                  ]}
                />
              }
            />

            <Route
              path="leads"
              element={
                <PlaceholderPage
                  title="Lead Management"
                  phase="Phase 6"
                  description="CRM tracker for customer inquiries, contact details, and conversion follow-ups."
                  highlights={[
                    "Automatic lead extraction from permitted chats",
                    "Inquiry type & product interest tagging",
                    "Follow-up status tracking (New, Contacted, Qualified, Closed)",
                    "Strict privacy and local storage"
                  ]}
                />
              }
            />

            <Route
              path="analytics"
              element={
                <PlaceholderPage
                  title="Analytics & Page Insights"
                  phase="Phase 7"
                  description="Real page performance metrics from official Meta Graph API with CSV export."
                  highlights={[
                    "Official Reach, Impressions, Engagement, and Video Views",
                    "Zero fake or fabricated metrics policy",
                    "Date range filtering and CSV report exports",
                    "Post-by-post performance analysis"
                  ]}
                />
              }
            />

            {/* Phase 6 & 7 Modules */}

            {/* Remaining Modules Roadmap */}

            <Route
              path="notifications"
              element={
                <PlaceholderPage
                  title="Notifications & System Alerts"
                  phase="Phase 7"
                  description="Real-time alerts for pending approvals, scheduled post reminders, and system events."
                  highlights={[
                    "Pending approval reminders",
                    "Token expiry warnings",
                    "Local AI unavailable notices",
                    "In-app and optional browser notifications"
                  ]}
                />
              }
            />

            <Route
              path="settings"
              element={
                <PlaceholderPage
                  title="Settings & Local Backups"
                  phase="Phase 7 / Phase 8"
                  description="System configuration, SQLite automated backups, and Windows Task Scheduler integration."
                  highlights={[
                    "Automated SQLite database backups to /data/backups/",
                    "One-click database restore",
                    "Windows Task Scheduler guide and configuration",
                    "Global Pause kill-switch configuration"
                  ]}
                />
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

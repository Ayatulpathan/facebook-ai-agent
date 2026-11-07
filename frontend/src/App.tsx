import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BrandProfilePage } from './pages/BrandProfilePage'
import { NichesPage } from './pages/NichesPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
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

            {/* Structured Placeholders for Subsequent Phases */}
            <Route
              path="approvals"
              element={
                <PlaceholderPage
                  title="Approval Center"
                  phase="Phase 4"
                  description="Human-in-the-loop verification gate for all posts, Reels, and customer replies."
                  highlights={[
                    "Mandatory approval barrier before any publishing or sending action",
                    "Cryptographic approval records with version tracking",
                    "Automatic invalidation of approvals if content is modified",
                    "One-click Approve, Reject, or Edit workflows"
                  ]}
                />
              }
            />

            <Route
              path="calendar"
              element={
                <PlaceholderPage
                  title="Content Calendar"
                  phase="Phase 3"
                  description="Interactive daily, weekly, and monthly publishing schedule with local timezone synchronization."
                  highlights={[
                    "Daily, weekly, and monthly grid views",
                    "Visual indicator for all 11 lifecycle statuses",
                    "Drag-and-drop rescheduling",
                    "Delay detection for computer downtime"
                  ]}
                />
              }
            />

            <Route
              path="research"
              element={
                <PlaceholderPage
                  title="Research Agent"
                  phase="Phase 2"
                  description="Autonomous niche trend discovery, seasonal event tracking, and customer question analysis."
                  highlights={[
                    "Publicly accessible topic discovery",
                    "Seasonal occasion & festival suggestions (Bangla & English)",
                    "Customer interest & FAQ mining",
                    "Clear labeling of AI-generated ideas vs verified facts"
                  ]}
                />
              }
            />

            <Route
              path="strategy"
              element={
                <PlaceholderPage
                  title="Content Strategy Agent"
                  phase="Phase 2"
                  description="High-converting monthly and weekly editorial plans tailored to your configured niches."
                  highlights={[
                    "Multi-niche strategy generation",
                    "Educational, promotional, and engagement campaign mixes",
                    "Target audience demographic resonance",
                    "Fully editable suggestions"
                  ]}
                />
              }
            />

            <Route
              path="studio"
              element={
                <PlaceholderPage
                  title="AI Content Studio"
                  phase="Phase 3"
                  description="Multi-lingual (Bangla & English) caption generator with strict anti-hallucination guards."
                  highlights={[
                    "Bangla and English natural copy generation",
                    "Tone, niche, and custom CTA selection",
                    "Zero price hallucination policy (strict catalog adherence)",
                    "Hashtags and engaging callouts"
                  ]}
                />
              }
            />

            <Route
              path="graphics"
              element={
                <PlaceholderPage
                  title="Graphic Design Studio"
                  phase="Phase 3"
                  description="HTML/CSS/SVG-based promotional graphic rendering optimized for 4 GB VRAM."
                  highlights={[
                    "No heavy generative diffusion models required",
                    "Editable promotional templates (Quotes, Price Cards, Sales, Festivals)",
                    "ImageMagick and SVG canvas rendering",
                    "Export to PNG and JPEG"
                  ]}
                />
              }
            />

            <Route
              path="reels"
              element={
                <PlaceholderPage
                  title="Reels Studio"
                  phase="Phase 3"
                  description="Vertical short-form video assembly using FFmpeg and local assets."
                  highlights={[
                    "Scene-by-scene script and storyboard generator",
                    "FFmpeg-powered vertical video (1080x1920) concatenation",
                    "Subtitles, text overlays, and audio integration",
                    "Low-resolution preview rendering for 8 GB RAM"
                  ]}
                />
              }
            />

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

            <Route
              path="media-library"
              element={
                <PlaceholderPage
                  title="Media Asset Library"
                  phase="Phase 3"
                  description="Local storage repository for brand logos, product photos, rendered graphics, and clips."
                  highlights={[
                    "Organized storage in /data/media/",
                    "Image and video asset tagging",
                    "Direct integration into AI Content Studio & Reels Studio",
                    "File size and resolution inspector"
                  ]}
                />
              }
            />

            <Route
              path="agents"
              element={
                <PlaceholderPage
                  title="AI Agent Master Orchestrator"
                  phase="Phase 2"
                  description="Monitor and configure the 11 specialized local AI agents running on Ollama."
                  highlights={[
                    "Master Orchestrator coordinating all 11 sub-agents",
                    "Local model selector: qwen2.5:1.5b (default), qwen2.5:0.5b (fallback)",
                    "Token consumption, latency, and context window monitor",
                    "Strict zero-cost external API gatekeeper"
                  ]}
                />
              }
            />

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

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Info,
  Sliders,
  Copy,
  Check
} from 'lucide-react'
import { api, FacebookStatus } from '../services/api'
import { Button } from '../components/ui/Button'

export const FacebookPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState(false)
  
  // Form state
  const [isMockMode, setIsMockMode] = useState<boolean>(true)
  const [pageId, setPageId] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string>('')
  const [appId, setAppId] = useState<string>('')
  const [appSecret, setAppSecret] = useState<string>('')
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Fetch status
  const { data: status, isLoading, isFetching } = useQuery<FacebookStatus>({
    queryKey: ['facebookStatus'],
    queryFn: async () => {
      const data = await api.getFacebookStatus()
      setIsMockMode(data.is_mock_mode)
      setPageId(data.page_id || '')
      setAppId(data.app_id || '')
      return data
    }
  })

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: () => api.verifyFacebookConnection(),
    onSuccess: (data) => {
      queryClient.setQueryData(['facebookStatus'], data)
      setFeedbackMsg({ text: 'Facebook connection and permissions verified successfully.', type: 'success' })
      setTimeout(() => setFeedbackMsg(null), 4000)
    },
    onError: (err: any) => {
      setFeedbackMsg({ text: err.message || 'Verification failed.', type: 'error' })
    }
  })

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: () => api.updateFacebookConfig({
      page_id: pageId.trim() || undefined,
      access_token: accessToken.trim() || undefined,
      app_id: appId.trim() || undefined,
      app_secret: appSecret.trim() || undefined,
      is_mock_mode: isMockMode
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['facebookStatus'], data)
      setAccessToken('')
      setAppSecret('')
      setFeedbackMsg({ text: 'Facebook configuration saved and updated.', type: 'success' })
      setTimeout(() => setFeedbackMsg(null), 4000)
    },
    onError: (err: any) => {
      setFeedbackMsg({ text: err.message || 'Failed to update configuration.', type: 'error' })
    }
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => api.disconnectFacebookPage(),
    onSuccess: (data) => {
      queryClient.setQueryData(['facebookStatus'], data)
      setFeedbackMsg({ text: 'Facebook page disconnected and tokens cleared.', type: 'success' })
      setTimeout(() => setFeedbackMsg(null), 4000)
    }
  })

  // Handle OAuth
  const handleOAuthConnect = async () => {
    try {
      const res = await api.getMetaOAuthUrl()
      if (res.oauth_url) {
        window.open(res.oauth_url, '_blank', 'width=650,height=750')
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Unable to generate Meta OAuth URL. Ensure App ID is set.', type: 'error' })
    }
  }

  const handleCopyPageId = () => {
    if (status?.page_id) {
      navigator.clipboard.writeText(status.page_id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span>Loading Facebook integration status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Share2 className="h-7 w-7 text-blue-600" />
            Facebook Page Integration
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official Meta Graph API gateway with strict human gatekeeper safeguards and zero-cost local sandbox.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => verifyMutation.mutate()}
            isLoading={verifyMutation.isPending || isFetching}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Verify Permissions</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Connection & Page Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Page Identity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-blue-500/20">
                  {status?.avatar_url ? (
                    <img src={status.avatar_url} alt="Page avatar" className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    status?.page_name?.[0] || 'F'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full border-2 border-white dark:border-slate-900">
                  <Share2 className="h-3 w-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {status?.page_name || 'No Page Connected'}
                  </h2>
                  {status?.is_connected ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Disconnected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {status?.category} • {status?.followers_count?.toLocaleString()} Followers
                </p>
                {status?.page_id && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      ID: {status.page_id}
                    </span>
                    <button
                      onClick={handleCopyPageId}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy Page ID"
                    >
                      {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {status?.is_mock_mode ? (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                  <Sliders className="h-3.5 w-3.5 mr-1.5" />
                  Mock Sandbox Mode (Zero Cost)
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Live Meta Graph API (v20.0)
                </span>
              )}
              {status?.last_verified_at && (
                <span className="text-[11px] text-slate-400">
                  Verified: {new Date(status.last_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Token State</span>
              <div className="mt-1 flex items-center space-x-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  status?.token_status === 'VALID' ? 'bg-emerald-500' :
                  status?.token_status === 'EXPIRING_SOON' ? 'bg-amber-500' :
                  status?.token_status === 'DEGRADED' ? 'bg-orange-500' : 'bg-rose-500'
                }`} />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status?.token_status}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Token Expiry</span>
              <div className="mt-1">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status?.expires_in_days !== null ? `${status?.expires_in_days} Days Remaining` : 'Never / Indefinite'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Meta Scopes</span>
              <div className="mt-1">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {status?.permissions_summary.granted} of {status?.permissions_summary.total} Granted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Security & Human Gatekeeper Invariant */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 mb-3">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="font-bold text-white text-base">Zero-Trust Gatekeeper</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Even with an active Meta access token, the local agent <strong>NEVER</strong> publishes automatically.
              Every post, image, or Reel requires your explicit human sign-off in the <strong>Approval Center</strong>.
            </p>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Tokens stored locally in SQLite</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Never transmitted to third parties</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Instant Global Pause kill-switch supported</span>
              </div>
            </div>
          </div>

          {status?.is_connected && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-rose-400 border-rose-900 hover:bg-rose-950/50 hover:text-rose-300"
                onClick={() => {
                  if (confirm("Disconnect this Facebook Page and clear local credentials?")) {
                    disconnectMutation.mutate()
                  }
                }}
                isLoading={disconnectMutation.isPending}
              >
                <Power className="h-3.5 w-3.5 mr-1.5" />
                Disconnect Page
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Granular Permissions Health Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <span>Official Meta Graph API Permissions Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review granted and missing permissions. Required features will degrade gracefully if unapproved by Meta.
            </p>
          </div>
          {status?.permissions_summary.all_required_granted ? (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> All Core Permissions Active
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Some Permissions Missing
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {status?.permissions.map((perm) => (
            <div key={perm.key} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {perm.name}
                  </span>
                  <code className="text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                    {perm.key}
                  </code>
                  {perm.required ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {perm.description}
                </p>
                {!perm.is_granted && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center space-x-1 font-medium">
                    <Info className="h-3.5 w-3.5 mr-1" />
                    <span>Impact: {perm.impact_if_missing}</span>
                  </p>
                )}
              </div>

              <div>
                {perm.is_granted ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                    Granted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-rose-600 dark:text-rose-400" />
                    Missing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration & Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            <span>Connection Mode & Credentials</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between local zero-cost Mock Sandbox testing and production Meta Graph API.
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setIsMockMode(true)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              isMockMode
                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Mock Sandbox Mode (100% Zero-Cost)
              </span>
              <input
                type="radio"
                checked={isMockMode}
                onChange={() => setIsMockMode(true)}
                className="text-purple-600 focus:ring-purple-500"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Recommended for development and offline testing. Simulates successful Meta publishing, comments, and analytics without needing an approved Meta App.
            </p>
          </div>

          <div
            onClick={() => setIsMockMode(false)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              !isMockMode
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Live Meta Graph API (v20.0)
              </span>
              <input
                type="radio"
                checked={!isMockMode}
                onChange={() => setIsMockMode(false)}
                className="text-blue-600 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Connect to your official Facebook Page using your Meta Developer credentials and Page Long-Lived Token.
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Facebook Page ID
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 1020304050"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Meta App ID (For OAuth)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {!isMockMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta App Secret
                </label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={status?.app_secret_configured ? "••••••••••••" : "Enter App Secret"}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Page Access Token (Long-Lived)
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={status?.has_token ? "Token is saved securely locally" : "EAAG..."}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <div>
              {!isMockMode && appId && (
                <Button
                  variant="outline"
                  onClick={handleOAuthConnect}
                  className="flex items-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Connect with Meta OAuth</span>
                </Button>
              )}
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Legal & Meta API Policy Notice */}
      <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
            Meta Graph API Compliance & Zero-Cost Architecture
          </span>
          {status?.legal_disclaimer} Facebook API access is subject to Meta's review, policies, and permitted scopes.
          This local management system never utilizes unofficial bots, scraping, or headless browser automation to bypass Meta policies.
        </div>
      </div>
    </div>
  )
}

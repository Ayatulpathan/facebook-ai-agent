import {
  AuthResponse,
  User,
  BrandProfile,
  Niche,
  NicheFormData,
  DashboardOverview,
  SystemHealth,
  AuditLogItem
} from '../types'

const API_BASE = '/api/v1'

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Session expired or unauthorized')
  }

  if (!response.ok) {
    let errorDetail = 'Request failed'
    try {
      const errorJson = await response.json()
      errorDetail = errorJson.detail || errorDetail
    } catch {
      errorDetail = response.statusText
    }
    throw new Error(errorDetail)
  }

  return response.json()
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await handleResponse<AuthResponse>(res)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  },

  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    })
    return handleResponse<User>(res)
  },

  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  // Dashboard & Health
  async getDashboardOverview(): Promise<DashboardOverview> {
    const res = await fetch(`${API_BASE}/dashboard/overview`, {
      headers: getAuthHeaders()
    })
    return handleResponse<DashboardOverview>(res)
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/dashboard/system-status`, {
      headers: getAuthHeaders()
    })
    return handleResponse<SystemHealth>(res)
  },

  async setGlobalPause(paused: boolean): Promise<{ global_pause: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/dashboard/global-pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paused })
    })
    return handleResponse<{ global_pause: boolean; message: string }>(res)
  },

  // Brand Profile
  async getBrandProfile(): Promise<BrandProfile> {
    const res = await fetch(`${API_BASE}/brand/profile`, {
      headers: getAuthHeaders()
    })
    return handleResponse<BrandProfile>(res)
  },

  async updateBrandProfile(profile: Partial<BrandProfile>): Promise<BrandProfile> {
    const res = await fetch(`${API_BASE}/brand/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profile)
    })
    return handleResponse<BrandProfile>(res)
  },

  // Niches
  async getNiches(activeOnly: boolean = false): Promise<Niche[]> {
    const url = activeOnly ? `${API_BASE}/niches/?active_only=true` : `${API_BASE}/niches/`
    const res = await fetch(url, {
      headers: getAuthHeaders()
    })
    return handleResponse<Niche[]>(res)
  },

  async getNiche(id: number): Promise<Niche> {
    const res = await fetch(`${API_BASE}/niches/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse<Niche>(res)
  },

  async createNiche(nicheData: NicheFormData): Promise<Niche> {
    const res = await fetch(`${API_BASE}/niches/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(nicheData)
    })
    return handleResponse<Niche>(res)
  },

  async updateNiche(id: number, nicheData: Partial<NicheFormData>): Promise<Niche> {
    const res = await fetch(`${API_BASE}/niches/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(nicheData)
    })
    return handleResponse<Niche>(res)
  },

  async deleteNiche(id: number): Promise<{ message: string; success: boolean }> {
    const res = await fetch(`${API_BASE}/niches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse<{ message: string; success: boolean }>(res)
  },

  // Audit Logs
  async getAuditLogs(limit: number = 50): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}`, {
      headers: getAuthHeaders()
    })
    return handleResponse<AuditLogItem[]>(res)
  },

  // Phase 2: Local AI Agents
  async getAgentsStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/status`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  async switchModel(modelName: string): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/switch-model`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ model_name: modelName })
    })
    return handleResponse<any>(res)
  },

  async generatePost(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/generate-post`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async generateStrategy(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/generate-strategy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async researchTopics(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/research-topics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async saveIdea(params: any): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/save-idea`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async getAgentRuns(limit: number = 20): Promise<any[]> {
    const res = await fetch(`${API_BASE}/agents/runs?limit=${limit}`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any[]>(res)
  },

  // ---------------- Phase 3: Content, Media & Studios ----------------
  async getContent(statusFilter?: string, nicheId?: number): Promise<any[]> {
    let url = `${API_BASE}/content/`
    const params = new URLSearchParams()
    if (statusFilter) params.append('status_filter', statusFilter)
    if (nicheId) params.append('niche_id', String(nicheId))
    if (params.toString()) url += `?${params.toString()}`

    const res = await fetch(url, { headers: getAuthHeaders() })
    return handleResponse<any[]>(res)
  },

  async getContentDetail(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/content/${id}`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  async createContent(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/content/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<any>(res)
  },

  async updateContent(id: number, data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/content/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<any>(res)
  },

  async submitForApproval(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/content/${id}/submit-approval`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  async deleteContent(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/content/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Calendar
  async getCalendarEvents(startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE}/calendar/`
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (params.toString()) url += `?${params.toString()}`

    const res = await fetch(url, { headers: getAuthHeaders() })
    return handleResponse<any[]>(res)
  },

  async reschedulePost(contentId: number, scheduledFor: string): Promise<any> {
    const res = await fetch(`${API_BASE}/calendar/reschedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content_id: contentId, scheduled_for: scheduledFor })
    })
    return handleResponse<any>(res)
  },

  // Media Library
  async uploadMedia(formData: FormData): Promise<any> {
    const token = localStorage.getItem('access_token')
    const headers: HeadersInit = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: headers,
      body: formData
    })
    return handleResponse<any>(res)
  },

  async getMedia(mediaType?: string): Promise<any[]> {
    const url = mediaType ? `${API_BASE}/media/?media_type=${mediaType}` : `${API_BASE}/media/`
    const res = await fetch(url, { headers: getAuthHeaders() })
    return handleResponse<any[]>(res)
  },

  async deleteMedia(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/media/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Graphic Studio
  async getGraphicTemplates(): Promise<any> {
    const res = await fetch(`${API_BASE}/graphics/templates`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  async renderGraphic(data: {
    template: string
    data: Record<string, string>
    primary_color?: string
    secondary_color?: string
    format?: string
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/graphics/render`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<any>(res)
  },

  // Reels Studio
  async generateReelScript(data: { topic: string; niche_id?: number; duration_seconds?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/reels/script`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<any>(res)
  },

  async renderReel(data: {
    title: string
    subtitle: string
    duration_seconds?: number
    preview_mode?: boolean
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/reels/render`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse<any>(res)
  },

  // ---------------- Phase 4: Approval Center & Queue ----------------
  async getPendingApprovals(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/approvals/pending`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any[]>(res)
  },

  async approveContent(contentId: number, versionNum: number, decisionNotes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/approvals/${contentId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ version_num: versionNum, decision_notes: decisionNotes })
    })
    return handleResponse<any>(res)
  },

  async rejectContent(contentId: number, versionNum: number, rejectionReason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/approvals/${contentId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ version_num: versionNum, rejection_reason: rejectionReason })
    })
    return handleResponse<any>(res)
  },

  async getApprovalHistory(limit: number = 50): Promise<any[]> {
    const res = await fetch(`${API_BASE}/approvals/history?limit=${limit}`, {
      headers: getAuthHeaders()
    })
    return handleResponse<any[]>(res)
  },

  async getPublishingQueue(state?: string): Promise<any[]> {
    const url = state ? `${API_BASE}/queue/?state=${state}` : `${API_BASE}/queue/`
    const res = await fetch(url, { headers: getAuthHeaders() })
    return handleResponse<any[]>(res)
  },

  async cancelQueueJob(queueId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  async retryQueueJob(queueId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Phase 5: Facebook Page Integration
  async getFacebookStatus(): Promise<FacebookStatus> {
    const res = await fetch(`${API_BASE}/facebook/status`, { headers: getAuthHeaders() })
    return handleResponse<FacebookStatus>(res)
  },

  async updateFacebookConfig(payload: FacebookConfigPayload): Promise<FacebookStatus> {
    const res = await fetch(`${API_BASE}/facebook/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    return handleResponse<FacebookStatus>(res)
  },

  async verifyFacebookConnection(): Promise<FacebookStatus> {
    const res = await fetch(`${API_BASE}/facebook/verify`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<FacebookStatus>(res)
  },

  async disconnectFacebookPage(): Promise<FacebookStatus> {
    const res = await fetch(`${API_BASE}/facebook/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<FacebookStatus>(res)
  },

  async getMetaOAuthUrl(redirectUri?: string): Promise<{ oauth_url: string }> {
    const url = redirectUri ? `${API_BASE}/facebook/oauth-url?redirect_uri=${encodeURIComponent(redirectUri)}` : `${API_BASE}/facebook/oauth-url`
    const res = await fetch(url, { headers: getAuthHeaders() })
    return handleResponse<{ oauth_url: string }>(res)
  },

  async publishApprovedNow(contentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/facebook/publish-now/${contentId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Phase 6: Comments
  async getComments(category?: string, replyStatus?: string, search?: string): Promise<CommentItem[]> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (replyStatus) params.append('reply_status', replyStatus)
    if (search) params.append('search', search)
    const res = await fetch(`${API_BASE}/comments/?${params.toString()}`, { headers: getAuthHeaders() })
    return handleResponse<CommentItem[]>(res)
  },

  async syncComments(postId?: string): Promise<any> {
    const url = postId ? `${API_BASE}/comments/sync?post_id=${encodeURIComponent(postId)}` : `${API_BASE}/comments/sync`
    const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() })
    return handleResponse<any>(res)
  },

  async approveCommentReply(commentId: number, replyText?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/comments/${commentId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reply_text: replyText })
    })
    return handleResponse<any>(res)
  },

  async rejectCommentReply(commentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/comments/${commentId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Phase 6: Messenger
  async getMessengerConversations(): Promise<ConversationSummary[]> {
    const res = await fetch(`${API_BASE}/messenger/conversations`, { headers: getAuthHeaders() })
    return handleResponse<ConversationSummary[]>(res)
  },

  async getMessengerThread(conversationId: number): Promise<ConversationDetail> {
    const res = await fetch(`${API_BASE}/messenger/conversations/${conversationId}`, { headers: getAuthHeaders() })
    return handleResponse<ConversationDetail>(res)
  },

  async syncMessenger(): Promise<any> {
    const res = await fetch(`${API_BASE}/messenger/sync`, { method: 'POST', headers: getAuthHeaders() })
    return handleResponse<any>(res)
  },

  async approveMessengerDraft(draftId: number, replyText?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/messenger/drafts/${draftId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reply_text: replyText })
    })
    return handleResponse<any>(res)
  },

  async rejectMessengerDraft(draftId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/messenger/drafts/${draftId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    return handleResponse<any>(res)
  },

  // Phase 6: Leads
  async getLeads(status?: string, search?: string): Promise<LeadItem[]> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (search) params.append('search', search)
    const res = await fetch(`${API_BASE}/leads/?${params.toString()}`, { headers: getAuthHeaders() })
    return handleResponse<LeadItem[]>(res)
  },

  async getLeadMetrics(): Promise<LeadMetrics> {
    const res = await fetch(`${API_BASE}/leads/metrics`, { headers: getAuthHeaders() })
    return handleResponse<LeadMetrics>(res)
  },

  async createLead(lead: Partial<LeadItem>): Promise<LeadItem> {
    const res = await fetch(`${API_BASE}/leads/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(lead)
    })
    return handleResponse<LeadItem>(res)
  },

  async updateLead(leadId: number, update: Partial<LeadItem>): Promise<LeadItem> {
    const res = await fetch(`${API_BASE}/leads/${leadId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(update)
    })
    return handleResponse<LeadItem>(res)
  },

  getLeadsCsvDownloadUrl(): string {
    return `${API_BASE}/leads/export/csv`
  }
}

export interface CommentItem {
  id: number
  post_id: number | null
  meta_post_id: string
  meta_comment_id: string
  sender_name: string
  sender_id: string
  comment_text: string
  category: string
  suggested_reply: string
  reply_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT' | string
  approved_reply_text: string
  is_lead: boolean
  sent_at: string | null
  created_at: string
}

export interface ConversationSummary {
  id: number
  meta_thread_id: string
  sender_name: string
  sender_id: string
  platform: string
  status: string
  updated_at: string
  latest_message: string
  latest_message_sender: string
  has_pending_approval: boolean
  pending_drafts_count: number
}

export interface ConversationDetail {
  conversation: {
    id: number
    meta_thread_id: string
    sender_name: string
    sender_id: string
    updated_at: string
  }
  messages: Array<{
    id: number
    sender_type: string
    message_text: string
    timestamp: string
    draft?: {
      id: number
      suggested_reply: string
      detected_intent: string
      approval_status: string
    }
  }>
  pending_draft?: {
    id: number
    message_id: number
    suggested_reply: string
    detected_intent: string
    approval_status: string
    created_at: string
  }
}

export interface LeadItem {
  id: number
  customer_name: string
  facebook_reference: string
  contact_info: string
  inquiry_type: string
  product_interest: string
  follow_up_status: 'New' | 'Contacted' | 'Qualified' | 'Closed' | string
  notes: string
  created_at: string
}

export interface LeadMetrics {
  total: number
  new: number
  contacted: number
  qualified: number
  closed: number
}

export interface FacebookPermission {
  key: string
  name: string
  description: string
  required: boolean
  impact_if_missing: string
  is_granted: boolean
}

export interface FacebookStatus {
  is_connected: boolean
  is_mock_mode: boolean
  page_id: string | null
  page_name: string | null
  category: string
  followers_count: number
  avatar_url: string
  status: string
  has_token: boolean
  app_id: string | null
  app_secret_configured: boolean
  token_status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEGRADED' | string
  token_expires_at: string | null
  expires_in_days: number | null
  permissions_summary: {
    total: number
    granted: number
    missing: number
    all_required_granted: boolean
  }
  permissions: FacebookPermission[]
  last_verified_at: string | null
  legal_disclaimer: string
}

export interface FacebookConfigPayload {
  page_id?: string
  access_token?: string
  app_id?: string
  app_secret?: string
  is_mock_mode?: boolean
}

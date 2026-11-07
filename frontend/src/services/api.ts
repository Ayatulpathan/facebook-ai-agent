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

  // ---------------- Phase 2: Local AI Agents ----------------
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

  async generatePost(params: {
    topic: string
    niche_id?: number | null
    post_type?: string
    language?: string
    tone?: string
    custom_cta?: string
    include_emojis?: boolean
    save_as_draft?: boolean
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/generate-post`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async generateStrategy(params: {
    niche_id: number
    timeframe?: string
    goals?: string
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/generate-strategy`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async researchTopics(params: {
    niche_id: number
    category?: string
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/agents/research-topics`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params)
    })
    return handleResponse<any>(res)
  },

  async saveIdea(params: {
    niche_id?: number
    title: string
    concept: string
    category: string
  }): Promise<any> {
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
  }
}

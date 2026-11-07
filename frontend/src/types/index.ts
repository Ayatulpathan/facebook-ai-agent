export interface User {
  id: number
  username: string
  role: string
  is_active: boolean
  created_at: string
  last_login?: string | null
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    username: string
    role: string
  }
}

export interface BrandProfile {
  id: number
  page_name: string
  page_description: string
  brand_identity: string
  brand_logo_url: string
  primary_color: string
  secondary_color: string
  target_audience: string
  languages: string
  writing_tone: string
  products_and_services: string
  verified_prices: string
  contact_details: string
  preferred_cta: string
  prohibited_claims: string
  prohibited_topics: string
  updated_at: string
}

export interface Niche {
  id: number
  name: string
  slug: string
  description: string
  target_demographic: string
  preferred_tone: string
  preferred_cta: string
  sample_topics: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NicheFormData {
  name: string
  description: string
  target_demographic: string
  preferred_tone: string
  preferred_cta: string
  sample_topics: string
  is_active: boolean
}

export interface PostStatusCounts {
  total_posts: number
  draft: number
  generating: number
  quality_check: number
  pending_approval: number
  approved: number
  scheduled: number
  publishing: number
  published: number
  rejected: number
  failed: number
  delayed: number
}

export interface DashboardOverview {
  post_counts: PostStatusCounts
  pending_approvals_count: number
  pending_comments_count: number
  pending_messages_count: number
  new_leads_count: number
  ai_status: "online" | "offline" | "busy" | "error"
  facebook_status: "connected" | "disconnected" | "token_expiring"
  local_ai_model: string
  global_pause_enabled: boolean
  upcoming_tasks: Array<{
    id: number
    content_id: number
    scheduled_time: string
    state: string
  }>
}

export interface SystemHealth {
  status: string
  timestamp: string
  database: string
  ollama_service: {
    status: string
    models?: string[]
    url?: string
    error?: string
  }
  facebook_connection: {
    status: string
    page_name?: string | null
    token_expires_at?: string | null
  }
  global_pause: boolean
  version: string
}

export interface AuditLogItem {
  id: number
  action: string
  entity: string
  entity_id?: string | null
  actor: string
  details: string
  ip_address: string
  created_at: string
}

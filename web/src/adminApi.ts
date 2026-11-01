// SPEC-008 US2/US3: typed admin console calls. Same-origin cookies; every non-GET carries the CSRF token from /api/admin/me.
import { ApiError } from './api'

export interface AdminMe { email: string; csrfToken: string }
export interface Dashboard {
  seatsUsed: number; seatCap: number; active: number; expired: number; revoked: number
  pendingInvites: number; expiringIn7Days: number; labels: string[]
}
export interface AccountRow {
  betaId: string; label: string; status: 'active' | 'expired' | 'revoked'
  activatedAt: string; expiresAt: string; lastSeenAt: string | null; devices: number; activeNow: boolean
}
export interface InviteRow {
  id: string; label: string; status: 'pending' | 'used' | 'revoked' | 'expired'
  createdAt: string; expiresAt: string; createdBy: string; usedAt: string | null
}
export interface AuditRow { id: number | string; at: string; actor: string; action: string; target: string; detail: string }
export interface AccountFilters { label?: string; status?: string; sort?: string; order?: string }

let csrf = ''

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error || `Request failed (${res.status})`, body)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export async function adminMe(): Promise<AdminMe> {
  const me = await parse<AdminMe>(await fetch('/api/admin/me'))
  csrf = me.csrfToken
  return me
}

async function get<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path))
}

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  if (!csrf) await adminMe()
  const send = () =>
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    })
  let res = await send()
  if (res.status === 403) {
    const data = await res.clone().json().catch(() => null)
    if (data?.code === 'csrf') {
      await adminMe()
      res = await send()
    }
  }
  return parse<T>(res)
}

export function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.set(k, String(v))
  const s = u.toString()
  return s ? `?${s}` : ''
}

const enc = encodeURIComponent
export const adminLogout = () => post<void>('/api/auth/admin/logout')
export const fetchDashboard = (label?: string) => get<Dashboard>(`/api/admin/dashboard${qs({ label })}`)
export const fetchAccounts = (f: AccountFilters) =>
  get<{ items: AccountRow[]; total: number }>(`/api/admin/accounts${qs({ ...f, limit: 500 })}`)
export const accountsCsvUrl = (f: AccountFilters) => `/api/admin/accounts.csv${qs({ label: f.label, status: f.status })}`
export const fetchInvites = (status?: string) => get<{ items: InviteRow[]; total: number }>(`/api/admin/invites${qs({ status })}`)
export const createInvites = (count: number, label?: string) =>
  post<{ links: string[] }>('/api/admin/invites', label ? { count, label } : { count })
export const revokeInvite = (id: string) => post<void>(`/api/admin/invites/${enc(id)}/revoke`)
export const revokeAccount = (betaId: string) => post<void>(`/api/admin/accounts/${enc(betaId)}/revoke`)
export const extendAccount = (betaId: string, months: number) =>
  post<{ expiresAt: string }>(`/api/admin/accounts/${enc(betaId)}/extend`, { months })
export const extendLabel = (label: string, months: number) =>
  post<{ extended: number }>('/api/admin/accounts/extend-label', { label, months })
export const reissuePassword = (betaId: string) => post<{ password: string }>(`/api/admin/accounts/${enc(betaId)}/reissue`)
export const fetchAudit = (before?: number | string) =>
  get<{ items: AuditRow[] }>(`/api/admin/audit${qs({ limit: 100, before })}`)
// Read-only endpoints for the tabs built later.
export const fetchOverview = () => get<unknown>('/api/admin/overview')
export const fetchUsage = (days: 7 | 30) => get<unknown>(`/api/admin/usage${qs({ days })}`)
export const fetchUsersActivity = () => get<unknown>('/api/admin/users/activity')
export const fetchCosts = () => get<unknown>('/api/admin/costs')
export const fetchFeedback = (f: Record<string, string | number | undefined> = {}) => get<unknown>(`/api/admin/feedback${qs(f)}`)
export const setFeedbackStatus = (id: string, status: 'new' | 'read' | 'resolved') =>
  post<void>(`/api/admin/feedback/${enc(id)}/status`, { status })
export const deleteFeedback = (id: string) => post<void>(`/api/admin/feedback/${enc(id)}/delete`)

import { Page, Route } from '@playwright/test'

export interface Req { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: unknown }

const ACCOUNTS = [
  { betaId: 'BETA-AAAA-1111', label: 'School A - Grade 7', status: 'active', activatedAt: '2026-11-02T10:00:00Z', expiresAt: '2027-01-02T10:00:00Z', lastSeenAt: '2026-11-02T10:00:00Z', devices: 2, activeNow: false },
  { betaId: 'BETA-BBBB-2222', label: '', status: 'revoked', activatedAt: '2026-10-01T10:00:00Z', expiresAt: '2026-12-01T10:00:00Z', lastSeenAt: null, devices: 0, activeNow: false },
]
const INVITES = [
  { id: 'inv-1', label: 'School A', status: 'pending', createdAt: '2026-11-02T10:00:00Z', expiresAt: '2026-11-16T10:00:00Z', createdBy: 'owner@example.org', usedAt: null },
  { id: 'inv-2', label: '', status: 'used', createdAt: '2026-11-01T10:00:00Z', expiresAt: '2026-11-15T10:00:00Z', createdBy: 'owner@example.org', usedAt: '2026-11-01T11:00:00Z' },
]
const DASH = { seatsUsed: 312, seatCap: 1000, active: 290, expired: 12, revoked: 4, pendingInvites: 22, expiringIn7Days: 9, labels: ['School A - Grade 7', 'School B'] }

interface Opts {
  signedIn?: boolean
  post?: (r: Req) => { status?: number; json?: unknown } | undefined
  audit?: (r: Req) => unknown
  feedback?: (r: Req) => unknown
}

export async function mockAdmin(page: Page, opts: Opts = {}) {
  const reqs: Req[] = []
  let meCalls = 0
  await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: Boolean(opts.feedback) } }))
  await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  await page.route('**/api/auth/admin/logout', (r) => {
    reqs.push(toReq(r))
    return r.fulfill({ status: 204 })
  })
  await page.route('**/api/admin/**', async (route) => {
    const req = toReq(route)
    const p = req.path
    if (p === '/api/admin/me') {
      meCalls++
      if (opts.signedIn === false) return route.fulfill({ status: 401, json: { error: 'x', code: 'admin_required' } })
      return route.fulfill({ json: { email: 'owner@example.org', csrfToken: `tok${meCalls}` } })
    }
    reqs.push(req)
    if (req.method === 'POST') {
      const o = opts.post?.(req)
      return route.fulfill({ status: o?.status ?? 204, json: o?.json })
    }
    if (p === '/api/admin/dashboard') return route.fulfill({ json: DASH })
    if (p === '/api/admin/overview') return route.fulfill({ json: { generatedAt: '2026-11-02T10:00:00Z', seats: { used: 312, cap: 1000 }, accounts: { active: 290, expired: 12, revoked: 4, expiringIn7Days: 9 }, invites: { pending: 22 }, activeNow: 14, activeLast24h: 88, activeLast7d: 201, ai: { todayUSD: 0.12, ceilingUSD: 1, monthToDateUSD: 1.9, budgetUSD: 30 }, feedback: { unread: 3 }, tutorEnabled: false } })
    if (p === '/api/admin/usage') return route.fulfill({ json: { generatedAt: '2026-11-02T10:00:00Z', days: Number(req.query.get('days') ?? 30), series: [{ date: '2026-11-02', dau: 40, signinOk: 55, signinFail: 3, activations: 6, quiz: 20, tutorQuestions: 0, requests: 2400, errors5xx: 1 }], totals: {}, lessons: [{ lessonId: '1-intro', views: 180 }] } })
    if (p === '/api/admin/costs') return route.fulfill({ json: { generatedAt: '2026-11-02T10:00:00Z', ai: { estimated: true, todayUSD: 0.12, ceilingUSD: 1, ceilingReached: false, monthToDateUSD: 1.9, budgetUSD: 30, budgetUsedPct: 6.3, thresholds: { '50': false, '90': false, '100': false }, projectedMonthUSD: null }, hosting: { connected: false, reason: 'Cloud billing source is not connected', items: [] } } })
    if (p === '/api/admin/users/activity') return route.fulfill({ json: { generatedAt: '2026-11-02T10:00:00Z', activeNow: 14, activeLast24h: 88, activeLast7d: 201, inactive14d: 7, byLabel: [] } })
    if (p === '/api/admin/feedback') return route.fulfill({ json: opts.feedback ? opts.feedback(req) : { items: [], total: 0, unread: 0, held: { waiting: 0, withheld: 0, byReason: {} } } })
    if (p === '/api/admin/accounts') return route.fulfill({ json: { items: ACCOUNTS, total: 2 } })
    if (p === '/api/admin/invites') return route.fulfill({ json: { items: INVITES, total: 2 } })
    if (p === '/api/admin/audit') return route.fulfill({ json: { items: opts.audit ? opts.audit(req) : [] } })
    return route.fulfill({ status: 404, json: { error: 'nf' } })
  })
  return { reqs, me: () => meCalls, token: () => `tok${meCalls}`, posts: () => reqs.filter((r) => r.method === 'POST') }
}

function toReq(route: Route): Req {
  const rq = route.request()
  const u = new URL(rq.url())
  let body: unknown = null
  try {
    body = rq.postDataJSON()
  } catch {
    /* no body */
  }
  return { method: rq.method(), path: u.pathname, query: u.searchParams, headers: rq.headers(), body }
}


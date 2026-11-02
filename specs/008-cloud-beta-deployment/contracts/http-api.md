# HTTP Contract: Auth, Admin Console, Feedback, Runtime

**Feature**: SPEC-008 | **Date**: 2026-11-01

Conventions: JSON bodies, `Content-Type: application/json` required on every `POST`. Errors are `{"error":"<message>","code":"<machine_code>"}`. Times are RFC 3339 UTC strings; the UI renders them in IST. Router uses Go 1.22 method+path patterns (DC-02). No CORS headers are ever emitted (NFR-SEC-04).

When auth is **off** (self-hosted default) none of the gate rules apply, `/api/auth/*` and `/api/admin/*` return `404`, and `/api/runtime` reports `authRequired:false`.

## Gate (FR-001)

When auth is on, every `/api/*` request needs a valid learner session cookie `session`, except:

| Path | Notes |
| --- | --- |
| `GET /api/health` | exact body `{"ok":true}` (NFR-REL-02) |
| `GET /api/runtime` | public deployment facts |
| `/api/auth/*` | sign-in, activation, session probe, admin OIDC |
| `/api/admin/*` | own check: valid `admin_session` cookie |

Failure responses: `401 {"error":"Sign in required","code":"signin_required"}`; expired account `401 {"error":"Your beta access has expired. Ask your teacher or admin to extend it.","code":"account_expired"}`; revoked `401 {"code":"account_revoked"}`. The session cookie is cleared on the last two. Revoking an account or reissuing its password deletes its sessions, so that learner's next request answers `signin_required`; signing in again then shows `account_revoked` (or works with the new password).

## Runtime

### `GET /api/runtime` → 200

```json
{ "hosted": true, "authRequired": true, "tutorEnabled": false, "feedbackEnabled": true }
```

`tutorEnabled:false` makes the UI hide the tutor panel, microphone and read-aloud controls (FR-024). `feedbackEnabled` is true only when auth is on, the store is available **and the feedback auditor is configured** (FR-058).

## Learner

### `GET /api/auth/session` → 200 (always)

```json
{ "authenticated": true, "betaId": "BETA-7KQ3-M9XP", "label": "School A", "expiresAt": "2027-01-01T08:30:00Z", "daysLeft": 61, "expiringSoon": false }
```

Unauthenticated: `{"authenticated":false}`. `expiringSoon` is true when `daysLeft <= 7` (FR-011).

### `POST /api/auth/activate`

Request `{ "token": "<invite token from the link>" }`.

| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "betaId", "password", "expiresAt" }` + `Set-Cookie: session` | valid pending invite; password shown once |
| 404 | `code: invite_invalid` | unknown token |
| 409 | `code: invite_used`, message "This invite has already been used. Please sign in." | already used |
| 410 | `code: invite_expired` or `invite_revoked` | past 14 days or revoked |
| 429 | `code: rate_limited` | per-address request limit |

### `POST /api/auth/login`

Request `{ "betaId": "BETA-7KQ3-M9XP", "password": "maple-tiger-river-cloud-482" }`.

| Status | Body | When |
| --- | --- | --- |
| 200 | session fields as in `GET /api/auth/session` + `Set-Cookie: session` | correct |
| 401 | `code: bad_credentials`, "Beta ID or password is incorrect." | wrong ID or password (same message for both) |
| 401 | `code: account_expired` / `account_revoked` | correct credentials, account unusable |
| 429 | `code: locked`, "Too many attempts. Try again in 15 minutes." + `Retry-After` | FR-013 |

### `POST /api/auth/logout` → 204

Deletes the server session and clears the cookie. Always 204.

## Admin sign-in (OIDC)

### `GET /api/auth/admin/login` → 302

Sets signed cookie `oidc_flow` and redirects to the provider's authorization endpoint (code flow, PKCE S256, state, nonce, scopes `openid email`). `503 {"code":"admin_not_configured"}` if OIDC is not configured.

### `GET /api/auth/admin/callback?code=&state=` → 302 `/admin`

Validates state against `oidc_flow`, exchanges the code, verifies the ID token, checks the email allowlist, sets `admin_session` (8 hours, HttpOnly, SameSite=Lax) and redirects to `/admin`. Failures redirect to `/admin?error=<code>` where code is one of `state`, `token`, `not_allowed`, `mfa_required`. The attempted email is never put in the URL.

### `POST /api/auth/admin/logout` → 204

Clears `admin_session`. Requires the CSRF header.

## Admin (all require `admin_session`; non-GET also require `X-CSRF-Token` and a same-origin `Origin`)

Failures: `401 {"code":"admin_required"}`, `403 {"code":"csrf"}`.

### `GET /api/admin/me` → 200

`{ "email": "owner@example.org", "csrfToken": "…" }`

### Overview (FR-041)

`GET /api/admin/overview` → 200

```json
{
  "generatedAt": "…",
  "seats": { "used": 312, "cap": 1000 },
  "accounts": { "active": 290, "expired": 12, "revoked": 4, "expiringIn7Days": 9 },
  "invites": { "pending": 22 },
  "activeNow": 14,
  "activeLast24h": 88,
  "activeLast7d": 201,
  "ai": { "todayUSD": 0, "ceilingUSD": 1, "monthToDateUSD": 0, "budgetUSD": 30 },
  "feedback": { "unread": 3 },
  "tutorEnabled": false
}
```

### Users and invites (FR-015, FR-043)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/dashboard?label=` | FR-015 counts, filterable by label; includes `labels: string[]` |
| `GET /api/admin/accounts?label=&status=&sort=lastSeen\|expiry\|activated&order=asc\|desc&limit=&offset=` | rows `{betaId,label,status,derivedStatus,activatedAt,expiresAt,lastSeenAt,devices,activeNow}`; `status` filter: `active,expired,revoked` |
| `GET /api/admin/accounts.csv?label=&status=` | export without passwords (FR-016): `betaId,label,status,activatedAt,expiresAt,lastSeenAt` |
| `GET /api/admin/invites?status=` | rows `{id,label,status,createdAt,expiresAt,createdBy,usedAt}`; never tokens |
| `POST /api/admin/invites` | `{count:1..100,label?}` → 201 `{ "links": ["https://…/invite/<token>", …] }` shown once; 409 `code: seat_cap` "Seat cap reached (1,000)" and nothing created |
| `GET /api/admin/invites.csv` is **not provided** | tokens are not stored; the UI offers "Download these links (CSV)" generated in the browser from the 201 response |
| `POST /api/admin/invites/{id}/revoke` | 204; frees the seat |
| `POST /api/admin/accounts/{betaId}/revoke` | 204; sessions deleted; 404 unknown |
| `POST /api/admin/accounts/{betaId}/extend` | `{months?:1..24 default 2}` → `{expiresAt}`; 409 `code: revoked` for revoked |
| `POST /api/admin/accounts/extend-label` | `{label, months?}` → `{extended: n}` (revoked skipped) |
| `POST /api/admin/accounts/{betaId}/reissue` | → `{password}` shown once; old password and all sessions invalidated; expiry unchanged |

#### Response shapes for users and invites (as built)

- `GET /api/admin/dashboard?label=` → `{ "seatsUsed": 312, "seatCap": 1000, "active": 290, "expired": 12, "revoked": 4, "pendingInvites": 22, "expiringIn7Days": 9, "labels": ["School A - Grade 7"] }`. `seatsUsed` and `seatCap` are global; the other counts follow the label filter.
- `GET /api/admin/accounts?...` → `{ "items": [ { "betaId", "label", "status": "active" | "expired" | "revoked", "activatedAt", "expiresAt", "lastSeenAt" | null, "devices": 0, "activeNow": false } ], "total": 0 }`. `status` is the derived status.
- `GET /api/admin/invites?status=` → `{ "items": [ { "id", "label", "status": "pending" | "used" | "revoked" | "expired", "createdAt", "expiresAt", "createdBy", "usedAt" | null } ], "total": 0 }`.
- `POST /api/admin/invites` → `201 { "links": ["https://…/invite/<token>"] }`; `409 { "code": "seat_cap", "error": "Seat cap reached (1,000)" }`; `400 { "code": "invalid" }`.
- `POST /api/admin/accounts/{betaId}/reissue` → `{ "password": "…" }`, shown once; the old password and all of the account's sessions end at once.
- `POST /api/admin/accounts/{betaId}/extend` `{ "months": 2 }` → `{ "expiresAt": "…" }`; `POST /api/admin/accounts/extend-label` `{ "label": "…", "months": 2 }` → `{ "extended": 12 }`. Months are 1 to 24, default 2.
- `GET /api/admin/audit?limit=100&before=<id>` → `{ "items": [ { "id", "at", "actor", "action", "target", "detail" } ] }`, newest first; page by passing the last `id` as `before`.
- All admin writes are `POST` with `Content-Type: application/json` (send `{}` when there is nothing to send) and the `X-CSRF-Token` from `GET /api/admin/me`.

### Usage (FR-042)

`GET /api/admin/usage?days=30` (7 or 30) → 200

```json
{
  "generatedAt": "…",
  "days": 30,
  "series": [ { "date": "2026-11-01", "dau": 40, "signinOk": 55, "signinFail": 3, "activations": 6, "quiz": 20, "tutorQuestions": 0, "requests": 2400, "errors5xx": 1 } ],
  "totals": { "today": {}, "last7d": {}, "last30d": {} },
  "lessons": [ { "lessonId": "1-intro", "views": 180 } ]
}
```

`totals.*` use the same measure names as `series` items. `dau` totals are sums of daily distinct counts (a person active on 3 days counts 3); the UI labels them "account-days".

### Users activity (FR-043)

`GET /api/admin/users/activity` → `{ generatedAt, activeNow, activeLast24h, activeLast7d, inactive14d, byLabel:[{label,accounts,activeLast7d}] }`. Per-account rows come from `GET /api/admin/accounts`.

### Costs (FR-044, FR-045)

`GET /api/admin/costs` → 200

```json
{
  "generatedAt": "…",
  "ai": {
    "estimated": true,
    "todayUSD": 0.12, "ceilingUSD": 1.0, "ceilingReached": false,
    "monthToDateUSD": 1.9, "budgetUSD": 30, "budgetUsedPct": 6.3,
    "thresholds": { "50": false, "90": false, "100": false },
    "projectedMonthUSD": 18.4,
    "daily": [ { "date": "2026-11-01", "usd": 0.12 } ]
  },
  "hosting": { "connected": false, "reason": "Cloud billing source is not connected", "items": [] }
}
```

`projectedMonthUSD` is `null` before day 4 of the month. `hosting.items` is `[{name, usd}]` when connected.

### Feedback inbox (FR-051, FR-052)

Only items whose review is `passed` are ever returned or exported.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/feedback?status=&category=&rating=&lessonId=&label=&limit=&offset=` | newest first; `{ items:[{id,at,rating,category,message,label,lessonId,mode,appVersion,status}], total, unread, held:{waiting:n, withheld:n, byReason:{personal_details:n,...}} }`. `held` carries counts only, never text |
| `POST /api/admin/feedback/{id}/status` | `{status:"new"\|"read"\|"resolved"}` → 204; 404 if not passed; audit `feedback.status` |
| `POST /api/admin/feedback/{id}/delete` | 204; audit `feedback.delete` |
| `GET /api/admin/feedback.csv?…same filters` | CSV of passed items; audit `feedback.export`; cells starting `= + - @` are prefixed with `'` |

### Audit (FR-017)

`GET /api/admin/audit?limit=100&before=<id>` → `{ items:[{id,at,actor,action,target,detail}] }` newest first.

## Learner feedback (FR-047..FR-050, FR-055..FR-059)

### `POST /api/feedback` (learner session required)

```json
{ "rating": 4, "category": "content", "message": "Lesson 2 was clear", "lessonId": "2-symbolic", "mode": "junior", "appVersion": "3.2.0" }
```

| Status | When |
| --- | --- |
| 201 `{ "ok": true }` | passed the rule check and stored as `waiting`; the response does not say whether the auditor has run |
| 400 `code: invalid` | rating outside 1..5, bad category, message over 500 characters, unknown fields |
| 422 `code: pii_detected`, "Please remove personal details (like phone numbers, emails or addresses) and send again." plus `"kind": "phone"\|"email"\|"address"\|"id_number"\|"date_of_birth"\|"link"` | the rule check matched; **nothing stored**; the matched text is never echoed or logged |
| 429 `code: feedback_limit` "Thanks! You've sent a few already. Please try again later." | 5 per account per hour (a 422 rejection also counts) |
| 404 | auth off, or the auditor is not configured |

The server ignores any identity in the body and takes the label from the session's account.

### Auditor call (internal, not an HTTP endpoint of this app)

Request to the configured AI provider: system instruction stating the message is untrusted data and must never be obeyed; the message in a delimited block; no tools; low token limit. Accepted reply: exactly `{"verdict":"pass"}` or `{"verdict":"withhold","reason":"<one of personal_details|contact_details|address|abusive|unsafe|injection_attempt|unclear>"}`. Any other reply, HTTP error, timeout or spend-ceiling refusal leaves the item `waiting`.

## Usage events

### `POST /api/usage/event` (learner session required)

`{ "event": "quiz_open" }` → 204. Any other value → 400 `code: invalid`. Counts the opening of a quiz, which the server cannot otherwise see (FR-040). It carries no identity.

## Tutor (changes to existing endpoints)

- `POST /api/tutor`, `POST /api/tutor/stream`: when `tutorEnabled` is false → `503 {"error":"tutor disabled"}` before body parsing or any model client.
- `POST /api/tutor/prepare` (hosted only, learner session, tutor rate limit; FR-021a): same body and `400`/`404`/`413` rules as `/api/tutor`. Works when `tutorEnabled` is false and never calls a model. `200 {"safetyReply"}` when the question is screened out, else `200 {"messages":[{"role":"system","content"},{"role":"user","content"}],"maxTokens","citation","fallback"}`. Not registered on a self-hosted server.
- Any unknown `/api/*` path → `404 {"error":"not found"}`, never `index.html`.
- At the daily ceiling → `200` with the reply text "The tutor is resting until tomorrow." in the normal answer shape (JSON answer, or SSE token then done), no model call.
- Store failure while reserving spend → `503 {"error":"tutor temporarily unavailable"}`.

## Rate limits

Per client address (trusted-proxy aware): `login` and `activate` 30 requests/minute; `feedback` 20/minute (the 5-per-hour account limit is separate); admin endpoints 120/minute. Exceeding returns `429 {"code":"rate_limited"}` with `Retry-After`.

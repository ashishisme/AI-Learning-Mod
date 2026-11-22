# Data Model: Invite-Only Access, Spend, Usage, Feedback

**Feature**: SPEC-008 | **Date**: 2026-11-01

All persistent state lives behind `state.Store` (see [contracts/store.md](./contracts/store.md)). Times are stored in UTC (RFC 3339) and displayed in IST. **No record in this model holds a name, email (learners), phone, date of birth, network address, user agent or tutor question text.** The only email stored is an admin's, in audit entries (required by FR-017).

## Entities

### Invite

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string, 10 chars `[a-z2-9]` | public handle used by admins to list and revoke; unique |
| `tokenHash` | string, hex SHA-256 | of the 256-bit link token; the token itself is never stored; unique |
| `label` | string, 0..40 chars | group label; letters, digits, space, `-`, `_`, `.`; no personal names (UI guidance, FR-036) |
| `createdBy` | string | admin email |
| `createdAt` | time | |
| `expiresAt` | time | `createdAt + 14 days` (FR-003) |
| `status` | `pending` / `used` / `revoked` | `expired` is derived: `pending` and `now > expiresAt` |
| `usedAt` | time, optional | set on activation |
| `accountId` | string, optional | Beta ID created from it |

**Transitions**: `pending → used` (activation), `pending → revoked` (admin), derived `pending → expired`. No transition leaves `used` or `revoked`. A pending, unexpired invite holds one seat.

### Account (beta account)

| Field | Type | Rules |
| --- | --- | --- |
| `betaId` | string `BETA-XXXX-XXXX` | primary key; alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `passwordHash` | string | `pbkdf2-sha256$iter$salt$hash`; never returned by any API |
| `label` | string | copied from the invite |
| `activatedAt` | time | |
| `expiresAt` | time | `AddMonthsIST(activatedAt, 2)`; changed only by extend |
| `status` | `active` / `revoked` | `expired` is derived: `active` and `now >= expiresAt` |
| `lastSeenAt` | time, optional | 1-minute precision; written by the usage flush |
| `extensions` | list of `{at, by, months, newExpiresAt}` | history (FR-008, FR-017 support) |
| `passwordReissuedAt` | time, optional | |

**Transitions**: `active → revoked` (admin; deletes sessions, frees the seat); derived `active → expired`; extend on `active` or expired sets `expiresAt = AddMonthsIST(max(now, expiresAt), months)`. Extend on `revoked` is refused. An account expired for more than 90 days is deleted by the sweep (FR-039). A seat is held by `active` accounts (expired or not) until revoked or deleted.

### Session (learner)

| Field | Type | Rules |
| --- | --- | --- |
| `tokenHash` | string, hex SHA-256 | primary key |
| `betaId` | string | |
| `createdAt` | time | |
| `expiresAt` | time | `min(createdAt + 14 days, account.expiresAt at creation)`; re-checked against the account on every request |

Deleted on sign-out, account revoke, password reissue, expiry detection, or sweep. Holds no address or device string; a device count is the number of sessions for an account.

### Admin session (not stored)

HMAC-signed cookie `admin_session` carrying `{email, csrf, exp}` (8 hours). Login flow state is another signed cookie `oidc_flow` carrying `{state, nonce, verifier, exp}` (10 minutes).

### Audit entry

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | monotonic, sortable |
| `at` | time | |
| `actor` | string | admin email, or `system` for sweeps |
| `action` | string | `invite.create`, `invite.revoke`, `account.revoke`, `account.extend`, `account.extend_label`, `account.reissue`, `account.purge`, `feedback.status`, `feedback.delete`, `feedback.export` |
| `target` | string | Beta ID, invite id, label, or feedback id; never a token or password |
| `detail` | string, ≤200 | e.g. `count=5 label=School A`, `months=2`; never secrets |

Append-only; retained at least 12 months (not swept before 24 months).

### Counter

`key → int64`. Keys (all dates are IST `YYYY-MM-DD`, hours `YYYY-MM-DDTHH`):

| Key | Unit | Written by |
| --- | --- | --- |
| `spend:<date>` | micro-US-dollars | spend tally (transactional) |
| `usage:<date>:req`, `:err5xx` | count | session gate (via recorder) |
| `usage:<date>:signin_ok`, `:signin_fail`, `:activation` | count | auth handlers |
| `usage:<date>:dau` | count | recorder, first sighting of an account that day |
| `usage:<date>:lesson:<lessonId>` | count | lessons handler |
| `usage:<date>:quiz`, `:tutor_q` | count | quiz open, tutor handler |
| `fbrate:<hash16>:<hour>` | count | feedback rate limit; `hash16` is the first 16 hex chars of SHA-256 of the Beta ID |

Counters older than 400 days are swept.

### Attempt (lockout)

`key → []time` for `id:<BETAID>` and `ip:<address>`. Entries older than 15 minutes are dropped on write and by the sweep. Addresses live here only for the 15-minute window; they are not copied anywhere else.

### Feedback item (DC-09 amendment 2, ratified)

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | random, 12 chars |
| `at` | time | |
| `rating` | int | 1..5 |
| `category` | `bug` / `content` / `idea` / `other` | |
| `message` | string | at most 500 runes; empty when `review = withheld`; stored only after the rule check found nothing |
| `label` | string | the sender's account label, may be empty |
| `lessonId` | string | matches the lesson id pattern or empty |
| `mode` | `standard` / `junior` / `plain-english` | |
| `appVersion` | string, at most 20 | |
| `status` | `new` / `read` / `resolved` | admin triage; only meaningful when `review = passed` |
| `review` | `waiting` / `passed` / `withheld` | set `waiting` on store; changed only by the auditor |
| `withheldReason` | enum or empty | `personal_details`, `contact_details`, `address`, `abusive`, `unsafe`, `injection_attempt`, `unclear`; set only when `review = withheld` |
| `reviewedAt` | time, optional | |
| `reviewTries` | int | auditor attempts so far; informational |
| `claimedUntil` | time, optional | processing metadata: one auditor worker at a time across instances |

**Transitions**: `waiting → passed` or `waiting → withheld` (text deleted in the same transaction). No transition leaves `passed` except deletion. A rule-check rejection never creates a record. Deleted after 180 days from `at`, or 7 days from `at` if still `waiting`. Admin queries and exports return only `review = passed`. No Beta ID, address, session or device details; the auditor's free text is never stored.

### Cost snapshot (computed, not stored)

`{generatedAt, ai:{todayUSD, monthToDateUSD, ceilingUSD, budgetUSD, thresholds:{50,90,100:reached bool}, projectedMonthUSD|null}, hosting:{connected, reason, items[]}}`. `projectedMonthUSD` is null before day 4 of the month.

### Seat count (computed)

`accounts(status=active) + invites(status=pending and now <= expiresAt)`, never above `SEAT_CAP` (default 1000).

## Relationships

```text
Invite 1 ──activates──▶ 0..1 Account 1 ──has──▶ 0..n Session
Account ──label──▶ Invite.label (copied)       Feedback.label (copied at send time)
Audit.target ──▶ Invite.id | Account.betaId | label | Feedback.id
```

## Persisted file layout (file store)

```json
{
  "version": 1,
  "invites": { "<id>": {} },
  "accounts": { "<betaId>": {} },
  "sessions": { "<tokenHash>": {} },
  "audit": [],
  "counters": { "<key>": 0 },
  "attempts": { "<key>": ["<time>"] },
  "feedback": { "<id>": {} }
}
```

Loading a file with an unknown `version` or invalid JSON stops startup with an error; the store never starts empty over an existing file.

## Validation summary

- Labels: trimmed, ≤40 chars, `[A-Za-z0-9 _.-]`.
- Invite batch size: 1..100 per request.
- Extend months: 1..24 (default 2).
- Beta ID and password input: trimmed, case-insensitive, spaces and dashes normalised.
- Feedback: see Feedback item; unknown fields rejected (`DisallowUnknownFields`), body ≤ 4 KiB.

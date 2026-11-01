# Quickstart: Validating Invite-Only Access, Spend Ceiling, Admin Console, Feedback

**Feature**: SPEC-008 | Contracts: [http-api.md](./contracts/http-api.md), [store.md](./contracts/store.md) | Data: [data-model.md](./data-model.md)

This is a validation guide. It does not contain implementation.

## Prerequisites

- Go 1.23, Node 20, `npm --prefix web ci`, Playwright browsers installed.
- Constitution 2.1.0 applied. For the feedback scenarios, amendment 2 (2.2.0) ratified.

## 1. Automated gates

```bash
go vet ./... && go test -race ./...
cd web && npx tsc --noEmit && npm run build && npx playwright test
```

Expected: all green. The Go suite includes the store contract tests (atomicity, 50-way concurrency, restart durability), PBKDF2 known-answer tests, OIDC negative tests (bad signature, wrong `iss`/`aud`/`nonce`, expired, `alg: none`, unlisted email), lockout, expiry maths, spend reservation under concurrency, the personal-details rule-check corpus, the fake-AI auditor tests (pass, withhold, unusable, injection text, no call when idle), and an end-to-end router test using the fake identity provider.

## 2. Local run with auth and a fake identity provider

```bash
# terminal 1: development-only OIDC provider (prints its issuer URL, admin email admin@example.org)
go run ./cmd/devidp -addr 127.0.0.1:9100

# terminal 2: server with auth on (add FEEDBACK_AUDITOR_BASE_URL/API_KEY/MODEL to enable Feedback; a fake auditor can be pointed at with MOCK values in tests)
AUTH_REQUIRED=true \
STATE_FILE=./data/state.json \
SESSION_SECRET="$(head -c 32 /dev/urandom | base64)" \
PUBLIC_BASE_URL=http://localhost:8080 \
OIDC_ISSUER=http://127.0.0.1:9100 OIDC_CLIENT_ID=dev OIDC_CLIENT_SECRET=dev \
ADMIN_EMAILS=admin@example.org \
go run ./cmd/server
```

(`web/` served by Vite on :3000 proxies `/api`; or build the SPA and open http://localhost:8080.)

## 3. Scenarios (map to spec acceptance scenarios)

| # | Do | Expect |
| --- | --- | --- |
| 1 | Open `/` signed out | Sign-in screen with the "invite-only beta" notice; no lesson content; `GET /api/lessons` returns 401 |
| 2 | Open `/admin`, choose sign in | Redirected to the fake provider, back to `/admin`; Overview shows seats 0 / 1000 |
| 3 | Admin: create 3 invites with label `School A – Grade 7` | 3 links shown once; "Download CSV" works; seats 3 / 1000 |
| 4 | Open link 1 in a fresh browser, press Activate | Beta ID and password shown once with Copy and "I've saved it"; expiry = same day two months later (IST); lessons open |
| 5 | Open link 1 again | "This invite has already been used. Please sign in." |
| 6 | Sign out (choose "also clear progress"), sign in on another browser with the credentials | Works; second device count shows 2 in Users |
| 7 | Enter a wrong password 10 times, then the right one | 429 "Too many attempts"; unlocks 15 minutes after the last failure |
| 8 | Admin: revoke the account | Next request from the learner's browser returns to sign-in within one request; seat freed |
| 9 | Admin: reissue password for another account | New password shown once; old one fails; expiry unchanged |
| 10 | Expiry and extension: covered by a Go test with an injected clock; by hand, stop the server, set the account's `expiresAt` in `data/state.json` to a past time, restart, then extend it as admin | Before extending: sign-in refused with the expiry message. After: sign-in works immediately |
| 11 | Start with `SEAT_CAP=5`, create 6 invites in one request | 409 "Seat cap reached (5)"; no invite created |
| 12 | Tutor: with `HOSTED_MODE=true` and no `TUTOR_ENABLED` | Tutor panel, mic and read-aloud hidden; `POST /api/tutor` returns 503 `tutor disabled` |
| 13 | Tutor: `TUTOR_ENABLED=true DAILY_SPEND_CEILING_USD=0.002` with `MOCK_TUTOR=true` | After a few questions: "The tutor is resting until tomorrow."; lessons still work |
| 14 | Admin → Usage after some browsing | Today's bars and lesson table update within 1 minute; no IPs, no Beta IDs anywhere |
| 15 | Admin → Users | Rows show last seen, devices, active now; filter by label and status work |
| 16 | Admin → Costs | AI spend and ceiling shown, thresholds at 50/90/100, projection after day 3; hosting row says "not connected" with no number |
| 17 | Learner → Feedback: rating 4, category content, message "call me on 98765 43210 or mail a.b at gmail dot com" | Refused with the "remove personal details" message (422); nothing appears in the state file; the server log has no matched text |
| 17b | Same learner sends "Lesson 2 was clear but the quiz was too long" | Confirmation; the admin Feedback tab shows nothing yet; after the auditor runs (fake auditor in dev) the item appears with lesson and group label only, nothing identifying |
| 17c | Send "my name is Asha from Rose Valley school" with the fake auditor set to withhold | The item never appears; the admin sees "Withheld: 1" with reason `personal_details`; the state file holds no text for it |
| 17d | Stop the fake auditor and send clean feedback | Item stays hidden from admins and is retried; an item still waiting after 7 days (clock test) is deleted; with zero feedback, no AI call is made |
| 18 | Send 6 feedback items within an hour | The 6th is refused with the "try again later" message |
| 19 | Admin: mark read, then resolved, then export CSV, then delete | Unread count updates; Audit tab lists `feedback.status`, `feedback.export`, `feedback.delete`; export holds only passed items |
| 20 | Restart the server | Accounts, invites, spend tally and feedback remain; usage loses at most the last 30 seconds |

## 4. Privacy spot check (SC-012, SC-016)

```bash
grep -E '@|https?://|[0-9]{7,}' data/state.json   # only admin emails in audit entries may match
grep -i 'password' data/state.json                 # only "passwordHash" fields
```

Logs (`logs/server.log`) must contain no passwords, tokens or cookies.

## 5. Deployment note

The file store is for one instance with a persistent volume. Do not run it on ephemeral storage or with more than one instance until the managed store adapter exists.

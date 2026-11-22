# Focused security review

This is source review, not a penetration test or cloud IAM audit. Tests cover several local controls; deployed configuration remains unverified.

| Priority | Finding and evidence | Threat and recommended action | Verification |
|---|---|---|---|
| P0 | Hosted mode uses `STATE_FILE` (`cmd/server/config.go:122-127`, `main.go:132`). | Ephemeral or multi-instance state can lose/recreate accounts and revoke history. Require managed transactional state before Cloud Run. | Restart, scale-to-zero and concurrent-seat tests. |
| P0 | Terraform defines secret containers/access only (`deploy/terraform/main.tf`). WIF provider and runtime/deploy identities are absent. | A broad or misbound identity could deploy or read secrets. Scope GitHub WIF by repository, tag and environment; separate identities and minimal roles. | Terraform plan/IAM review and attempted unauthorized principal access in staging. |
| P1 | CSP allows GitHub-hosted images and `data:` (`internal/api/middleware.go:13`). | External image requests expose access metadata and break offline rendering. Bundle images; review `data:` need; set self-origin/approved-host policy. | Browser network assertion with third-party domains blocked. |
| P1 | Auth/session protections exist: hashed session tokens, HttpOnly/SameSite cookies, secure flag for HTTPS, admin CSRF token and same-origin check (`internal/api/session_gate.go:48`, `admin_handlers.go:106`). | Cloud proxy/base-URL misconfiguration could weaken cookies or origin checks. Validate actual HTTPS redirect and host/proxy settings. | Staging browser cookie, CSRF and forged forwarding-header tests. |
| P1 | OIDC and feedback auditor use configured client secrets/API key (`cmd/server/config.go:85-90`, `:108-120`). | Secret exposure through environment or logs. Inject from Secret Manager; distinguish platform managed identity from third-party auth. Avoid printing values. | Secret/version IAM review and log scan. |
| P1 | Rate limiter for tutor is process-local (`internal/api/ratelimit.go:25-35`). Lockout uses shared Store. | Requests distributed across instances can bypass per-instance limits. Use shared policy for critical limits and test multi-instance behavior. | Parallel requests via two instances. |
| P2 | Panic logger includes error/stack/path (`internal/api/middleware.go:35-56`). | A future panic string might contain sensitive data. Sanitize logs and enforce retention/access limits. | Inject safe panic, inspect captured logs. |
| P2 | Container runs UID 10001 and removes package manager (`Dockerfile`); runtime has no live image scan in this review. | Dependency/base image vulnerabilities may remain. Scan pinned image and dependencies in CI; review SBOM and patches. | CI scan and staged image inspection. |

Do not add Cloud Armor or an external HTTPS load balancer by default. Reassess if abuse metrics, geographic restrictions, custom-domain policy or edge WAF requirements justify recurring cost and operational overhead. The beta demo runs in staging. Build a distinct production security boundary for GA; do not connect beta credentials or data to it.

Privacy: the Store contract forbids learner PII and tutor text (`internal/state/store.go:1-4`); `internal/api/privacy_test.go` checks local state/log behavior. A Firestore schema, backups, billing exports and telemetry need the same data-minimization review. Retention/deletion must be implemented and tested across live records and backup policy.

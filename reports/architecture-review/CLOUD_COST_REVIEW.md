# Cloud cost review

The SPEC-007 numbers are planning estimates, not observed bills. This review did not access billing data, a project or a pricing calculator. Confirm prices, region and quotas before approval.

| Cost driver | Current evidence | Beta control and trade-off |
|---|---|---|
| Cloud Run | No service exists in Terraform | Start with minimum instances 0, small maximum and measured concurrency; cold starts are acceptable only if UX targets permit. Request CPU/memory and streaming duration affect cost. |
| Firestore | No adapter/database | Count reads and writes per user action; avoid full-state scans and hot global counters. Native transactions need contention tests. Use only required indexes. |
| Backups | None | Daily schedule with short, owner-approved retention; cost storage and restore drills. Google supports daily [Firestore backups](https://docs.cloud.google.com/firestore/native/docs/backups). |
| Artifact Registry | Workflow pushes images, repository not provisioned | Retain active and rollback digests; clean older images automatically after a safe window. |
| Logs/Monitoring | `slog` only; no cloud policies | Low-cardinality metrics, no learner text, bounded retention and alert routing. Measure ingestion volume before adding tracing. |
| Network/egress | External OIDC, auditor and remote images | Bundle images; measure egress and third-party calls. Avoid CDN/load balancer until latency and traffic justify them. |
| AI | Tutor hosted default off; feedback auditor optional | Keep tutor off. Track auditor tokens and fail closed. Do not equate estimated token spend with provider invoice. |

The reported “$0 idle” should mean no idle Cloud Run compute, not zero total cloud bill; storage, backups and registry can persist while the service is idle. [Minimum instances can be set to zero](https://docs.cloud.google.com/run/docs/configuring/min-instances), but the latency trade-off should be measured.

Budget alerts at 50%, 90% and 100% should reach the owner through a tested notification channel. An alerts-only budget [does not cap spending](https://docs.cloud.google.com/billing/docs/how-to/budgets), and [programmatic notifications may be delayed](https://docs.cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications). For the tutor, use an independent, persisted application policy: a conservative shared spend reservation, automatic disabled latch at threshold, fail-closed behavior when cost data is unavailable, and an audited authorized manual reset. Keep the tutor off throughout the beta.

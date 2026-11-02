# Cloud deployment status

**Nothing is deployed, and deployment must stay off.** The agreed design is in
[`specs/008-cloud-beta-deployment/cloud-beta-design.md`](../specs/008-cloud-beta-deployment/cloud-beta-design.md).
The work is tracked in [Phase 10 of its tasks](../specs/008-cloud-beta-deployment/tasks.md).

**Environment decision:** the staging Cloud Run environment is the initial
invite-only beta demo. A separate production environment is a GA milestone. It is
not provisioned or targeted by this work.

## What exists today

| Item | State | Still needed |
| --- | --- | --- |
| Application | Firestore adapter, Cloud Run refusals, secret files, bundled images, tightened CSP, tutor latch: built and tested, including on the Firestore emulator with two server processes | Production concurrency on real Firestore (T120) |
| `.github/workflows/deploy.yml`, `rollback.yml`, `scripts/smoke.sh` | `actionlint` clean; smoke script tested on a real server; guarded by `CLOUD_DEPLOYMENT_READY` | A first real run on GitHub |
| `terraform/` | `fmt` and `validate` pass | `terraform plan` against the staging project, then apply (T112) |

Nothing has been deployed, no image has been built, and `terraform plan` has not run.

Do not set `CLOUD_DEPLOYMENT_READY` to `true` until T120 has passed and the owner
has approved the cutover (T121).

## Target staging beta

- One image on Cloud Run v2 with `min=0`, `max=2` and instance-based billing, with no
  CDN or external load balancer by default.
- Firestore Standard edition in Native mode, reached over a standard-library REST
  client with the runtime identity.
- Daily Firestore backups with a tested restore into a separate database.
- A tag-only release: digest-pinned no-traffic candidate, smoke test, reviewer
  approval, promotion, and one-step rollback.
- Region `us-central1` (owner decision) on the `run.app` URL. A custom domain is
  optional and not needed for the beta.
- Budget alerts at 50%, 90% and 100%. These notify the owner and do **not** cap
  spending. The tutor stays off.

Secrets are mounted from Secret Manager as Cloud Run volumes and read by the
service's own identity. They are never hardcoded, in plain environment variables,
in GitHub configuration or in Terraform state. Feedback stays hidden until the
auditor key works in staging.

## What the owner needs to provide

The open decisions and recommendations are in section 6 of the design. External
inputs: staging project, billing account, IAM/WIF administrator, IdP issuer and
client, secret versions, budget amount, alert destination, backup retention and
recovery targets, and written cutover approval.

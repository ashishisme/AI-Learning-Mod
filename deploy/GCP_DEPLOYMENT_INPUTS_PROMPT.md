# Prompt for the Google Cloud AI assistant: inputs and plan for the staging beta

Paste everything below the line into the Google Cloud AI assistant, ideally while the staging project is selected so it can inspect it. It contains no secrets. **Never paste a secret value, token or key into the assistant.** Secrets go into Secret Manager with the commands in section 4.

---

You are helping the owner of **AI Foundations Coach** prepare its first Google Cloud deployment: an **invite-only beta demo in a staging project**. Your job is to:

1. check the plan and architecture below against current Google Cloud behaviour;
2. help the owner find or decide every input in section 2;
3. find anything in the project or organisation that would block the plan.

**Read only.** Do not create, change or delete any resource, and do not run anything that does. Where an action is needed, write the command for the owner to run. Never ask for, display or store a secret value. Cite official Google Cloud documentation for any behaviour, limit, role or price you rely on, and say when you are unsure.

**Snapshot date: 2026-11-02.** Treat it as today. Do not flag a version or product as nonexistent from memory; check the docs.

## 1. What is being deployed

A small learning app for an invite-only class beta, whose learners may be children. Learners get single-use invites and system-generated IDs; no names, emails or birth dates are collected. Admins sign in with OIDC. A Go server and React app ship as **one container**.

Built and tested locally (application code is done; the cloud side has never run):

- Go 1.27.3 server using the standard library only. No new modules are allowed without a constitution amendment, which is why the Firestore client is hand-written REST rather than the Go SDK.
- Durable state in **Firestore Native mode**. It is tested on Google's emulator, including two server processes sharing one database. At 50 writers on one document the emulator livelocks, and production concurrency is still unproven.
- Secrets are read from **files mounted from Secret Manager**, never from plain environment variables. The app refuses to start on Cloud Run with plain secret variables, with the file-based store, or with an emulator address.
- Lesson images ship inside the image. The content policy allows only the app's own origin.
- The AI tutor stays **off** for the whole beta, behind a persisted budget switch.

Owner decisions already made:

| Decision | Value |
|---|---|
| Environment | Staging is the beta demo. A separate GA production project comes later; do not plan or touch it. |
| Region | `us-central1`. The Firestore location cannot be changed later. |
| Public URL | The default `run.app` URL. No custom domain, load balancer, CDN or Cloud Armor for the beta. |
| Idle cost rule | No idle compute or provisioned capacity; small storage and backup charges are allowed. |
| Feedback auditor key | Allowed only from Secret Manager, read at runtime by the service's own identity. Feedback stays hidden until it works. |

## 2. Inputs needed

For each row, tell the owner how to find or decide it, check it where you can see the project, and flag a problem. Fill in only non-secret values.

### 2.1 Project, billing and people

| Input | Used for | How to find or decide |
|---|---|---|
| Staging project ID, and project number | Terraform `project_id`, service URL | `gcloud projects describe PROJECT_ID --format='value(projectId,projectNumber)'` |
| Is it a new, empty project? | A `(default)` Firestore database that already exists in another location or mode would conflict | `gcloud firestore databases list --project PROJECT_ID` |
| Organisation, or no organisation | Which organisation policies apply | `gcloud projects get-ancestors PROJECT_ID` |
| Billing account ID, and whether it is linked | Terraform `billing_account`, budgets | `gcloud billing projects describe PROJECT_ID` |
| Who runs the first `terraform apply` | Must be able to create the resources in section 3 | Name the person; see 2.2 |
| Who may approve releases | Required reviewer on the GitHub `staging-promote` environment | Name one or more GitHub users |
| Who approves the beta cutover | Written approval before any traffic | The owner |

### 2.2 Credentials and access

No service-account key files may be created or downloaded at any point.

| Need | Plan | Confirm |
|---|---|---|
| A person applying Terraform | Uses their own `gcloud auth application-default login` | Which roles they need: we expect Project Owner (or an equivalent set) on the staging project, plus a billing role that can create budgets, such as Billing Account Costs Manager. Confirm the minimum. |
| GitHub releases | Workload Identity Federation, trusted only for repository `ashishisme/AI-Learning-Mod`, refs starting `refs/tags/v`, and GitHub environments `staging` or `staging-promote` | Whether this attribute condition is valid and cannot be satisfied by a fork, pull request or manual run on a branch |
| The running service | Its own service account with `roles/datastore.user` and accessor on named secrets only | Whether anything else is needed to read mounted secrets or write logs |
| Deploying a release | A deploy service account with `roles/run.developer` on the service, `roles/artifactregistry.writer` on the repository, and `roles/iam.serviceAccountUser` on the runtime account only | Whether `gcloud run deploy --no-traffic --tag` and `update-traffic` need more, such as viewing operations |
| Budget notifications | A Pub/Sub push subscription that signs its requests as a dedicated service account | Whether the budget can publish to the topic without extra IAM |

### 2.3 Application settings

| Input | Terraform variable | Notes |
|---|---|---|
| Identity provider for admin sign-in | `oidc_issuer`, `oidc_client_id` | If it is Google, the issuer is `https://accounts.google.com` and the client is an OAuth web client. Its authorised redirect URI must be `<service_url>/api/auth/admin/callback`. Say what the consent screen setup needs. |
| Admin emails | `admin_emails` | Comma-separated allowlist. Keep it in an uncommitted `terraform.tfvars`, because it is personal data. |
| Monthly budget in US dollars | `monthly_budget_usd` | Alerts at 50%, 90% and 100%. They notify the owner and **do not cap spending**. |
| Owner alert email | `owner_alert_email` | Must be tested for delivery. |
| Backup retention | `backup_retention` | Proposed 14 days, with a 24-hour recovery point and a 4-hour recovery time. Undecided (O4). |
| Feedback auditor | `feedback_auditor` | Optional: endpoint and model of a third-party AI provider. Leave empty and feedback stays hidden. |
| Maximum instances and concurrency | `max_instances`, `concurrency` | Starting values 2 and 80, to be revised from measurements. |

### 2.4 Secrets, held only in Secret Manager

Terraform creates three empty secrets and the access grants. The owner adds the values, so they never reach Terraform state:

| Secret | Value |
|---|---|
| `ai-foundations-coach-session-secret` | At least 32 random bytes |
| `ai-foundations-coach-oidc-client-secret` | The OAuth client secret |
| `ai-foundations-coach-auditor-api-key` | The auditor provider's key, only if feedback is wanted |

Write the commands so a value never appears on screen or in shell history, for example `openssl rand -base64 48 | gcloud secrets versions add SECRET --data-file=-`.

### 2.5 Other inputs

- **Terraform state:** there is no backend yet. Propose a Cloud Storage bucket for state, with versioning and access restricted to the people who apply. State holds the admin email list.
- **GitHub settings** after apply:
  - environments `staging` and `staging-promote`, with a `v*` tag rule on both and a reviewer on `staging-promote` only;
  - variables `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_ARTIFACT_REPOSITORY` and `GCP_SERVICE`, which Terraform outputs;
  - `CLOUD_DEPLOYMENT_READY` left unset until cutover.
- **Existing beta data (O5):** has a real beta already run on a single server? If not, Firestore starts empty and no migration is needed.
- **Privacy and residency:** the app runs on India time and the team expects learners in India, while the data will sit in `us-central1`. Note what the owner should ask counsel about COPPA and India's DPDP Act. Raise questions only; give no legal conclusions.

## 3. Deployment plan

1. **Preflight (read only):** check the project, billing link, organisation policies (section 5), quotas, enabled APIs and Firestore state. Report blockers.
2. **State backend:** the owner creates the state bucket; the Terraform gains a `backend "gcs"` block.
3. **Plan:** fill in `terraform.tfvars`, run `terraform plan`, and review it, especially IAM and anything the plan would destroy.
4. **Apply:** creates the resources listed below.
5. **Secrets:** the owner adds the secret values; the identity provider gets the redirect URI.
6. **GitHub:** set up the environments and variables, and push the code.
7. **Verify without deploying:** run the release workflow from a branch. It runs the tests, the lesson ingest, the emulator suite and the browser suite, and cannot deploy because it is not on a `v*` tag.
8. **First release:** with `CLOUD_DEPLOYMENT_READY` still off, run the staging acceptance by hand:
   - deploy a tagged revision with no traffic, run smoke checks, then promote it;
   - check sign-in, invites and session continuity across a new revision;
   - check streaming over TLS, scale-to-zero persistence, and 50 concurrent writers on real Firestore;
   - run a backup restore drill into a separate database;
   - roll back and time it (target: under 5 minutes);
   - check the content policy and budget alert delivery.
9. **Cutover:** with the owner's written approval, set `CLOUD_DEPLOYMENT_READY=true` and invite the first class.

## 4. Architecture

```text
Learner or admin browser ──HTTPS──▶ Cloud Run v2 service (one container, run.app URL)
                                      │  runtime service account
                                      ├──▶ Firestore Standard, Native mode, (default), us-central1
                                      ├──▶ Secret Manager (three secrets, mounted as files)
                                      ├──▶ Admin OIDC provider
                                      └──▶ Optional feedback auditor (third-party AI)
GitHub Actions (v* tags) ──WIF──▶ deploy service account ──▶ Artifact Registry, then Cloud Run
Cloud Billing budget ──▶ Pub/Sub ──signed push──▶ the app's budget route (switches the tutor off)
Cloud Scheduler (daily) ──▶ GET /api/health (wakes the service so retention clean-up runs)
```

**Created by Terraform** (`deploy/terraform/`):

- **Cloud Run v2 service:**
  - minimum 0 and maximum 2 instances, 1 vCPU, 512 MiB, concurrency 80, timeout 300 s;
  - instance-based billing, because background work gets no CPU otherwise;
  - a startup probe on `/api/health`;
  - `invoker_iam_disabled = true`, since the app has its own sign-in gate.
- **Firestore:** `(default)` database with pessimistic concurrency, delete protection, and a daily backup schedule.
- **Artifact Registry:** a repository with a cleanup policy that starts in dry-run mode, plus automatic image scanning.
- **Identities:** runtime, deploy and budget-push service accounts, and a Workload Identity pool and provider for GitHub.
- **Secrets:** the three Secret Manager secrets and their per-secret access grants.
- **Monitoring:** alerts at p95 latency above 1.5 s and error rate above 1%, log-based metrics for auth and streaming failures, and an email notification channel.
- **Logging:** request logs are excluded, because they record client addresses and invite tokens in URLs, and other logs are kept 30 days.
- **Budget:** at 50%, 90% and 100%, notifying by email and Pub/Sub.
- **Scheduler:** the daily wake-up job.

**Releases:** tag-only, by image digest. A no-traffic revision is smoke-tested, then promoted after a reviewer approves, with automatic rollback if the public URL then fails its checks. A separate workflow does a one-step rollback.

## 5. Checks to run against the project

Report each as OK, blocker, or needs action, with the evidence:

1. Organisation policies on the project:
   - `constraints/run.managed.requireInvokerIam` (or `constraints/run.requireInvokerIam`), which can stop us disabling the invoker check;
   - domain restricted sharing, which blocks the alternative of an `allUsers` invoker grant. **If both apply, the beta cannot be public without an exception.**
   - resource location restrictions, which must allow `us-central1`;
   - any rule against service-account creation or Workload Identity Federation.
2. Firestore Native mode, Cloud Run, Artifact Registry, Cloud Scheduler and Pub/Sub are available in `us-central1`, and Firestore's free tier applies to `(default)`.
3. Quotas that a first deployment could hit.
4. The roles the applying person actually holds, against what section 3 creates.
5. Whether the Terraform resource names and settings above match the current Google provider, version 8.9. It passes `terraform validate`, but has never run `plan`.

## 6. Questions to answer

1. Is the IAM in 2.2 sufficient and minimal? List any missing or excessive role.
2. Can the Workload Identity condition be bypassed?
3. Will a multi-architecture image with an SBOM attestation deploy to Cloud Run by digest?
4. Does excluding Cloud Run request logs remove client addresses and invite tokens everywhere, including any default sink?
5. What is the expected monthly cost while idle and at about 40 active learners in `us-central1`? Include instance-based billing with a daily 15-minute wake, Firestore storage and backups, Artifact Registry, logging, monitoring, Scheduler and Pub/Sub. Cite the pricing pages and date.
6. Is a daily backup alone enough for the proposed recovery targets, or is point-in-time recovery worth its cost here?
7. Anything in this plan that Google Cloud would do differently today, with the reason.

## 7. Reply format

1. **Verdict:** ready for `terraform plan`, ready after listed actions, or blocked. One paragraph.
2. **Input sheet:** the tables in section 2 with non-secret values filled where you could find them, and "owner to provide" otherwise.
3. **Blockers and actions:** ordered, each with the command or console step for the owner.
4. **Design corrections:** each with a citation and the smallest change.
5. **Answers to section 6.**
6. **What you could not check, and why.**

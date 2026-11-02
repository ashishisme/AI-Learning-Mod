# AI Foundations Coach — Complete GCP Deployment Guide

**Target Environment**: Google Cloud Platform (Cloud Run v2, Firestore Native, Secret Manager, WIF)  
**Deployment Region**: `asia-south1` (Mumbai)  
**Target Project**: `ai-learning-513415` (Project Number: `210042136085`)  
**Methodology Principle**: *Verify Twice, Apply Once*

---

## Architecture Summary

```
                       [ GitHub Actions CI/CD ]
                                  │
                   (OIDC Workload Identity Federation)
                                  ▼
[ User Browser ] ──HTTPS──▶ [ Cloud Run v2 (asia-south1) ]
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
   [ Firestore Native ]   [ Secret Manager ]   [ Artifact Registry ]
   - Invites & Accounts   - Session Secret     - Multi-arch Images
   - Sessions & Audits    - OAuth Client       - Signed SBOMs
   - Lockout & Spend        Secret
```

---

## Pre-Flight Checklist

Before starting, confirm you have access to:
- [x] GCP Project: `ai-learning-513415` with Owner/Editor permissions.
- [x] Billing Account: `0168EA-9F583A-BC8B44` (Active).
- [x] Google OAuth Client ID: `<YOUR_GOOGLE_OAUTH_CLIENT_ID>`.
- [x] Google OAuth Client Secret: `<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>`.
- [x] Admin Email: `qunityfy@gmail.com`.
- [x] GitHub Repository Admin Access: `ashishisme/AI-Learning-Mod`.

---

## Step 1: Infrastructure Bootstrap via Google Cloud Shell

Because your local machine does not have `terraform` or `gcloud` installed, perform this one-time bootstrap directly inside **Google Cloud Shell** in your web browser.

1. Open [Google Cloud Shell](https://shell.cloud.google.com/?project=ai-learning-513415).
2. When the terminal loads, execute the following commands in sequence:

```bash
# 1.1 Clone the repository and navigate to the Terraform directory
git clone -b cloud-beta https://github.com/ashishisme/AI-Learning-Mod.git
cd AI-Learning-Mod/deploy/terraform

# 1.2 Write the environment configuration file
cat << 'EOF' > terraform.tfvars
project_id         = "ai-learning-513415"
region             = "asia-south1"
service_name       = "ai-foundations-coach"
github_repository  = "ashishisme/AI-Learning-Mod"

billing_account    = "0168EA-9F583A-BC8B44"
monthly_budget_usd = 30
owner_alert_email  = "qunityfy@gmail.com"

oidc_issuer        = "https://accounts.google.com"
oidc_client_id     = "<YOUR_GOOGLE_OAUTH_CLIENT_ID>"
admin_emails       = "qunityfy@gmail.com"
backup_retention   = "1209600s"
EOF

# 1.3 Initialize Terraform
terraform init

# 1.4 Review the execution plan
terraform plan -out=tfplan

# 1.5 Apply the infrastructure
terraform apply tfplan
```

### What this provisions:
- Enables the 12 required Google Cloud APIs (`run.googleapis.com`, `firestore.googleapis.com`, `secretmanager.googleapis.com`, etc.).
- Creates the **Firestore Native** database in `asia-south1` with a 14-day daily backup schedule.
- Creates Service Accounts for runtime, deployment, and budget push notifications.
- Configures **Workload Identity Federation (WIF)** for GitHub Actions.
- Provisions **Artifact Registry** (`asia-south1-docker.pkg.dev/ai-learning-513415/ai-foundations-coach`).
- Configures the Cloud Run v2 service using a lightweight placeholder bootstrap image.
- Sets up Cloud Monitoring alert policies and Pub/Sub budget notifications.

---

## Step 2: Populate Secret Manager Payloads

Terraform creates the secret containers without storing plaintext values in the Terraform state file. Populate the actual secrets directly using `gcloud` in Cloud Shell:

```bash
# 2.1 Generate and store a secure 32-byte Session Secret
head -c 32 /dev/urandom | base64 | tr -d '\n' | gcloud secrets versions add ai-foundations-coach-session-secret \
  --project=ai-learning-513415 \
  --data-file=-

# 2.2 Store the Google OAuth Client Secret
echo -n "<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>" | gcloud secrets versions add ai-foundations-coach-oidc-client-secret \
  --project=ai-learning-513415 \
  --data-file=-
```

---

## Step 3: Print and Save GitHub Variables

Still in Cloud Shell, run:

```bash
terraform output github_variables
```

Keep the printed output handy for Step 5. The values will match:
```hcl
GCP_WORKLOAD_IDENTITY_PROVIDER = "projects/210042136085/locations/global/workloadIdentityPools/ai-foundations-coach-github/providers/github-actions"
GCP_DEPLOY_SERVICE_ACCOUNT     = "ai-foundations-coach-deploy@ai-learning-513415.iam.gserviceaccount.com"
GCP_PROJECT_ID                 = "ai-learning-513415"
GCP_REGION                     = "asia-south1"
GCP_ARTIFACT_REPOSITORY        = "ai-foundations-coach"
GCP_SERVICE                    = "ai-foundations-coach"
```

---

## Step 4: Configure Google Cloud OAuth Redirect URI

The admin authentication flow requires Google Identity to whitelist your Cloud Run callback URL:

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials?project=ai-learning-513415).
2. Locate the OAuth 2.0 Client ID:  
   `<YOUR_GOOGLE_OAUTH_CLIENT_ID>`
3. Click to edit it.
4. Under **Authorized redirect URIs**, click **+ ADD URI** and paste:
   ```text
   https://ai-foundations-coach-210042136085.asia-south1.run.app/api/auth/admin/callback
   ```
5. Click **Save**.

---

## Step 5: Configure GitHub Actions Environments & Variables

In your GitHub repository ([`ashishisme/AI-Learning-Mod`](https://github.com/ashishisme/AI-Learning-Mod)):

### 5.1 Create Environments
1. Go to **Settings** > **Environments**.
2. Click **New environment** and create:
   - Name: `staging`
3. Click **New environment** and create:
   - Name: `staging-promote`
   - Under **Deployment protection rules**, check **Required reviewers**.
   - Select your GitHub user account as the required reviewer.
   - Click **Save protection rules**.

### 5.2 Add Variables to Environments
Under **both** `staging` and `staging-promote` environments, add the following 6 **Environment Variables**:

| Variable Name | Value |
| :--- | :--- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/210042136085/locations/global/workloadIdentityPools/ai-foundations-coach-github/providers/github-actions` |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | `ai-foundations-coach-deploy@ai-learning-513415.iam.gserviceaccount.com` |
| `GCP_PROJECT_ID` | `ai-learning-513415` |
| `GCP_REGION` | `asia-south1` |
| `GCP_ARTIFACT_REPOSITORY` | `ai-foundations-coach` |
| `GCP_SERVICE` | `ai-foundations-coach` |

### 5.3 Enable the Deployment Safety Gate
1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click the **Variables** tab (Repository level).
3. Click **New repository variable**:
   - Name: `CLOUD_DEPLOYMENT_READY`
   - Value: `true`
4. Click **Add variable**.

---

## Step 6: Deploy Your First Release via Git Tag

Deployments are fully automated and tag-driven. From your local development machine terminal:

```bash
# 6.1 Ensure you are on the cloud-beta branch and up to date
git checkout cloud-beta
git pull origin cloud-beta

# 6.2 Create the first release tag
git tag v0.1.0

# 6.3 Push the tag to GitHub
git push origin v0.1.0
```

---

## Step 7: Monitor & Approve the Release Pipeline

1. Go to the **Actions** tab in your GitHub repository.
2. Click on the running **Cloud Run release** workflow.
3. The workflow executes through 4 distinct stages:
   - **`verify` & `store-emulator`**: Runs unit tests, Go race detector, vulnerability checks, Playwright tests, and tests the Firestore contract on an emulator.
   - **`build`**: Compiles the Vue SPA, builds Go binaries for `linux/amd64` and `linux/arm64`, attaches an SBOM, and pushes the image to Artifact Registry.
   - **`candidate`**: Deploys the revision to Cloud Run with `--no-traffic` and tag `rc-v0-1-0`, then executes `smoke.sh` against the candidate URL.
   - **`promote`**: Pauses and waits for your approval. Click **Review deployments**, select `staging-promote`, and click **Approve and deploy**.
4. Once approved, 100% of live traffic routes to the new revision, and a final public smoke test confirms success.

---

## Step 8: Post-Deployment Verification

1. Navigate to your live public URL:
   ```text
   https://ai-foundations-coach-210042136085.asia-south1.run.app
   ```
2. Verify the health probe:
   ```bash
   curl -i https://ai-foundations-coach-210042136085.asia-south1.run.app/api/health
   # Expected response: HTTP 200 {"ok":true}
   ```
3. Test Admin Login:
   - Navigate to `https://ai-foundations-coach-210042136085.asia-south1.run.app/admin`.
   - Sign in using `qunityfy@gmail.com`.
   - Verify you are admitted to the Admin Console to generate learner invite links.

---

## Emergency Rollback Procedure (<2 Minutes)

If a breaking issue is ever discovered after a release is promoted:

1. In GitHub, go to the **Actions** tab.
2. Select **Roll back staging** from the left-hand sidebar.
3. Click **Run workflow**:
   - Use workflow from: `cloud-beta` (or the release tag)
   - Revision to send all traffic to: `<PREVIOUS_REVISION_NAME>` (e.g. `ai-foundations-coach-00001-abc`, found in the previous release summary)
4. Click **Run workflow**. Traffic will revert immediately without rebuilding containers or awaiting manual reviews.


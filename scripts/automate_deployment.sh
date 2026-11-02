#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="ai-learning-513415"
REPO="ashishisme/AI-Learning-Mod"
# Never commit the real value: export OAUTH_CLIENT_SECRET in your shell before running.
OAUTH_CLIENT_SECRET="${OAUTH_CLIENT_SECRET:-}"

echo "================================================================"
echo "🔧 Ensuring Terraform is installed..."
echo "================================================================"
if ! command -v terraform &> /dev/null || ! terraform version &> /dev/null; then
  echo "Terraform not found or Cloud Shell shim detected. Installing official Terraform binary..."
  mkdir -p "$HOME/bin"
  ARCH="$(dpkg --print-architecture 2>/dev/null || echo "amd64")"
  curl -fsSL "https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_${ARCH}.zip" -o /tmp/tf.zip
  unzip -q -o /tmp/tf.zip -d "$HOME/bin"
  export PATH="$HOME/bin:$PATH"
  rm -f /tmp/tf.zip
  echo "✅ Terraform $(terraform version -json | grep -o '"version":[^,]*' || echo 'installed') ready."
fi

echo "================================================================"
echo "🚀 1. Initializing and Applying Terraform in deploy/terraform..."
echo "================================================================"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deploy/terraform" && pwd)"
cd "${DIR}"

# The official binary falls back to the Cloud Shell metadata server, which can
# return an empty token ("invalid token JSON from metadata: EOF"). Hand Terraform
# the gcloud user's token instead (valid ~1h, enough for one apply).
if [ -z "${GOOGLE_OAUTH_ACCESS_TOKEN:-}" ]; then
  GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)" || {
    echo "❌ gcloud is not authenticated. Run: gcloud auth login && gcloud config set project ${PROJECT_ID}" >&2
    exit 1
  }
  export GOOGLE_OAUTH_ACCESS_TOKEN
fi

terraform init

# Cloud Run refuses to mount a secret with no versions, so create the secrets
# and fill them before the full apply creates or updates the service.
terraform apply -auto-approve \
  -target=google_secret_manager_secret.session_secret \
  -target=google_secret_manager_secret.oidc_client_secret

echo ""
echo "================================================================"
echo "🔐 2. Populating Secrets in Secret Manager (only if empty)..."
echo "================================================================"
has_version() {
  [ -n "$(gcloud secrets versions list "$1" --project="${PROJECT_ID}" --filter='state=ENABLED' --limit=1 --format='value(name)')" ]
}

# Random 32-byte session secret. Skipped on re-runs so existing sessions survive.
if ! has_version ai-foundations-coach-session-secret; then
  head -c 32 /dev/urandom | base64 | tr -d '\n' | gcloud secrets versions add ai-foundations-coach-session-secret \
    --project="${PROJECT_ID}" --data-file=-
fi

if ! has_version ai-foundations-coach-oidc-client-secret; then
  if [ -z "${OAUTH_CLIENT_SECRET}" ]; then
    echo "❌ Set OAUTH_CLIENT_SECRET (Google OAuth client secret) and re-run." >&2
    exit 1
  fi
  printf "%s" "${OAUTH_CLIENT_SECRET}" | gcloud secrets versions add ai-foundations-coach-oidc-client-secret \
    --project="${PROJECT_ID}" --data-file=-
fi

echo ""
echo "================================================================"
echo "🚀 Applying the rest of the infrastructure..."
echo "================================================================"
terraform apply -auto-approve

echo ""
echo "================================================================"
echo "⚙️ 3. Configuring GitHub Actions via GitHub CLI (gh)..."
echo "================================================================"
WIF_PROVIDER=$(terraform output -json github_variables | jq -r '.GCP_WORKLOAD_IDENTITY_PROVIDER')
DEPLOY_SA=$(terraform output -json github_variables | jq -r '.GCP_DEPLOY_SERVICE_ACCOUNT')

if command -v gh &> /dev/null; then
  gh repo set-default "${REPO}" || true
  
  # Set Repository release gate variable
  gh variable set CLOUD_DEPLOYMENT_READY --body "true" --repo "${REPO}"
  
  # Configure staging and staging-promote environments
  for ENV in "staging" "staging-promote"; do
    gh api -X PUT "repos/${REPO}/environments/${ENV}" || true
    gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --env "${ENV}" --body "${WIF_PROVIDER}" --repo "${REPO}"
    gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --env "${ENV}" --body "${DEPLOY_SA}" --repo "${REPO}"
    gh variable set GCP_PROJECT_ID --env "${ENV}" --body "${PROJECT_ID}" --repo "${REPO}"
    gh variable set GCP_REGION --env "${ENV}" --body "asia-south1" --repo "${REPO}"
    gh variable set GCP_ARTIFACT_REPOSITORY --env "${ENV}" --body "ai-foundations-coach" --repo "${REPO}"
    gh variable set GCP_SERVICE --env "${ENV}" --body "ai-foundations-coach" --repo "${REPO}"
  done
  echo "✅ GitHub environment variables configured successfully."
else
  echo "⚠️ GitHub CLI (gh) not detected; configure variables from 'terraform output github_variables' manually in GitHub Settings."
fi

echo ""
echo "================================================================"
echo "🎉 Infrastructure bootstrap & Secret configuration complete!"
echo "👉 Add OAuth redirect URI to Google Cloud Console:"
echo "   https://ai-foundations-coach-210042136085.asia-south1.run.app/api/auth/admin/callback"
echo ""
echo "Next Step: Tag and push release from your local machine:"
echo "   git tag v0.1.0 && git push origin v0.1.0"
echo "================================================================"

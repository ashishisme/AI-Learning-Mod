#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="ai-learning-513415"
REPO="ashishisme/AI-Learning-Mod"
OAUTH_CLIENT_SECRET="<YOUR_GOOGLE_OAUTH_CLIENT_SECRET>"

echo "================================================================"
echo "🚀 1. Initializing and Applying Terraform in deploy/terraform..."
echo "================================================================"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deploy/terraform" && pwd)"
cd "${DIR}"

terraform init
terraform apply -auto-approve

echo ""
echo "================================================================"
echo "🔐 2. Populating Secrets in Secret Manager..."
echo "================================================================"
# Upload random 32-byte session secret
head -c 32 /dev/urandom | base64 | tr -d '\n' | gcloud secrets versions add ai-foundations-coach-session-secret \
  --project="${PROJECT_ID}" \
  --data-file=-

# Upload OAuth client secret securely
printf "%s" "${OAUTH_CLIENT_SECRET}" | gcloud secrets versions add ai-foundations-coach-oidc-client-secret \
  --project="${PROJECT_ID}" \
  --data-file=-

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

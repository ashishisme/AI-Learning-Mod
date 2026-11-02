output "service_url" {
  description = "Public URL of the beta demo. Register <url>/api/auth/admin/callback with the identity provider."
  value       = local.public_url
}

output "github_variables" {
  description = "Variables to set on the GitHub staging and staging-promote environments."
  value = {
    GCP_WORKLOAD_IDENTITY_PROVIDER = google_iam_workload_identity_pool_provider.github.name
    GCP_DEPLOY_SERVICE_ACCOUNT     = google_service_account.deploy.email
    GCP_PROJECT_ID                 = var.project_id
    GCP_REGION                     = var.region
    GCP_ARTIFACT_REPOSITORY        = google_artifact_registry_repository.images.repository_id
    GCP_SERVICE                    = google_cloud_run_v2_service.coach.name
  }
}

output "secrets_to_fill" {
  description = "Secrets that need a version added outside Terraform, so values never reach its state."
  value = [
    google_secret_manager_secret.session_secret.secret_id,
    google_secret_manager_secret.oidc_client_secret.secret_id,
    google_secret_manager_secret.auditor_api_key.secret_id,
  ]
}

output "runtime_service_account" {
  description = "The identity the service runs as."
  value       = google_service_account.runtime.email
}

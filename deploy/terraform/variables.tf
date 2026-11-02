variable "project_id" {
  description = "The staging project. Never point this at a GA production project."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, Firestore and Artifact Registry. Owner decision O3. The Firestore location cannot be changed after creation."
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name. It also forms the public run.app URL."
  type        = string
  default     = "ai-foundations-coach"
}

variable "github_repository" {
  description = "The only repository allowed to deploy, as owner/name."
  type        = string
  default     = "ashishisme/AI-Learning-Mod"
}

variable "bootstrap_image" {
  description = "Placeholder for the very first revision, before any release exists. The release workflow owns the image afterwards."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "max_instances" {
  description = "Upper bound on instances (FR-027). Two exercises cross-instance behaviour during the beta. Revise from the T122 measurements."
  type        = number
  default     = 2
}

variable "concurrency" {
  description = "Requests per instance. A starting value; revise from the T122 measurements."
  type        = number
  default     = 80
}

variable "oidc_issuer" {
  description = "Issuer URL of the organisation identity provider for admin sign-in."
  type        = string
}

variable "oidc_client_id" {
  description = "OIDC client ID for admin sign-in. The client secret goes in Secret Manager, never here."
  type        = string
}

variable "admin_emails" {
  description = "Comma-separated admin allowlist. Keep it in an uncommitted tfvars file."
  type        = string
}

variable "feedback_auditor" {
  description = "Set this only after adding a version to the auditor key secret. Until then feedback stays hidden (owner decision O2)."
  type = object({
    base_url = string
    model    = string
  })
  default = null
}

variable "backup_retention" {
  description = "How long daily backups are kept. Proposed, pending owner decision O4. Deleted records survive in backups until they age out."
  type        = string
  default     = "1209600s" # 14 days
}

variable "billing_account" {
  description = "Billing account ID the budget is created on."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly budget in whole US dollars. Alerts at 50%, 90% and 100% notify the owner and do NOT cap spending."
  type        = number
}

variable "owner_alert_email" {
  description = "Tested destination for budget and service alerts."
  type        = string
}

variable "registry_cleanup_dry_run" {
  description = "Keep true until a dry run proves the cleanup keeps the active and rollback images and their child manifests (T114)."
  type        = bool
  default     = true
}

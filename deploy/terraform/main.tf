# SPEC: FR-023, FR-026, FR-027, FR-029, FR-032, FR-038, SPEC-007 Task 4
# The staging beta demo. Design: specs/008-cloud-beta-deployment/cloud-beta-design.md.
# Secret values are added outside Terraform, so they never reach its state. Keep state in a restricted
# backend: it still holds the admin email allowlist.

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "this" {}

locals {
  apis = toset([
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudscheduler.googleapis.com",
    "containerscanning.googleapis.com",
    "firestore.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sts.googleapis.com",
  ])
  # Known before the service exists, so the app can be told its own address.
  public_url        = "https://${var.service_name}-${data.google_project.this.number}.${var.region}.run.app"
  budget_push_path  = "/api/internal/budget"
  budget_push_url   = "${local.public_url}${local.budget_push_path}"
  store_collections = toset(["invites", "accounts", "sessions", "audit", "attempts", "feedback"])

  # Each secret is a mounted file, fetched from Secret Manager when read (design D13).
  secrets = merge(
    {
      session = { env = "SESSION_SECRET_FILE", id = google_secret_manager_secret.session_secret.secret_id }
      oidc    = { env = "OIDC_CLIENT_SECRET_FILE", id = google_secret_manager_secret.oidc_client_secret.secret_id }
    },
    var.feedback_auditor == null ? {} : {
      auditor = { env = "FEEDBACK_AUDITOR_API_KEY_FILE", id = google_secret_manager_secret.auditor_api_key.secret_id }
    },
  )
}

resource "google_project_service" "apis" {
  for_each           = local.apis
  service            = each.value
  disable_on_destroy = false
}

# ---- identities

resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "Coach runtime"
  depends_on   = [google_project_service.apis]
}

resource "google_service_account" "deploy" {
  account_id   = "${var.service_name}-deploy"
  display_name = "Coach release workflow"
  depends_on   = [google_project_service.apis]
}

resource "google_service_account" "budget_push" {
  account_id   = "${var.service_name}-budget"
  display_name = "Signs budget notifications pushed to the app"
  depends_on   = [google_project_service.apis]
}

resource "google_project_iam_member" "runtime_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_artifact_registry_repository_iam_member" "deploy_push" {
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_cloud_run_v2_service_iam_member" "deploy_service" {
  name     = google_cloud_run_v2_service.coach.name
  location = google_cloud_run_v2_service.coach.location
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deploy.email}"
}

resource "google_service_account_iam_member" "deploy_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy.email}"
}

# ---- GitHub release identity: this repository, release tags, the two staging environments

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "${var.service_name}-github"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.ref"         = "assertion.ref"
    "attribute.environment" = "assertion.environment"
  }
  attribute_condition = join(" && ", [
    "assertion.repository == \"${var.github_repository}\"",
    "assertion.ref.startsWith(\"refs/tags/v\")",
    "assertion.environment in [\"staging\", \"staging-promote\"]",
  ])
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_deploys" {
  service_account_id = google_service_account.deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# ---- secrets: containers and per-secret access only

resource "google_secret_manager_secret" "session_secret" {
  secret_id = "${var.service_name}-session-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "oidc_client_secret" {
  secret_id = "${var.service_name}-oidc-client-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "auditor_api_key" {
  secret_id = "${var.service_name}-auditor-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "runtime_reads" {
  for_each = {
    session = google_secret_manager_secret.session_secret.id
    oidc    = google_secret_manager_secret.oidc_client_secret.id
    auditor = google_secret_manager_secret.auditor_api_key.id
  }
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# ---- Firestore

resource "google_firestore_database" "default" {
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  database_edition        = "STANDARD"
  concurrency_mode        = "PESSIMISTIC"
  delete_protection_state = "DELETE_PROTECTION_ENABLED"
  deletion_policy         = "ABANDON"
  depends_on              = [google_project_service.apis]
}

# Each record is JSON in "data". It is never queried and can pass the indexed-value size limit.
resource "google_firestore_field" "data_not_indexed" {
  for_each   = local.store_collections
  database   = google_firestore_database.default.name
  collection = each.value
  field      = "data"
  index_config {}
}

resource "google_firestore_backup_schedule" "daily" {
  database  = google_firestore_database.default.name
  retention = var.backup_retention
  daily_recurrence {}
}

# ---- images

resource "google_artifact_registry_repository" "images" {
  location               = var.region
  repository_id          = var.service_name
  format                 = "DOCKER"
  cleanup_policy_dry_run = var.registry_cleanup_dry_run

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      # Each multi-architecture release is several versions (index, images, attestations).
      keep_count = 40
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "90d"
    }
  }
  depends_on = [google_project_service.apis]
}

# ---- the service

resource "google_cloud_run_v2_service" "coach" {
  name                = var.service_name
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"
  # The app has its own session gate. This also avoids an allUsers grant, which organisation policy can forbid.
  invoker_iam_disabled = true

  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = "300s"
    max_instance_request_concurrency = var.concurrency

    scaling {
      min_instance_count = 0 # FR-027
      max_instance_count = var.max_instances
    }

    containers {
      image = var.bootstrap_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # Instance-based billing: background work gets no CPU otherwise (design D8).
        cpu_idle          = false
        startup_cpu_boost = true
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds    = 5
        failure_threshold = 10
      }

      dynamic "env" {
        for_each = merge(
          {
            HOSTED_MODE                 = "true"
            STATE_BACKEND               = "firestore"
            FIRESTORE_PROJECT_ID        = var.project_id
            PUBLIC_BASE_URL             = local.public_url
            OIDC_ISSUER                 = var.oidc_issuer
            OIDC_CLIENT_ID              = var.oidc_client_id
            ADMIN_EMAILS                = var.admin_emails
            TRUSTED_PROXY_HOPS          = "1"
            MONTHLY_BUDGET_USD          = tostring(var.monthly_budget_usd)
            BUDGET_PUSH_AUDIENCE        = local.budget_push_url
            BUDGET_PUSH_SERVICE_ACCOUNT = google_service_account.budget_push.email
          },
          var.feedback_auditor == null ? {} : {
            FEEDBACK_AUDITOR_BASE_URL = var.feedback_auditor.base_url
            FEEDBACK_AUDITOR_MODEL    = var.feedback_auditor.model
          },
          { for k, s in local.secrets : s.env => "/secrets/${k}/value" },
        )
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "volume_mounts" {
        for_each = local.secrets
        content {
          name       = volume_mounts.key
          mount_path = "/secrets/${volume_mounts.key}"
        }
      }
    }

    dynamic "volumes" {
      for_each = local.secrets
      content {
        name = volumes.key
        secret {
          secret = volumes.value.id
          items {
            path    = "value"
            version = "latest"
          }
        }
      }
    }
  }

  # The release workflow owns the image and traffic (design section 4).
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      traffic,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_project_iam_member.runtime_firestore,
    google_secret_manager_secret_iam_member.runtime_reads,
  ]
}

# ---- retention when idle: nothing sweeps at zero instances, and a sweep runs at every start (design D9)

resource "google_cloud_scheduler_job" "daily_wake" {
  name     = "${var.service_name}-daily-wake"
  region   = var.region
  schedule = "0 3 * * *"
  http_target {
    uri         = "${local.public_url}/api/health"
    http_method = "GET"
  }
  depends_on = [google_project_service.apis]
}

# ---- logs: request logs hold client addresses and invite tokens in URLs, so they are not kept

resource "google_logging_project_exclusion" "request_logs" {
  name        = "${var.service_name}-request-logs"
  description = "Request logs record client addresses, user agents and URLs, including invite tokens (SC-012, design D14). Cloud Run metrics are unaffected."
  filter      = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND log_id(\"run.googleapis.com/requests\")"
  depends_on  = [google_project_service.apis]
}

resource "google_logging_project_bucket_config" "default" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "_Default"
  retention_days = 30 # FR-038
}

# ---- alerts

resource "google_monitoring_notification_channel" "owner" {
  display_name = "Coach owner"
  type         = "email"
  labels = {
    email_address = var.owner_alert_email
  }
  depends_on = [google_project_service.apis]
}

resource "google_logging_metric" "auth_failures" {
  name   = "${var.service_name}/auth_failures"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND jsonPayload.message=\"auth_failure\""
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_logging_metric" "sse_failures" {
  name   = "${var.service_name}/sse_failures"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND jsonPayload.message=\"streaming tutor error\""
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "latency" {
  display_name          = "Coach p95 latency above 1.5 s"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.owner.name]
  conditions {
    display_name = "p95 request latency"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1500
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }
  depends_on = [google_project_service.apis]
}

resource "google_monitoring_alert_policy" "errors" {
  display_name          = "Coach error rate above 1%"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.owner.name]
  conditions {
    display_name = "5xx share of requests"
    # A ratio condition, not MQL: Google ended MQL support for new alerting policies on 2025-07-22.
    condition_threshold {
      filter             = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      denominator_filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\" AND metric.type=\"run.googleapis.com/request_count\""
      comparison         = "COMPARISON_GT"
      threshold_value    = 0.01
      duration           = "300s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
      denominator_aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  depends_on = [google_project_service.apis]
}

# ---- budget: notifies the owner and trips the tutor switch. It is not a spending cap.

resource "google_pubsub_topic" "budget" {
  name       = "${var.service_name}-budget"
  depends_on = [google_project_service.apis]
}

resource "google_pubsub_subscription" "budget_push" {
  name  = "${var.service_name}-budget-push"
  topic = google_pubsub_topic.budget.id
  push_config {
    push_endpoint = local.budget_push_url
    oidc_token {
      service_account_email = google_service_account.budget_push.email
      audience              = local.budget_push_url
    }
  }
}

# resource "google_billing_budget" "monthly" {
#   billing_account = var.billing_account
#   display_name    = "${var.service_name} monthly budget"
#   budget_filter {
#     projects = ["projects/${data.google_project.this.number}"]
#   }
#   amount {
#     specified_amount {
#       currency_code = "USD"
#       units         = tostring(var.monthly_budget_usd)
#     }
#   }
#   threshold_rules {
#     threshold_percent = 0.5
#   }
#   threshold_rules {
#     threshold_percent = 0.9
#   }
#   threshold_rules {
#     threshold_percent = 1.0
#   }
#   all_updates_rule {
#     pubsub_topic                     = google_pubsub_topic.budget.id
#     monitoring_notification_channels = [google_monitoring_notification_channel.owner.id]
#   }
#   depends_on = [google_project_service.apis]
# }

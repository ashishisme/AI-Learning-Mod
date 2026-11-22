terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.9"
    }
  }
  # State lives in a private, versioned bucket, so it survives Cloud Shell and any one machine.
  # The bucket is made once with gcloud (deploy/README or the runbook), not by this configuration.
  backend "gcs" {
    bucket = "ai-learning-513415-tfstate"
    prefix = "ai-foundations-coach"
  }
}

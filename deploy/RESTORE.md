# Restoring Firestore from a backup

Daily backups of the `(default)` database are kept for 14 days (`backup_retention`, Terraform). A restore always goes into a **new** database. Firestore never restores over an existing one, so live data is safe while you check a copy.

The drill below was run on 2026-11-04 (SPEC-008 T115). The backup from 2026-11-03 17:43 UTC restored in under 30 minutes. Every collection matched the live database, apart from one `attempts` record written after the backup was taken.

## Who can do this

Only project owners can see or restore backups. The app's runtime identity has `roles/datastore.user`, which can read and write documents but not backups.

## 1. Find the backup

```bash
gcloud firestore backups list --location=asia-south1 \
  --format='table(name.basename(),database.basename(),snapshotTime,state)'
```

## 2. Restore it into a new database

```bash
gcloud firestore databases restore \
  --source-backup=projects/<PROJECT_ID>/locations/asia-south1/backups/<BACKUP_ID> \
  --destination-database=restore-<YYYYMMDD>
gcloud firestore operations list --database=restore-<YYYYMMDD> \
  --format='value(metadata.progressPercentage,done)'      # wait until done is True
```

## 3. Check it

Count the documents in each collection: invites, accounts, sessions, audit, attempts and feedback. Compare them with `(default)`. The counts should match, apart from writes made after the backup's snapshot time. Use the REST `runAggregationQuery` with a `count` aggregation. Look at counts only, never at document contents, which hold personal data.

## 4a. A drill: delete the copy

A restored database comes back with delete protection on.

```bash
gcloud firestore databases update --database=restore-<YYYYMMDD> --no-delete-protection
gcloud firestore databases delete --database=restore-<YYYYMMDD> --quiet
```

## 4b. A real recovery: serve from the copy

The app reads the `(default)` database. The quickest switch is a new `(default)`:

1. Pause sign-ins. Roll back to, or deploy, a revision with the site behind maintenance, or accept that writes made during the switch will be lost.
2. Export the restored database to a bucket with `gcloud firestore export`. Turn off delete protection on `(default)`, delete it, recreate `(default)`, and import the export.
3. Run `./deploy/scripts/smoke.sh <SERVICE_URL>`, sign in as admin, and check the seat count and accounts.

IAM for Firestore is set on the project, so nothing needs to be granted again after a restore.

---
name: "speckit-git-feature"
description: "Create a new feature branch with sequential or timestamp numbering"
allowed-tools:
  - read
  - exec
---

Create a new Git feature branch for the current specification.

## Steps

1. Run the feature branch creation script:
   ```bash
   .specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS"
   ```

2. Parse the JSON output to get:
   - BRANCH_NAME
   - SPEC_FILE
   - FEATURE_NUM

3. Create and checkout the branch:
   ```bash
   git checkout -b $BRANCH_NAME
   ```

4. Persist the feature state:
   ```bash
   export SPECIFY_FEATURE=$BRANCH_NAME
   export SPECIFY_FEATURE_DIRECTORY=$SPEC_FILE
   ```

5. Report completion with the branch name and feature directory.

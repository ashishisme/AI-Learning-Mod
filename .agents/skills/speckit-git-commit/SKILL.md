---
name: "speckit-git-commit"
description: "Auto-commit changes with a configurable message"
allowed-tools:
  - read
  - exec
---

Commit current changes with a message based on the context.

## Steps

1. Check if there are any changes to commit:
   ```bash
   git status --porcelain
   ```

2. If no changes, skip and report no changes to commit.

3. If changes exist:
   - Stage all changed files (but NOT using `git add .` per constitution rule)
   - Use `git add` with explicit file paths from the status output
   - Commit with the message provided in $ARGUMENTS or a default message
   - Default message: "[Spec Kit] Save progress"

4. Report the commit hash and files committed.

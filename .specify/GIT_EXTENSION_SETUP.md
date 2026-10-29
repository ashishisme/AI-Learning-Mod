# Git Extension Setup for Spec Kit

## Status: ✓ Enabled

This project now has Git integration enabled for Spec-Driven Development (SDD).

## What Was Configured

### 1. Extension Structure
- Created `.specify/extensions/` directory
- Created `.specify/extensions/git/` directory
- Added `git-config.yml` with branch numbering and auto-commit settings

### 2. Extension Hooks
- Created `.specify/extensions.yml` to register Git hooks
- Configured `before_specify` hook to create feature branches automatically
- Configured optional auto-commit hooks (disabled by default)

### 3. Git Skills
- Created `speckit-git-feature` skill for branch creation
- Created `speckit-git-commit` skill for auto-committing changes
- Copied both skills to global directory (`%APPDATA%\devin\skills\`)

## Configuration Settings

### Branch Numbering
- Strategy: `sequential` (001, 002, 003, ...)
- Location: `.specify/extensions/git/git-config.yml`

### Auto-Commit Hooks
- Default: Disabled (set to `false` in git-config.yml)
- Can be enabled per-command in git-config.yml
- Current hooks registered but not active

## How It Works

### Before Specifying a Feature
When you run `/speckit-specify "Add user authentication"`:
1. The `before_specify` hook triggers `speckit-git-feature`
2. A new branch is created (e.g., `001-user-authentication`)
3. The branch is checked out
4. Feature state is persisted for downstream commands

### Manual Branch Creation
You can also manually create a feature branch:
```bash
.specify/scripts/bash/create-new-feature.sh --json "Add user authentication"
```

### Auto-Commit (Optional)
To enable auto-commit, edit `.specify/extensions/git/git-config.yml`:
```yaml
auto_commit:
  default: true  # Enable for all commands
  after_specify:
    enabled: true
    message: "[Spec Kit] Add specification"
```

## Available Commands

- `/speckit-git-feature` - Create a new feature branch
- `/speckit-git-commit` - Commit changes with a message

## Git Discipline Rules (from Constitution)

The project constitution enforces:
- ✓ Never use `git add .` or `git add -A`
- ✓ Always specify files explicitly when staging
- ✓ Never commit `.env` or secret files
- ✓ Use conventional commit prefixes (feat:, fix:, test:, docs:)

## Next Steps

1. Test the Git extension by running a specification:
   ```
   /speckit-specify "Test feature"
   ```

2. Verify branch creation:
   ```bash
   git branch
   ```

3. Optionally enable auto-commit in `git-config.yml` if desired

## Files Modified/Created

- `.specify/extensions/git/git-config.yml` (new)
- `.specify/extensions.yml` (new)
- `.agents/skills/speckit-git-feature/SKILL.md` (new)
- `.agents/skills/speckit-git-commit/SKILL.md` (new)
- Global skills: `%APPDATA%\devin\skills\speckit-git-*` (new)

## Integration with Existing SDD Workflow

The Git extension integrates seamlessly with the existing Spec Kit workflow:
- `/speckit-specify` → creates branch → writes spec
- `/speckit-plan` → writes plan
- `/speckit-tasks` → writes tasks
- `/speckit-implement` → implements tasks

All commands now have Git hooks available for automatic branching and committing.

# Commit Guidelines

This document establishes the commit framework and practices for the 6FB Booking project. All developers and AI assistants working on this project must follow these guidelines.

## 🎯 Core Principles

1. **Commit Early, Commit Often**: Small, focused commits are better than large, complex ones
2. **Atomic Commits**: Each commit should represent one logical change
3. **Clear Communication**: Commit messages should explain the "what" and "why"
4. **Consistent Format**: Follow the established format for all commits

## 📝 Commit Message Format

```
type(scope): brief description (max 50 chars)

[optional body]
- Detailed explanation of changes
- Why this change was necessary
- Any breaking changes or side effects
- Reference issue numbers (#123)

[optional footer]
Closes #123
BREAKING CHANGE: description
```

### Examples:

```
feat(booking): add real-time slot availability

- Implemented WebSocket connection for live updates
- Added slot reservation system to prevent double-booking
- Integrated with existing calendar service
- Updated frontend to display live availability

Closes #45
```

```
fix(auth): resolve JWT token expiration issue

- Fixed incorrect timestamp calculation
- Added proper timezone handling
- Updated tests to cover edge cases
```

## 🏷️ Commit Types

| Type | Description | When to Use |
|------|-------------|-------------|
| `feat` | New features | Adding new functionality |
| `fix` | Bug fixes | Fixing broken functionality |
| `docs` | Documentation | README, comments, guides |
| `style` | Code style | Formatting, semicolons, etc. |
| `refactor` | Code refactoring | Restructuring without changing behavior |
| `perf` | Performance | Improving performance |
| `test` | Tests | Adding or updating tests |
| `build` | Build system | Dependencies, configs |
| `ci` | CI/CD | GitHub Actions, deployment |
| `chore` | Maintenance | Routine tasks, cleanup |
| `revert` | Revert commits | Undoing previous commits |

## 🔍 Scope Guidelines

Use these scopes to indicate the area of change:

### Backend Scopes:
- `api` - API endpoints
- `auth` - Authentication/authorization
- `db` - Database models/migrations
- `payment` - Payment processing
- `booking` - Booking logic
- `analytics` - Analytics service
- `notification` - Email/SMS services

### Frontend Scopes:
- `ui` - UI components
- `booking` - Booking interface
- `dashboard` - Dashboard features
- `auth` - Auth pages/flows
- `admin` - Admin interface
- `client` - Client management

### General Scopes:
- `config` - Configuration files
- `deps` - Dependencies
- `docker` - Docker/containerization
- `scripts` - Build/utility scripts

## ⏰ Auto-Commit Triggers

Commit immediately after completing:

1. **Bug Fixes** - No matter how small
2. **Feature Implementation** - Each complete feature
3. **Refactoring** - After code cleanup
4. **Configuration Changes** - Any config updates
5. **Documentation Updates** - README, comments, guides
6. **Test Modifications** - New or updated tests
7. **30-Minute Rule** - Commit at least every 30 minutes of active coding

## 📋 Session Management

### Pre-Session Checklist:
```bash
# 1. Check current status
git status

# 2. Ensure on correct branch
git branch

# 3. Pull latest changes
git pull origin $(git branch --show-current)

# 4. Check for uncommitted work
git diff --stat
```

### During Session:
- Track changes mentally or in comments
- Commit after each completed task
- Use `git diff` to review changes before committing
- Group related changes in single commits

### Post-Session Routine:
```bash
# 1. Check for uncommitted changes
git status

# 2. Commit any pending work
git add .
git commit -m "chore: work in progress [session-end]"

# 3. Push to remote
git push origin $(git branch --show-current)

# 4. Log session summary
echo "Session ended: $(date)" >> .session-log
```

## 🛠️ Commit Command Templates

### Quick Commit:
```bash
# For simple changes
git add .
git commit -m "type(scope): description"
```

### Detailed Commit:
```bash
# For complex changes
git add .
git commit -m "type(scope): brief description" -m "" -m "- Detail 1" -m "- Detail 2" -m "" -m "Closes #issue"
```

### Interactive Commit:
```bash
# For selective staging
git add -p
git commit -v  # Opens editor with diff
```

## 📊 Change Tracking System

### Track Uncommitted Changes:
```bash
# Create alias for tracking
git config --global alias.changes '!git diff --name-status && echo "---" && git status -s'

# Use: git changes
```

### Commit Reminders:
1. After completing any task from todo list
2. Before starting a new major task
3. Every 30 minutes of active development
4. Before any risky operations
5. At natural breakpoints in work

## 🚨 AI Assistant Responsibilities

When working as an AI assistant on this project:

1. **Proactive Reminders**:
   - "We've completed [task]. Should we commit these changes?"
   - "It's been 30 minutes since our last commit. Let's commit current progress."
   - "Before we start [major change], let's commit our current work."

2. **Change Tracking**:
   - Keep mental note of files modified
   - Summarize changes when suggesting commits
   - Group related changes appropriately

3. **Commit Message Crafting**:
   - Follow the format precisely
   - Include all relevant details
   - Reference issues when applicable
   - Use clear, descriptive language

4. **Session Boundaries**:
   - Start by checking git status
   - End with a commit (even if WIP)
   - Document session progress

## 🔧 Git Configuration

### Recommended Git Aliases:
```bash
# Add to ~/.gitconfig or run commands
git config --global alias.cm 'commit -m'
git config --global alias.cam 'commit -am'
git config --global alias.s 'status -s'
git config --global alias.d 'diff'
git config --global alias.dc 'diff --cached'
git config --global alias.last 'log -1 HEAD'
git config --global alias.unstage 'reset HEAD --'
```

### Commit Message Template:
```bash
# Create template file
cat > ~/.gitmessage << 'EOF'
type(scope): subject

# Body - Explain *what* and *why* (not *how*)

# Footer - Issues, breaking changes, etc.

# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Scopes: api, auth, db, payment, booking, ui, dashboard, config, etc.
# Remember: 
# - Capitalize subject
# - No period at end of subject
# - Use imperative mood
# - Wrap at 72 characters
EOF

# Set as default template
git config --global commit.template ~/.gitmessage
```

## 📈 Commit Quality Metrics

Good commits have:
- ✅ Clear, descriptive messages
- ✅ Single logical change
- ✅ Proper type and scope
- ✅ All tests passing
- ✅ No debug code or console.logs
- ✅ Related files grouped together

Poor commits have:
- ❌ Vague messages like "fix bug" or "update"
- ❌ Multiple unrelated changes
- ❌ Missing type or scope
- ❌ Broken tests
- ❌ Commented out code
- ❌ Merge conflicts

## 🎭 Special Scenarios

### Work in Progress (WIP):
```bash
# For incomplete work at session end
git commit -m "chore: wip - [description of progress]"
```

### Emergency Fixes:
```bash
# For critical production fixes
git commit -m "fix(critical): [description]" -m "EMERGENCY: [details]"
```

### Reverting Changes:
```bash
# To undo a commit
git revert <commit-hash>
# Commit message auto-generated: "Revert \"original commit message\""
```

### Squashing Commits:
```bash
# Before merging, clean up commit history
git rebase -i HEAD~n  # n = number of commits
# Mark commits to squash, then create new message
```

## 🔄 Integration with Development Workflow

1. **Feature Development**:
   ```
   feat(scope): implement [feature name]
   test(scope): add tests for [feature]
   docs(scope): document [feature] usage
   ```

2. **Bug Fixing**:
   ```
   fix(scope): resolve [issue description]
   test(scope): add regression test for [issue]
   ```

3. **Refactoring**:
   ```
   refactor(scope): extract [component/function]
   refactor(scope): simplify [logic description]
   test(scope): update tests for refactored code
   ```

## 📚 Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- Project-specific conventions in CLAUDE.md

---

**Remember**: These guidelines are mandatory for maintaining code quality and project history. When in doubt, err on the side of more frequent, smaller commits rather than fewer, larger ones.

Last updated: 2025-06-28
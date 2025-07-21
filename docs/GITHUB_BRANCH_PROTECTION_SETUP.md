# GitHub Branch Protection Setup Guide

## Overview
This guide provides the recommended GitHub branch protection rules for the BookedBarber V2 worktree workflow. These rules ensure code quality and prevent accidental deployments.

## Branch Protection Configuration

### 1. Main Branches Protection

#### `main` Branch Protection (Integration Branch)
```
Settings → Branches → Add rule

Branch name pattern: main

Protection rules:
✅ Require a pull request before merging
  ✅ Require approvals: 1 (for team environments)
  ✅ Dismiss stale PR approvals when new commits are pushed
  ✅ Require review from code owners (if CODEOWNERS file exists)

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required status checks:
    - tests (backend)
    - build (frontend)
    - lint (both)

✅ Require conversation resolution before merging
✅ Restrict pushes that create files larger than 100MB
✅ Do not allow bypassing the above settings (for team environments)
```

#### `staging` Branch Protection (Pre-Production)
```
Settings → Branches → Add rule

Branch name pattern: staging

Protection rules:
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale PR approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required status checks:
    - integration-tests
    - staging-deployment

✅ Require conversation resolution before merging
✅ Restrict pushes that create files larger than 100MB
✅ Require linear history (clean merge commits)
✅ Do not allow bypassing the above settings
```

#### `production` Branch Protection (Production)
```
Settings → Branches → Add rule

Branch name pattern: production

Protection rules:
✅ Require a pull request before merging
  ✅ Require approvals: 2 (for critical production deployments)
  ✅ Dismiss stale PR approvals when new commits are pushed
  ✅ Require review from code owners

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required status checks:
    - production-readiness-check
    - security-scan
    - performance-test

✅ Require conversation resolution before merging
✅ Restrict pushes that create files larger than 50MB
✅ Require linear history
✅ Include administrators (no bypassing for anyone)
```

### 2. Feature Branch Naming Pattern

#### Feature Branches Protection
```
Settings → Branches → Add rule

Branch name pattern: feature/*

Protection rules:
✅ Require status checks to pass before merging
  Required status checks:
    - unit-tests
    - lint-check

⚠️ Allow force pushes (for feature branch flexibility)
⚠️ Allow deletions (for cleanup after merging)
```

### 3. GitHub Actions Workflow Integration

#### Required Status Checks Setup

Create `.github/workflows/branch-protection.yml`:

```yaml
name: Branch Protection Checks

on:
  pull_request:
    branches: [ main, staging, production ]
  push:
    branches: [ main, staging ]

jobs:
  tests:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend-v2
          pip install -r requirements.txt
      - name: Run backend tests
        run: |
          cd backend-v2
          pytest --maxfail=1

  build:
    name: Build Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend-v2/frontend-v2/package-lock.json
      - name: Install dependencies
        run: |
          cd backend-v2/frontend-v2
          npm ci
      - name: Build frontend
        run: |
          cd backend-v2/frontend-v2
          npm run build

  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend-v2/frontend-v2/package-lock.json
      - name: Install dependencies
        run: |
          cd backend-v2/frontend-v2
          npm ci
      - name: Lint frontend
        run: |
          cd backend-v2/frontend-v2
          npm run lint
      - name: Lint backend
        run: |
          cd backend-v2
          pip install flake8
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

  integration-tests:
    name: Integration Tests (Staging Only)
    runs-on: ubuntu-latest
    if: github.base_ref == 'staging' || github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: |
          cd backend-v2
          pip install -r requirements.txt
          pytest tests/integration/ -v

  security-scan:
    name: Security Scan (Production Only)
    runs-on: ubuntu-latest
    if: github.base_ref == 'production' || github.ref == 'refs/heads/production'
    steps:
      - uses: actions/checkout@v4
      - name: Run security audit
        run: |
          # Backend security check
          cd backend-v2
          pip install safety
          safety check
          
          # Frontend security check
          cd frontend-v2
          npm audit --audit-level high
```

## Branch Workflow Enforcement

### Auto-merge Prevention
These settings prevent direct pushes to protected branches and enforce the worktree workflow:

1. **Feature branches** → Only merge to `main`
2. **main** → Only merge to `staging`  
3. **staging** → Only merge to `production`

### Claude Code Integration
The branch protection rules integrate with the worktree workflow by:

- Requiring PRs for all major branch merges
- Running automated tests before deployment
- Preventing accidental direct pushes to production branches
- Ensuring code review for production changes

## Implementation Steps

### Step 1: Configure Branch Protection (GitHub Web UI)
1. Go to repository Settings → Branches
2. Add protection rules for each branch as specified above
3. Configure required status checks

### Step 2: Set Up GitHub Actions
1. Create `.github/workflows/branch-protection.yml`
2. Commit and push to trigger initial workflow runs
3. Verify all status checks appear in branch protection settings

### Step 3: Validate Workflow
1. Create a test feature branch
2. Open PR to main
3. Verify protection rules enforce proper workflow
4. Test that status checks run and are required

### Step 4: Team Training
1. Document the new workflow for team members
2. Update contribution guidelines
3. Test branch protection with team members

## Troubleshooting

### Common Issues

1. **Status check not appearing**: 
   - Ensure the workflow has run at least once
   - Check that job names match exactly in branch protection settings

2. **Unable to merge PRs**:
   - Verify all required status checks are passing
   - Ensure PR is up to date with target branch

3. **Branch protection too restrictive**:
   - Admin users can temporarily disable restrictions if needed
   - Use "Include administrators" carefully - it prevents emergency overrides

### Emergency Override Process
For critical production hotfixes:

1. **Temporary disable** branch protection on production
2. **Create hotfix branch** directly from production
3. **Apply minimal fix** with thorough testing
4. **Re-enable protection** immediately after deployment
5. **Document the override** in incident log

## Best Practices

### Pull Request Guidelines
- Keep PRs small and focused
- Write clear PR descriptions
- Include screenshots for UI changes
- Reference issue numbers
- Request specific reviewers

### Code Review Standards
- Review for functionality, security, and performance
- Test locally when possible
- Provide constructive feedback
- Approve only when confident in changes

### Merge Strategy
- Use "Squash and merge" for feature branches
- Use "Merge commit" for release branches
- Delete feature branches after merging
- Keep commit history clean and meaningful

## Monitoring and Metrics

Track these metrics to validate the effectiveness of branch protection:

- **PR merge time**: Should remain reasonable (<2 days)
- **Build failure rate**: Should decrease over time
- **Production incidents**: Should decrease due to better quality gates
- **Code review coverage**: Should increase developer knowledge sharing

---

## Quick Reference Commands

```bash
# Check branch protection status
gh api repos/:owner/:repo/branches/main/protection

# Create PR via CLI
gh pr create --base develop --head feature/my-feature

# View required status checks
gh api repos/:owner/:repo/branches/main/protection/required_status_checks

# Override protection (admin only, emergency use)
gh api repos/:owner/:repo/branches/main/protection --method DELETE
```

This branch protection setup ensures that your worktree workflow operates safely and maintains code quality throughout the development pipeline.
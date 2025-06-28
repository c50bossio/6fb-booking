# CI/CD Setup Guide

This guide explains how to set up and use the continuous integration and deployment pipelines for the 6FB monorepo project.

## Overview

The CI/CD pipelines enforce code quality standards across all packages in the monorepo:

- **Code Quality**: ESLint with custom rules, TypeScript checking, Prettier formatting
- **Build Validation**: Ensures all packages build successfully
- **Pre-commit Checks**: Validates commit messages and staged files
- **Monorepo Boundaries**: Enforces package dependency rules
- **Bundle Size Monitoring**: Tracks and limits bundle sizes
- **Security Auditing**: Checks for known vulnerabilities

## Available CI Configurations

### 1. GitHub Actions (Recommended)

Located in `.github/workflows/`:

- `code-quality.yml` - Runs linting, type checking, and formatting checks
- `build-validation.yml` - Validates builds and checks for unused code
- `pre-commit-check.yml` - Ensures pre-commit hooks pass
- `monorepo-boundaries.yml` - Enforces package import boundaries
- `bundle-size-check.yml` - Monitors and limits bundle sizes

### 2. GitLab CI

- `.gitlab-ci.yml` - Complete GitLab CI/CD pipeline configuration

### 3. Generic CI Script

- `ci/validate-all.sh` - Shell script that can be used with any CI system

## Quick Start

### GitHub Actions Setup

1. **Enable GitHub Actions** in your repository settings

2. **Configure secrets** (if needed):
   ```
   Settings → Secrets → Actions → New repository secret
   ```
   Add any required secrets like API keys or deployment tokens.

3. **Create branch protection rules**:
   ```
   Settings → Branches → Add rule
   ```
   - Branch name pattern: `main`
   - Required status checks:
     - ESLint Check
     - TypeScript Type Check
     - Build Validation
     - Pre-commit Hook Validation
     - Bundle Size Check

4. **Monitor pipeline status**:
   - Check the Actions tab in your repository
   - Each PR will show check status
   - Click on failed checks to see details

### GitLab CI Setup

1. **Ensure GitLab CI is enabled** for your project

2. **Configure CI/CD variables**:
   ```
   Settings → CI/CD → Variables
   ```
   Add any required variables.

3. **Configure merge request settings**:
   ```
   Settings → General → Merge requests
   ```
   - Enable "Pipelines must succeed"
   - Configure required approvals

### Generic CI Setup (Jenkins, CircleCI, etc.)

1. **Create a new pipeline/job**

2. **Configure the build environment**:
   - Node.js 20.x
   - Git
   - Python 3.x (for pre-commit hooks)

3. **Add build step**:
   ```bash
   ./ci/validate-all.sh
   ```

4. **Configure artifacts**:
   - Archive `ci-results/` directory
   - Publish test results from `ci-results/*.xml`

## Pipeline Stages

### 1. Install Stage
- Installs root dependencies
- Installs package-specific dependencies
- Caches node_modules for faster subsequent runs

### 2. Quality Checks
- **ESLint**: Runs custom and standard ESLint rules
- **TypeScript**: Checks types across all packages
- **Prettier**: Ensures consistent formatting
- **Custom Rules**: Validates our custom ESLint plugin

### 3. Build Stage
- Builds all packages
- Generates bundle size reports
- Creates dependency graphs

### 4. Test Stage
- Runs unit tests for each package
- Checks import boundaries
- Validates monorepo structure
- Runs security audits

### 5. Analysis Stage
- Bundle size analysis
- Lighthouse performance checks (frontend)
- Dependency analysis

## Configuration

### ESLint CI Mode

Each package should have a `lint:ci` script in `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx,js,jsx",
    "lint:ci": "eslint . --ext ts,tsx,js,jsx --format json --output-file eslint-report.json"
  }
}
```

### Bundle Size Limits

Configure in `package.json`:

```json
{
  "size-limit": [
    {
      "path": ".next/static/chunks/main-*.js",
      "limit": "300 KB"
    },
    {
      "path": ".next/static/chunks/pages/**/*.js",
      "limit": "100 KB"
    }
  ]
}
```

### Pre-commit Hooks

Ensure `.pre-commit-config.yaml` is configured:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
```

## Running Locally

### Run all checks:
```bash
./ci/validate-all.sh
```

### Run specific checks:
```bash
# ESLint only
npm run lint

# Type checking only
npm run type-check

# Bundle size check
npm run analyze

# Import boundary check
./ci/check-boundaries.sh
```

## Troubleshooting

### Common Issues

1. **ESLint failures**
   - Check the ESLint report in artifacts
   - Run `npm run lint:fix` to auto-fix issues
   - Review custom rule violations

2. **Type check failures**
   - Ensure all packages have proper TypeScript configs
   - Check for missing type definitions
   - Verify import paths

3. **Bundle size exceeded**
   - Analyze bundle with `npm run analyze`
   - Look for large dependencies
   - Consider code splitting

4. **Import boundary violations**
   - Review the error messages carefully
   - Ensure packages only import allowed dependencies
   - Move shared code to the `shared` package

5. **Pre-commit hook failures**
   - Run `pre-commit run --all-files` locally
   - Ensure Git hooks are installed: `pre-commit install`

### Cache Issues

If you encounter dependency issues:

1. **GitHub Actions**:
   - Increment `CACHE_VERSION` in workflows
   - Or clear cache in Actions settings

2. **GitLab CI**:
   - Clear pipeline caches in CI/CD settings
   - Update `CACHE_VERSION` variable

3. **Local**:
   ```bash
   rm -rf node_modules packages/*/node_modules
   npm ci
   ```

## Performance Optimization

### Parallel Execution
- Workflows run package checks in parallel using matrix strategies
- This reduces overall pipeline time

### Caching Strategy
- Dependencies are cached based on lock files
- Build outputs are cached between stages
- Cache keys include branch names for isolation

### Conditional Runs
- Some checks only run when relevant files change
- Use path filters in workflows to skip unnecessary checks

## Monitoring and Alerts

### GitHub Actions
- Set up email notifications in GitHub settings
- Use GitHub Mobile app for push notifications
- Configure Slack/Discord webhooks for team alerts

### GitLab CI
- Configure pipeline notifications in project settings
- Set up integrations with chat tools
- Use GitLab's built-in alerting

### Metrics to Track
- Pipeline duration trends
- Failure rates by check type
- Bundle size trends over time
- Test coverage changes

## Best Practices

1. **Fix failures immediately**
   - Don't let technical debt accumulate
   - Address ESLint warnings before they become errors

2. **Keep dependencies updated**
   - Regularly update dependencies
   - Run security audits locally before pushing

3. **Monitor bundle sizes**
   - Review bundle analysis reports
   - Set alerts for significant size increases

4. **Use pre-commit hooks locally**
   - Install hooks: `pre-commit install`
   - This catches issues before CI

5. **Cache wisely**
   - Don't cache build outputs that change frequently
   - Clear caches when debugging dependency issues

## Integration with Development Workflow

### PR/MR Workflow
1. Create feature branch
2. Make changes and commit
3. Push branch and create PR/MR
4. CI runs automatically
5. Fix any failures
6. Get code review
7. Merge when all checks pass

### Deployment Pipeline
After merge to main:
1. All checks run again
2. Build artifacts are created
3. Deployment can be triggered (manual or automatic)
4. Post-deployment tests run

## Extending the Pipeline

### Adding New Checks

1. **Create new workflow/job**:
   ```yaml
   custom-check:
     name: Custom Check
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - name: Run custom check
         run: ./scripts/custom-check.sh
   ```

2. **Update branch protection** to require the new check

3. **Document the check** in this guide

### Adding New Packages

When adding a new package to the monorepo:

1. Update matrix configurations in workflows:
   ```yaml
   matrix:
     package: [frontend, backend, shared, mobile, new-package]
   ```

2. Ensure the package has required scripts:
   - `build`
   - `test`
   - `lint`
   - `type-check`

3. Update `ci/validate-all.sh` to include the new package

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review workflow logs for detailed error messages
3. Consult team leads or DevOps engineers
4. Open an issue in the repository with CI/CD label
# 005. Pre-commit Enforcement

Date: 2025-06-28

## Status

Accepted

## Context

Code quality issues were frequently making it into the main branch:
- Inconsistent formatting
- Linting errors
- Failing tests
- Large files accidentally committed
- Sensitive data in commits

Manual code review caught some issues but not consistently. We needed automated quality gates.

## Decision

We implement comprehensive pre-commit hooks and build-time checks:

1. **Pre-commit Framework**: Using pre-commit for Python and husky for Node.js
2. **Checks Run on Every Commit**:
   - Code formatting (black, prettier)
   - Linting (ruff, ESLint)
   - Type checking (mypy, TypeScript)
   - Security scanning (bandit, detect-secrets)
   - File size limits
   - Commit message format

3. **Configuration**:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    hooks:
      - id: black
  - repo: https://github.com/charliermarsh/ruff-pre-commit
    hooks:
      - id: ruff
  - repo: https://github.com/pre-commit/mirrors-mypy
    hooks:
      - id: mypy
```

4. **CI/CD Enforcement**: Same checks run in CI to catch bypasses

## Consequences

### Positive
- Consistent code quality
- Fewer review cycles
- Prevents sensitive data leaks
- Automated formatting
- Early error detection

### Negative
- Slightly slower commit process
- Initial setup complexity
- Occasional false positives
- Need to educate team on bypassing when necessary

### Neutral
- Commits take 10-30 seconds
- Can be bypassed with --no-verify (logged in CI)

## References

- Pre-commit: https://pre-commit.com/
- Husky: https://typicode.github.io/husky/
- Conventional Commits: https://www.conventionalcommits.org/

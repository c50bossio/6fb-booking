# 004. Monorepo Structure

Date: 2025-06-28

## Status

Accepted

## Context

The 6fb-booking project consists of multiple interconnected parts:
- Backend API (FastAPI/Python)
- Frontend application (Next.js/TypeScript)
- Shared types and utilities
- Scripts and tooling
- Documentation

We needed to decide between:
1. Separate repositories for each part
2. Monorepo with all parts together
3. Hybrid approach with git submodules

## Decision

We chose an Nx-based monorepo structure:

```
6fb-booking/
├── backend-v2/          # FastAPI application
├── backend-v2/frontend-v2/         # Next.js application
├── scripts/          # Shared scripts and tooling
├── docs/             # Documentation
├── .github/          # CI/CD workflows
├── nx.json           # Nx configuration
└── package.json      # Root package.json
```

Key principles:
1. **Shared Tooling**: Common linting, formatting, and testing setup
2. **Atomic Commits**: Related changes across backend-v2/frontend-v2/backend in single commit
3. **Unified CI/CD**: Single pipeline for entire system
4. **Cross-Project Scripts**: Scripts that coordinate both services

## Consequences

### Positive
- Atomic commits across stack
- Shared development tooling
- Easier refactoring across boundaries
- Single source of truth
- Simplified dependency management
- Better code sharing

### Negative
- Larger repository size
- More complex initial setup
- Potential for accidental cross-dependencies
- Single point of failure for CI/CD

### Neutral
- All developers need full stack setup
- Shared versioning strategy

## References

- Nx Documentation: https://nx.dev/
- Monorepo Best Practices: https://monorepo.tools/
- Google Monorepo: https://cacm.acm.org/magazines/2016/7/204032-why-google-stores-billions-of-lines-of-code-in-a-single-repository/

# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the 6FB Booking Platform. ADRs document important architectural decisions made during the development of the system, providing context, rationale, and consequences for future reference.

## What is an ADR?

An Architecture Decision Record captures a single architectural decision and its rationale. ADRs help:
- Document why decisions were made
- Provide context for future developers
- Track the evolution of the system architecture
- Avoid repeating past mistakes

## ADR Format

Each ADR follows this structure:
- **Title**: Brief description of the decision
- **Date**: When the decision was made
- **Status**: Accepted/Rejected/Deprecated/Superseded
- **Context**: Why we needed to make this decision
- **Decision**: What we decided to do
- **Consequences**: What happens as a result (positive, negative, neutral)
- **References**: Related documentation or resources

## Current ADRs

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-single-authentication-system.md) | Single Authentication System | Accepted | 2025-06-28 |
| [002](002-unified-payment-processing.md) | Unified Payment Processing | Accepted | 2025-06-28 |
| [003](003-no-duplicate-components.md) | No Duplicate Components | Accepted | 2025-06-28 |
| [004](004-monorepo-structure.md) | Monorepo Structure | Accepted | 2025-06-28 |
| [005](005-pre-commit-enforcement.md) | Pre-commit Enforcement | Accepted | 2025-06-28 |
| [006](006-component-naming-conventions.md) | Component Naming Conventions | Accepted | 2025-06-28 |
| [007](007-api-endpoint-organization.md) | API Endpoint Organization | Accepted | 2025-06-28 |
| [008](008-database-client-model.md) | Database Client Model | Accepted | 2025-06-28 |

## Creating New ADRs

When making a significant architectural decision:

1. Create a new file: `{number}-{brief-description}.md`
2. Use the next available number (e.g., 009)
3. Follow the standard ADR format
4. Update this index file
5. Submit as part of your PR implementing the decision

## Guidelines

- Keep ADRs concise and focused on a single decision
- Include enough context for someone unfamiliar with the problem
- Be honest about negative consequences
- Link to relevant documentation or code
- Once accepted, ADRs should not be edited (create new ADRs to supersede)

## References

- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) by Michael Nygard
- [ADR Tools](https://github.com/npryce/adr-tools) - Command-line tools for working with ADRs
- [ADR GitHub Organization](https://adr.github.io/) - More examples and templates
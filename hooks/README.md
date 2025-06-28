# Pre-commit Hooks Documentation

## Overview

This directory contains custom pre-commit hooks designed to maintain code quality and prevent common issues in the 6fb-booking project. These hooks run automatically before each commit to catch problems early.

## Installation

```bash
# From the project root directory
./install-pre-commit-hooks.sh
```

This will:
1. Install the pre-commit framework
2. Set up all hooks defined in `.pre-commit-config.yaml`
3. Create a secrets baseline file
4. Run an initial check on all files

## Hooks Description

### 1. Check Test Files in Root (`check-test-files.py`)

**Purpose**: Prevents test files from being placed in the root directory.

**What it checks**:
- Files with "test" or "spec" in the name
- Python, JavaScript, and TypeScript test files in the root

**Why it matters**:
- Keeps the project structure organized
- Makes it easier to run test suites
- Prevents clutter in the root directory

**How to fix**:
- Move Python tests to `backend/tests/`
- Move JavaScript/TypeScript tests to `frontend/src/__tests__/` or `frontend/tests/`

### 2. Check File Prefixes (`check-file-prefixes.py`)

**Purpose**: Blocks files with temporary or experimental prefixes.

**Blocked prefixes**:
- `test-`, `demo-`, `enhanced-`, `simple-`, `temporary-`
- `temp-`, `tmp-`, `experiment-`, `exp-`
- `backup-`, `old-`, `new-`, `fixed-`
- `broken-`, `wip-`, `draft-`

**Why it matters**:
- Prevents work-in-progress files from entering production
- Maintains clean and professional codebase
- Reduces confusion about which files are "real"

**How to fix**:
- Rename files with proper, descriptive names
- Remove temporary files before committing

### 3. Check Duplicate Components (`check-duplicate-components.py`)

**Purpose**: Detects multiple implementations of the same React component.

**Components checked**:
- Calendar, Auth, Dashboard, Booking
- Payment, Analytics, Settings

**Why it matters**:
- Prevents import confusion
- Maintains single source of truth
- Reduces maintenance burden

**How to fix**:
- Choose the best implementation and remove others
- Use props for variations instead of duplicate components
- Consolidate features from multiple versions

### 4. Check Duplicate Auth (`check-duplicate-auth.py`)

**Purpose**: Ensures only one authentication system is in use.

**What it checks**:
- Multiple auth endpoints
- Mixed authentication methods (JWT vs Session)
- Duplicate auth components and contexts

**Why it matters**:
- Security consistency
- Prevents authentication conflicts
- Simplifies maintenance

**How to fix**:
- Stick to JWT authentication (project standard)
- Remove alternative auth implementations
- Consolidate auth logic in one place

### 5. Check File Count (`check-file-count.py`)

**Purpose**: Prevents commits with too many files (max: 20).

**Why it matters**:
- Large commits are hard to review
- Increases chance of bugs
- Makes rollbacks difficult

**How to fix**:
- Split changes into logical commits
- Use `git reset HEAD <file>` to unstage files
- Group related changes together

### 6. Check Database Files (`check-database-files.py`)

**Purpose**: Prevents database files from being committed.

**Blocked patterns**:
- `.db`, `.sqlite`, `.sqlite3`, `.db3`
- SQLite WAL and SHM files
- Common database filenames

**Why it matters**:
- Databases contain sensitive data
- Cause merge conflicts
- Bloat repository size

**How to fix**:
- Remove from staging: `git reset HEAD <file>`
- Add to `.gitignore`
- Use migrations for schema changes

### 7. Check Duplicate Endpoints (`check-duplicate-endpoints.py`)

**Purpose**: Detects duplicate API endpoint definitions.

**What it checks**:
- FastAPI route decorators
- Same paths with same HTTP methods
- Similar endpoint patterns

**Why it matters**:
- Prevents routing conflicts
- Avoids unpredictable behavior
- Maintains clear API structure

**How to fix**:
- Remove duplicate endpoint definitions
- Use different paths for different purposes
- Consolidate similar functionality

### 8. No Commit to Branch (`no-commit-to-branch.py`)

**Purpose**: Prevents direct commits to main/master branches.

**Protected branches**:
- `main`
- `master`

**Why it matters**:
- Enforces code review process
- Ensures CI/CD checks pass
- Maintains clean commit history

**How to fix**:
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit to the feature branch
3. Create a pull request

## Standard Hooks

In addition to custom hooks, we use several standard pre-commit hooks:

- **Trailing whitespace**: Removes unnecessary whitespace
- **End of file fixer**: Ensures files end with a newline
- **YAML/JSON checkers**: Validates syntax
- **Large file check**: Prevents files over 1MB
- **Black**: Python code formatter
- **Flake8**: Python linter
- **isort**: Python import sorter
- **ESLint**: JavaScript/TypeScript linter
- **detect-secrets**: Prevents secrets in code

## Usage

### Running Hooks Manually

```bash
# Run on all files
pre-commit run --all-files

# Run on specific files
pre-commit run --files file1.py file2.js

# Run specific hook
pre-commit run check-duplicate-components
```

### Bypassing Hooks (Use Sparingly!)

```bash
# Skip all hooks for one commit
git commit --no-verify -m "Emergency fix"

# Note: This should only be used in emergencies!
```

### Updating Hooks

```bash
# Update hook definitions
pre-commit autoupdate

# Clean and reinstall
pre-commit clean
pre-commit install
```

## Troubleshooting

### Hook Fails but Code is Fine

1. Check the specific error message
2. Ensure you're not hitting a false positive
3. If it's a bug in the hook, report it

### Performance Issues

1. Use `--show-diff-on-failure` to see what changed
2. Run hooks on specific files instead of all files
3. Consider excluding large generated files

### Installation Problems

1. Ensure Python 3 is installed
2. Try installing with pip: `pip install pre-commit`
3. Check file permissions on hook scripts

## Contributing

To add a new hook:

1. Create the hook script in `hooks/`
2. Add it to `.pre-commit-config.yaml`
3. Update this documentation
4. Test thoroughly before committing

## Best Practices

1. **Fix issues, don't bypass**: Address the root cause
2. **Small commits**: Easier to pass hooks and review
3. **Run early**: Use `pre-commit run` before staging
4. **Keep hooks fast**: They run on every commit
5. **Document exceptions**: If you must bypass, document why

## Contact

For questions or issues with these hooks, please:
1. Check this documentation first
2. Look for similar issues in the project
3. Ask the team for clarification

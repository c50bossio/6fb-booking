#!/bin/bash

# Setup Git Hooks for Local Development

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Git hooks for 6FB monorepo...${NC}"

# Install husky
echo -e "${BLUE}Installing Husky...${NC}"
npm install --save-dev husky

# Initialize husky
echo -e "${BLUE}Initializing Husky...${NC}"
npx husky install

# Create pre-commit hook
echo -e "${BLUE}Creating pre-commit hook...${NC}"
npx husky add .husky/pre-commit 'npm run pre-commit'

# Create commit-msg hook
echo -e "${BLUE}Creating commit-msg hook...${NC}"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'

# Create pre-push hook
echo -e "${BLUE}Creating pre-push hook...${NC}"
cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-push checks..."

# Run type checking
echo "Type checking..."
npm run type-check

# Run tests
echo "Running tests..."
npm test

echo "Pre-push checks passed!"
EOF

chmod +x .husky/pre-push

# Update package.json scripts
echo -e "${BLUE}Updating package.json scripts...${NC}"
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

pkg.scripts = {
  ...pkg.scripts,
  "prepare": "husky install",
  "pre-commit": "lint-staged",
  "type-check": "tsc --noEmit",
  "test": "jest"
};

if (!pkg["lint-staged"]) {
  pkg["lint-staged"] = {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "packages/*/src/**/*.{ts,tsx}": [
      "bash -c \"cd \\$(dirname {})/../.. && npm run type-check\""
    ]
  };
}

fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("package.json updated successfully");
'

# Install additional dependencies
echo -e "${BLUE}Installing additional dependencies...${NC}"
npm install --save-dev lint-staged @commitlint/cli @commitlint/config-conventional

# Create commitlint config if it doesn't exist
if [ ! -f ".commitlintrc.json" ]; then
  echo -e "${BLUE}Creating commitlint configuration...${NC}"
  cat > .commitlintrc.json << 'EOF'
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert"
      ]
    ],
    "scope-enum": [
      2,
      "always",
      [
        "frontend",
        "backend",
        "shared",
        "mobile",
        "eslint-plugin",
        "deps",
        "ci",
        "docs"
      ]
    ],
    "subject-case": [2, "always", "sentence-case"],
    "header-max-length": [2, "always", 100]
  }
}
EOF
fi

# Create .lintstagedrc.json for better configuration
echo -e "${BLUE}Creating lint-staged configuration...${NC}"
cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix --max-warnings 0",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ],
  "packages/frontend/**/*.{ts,tsx}": [
    "bash -c 'cd packages/frontend && npm run type-check'"
  ],
  "packages/backend/**/*.{ts,tsx}": [
    "bash -c 'cd packages/backend && npm run type-check'"
  ],
  "packages/shared/**/*.{ts,tsx}": [
    "bash -c 'cd packages/shared && npm run type-check'"
  ],
  "packages/mobile/**/*.{ts,tsx}": [
    "bash -c 'cd packages/mobile && npm run type-check'"
  ]
}
EOF

echo -e "${GREEN}✅ Git hooks setup complete!${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Commit these changes: git add . && git commit -m 'chore: setup git hooks'"
echo "2. Test the hooks: Make a change and try to commit"
echo "3. Team members should run: npm install"
echo
echo -e "${BLUE}Hook summary:${NC}"
echo "- pre-commit: Runs ESLint, Prettier, and type checking on staged files"
echo "- commit-msg: Validates commit message format"
echo "- pre-push: Runs full type check and tests"

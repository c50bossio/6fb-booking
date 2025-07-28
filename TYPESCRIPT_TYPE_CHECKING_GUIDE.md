# TypeScript Type Checking Hook - Claude Code Integration

## Overview

An automated TypeScript type checking system that runs after every file modification in Claude Code, ensuring type safety and consistency across the entire project.

## Features

### 🔍 **Automatic Type Checking**
- **Triggers after** every TypeScript/JavaScript file modification
- **Multi-project support** - finds all TypeScript projects (directories with `tsconfig.json`)
- **Smart filtering** - only checks projects with relevant file changes
- **Comprehensive coverage** - checks `.ts`, `.tsx`, `.js`, `.jsx` files

### 🎯 **Error Detection & Reporting**
- **Structured error parsing** with file paths, line numbers, and error codes
- **Claude-friendly formatting** for immediate error resolution
- **Error grouping by file** for organized feedback
- **Detailed JSON reports** for debugging and analysis

### ⚡ **Performance Optimizations**
- **Project-specific checking** - only runs on affected TypeScript projects
- **File-based filtering** - skips projects when no relevant files changed
- **Timeout protection** - prevents hanging on large projects
- **Caching support** - uses TypeScript's incremental compilation

## Implementation Details

### Files Created
1. **Core Engine**: `.claude/hooks/typescript-type-checker.py` - Python script for type checking
2. **Shell Wrapper**: `.claude/hooks/typescript-hook-wrapper.sh` - Integration with Claude Code
3. **Hook Configuration**: Updated `.claude/hooks.json` with TypeScript hook
4. **Documentation**: This guide for usage and troubleshooting

### Hook Integration
```json
{
  "name": "typescript_type_checking",
  "event": "PostToolUse",
  "matchers": [
    "Edit(file_path:*.ts)",
    "Write(file_path:*.tsx)",
    "MultiEdit(file_path:*.js)"
  ],
  "blocking": true
}
```

### Type Checker Capabilities
- **Multi-compiler support**: Local TypeScript, global TypeScript, npx TypeScript
- **Project discovery**: Automatically finds all TypeScript projects
- **Error parsing**: Extracts structured error information from TypeScript output
- **Smart reporting**: Groups and formats errors for Claude Code consumption

## Usage Examples

### Automatic Activation
The hook automatically runs when Claude Code modifies TypeScript files:
```typescript
// When Claude edits this file, type checking runs automatically
interface User {
  id: number;
  name: string;
}

function getUser(id: string): User { // Type error: id should be number
  // Hook will catch this type mismatch
}
```

### Manual Testing
```bash
# Test the hook manually
/Users/bossio/6fb-booking/.claude/hooks/typescript-hook-wrapper.sh manual

# Check hook status
/Users/bossio/6fb-booking/.claude/hooks/typescript-hook-wrapper.sh status

# Test specific files
python3 .claude/hooks/typescript-type-checker.py --modified-files app/components/Button.tsx
```

## Error Output Format

### Sample Error Report
```
🚨 TypeScript Type Errors Found:
==================================================

📁 File: app/components/Button.tsx
--------------------------------------
  🔴 Line 15, Column 22
     Error: TS2345 - Argument of type 'string' is not assignable to parameter of type 'number'

  🔴 Line 28, Column 5
     Error: TS2531 - Object is possibly 'null'

📁 File: lib/api.ts
--------------------------------------
  🔴 Line 42, Column 12
     Error: TS2322 - Type 'undefined' is not assignable to type 'string'

📊 Summary: 3 errors found across 2 files

🤖 Claude Code Action Required:
Please fix these TypeScript errors by:
1. Reviewing the affected files and error messages
2. Updating type definitions, interfaces, or function signatures
3. Ensuring consistency between function definitions and usage
4. Adding missing type annotations where needed
```

## Configuration Options

### Environment Variables
```bash
# Disable TypeScript checking temporarily
export CLAUDE_SKIP_TYPE_CHECK=true

# Specify custom project root
export TYPESCRIPT_PROJECT_ROOT=/path/to/project

# Enable verbose logging
export TYPESCRIPT_HOOK_VERBOSE=true
```

### Project Configuration
The hook respects TypeScript configuration files:
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.build.json` - Build-specific configuration  
- `.eslintrc.js` - ESLint integration (if present)

## Error Handling

### Compiler Not Found
```
⚠️ TypeScript compiler not found for project: /path/to/project
   Install with: npm install -g typescript
   Or locally: npm install --save-dev typescript
```

### No TypeScript Projects
```
ℹ️ No TypeScript projects found in the repository.
   Create a tsconfig.json file to enable TypeScript checking.
```

### Timeout Errors
```
🚨 TypeScript type checking timed out (60 seconds)
   Consider optimizing your TypeScript configuration or splitting large projects.
```

## Troubleshooting

### Hook Not Running
1. **Check hook configuration**: Verify `.claude/hooks.json` is properly formatted
2. **Validate file permissions**: Ensure scripts are executable
3. **Check logs**: Review `/Users/bossio/6fb-booking/.claude/logs/typescript-hook-wrapper.log`

### False Positives
1. **Update TypeScript**: Ensure you're using a recent TypeScript version
2. **Check tsconfig.json**: Verify TypeScript configuration is correct
3. **Dependencies**: Ensure all dependencies are installed (`npm install`)

### Performance Issues
1. **Incremental compilation**: Enable `"incremental": true` in `tsconfig.json`
2. **Exclude directories**: Add large directories to `"exclude"` array
3. **Project references**: Use TypeScript project references for large codebases

## Logs and Debugging

### Log Files
- **Main log**: `.claude/logs/typescript-type-checker.log` - Detailed execution logs
- **Wrapper log**: `.claude/logs/typescript-hook-wrapper.log` - Shell wrapper events
- **Error report**: `.claude/logs/typescript-errors.json` - Structured error data

### Debug Commands
```bash
# View recent errors
tail -20 .claude/logs/typescript-type-checker.log

# Watch logs in real-time
tail -f .claude/logs/typescript-hook-wrapper.log

# Analyze error patterns
jq '.errors[] | .code' .claude/logs/typescript-errors.json | sort | uniq -c | sort -nr
```

## Integration Benefits

### 🛡️ **Type Safety Enforcement**
- Catches type errors immediately after code changes
- Prevents function signature mismatches across files
- Ensures interface consistency throughout the project

### 🚀 **Development Efficiency**
- Provides instant feedback to Claude Code
- Eliminates manual type checking steps
- Reduces debugging time in development

### 📊 **Code Quality**
- Maintains TypeScript best practices
- Enforces consistent typing patterns
- Improves overall code reliability

## Advanced Usage

### Custom Project Structure
For projects with non-standard layouts:
```bash
# Check specific project directory
python3 .claude/hooks/typescript-type-checker.py --project-root /custom/path

# Include additional file patterns
# Modify the hook matchers in .claude/hooks.json
```

### Integration with CI/CD
The hook can be integrated with continuous integration:
```bash
# Use in GitHub Actions
- name: TypeScript Type Check
  run: python3 .claude/hooks/typescript-type-checker.py --quiet
```

### Custom Error Handlers
Extend the hook for custom error handling:
```python
# Add custom error processors in typescript-type-checker.py
def custom_error_handler(errors):
    # Custom logic for specific error types
    pass
```

---

**The TypeScript type checking hook ensures your codebase maintains type safety as Claude Code makes changes, catching errors immediately and providing clear guidance for resolution.**
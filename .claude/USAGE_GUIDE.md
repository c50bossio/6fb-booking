# Claude Code Usage Guide for BookedBarber V2

## Simplified Development Setup

This is a streamlined configuration, simplified from the complex SuperClaude V2 system.

### Essential Workflows

#### Starting Development
```bash
# Backend
cd backend-v2 && uvicorn main:app --reload

# Frontend  
cd backend-v2/frontend-v2 && npm run dev
```

#### Common Claude Code Commands
```bash
# Read project structure
ls backend-v2/

# Edit configuration
edit backend-v2/.env

# Run tests
cd backend-v2 && pytest
cd backend-v2/frontend-v2 && npm test

# Check build
cd backend-v2/frontend-v2 && npm run build
```

### Automated Features

- **Server Cleanup**: Automatically kills conflicting processes on session start/end
- **Frontend Verification**: Quick TypeScript syntax check after file edits
- **6FB Methodology**: Project context includes Six Figure Barber business alignment

### Troubleshooting

1. **Multiple server conflicts**: Scripts automatically clean up on session start
2. **TypeScript errors**: Verification hook will catch syntax issues
3. **Port conflicts**: Cleanup script handles ports 3000/8000

### What Was Removed

The complex SuperClaude V2 system included:
- Adaptive learning system (26KB)
- Smart routing with personas (24KB) 
- Ultra-compression mode (20KB)
- Enhanced context analysis (35KB)
- Learning database and complex routing

**Result**: 150KB+ of Python code reduced to ~3KB of essential scripts.

### Backup

Full SuperClaude V2 system preserved in git tag: `backup-superclaude-v2-system-20250711`

To restore: `git checkout backup-superclaude-v2-system-20250711`
# CLAUDE.md - BookedBarber V2 Project Guide

## 🎯 Project Overview

**BookedBarber V2** - Advanced booking and business management platform for barber shops, built on the Six Figure Barber methodology.

### Technology Stack
- **Backend**: FastAPI (Python 3.9+) with SQLAlchemy ORM
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (production) / SQLite (development)
- **Integrations**: Stripe Connect, Google Calendar API, SendGrid, Twilio

## 🚀 Development Workflow

### Quick Start
```bash
# Backend
cd backend-v2 && uvicorn main:app --reload

# Frontend  
cd backend-v2/frontend-v2 && npm run dev
```

### Essential Commands
```bash
# Run tests
cd backend-v2 && pytest
cd backend-v2/frontend-v2 && npm test

# Check build
cd backend-v2/frontend-v2 && npm run build

# Type checking
cd backend-v2/frontend-v2 && npx tsc --noEmit
```

## 🛠️ Simplified Claude Code Setup

This project uses a streamlined Claude Code configuration (simplified from complex SuperClaude V2 system):

### Automated Features
- **Server Cleanup**: Prevents port conflicts by cleaning up stale processes
- **Frontend Verification**: Quick TypeScript syntax checks after edits
- **6FB Methodology**: Project context includes Six Figure Barber business alignment

### Configuration Files
- `.claude/hooks.json` - Essential verification hooks
- `.claude/scripts/` - Server cleanup and verification scripts
- `.claude/project-settings.json` - Basic project context

## 📁 Project Structure

```
BookedBarber-V2/
├── backend-v2/              # V2 Backend (FastAPI) - ACTIVE
│   ├── main.py             # Application entry point
│   ├── api/v1/             # API endpoints
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic
│   └── frontend-v2/        # V2 Frontend (Next.js) - ACTIVE
│       ├── app/            # Next.js 14 app directory
│       ├── components/     # React components
│       └── lib/            # Utilities and API clients
├── .claude/                # Simplified Claude Code configuration
└── docs/                   # Documentation
```

## 💰 Six Figure Barber Integration

All development decisions align with Six Figure Barber Program principles:
1. **Revenue Optimization**: Features help barbers increase income
2. **Client Value Creation**: Enhance client experience and relationships
3. **Business Efficiency**: Improve time and resource utilization
4. **Professional Growth**: Support brand and business development
5. **Scalability**: Enable business expansion and growth

## 🔧 Troubleshooting

### Common Issues
1. **Server Conflicts**: Automated cleanup handles multiple server processes
2. **TypeScript Errors**: Verification hooks catch syntax issues early
3. **Port Conflicts**: Scripts automatically handle ports 3000/8000

### Debug Commands
```bash
# Check server conflicts
.claude/scripts/cleanup-all-servers.sh

# Verify frontend syntax
.claude/scripts/verify-frontend.sh

# Check git status
git status
```

## 📚 Key Conventions

### Code Standards
- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode, explicit types
- **Testing**: Minimum 80% coverage
- **Commits**: Conventional commits format

### Development Practices
- Only work with V2 system (backend-v2/, frontend-v2/)
- Use TodoWrite for task tracking
- Run tests before completion
- Follow 6FB methodology principles

## 🗂️ What Changed from SuperClaude V2

### Removed (150KB+ → 4KB):
- ❌ Adaptive learning system (26KB)
- ❌ Smart routing with personas (24KB)  
- ❌ Ultra-compression mode (20KB)
- ❌ Enhanced context analysis (35KB)
- ❌ Complex configuration and databases

### Kept (Essential):
- ✅ Hooks for verification and cleanup
- ✅ Basic project context and 6FB alignment
- ✅ Simple development workflow scripts
- ✅ Essential safety nets and troubleshooting

### Recovery
Full SuperClaude V2 system preserved in: `git tag backup-superclaude-v2-system-20250711`

## 🎯 Focus: Direct Claude Code Usage

With the complexity removed, development focuses on:
1. **Effective prompts** for Claude Code
2. **Clear task descriptions** with context
3. **Good documentation** in code and commits
4. **Simple workflows** with essential automation
5. **Six Figure Barber methodology** alignment

---

*Simplified Claude Code setup - focusing on proven patterns over complex automation*
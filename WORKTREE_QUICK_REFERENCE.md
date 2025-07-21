# 🌳 Git Worktree Quick Reference Guide

## 🚀 Daily Workflow Commands

### Starting a New Feature
```bash
# Create new feature worktree
./scripts/create-feature-worktree.sh my-awesome-feature

# Navigate to feature worktree (in separate terminal/IDE)
cd ~/6fb-booking-features/my-awesome-feature/

# Start development servers (frontend on 3002+, backend on 8002+)
./start-feature-dev.sh
```

### Developing in Feature Worktree
```bash
# Make your changes
git add .
git commit -m "feat: implement awesome feature"

# Push to remote (creates feature branch)
git push -u origin feature/my-awesome-feature-20250721
```

### Integration Testing (Develop Branch)
```bash
# Switch to main worktree
cd ~/6fb-booking/

# Pull latest main
git pull origin main

# Merge your feature
git merge feature/my-awesome-feature-20250721

# Test integration
npm run test  # or ./scripts/parallel-tests.sh

# Push to main
git push origin main
```

### Staging Testing (Staging Worktree)
```bash
# Switch to staging worktree
cd ~/6fb-booking-staging/

# Pull and merge main
git pull origin staging
git merge main

# Start staging servers (frontend on 3001, backend on 8001)
./start-staging-dev.sh

# Test with production-like configs
# When ready, push to trigger Render deployment
git push origin staging
```

### Production Deployment
```bash
# After staging tests pass on https://staging.bookedbarber.com
cd ~/6fb-booking-staging/

# Merge to production
git checkout production
git merge staging
git push origin production  # Triggers production deployment
```

---

## 📁 Directory Structure

```
~/6fb-booking/                    # Main worktree (main branch)
├── backend-v2/                   # Active V2 backend
├── scripts/                      # Automation scripts
└── .claude/                      # Claude hooks and scripts

~/6fb-booking-staging/            # Staging worktree (staging branch)
├── backend-v2/
│   ├── .env.staging             # Production-like config
│   └── staging_6fb_booking.db   # Isolated staging database
└── start-staging-dev.sh         # Staging development helper

~/6fb-booking-features/           # Feature worktrees directory
├── my-feature-1/                # Feature worktree 1
├── my-feature-2/                # Feature worktree 2 (parallel development)
└── another-feature/             # Feature worktree 3
```

---

## 🔧 Essential Commands

### Worktree Management
```bash
# Create feature worktree
./scripts/create-feature-worktree.sh <feature-name>

# List all worktrees
git worktree list

# Check worktree status
./scripts/worktree-status.sh

# Remove completed feature worktree
git worktree remove ~/6fb-booking-features/<feature-name>

# Cleanup merged feature worktrees
./scripts/cleanup-merged-worktrees.sh
```

### Development Servers
```bash
# Main worktree (main)
./scripts/start-dev-session.sh       # Frontend: 3000, Backend: 8000

# Staging worktree  
./scripts/start-dev-session-worktree.sh  # Frontend: 3001, Backend: 8001

# Feature worktree
./start-feature-dev.sh               # Frontend: 3002+, Backend: 8002+
```

### Health Checks
```bash
# Check main environment
./scripts/health-check.sh

# Check worktree environment (context-aware)
./scripts/health-check-worktree.sh

# Check all worktree statuses
./scripts/worktree-status.sh
```

### Testing
```bash
# Main worktree (comprehensive)
./scripts/parallel-tests.sh

# Worktree-aware testing (adapts to current context)
./scripts/parallel-tests-worktree.sh

# Feature worktree (focused unit tests)
cd ~/6fb-booking-features/my-feature && npm test
```

---

## 🌊 Complete Workflow Visual

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Feature       │    │      Main       │    │    Staging      │
│   Worktree      │───▶│   Worktree      │───▶│   Worktree      │
│                 │    │                 │    │                 │
│ feature/my-feat │    │    main         │    │    staging      │
│ Port: 3002+     │    │  Port: 3000     │    │  Port: 3001     │
│ DB: feature.db  │    │ DB: main.db     │    │ DB: staging.db  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
    Development              Integration              Pre-Production
     & Testing                Testing                   Testing
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │   Production    │
                                              │                 │
                                              │   production    │
                                              │ bookedbarber.com│
                                              └─────────────────┘
```

---

## ⚡ Quick Troubleshooting

### Port Conflicts
```bash
# Kill all Next.js processes
pkill -f "next dev" && pkill -f "npm run dev"

# Check what's using ports
lsof -i :3000 :3001 :3002 :8000 :8001 :8002

# Clean startup
./scripts/start-dev-session.sh
```

### Database Issues
```bash
# Reset staging database
cd ~/6fb-booking-staging/
rm backend-v2/staging_6fb_booking.db
./scripts/init-staging-database.sh

# Create missing feature database
cd ~/6fb-booking-features/my-feature/
./scripts/create-feature-database.sh
```

### Merge Conflicts
```bash
# In main worktree when merging feature
git status                    # See conflicted files
git diff                      # See conflict details
# Resolve conflicts in editor
git add .
git commit -m "resolve merge conflicts"
```

### Cleanup Everything
```bash
# Nuclear option - clean all environments
./scripts/cleanup-merged-worktrees.sh
pkill -f "npm run dev" && pkill -f "uvicorn"
rm -rf */node_modules/.cache */.next
```

---

## 🎯 Environment-Specific URLs

| Environment | Frontend | Backend | API Docs | Database |
|-------------|----------|---------|----------|----------|
| **Development** | http://localhost:3000 | http://localhost:8000 | http://localhost:8000/docs | SQLite (main) |
| **Feature** | http://localhost:3002+ | http://localhost:8002+ | http://localhost:8002+/docs | SQLite (isolated) |
| **Staging (Local)** | http://localhost:3001 | http://localhost:8001 | http://localhost:8001/docs | SQLite (staging) |
| **Staging (Cloud)** | https://staging.bookedbarber.com | https://api-staging.bookedbarber.com | https://api-staging.bookedbarber.com/docs | PostgreSQL |
| **Production** | https://bookedbarber.com | https://api.bookedbarber.com | https://api.bookedbarber.com/docs | PostgreSQL |

---

## 📋 Pre-Flight Checklist

### Before Starting Development
- [ ] Git working directory is clean (`git status`)
- [ ] On correct branch (`git branch --show-current`)
- [ ] Latest changes pulled (`git pull origin main`)
- [ ] No server conflicts (`lsof -i :3000 :8000`)

### Before Merging Feature
- [ ] All feature tests pass
- [ ] Feature branch pushed to remote
- [ ] No merge conflicts with main
- [ ] Database migrations applied if needed

### Before Staging Deployment
- [ ] All main tests pass
- [ ] Staging environment configured correctly
- [ ] Staging database up to date
- [ ] Environment variables validated

### Before Production Deployment
- [ ] Staging deployment tested thoroughly
- [ ] All integration tests pass
- [ ] Performance tests acceptable
- [ ] Security checks complete
- [ ] Team approval received

---

## 🆘 Emergency Procedures

### Hotfix to Production
```bash
# Create hotfix branch from production
git checkout production
git checkout -b hotfix/critical-fix

# Make minimal changes
git add . && git commit -m "fix: critical production issue"

# Deploy directly (bypass staging for emergencies)
git checkout production
git merge hotfix/critical-fix
git push origin production

# Clean up
git branch -d hotfix/critical-fix
```

### Rollback Production
```bash
# Find last good commit
git log --oneline -10

# Rollback to specific commit
git checkout production
git reset --hard <last-good-commit-hash>
git push --force origin production  # Use with extreme caution
```

### Recover Lost Worktree
```bash
# If worktree directory gets corrupted
git worktree list                    # See current worktrees
git worktree remove <path> --force   # Remove corrupted worktree
./scripts/create-feature-worktree.sh <feature-name>  # Recreate
```

---

## 🏆 Best Practices

### ✅ DO
- Commit frequently with meaningful messages
- Test in feature worktree before merging
- Use staging for integration testing
- Clean up merged feature worktrees
- Keep feature branches focused and small
- Review changes before pushing to main

### ❌ DON'T
- Push directly to main without testing
- Skip staging testing before production
- Leave old feature worktrees lying around
- Mix multiple features in one branch
- Force push to shared branches
- Bypass branch protection rules

---

## 📞 Getting Help

### Check Status
```bash
# Overall worktree health
./scripts/worktree-status.sh

# Environment context
./.claude/scripts/worktree-context-detection.sh

# System health
./scripts/health-check-worktree.sh
```

### Common Issues & Solutions
- **Port conflicts**: Use cleanup scripts
- **Database issues**: Check environment isolation  
- **Merge conflicts**: Resolve in main worktree
- **Performance**: Monitor resource usage per worktree
- **Permission issues**: Check file ownership

### Documentation References
- **Full Documentation**: `/CLAUDE.md` (Enhanced Git Workflow section)
- **Branch Protection**: `/docs/GITHUB_BRANCH_PROTECTION_SETUP.md`
- **Environment Templates**: `/docs/WORKTREE_ENVIRONMENT_TEMPLATES.md`
- **Troubleshooting**: This guide + health check scripts

---

*Last Updated: 2025-07-21*
*For the most current information, see CLAUDE.md in the project root*
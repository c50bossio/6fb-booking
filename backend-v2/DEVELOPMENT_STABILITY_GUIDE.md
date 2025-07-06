# Development Stability Guide

## 🎯 Goal: Rock-Solid Local Development

Your local development environment should be **MORE stable** than production, not less. This guide ensures that happens.

## 🚀 Quick Start (The Right Way)

```bash
# First time setup
npm install -g pm2
cd backend-v2
./scripts/start-dev-stable.sh
```

That's it! Everything is managed for you.

## 🛡️ Why Local Development Gets Unstable

### 1. **Multiple Server Processes** (Most Common)
- **Problem**: Running `npm run dev` multiple times creates zombie processes
- **Solution**: PM2 ensures single instance enforcement

### 2. **Memory Leaks from Hot Reload**
- **Problem**: Next.js dev server accumulates memory over time
- **Solution**: PM2 auto-restarts when memory exceeds 1GB

### 3. **Port Conflicts**
- **Problem**: "Port 3000 is already in use" errors
- **Solution**: Deep clean script kills all processes first

### 4. **Cache Corruption**
- **Problem**: `.next` cache gets corrupted
- **Solution**: Clean start removes all caches

### 5. **Dependency Issues**
- **Problem**: Missing or conflicting npm packages
- **Solution**: Automated dependency checks and installation

## 📋 Daily Development Workflow

### Morning Startup
```bash
cd backend-v2
./scripts/start-dev-stable.sh
# Everything starts clean and monitored
```

### During Development
```bash
# Check status anytime
pm2 status

# View logs
pm2 logs

# Restart a specific service
pm2 restart bookedbarber-frontend

# Monitor in real-time
pm2 monit
```

### End of Day
```bash
pm2 stop all
# Or just close terminal - PM2 handles cleanup
```

## 🔍 Health Monitoring

### 1. **Command Line Health Check**
```bash
npm run health
```

### 2. **Browser Health Monitor**
- Automatically appears in bottom-right of frontend
- Shows real-time status of all services
- Alerts when services are down

### 3. **PM2 Monitoring**
```bash
pm2 monit
```
Real-time CPU, memory, and log monitoring

## 🚨 Troubleshooting Guide

### "Frontend won't load"
```bash
# Quick fix
npm run dev:clean

# If that doesn't work
./scripts/deep-clean-dev.sh
./scripts/start-dev-stable.sh
```

### "Backend API errors"
```bash
# Check backend logs
pm2 logs bookedbarber-backend

# Restart backend only
pm2 restart bookedbarber-backend
```

### "Everything is slow"
```bash
# Check resource usage
pm2 status

# If memory is high
pm2 restart all
```

### "Mysterious TypeScript errors"
```bash
# Clear all caches
cd frontend-v2
rm -rf .next node_modules/.cache tsconfig.tsbuildinfo
npm run dev
```

## 🎯 Performance Baselines

Your local environment should hit these targets:

- **Frontend Load**: < 2 seconds
- **API Response**: < 100ms
- **Hot Reload**: < 1 second
- **Memory Usage**: < 500MB per service
- **CPU Usage**: < 30% idle

## 🛠️ Advanced Commands

### Complete Reset
```bash
# Nuclear option - full reset
pm2 kill
./scripts/deep-clean-dev.sh
rm -rf node_modules package-lock.json
rm -rf frontend-v2/node_modules frontend-v2/package-lock.json
npm run setup
./scripts/start-dev-stable.sh
```

### Performance Profiling
```bash
# CPU profiling
pm2 profile bookedbarber-frontend

# Memory snapshot
pm2 snapshot
```

### Custom PM2 Commands
```bash
# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect

# Generate startup script
pm2 startup
```

## 📊 Stability Checklist

Before starting any coding session:

- [ ] Run `./scripts/start-dev-stable.sh`
- [ ] Verify all services show "online" in `pm2 status`
- [ ] Check health monitor shows all green
- [ ] Confirm ports 3000 and 8000 respond
- [ ] Redis is running (`redis-cli ping`)

## 🚀 Production-Like Stability

### Enable Production Mode Locally
```bash
# Start with production settings
NODE_ENV=production pm2 start ecosystem.config.js --env production
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 10 --num 100 http://localhost:3000
```

### Memory Leak Detection
```bash
# Monitor memory over time
pm2 monitor

# If memory keeps growing, investigate:
pm2 logs --err
```

## 💡 Best Practices

1. **Always use PM2** for development
2. **Never run `npm run dev` directly** 
3. **Check `pm2 status` when things feel slow**
4. **Use `pm2 logs` instead of multiple terminal windows**
5. **Restart services that use > 1GB memory**
6. **Run health checks after major changes**
7. **Commit your PM2 ecosystem config**

## 🎯 The Goal

When everything is working correctly:
- Services start in < 10 seconds
- No crashes during 8-hour coding sessions  
- Hot reload works instantly
- No "port in use" errors ever
- Memory usage stays constant
- You focus on coding, not troubleshooting

## 📞 Getting Help

If stability issues persist:

1. Run: `npm run health > health-report.txt`
2. Check: `pm2 logs --lines 100 > pm2-logs.txt`
3. System info: `npx envinfo > system-info.txt`
4. Share these files when asking for help

Remember: **A stable development environment is a productive development environment!**
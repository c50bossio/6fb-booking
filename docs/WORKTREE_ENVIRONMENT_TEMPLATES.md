# Worktree Environment Templates

This document explains the environment template system for git worktrees in the BookedBarber project.

## Overview

The worktree system uses environment templates to automatically configure each worktree with appropriate settings for its purpose:

- **Feature Worktrees**: Isolated development environments for individual features
- **Staging Worktree**: Local staging environment with production-like settings
- **Main Worktree**: Primary development environment on develop branch

## Template Files

### Backend Templates

#### `.env.feature.template`
- **Purpose**: Feature development in isolated worktrees
- **Database**: Separate SQLite database per feature (`feature_{name}.db`)
- **Ports**: Dynamic assignment (8002+)
- **Security**: Development keys (insecure, not for production)
- **Services**: External services disabled (email, SMS, payments)
- **Logging**: Debug level with feature-specific log files

#### `.env.staging.worktree.template`  
- **Purpose**: Local staging environment for pre-deployment testing
- **Database**: Staging SQLite database (`staging_6fb_booking.db`)
- **Ports**: Fixed staging ports (8001)
- **Security**: Staging keys (secure but not production)
- **Services**: External services enabled with staging credentials
- **Logging**: Info level with staging-specific settings

### Frontend Templates

#### `.env.feature.template`
- **Purpose**: Feature development frontend
- **API**: Points to feature backend (http://localhost:8002+)
- **Analytics**: Disabled for development
- **Payments**: Test keys only, real payments disabled
- **Debug**: Development tools and debug info enabled

#### `.env.staging.worktree.template`
- **Purpose**: Local staging frontend
- **API**: Points to staging backend (http://localhost:8001)
- **Analytics**: Staging tracking IDs enabled
- **Payments**: Test keys with full payment flow testing
- **Debug**: Minimal debug info, production-like behavior

## Template Variables

Templates support variable substitution:

### Available Variables
- `{FEATURE_NAME}`: Name of the feature (e.g., "payment-improvements")
- `{FEATURE_BRANCH}`: Full branch name (e.g., "feature/payment-improvements-20250721")

### Variable Usage Example
```bash
# In template
DATABASE_URL=sqlite:///./feature_{FEATURE_NAME}.db
LOG_FILE=feature_{FEATURE_NAME}.log

# After substitution  
DATABASE_URL=sqlite:///./feature_payment-improvements.db
LOG_FILE=feature_payment-improvements.log
```

## Automatic Configuration

### Feature Worktree Creation
When running `./scripts/create-feature-worktree.sh [feature-name]`:

1. **Backend Configuration**:
   - Copies `.env.feature.template` to `backend-v2/.env`
   - Substitutes `{FEATURE_NAME}` with actual feature name
   - Assigns unique port numbers (8002+)
   - Creates isolated database file

2. **Frontend Configuration**:
   - Copies `.env.feature.template` to `frontend-v2/.env.local`
   - Configures API URL to match backend port
   - Assigns unique frontend port (3002+)
   - Disables external services for development

### Staging Worktree Creation
When running `./scripts/setup-staging-worktree.sh`:

1. **Backend Configuration**:
   - Copies `.env.staging.worktree.template` to `backend-v2/.env.staging`
   - Sets up staging database and Redis configuration
   - Configures staging ports (8001)
   - Enables external services with staging credentials

2. **Frontend Configuration**:
   - Copies `.env.staging.worktree.template` to `frontend-v2/.env.local`
   - Points to staging backend (localhost:8001)
   - Enables production-like features
   - Sets up staging analytics and tracking

## Environment Isolation

### Database Separation
```bash
# Main worktree (develop)
DATABASE_URL=sqlite:///./6fb_booking.db

# Staging worktree  
DATABASE_URL=sqlite:///./staging_6fb_booking.db

# Feature worktree
DATABASE_URL=sqlite:///./feature_payment-improvements.db
```

### Redis Database Separation
```bash
# Main worktree
REDIS_URL=redis://localhost:6379/0

# Staging worktree
REDIS_URL=redis://localhost:6379/1  

# Feature worktrees
REDIS_URL=redis://localhost:6379/2
```

### Port Assignments
| Environment | Frontend Port | Backend Port | Purpose |
|-------------|---------------|--------------|---------|
| Main (develop) | 3000 | 8000 | Primary development |
| Staging | 3001 | 8001 | Pre-deployment testing |
| Feature #1 | 3002 | 8002 | Feature development |
| Feature #2 | 3003 | 8003 | Parallel feature development |

## Security Considerations

### Development Keys (Feature Templates)
- **Purpose**: Insecure keys for isolated development
- **Usage**: Never use in staging or production
- **Rotation**: Not required (development only)

### Staging Keys (Staging Template)
- **Purpose**: Secure keys for staging testing
- **Usage**: Local staging environment only
- **Rotation**: Regular rotation recommended

### Production Keys
- **Source**: Render environment variables
- **Management**: Secure credential management system
- **Access**: Limited to production environment

## Customization

### Adding New Variables
1. **Define variable** in template files using `{VARIABLE_NAME}` syntax
2. **Update scripts** to perform substitution:
   ```bash
   # In create-feature-worktree.sh
   sed -i '' "s/{VARIABLE_NAME}/$actual_value/g" .env
   ```

### Adding New Templates
1. **Create template file** in appropriate directory
2. **Update creation scripts** to use new template
3. **Document variables** and usage in this file

### Template Validation
```bash
# Check template syntax
grep -E '\{[A-Z_]+\}' .env.feature.template

# Validate substitution
./scripts/create-feature-worktree.sh test-feature
grep -E '\{[A-Z_]+\}' /path/to/worktree/.env  # Should return nothing
```

## Troubleshooting

### Common Issues

#### Variable Not Substituted
```bash
# Problem: Variable still shows in final .env
DATABASE_URL=sqlite:///./feature_{FEATURE_NAME}.db

# Solution: Check script substitution logic
sed -i '' "s/{FEATURE_NAME}/$FEATURE_NAME/g" .env
```

#### Port Conflicts
```bash
# Problem: Port already in use
EADDRINUSE: Port 3002 is already in use

# Solution: Script auto-finds available ports
for i in {0..20}; do
    PORT=$((3002 + i))
    if ! lsof -i :$PORT > /dev/null 2>&1; then
        break
    fi
done
```

#### Missing Template
```bash
# Problem: Template file not found
cp: .env.feature.template: No such file or directory

# Solution: Verify template exists
ls -la backend-v2/.env.*.template
```

### Debug Environment Setup
```bash
# Verify environment configuration
cd [worktree-path]
cat backend-v2/.env | grep -E "DATABASE_URL|PORT|FEATURE_NAME"
cat frontend-v2/.env.local | grep -E "NEXT_PUBLIC_API_URL|NEXT_PUBLIC_ENVIRONMENT"
```

## Best Practices

### Template Management
1. **Keep templates updated** with new configuration options
2. **Version control templates** but never actual .env files
3. **Test template changes** with sample worktree creation
4. **Document new variables** in this file

### Environment Variables
1. **Use descriptive names** for clarity
2. **Group related settings** in template sections
3. **Provide secure defaults** where possible
4. **Comment sensitive values** with security notes

### Worktree Workflow
1. **Always use templates** for consistency
2. **Verify configuration** after worktree creation
3. **Clean up environments** when features are merged
4. **Monitor resource usage** (databases, ports, logs)

## Reference

### Template Locations
```
backend-v2/
├── .env.feature.template              # Feature backend template
├── .env.staging.worktree.template     # Staging backend template
└── frontend-v2/
    ├── .env.feature.template          # Feature frontend template
    └── .env.staging.worktree.template # Staging frontend template
```

### Script Integration
- `create-feature-worktree.sh`: Uses feature templates
- `setup-staging-worktree.sh`: Uses staging templates  
- `cleanup-merged-worktrees.sh`: Cleans up environment files
- `worktree-status.sh`: Shows environment configuration status
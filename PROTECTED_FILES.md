# Protected Files Registry

## Overview
This file lists all files that should NOT be modified without explicit permission. These files are critical to system stability and have been carefully crafted to work correctly.

## 🛡️ CRITICAL PROTECTION RULES

1. **ALWAYS CHECK THIS FILE FIRST** before modifying any code
2. **NEVER MODIFY** protected files during feature development
3. **CREATE NEW FILES** instead of modifying protected ones
4. **ASK PERMISSION** if a feature requires changes to protected files
5. **COMPOSE, DON'T MODIFY** - extend functionality without changing core files

## Protected Files List

### Frontend Core Files (DO NOT MODIFY)
```
backend-v2/frontend-v2/
├── app/
│   ├── layout.tsx              # ⛔ Root layout - NEVER modify during feature work
│   ├── (auth)/layout.tsx       # ⛔ Auth layout - critical for authentication flow
│   └── globals.css             # ⛔ Global styles - can break entire UI
├── components/
│   ├── ui/                     # ⛔ ALL shadcn/ui components - use as-is
│   ├── booking/
│   │   ├── BookingModal.tsx    # ⛔ Core booking flow - working perfectly
│   │   └── BookingCalendar.tsx # ⛔ Calendar component - complex state management
│   └── navigation/
│       ├── Header.tsx          # ⛔ Main navigation - affects all pages
│       └── Sidebar.tsx         # ⛔ Dashboard navigation - complex routing
└── lib/
    ├── auth.ts                 # ⛔ Authentication logic - security critical
    └── api.ts                  # ⛔ API client - all requests depend on this
```

### Backend Core Files (DO NOT MODIFY)
```
backend-v2/
├── main.py                     # ⛔ FastAPI app configuration - server startup
├── config/
│   ├── database.py            # ⛔ Database connection - can break all queries
│   └── settings.py            # ⛔ Environment configuration - security sensitive
├── middleware/
│   ├── auth.py                # ⛔ JWT validation - security critical
│   └── cors.py                # ⛔ CORS configuration - can block frontend
├── models/
│   ├── user.py                # ⛔ User model - authentication depends on this
│   └── base.py                # ⛔ Base model - all models inherit from this
└── utils/
    ├── security.py            # ⛔ Password hashing - security critical
    └── jwt.py                 # ⛔ Token generation - authentication core
```

### Configuration Files (DO NOT MODIFY)
```
/
├── .gitignore                 # ⛔ Git ignore rules - can expose secrets
├── docker-compose.yml         # ⛔ Docker configuration - deployment critical
├── package.json               # ⚠️ Modify dependencies only with approval
├── requirements.txt           # ⚠️ Modify dependencies only with approval
└── alembic.ini               # ⛔ Database migration config - can break migrations
```

### Database Migrations (NEVER MODIFY)
```
backend-v2/migrations/versions/
├── *.py                       # ⛔ ALL migration files - modifying breaks database
```

## Working With Protected Files

### If You Need to Extend Functionality:

1. **For Components**: Create wrapper components
   ```typescript
   // ❌ DON'T modify BookingModal.tsx
   // ✅ DO create EnhancedBookingModal.tsx that wraps it
   import { BookingModal } from './BookingModal';
   
   export function EnhancedBookingModal(props) {
     // Add your enhancements here
     return <BookingModal {...props} />;
   }
   ```

2. **For Services**: Create new service files
   ```python
   # ❌ DON'T modify auth_service.py
   # ✅ DO create auth_extensions.py that imports from it
   from services.auth_service import AuthService
   
   class ExtendedAuthService(AuthService):
       # Add new methods here
   ```

3. **For API Routes**: Add new endpoints
   ```python
   # ❌ DON'T modify existing endpoints
   # ✅ DO add new endpoints in new files
   ```

## Marketing Integration Protected Files (NEW - 2025-07-02)

### Core Marketing Files (PROTECTED AFTER IMPLEMENTATION)
```
backend-v2/
├── services/
│   ├── oauth_service.py       # 🔒 OAuth flow - security critical
│   ├── gmb_service.py         # 🔒 Google My Business - API integration
│   ├── review_service.py      # 🔒 Review automation - business critical
│   └── tracking_service.py    # 🔒 Conversion tracking - analytics core
├── api/v1/
│   ├── oauth.py              # 🔒 OAuth endpoints - security sensitive
│   ├── integrations.py       # 🔒 Integration management - data integrity
│   └── marketing/            # 🔒 Marketing endpoints directory
└── models/
    ├── integration.py        # 🔒 Integration model - data structure
    ├── review_template.py    # 🔒 Review templates - content management
    └── conversion_event.py   # 🔒 Tracking model - analytics data

backend-v2/frontend-v2/
├── components/
│   └── settings/
│       └── IntegrationsHub.tsx # 🔒 Integration UI - complex state
└── lib/
    └── tracking.ts           # 🔒 Tracking client - analytics critical
```

## Exception Process

If you absolutely MUST modify a protected file:

1. **STOP** and document why modification is necessary
2. **CREATE** a detailed plan of changes
3. **GET APPROVAL** from project lead
4. **BACKUP** the file before modification
5. **TEST EXTENSIVELY** after changes
6. **UPDATE** this registry with any new protections

## Version History

- **2025-01-02**: Initial protected files registry created
- **2025-01-15**: Added frontend component protections
- **2025-07-02**: Added marketing integration files to protection list

## Emergency Contacts

If you accidentally modify a protected file:
1. **DON'T PANIC**
2. Run: `git checkout -- <file-path>` to restore
3. If committed, create a revert commit immediately
4. Document what happened for team awareness

---

**Remember**: These protections exist to maintain system stability. When in doubt, create new files instead of modifying existing ones.
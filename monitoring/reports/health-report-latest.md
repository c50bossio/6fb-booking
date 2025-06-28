# 🏥 Codebase Health Report

**Generated:** 6/27/2025, 10:53:01 PM

## 📊 Executive Summary


**Overall Status:** 🔴 Critical (35%)

- **Files:** 1,785 files, 16.98 MB
- **Issues:** 1 critical, 3 warnings
- **Duplicates:** 16 found
- **TODOs:** 55 pending
- **Complexity:** Average 14.29


## 🚨 Critical Issues

- 🔴 Found 16 duplicate files/components (max allowed: 10)

## ⚠️  Warnings

- 🟡 PY file count (515) exceeds threshold (500)
- 🟡 309 files exceed complexity threshold
- 🟡 Too many TODOs (55) in codebase (max: 50)

## 📈 Metrics Overview

### 📁 File Statistics
- **Total Files:** 1,785
- **Total Size:** 16.98 MB

| File Type | Count | Size |
|-----------|-------|------|
| .py | 515 | 5.83 MB |
| .tsx | 384 | 4.35 MB |
| .md | 300 | 2.01 MB |
| .ts | 174 | 1.18 MB |
| .sh | 79 | 434.88 KB |
| .json | 75 | 917.22 KB |
| .js | 72 | 707.37 KB |
| .html | 71 | 564.78 KB |
| .txt | 23 | 33.94 KB |
| no extension | 12 | 10.97 KB |

### 🔍 Duplicate Detection
- **Duplicate Files:** 1
- **Similar Named Components:** 15


#### Duplicates Found:
- **Identical content** (430 Bytes):
  - frontend/src/app/barber-payments/minimal.tsx
  - frontend/src/app/barber-payments/page.tsx

- **page** found in:
  - frontend/src/app/(auth)/pos/page.tsx
  - frontend/src/app/about/page.tsx
  - frontend/src/app/analytics/ai/page.tsx
  - frontend/src/app/analytics/page.tsx
  - frontend/src/app/app/analytics/page.tsx
  - frontend/src/app/app/appointments/page.tsx
  - frontend/src/app/app/barbers/page.tsx
  - frontend/src/app/app/calendar/page.tsx
  - frontend/src/app/app/clients/page.tsx
  - frontend/src/app/app/page.tsx
  - frontend/src/app/app/payments/page.tsx
  - frontend/src/app/app/payouts/dashboard/page.tsx
  - frontend/src/app/app/payouts/management/page.tsx
  - frontend/src/app/app/payouts/page.tsx
  - frontend/src/app/appointments/page.tsx
  - frontend/src/app/auth-test/page.tsx
  - frontend/src/app/barber-payments/page.tsx
  - frontend/src/app/barbers/page.tsx
  - frontend/src/app/billing/page.tsx
  - frontend/src/app/book/[shopId]/booking/page.tsx
  - frontend/src/app/book/[shopId]/mobile-booking/page.tsx
  - frontend/src/app/book/[shopId]/page.tsx
  - frontend/src/app/book/confirmation/[token]/page.tsx
  - frontend/src/app/book/confirmation/demo/page.tsx
  - frontend/src/app/book/page.tsx
  - frontend/src/app/booking-calendar-demo/page.tsx
  - frontend/src/app/booking-demo/page.tsx
  - frontend/src/app/calendar-demo/page.tsx
  - frontend/src/app/calendar-google-demo/page.tsx
  - frontend/src/app/calendar-test/page.tsx
  - frontend/src/app/clients/[id]/page.tsx
  - frontend/src/app/clients/page.tsx
  - frontend/src/app/communications/page.tsx
  - frontend/src/app/contact/page.tsx
  - frontend/src/app/customer/appointments/page.tsx
  - frontend/src/app/customer/dashboard/page.tsx
  - frontend/src/app/customer/history/page.tsx
  - frontend/src/app/customer/login/page.tsx
  - frontend/src/app/customer/profile/page.tsx
  - frontend/src/app/customer/reset-password/page.tsx
  - frontend/src/app/customer/signup/page.tsx
  - frontend/src/app/dashboard/appointments/new/page.tsx
  - frontend/src/app/dashboard/appointments/page.tsx
  - frontend/src/app/dashboard/calendar/page.tsx
  - frontend/src/app/dashboard/calendar-demo/page.tsx
  - frontend/src/app/dashboard/calendar-settings/page.tsx
  - frontend/src/app/dashboard/clients/page.tsx
  - frontend/src/app/dashboard/enhanced/page.tsx
  - frontend/src/app/dashboard/financial/page.tsx
  - frontend/src/app/dashboard/gift-certificates/page.tsx
  - frontend/src/app/dashboard/notifications/page.tsx
  - frontend/src/app/dashboard/page.tsx
  - frontend/src/app/dashboard/services/page.tsx
  - frontend/src/app/dashboard/trafft-connect/page.tsx
  - frontend/src/app/demo-google-calendar/page.tsx
  - frontend/src/app/email-campaigns/page.tsx
  - frontend/src/app/enhanced-calendar-demo/page.tsx
  - frontend/src/app/example-dashboard/page.tsx
  - frontend/src/app/gift-certificates/page.tsx
  - frontend/src/app/gift-certificates/purchase/page.tsx
  - frontend/src/app/google-test/page.tsx
  - frontend/src/app/landing/page.tsx
  - frontend/src/app/local-seo/page.tsx
  - frontend/src/app/locations/page.tsx
  - frontend/src/app/login/page.tsx
  - frontend/src/app/notifications/page.tsx
  - frontend/src/app/page.tsx
  - frontend/src/app/payment/failure/page.tsx
  - frontend/src/app/payment/success/page.tsx
  - frontend/src/app/payments/failed/page.tsx
  - frontend/src/app/payments/page.tsx
  - frontend/src/app/payments/success/page.tsx
  - frontend/src/app/payout-schedules/page.tsx
  - frontend/src/app/payouts/page.tsx
  - frontend/src/app/privacy/page.tsx
  - frontend/src/app/recurring-bookings/page.tsx
  - frontend/src/app/reset-password/page.tsx
  - frontend/src/app/security/page.tsx
  - frontend/src/app/seo/local/page.tsx
  - frontend/src/app/settings/compensation/page.tsx
  - frontend/src/app/settings/google-calendar/page.tsx
  - frontend/src/app/settings/page.tsx
  - frontend/src/app/settings/payments/page.tsx
  - frontend/src/app/signup/page.tsx
  - frontend/src/app/simple-calendar-demo/page.tsx
  - frontend/src/app/subscription/[token]/page.tsx
  - frontend/src/app/support/page.tsx
  - frontend/src/app/terms/page.tsx
  - frontend/src/app/test/page.tsx
  - frontend/src/app/test-calendar/page.tsx
  - frontend/src/app/test-dashboard/page.tsx
  - frontend/src/app/test-public/page.tsx
  - frontend/src/app/upgrade/page.tsx

- **layout** found in:
  - frontend/src/app/analytics/layout.tsx
  - frontend/src/app/app/layout.tsx
  - frontend/src/app/barbers/layout.tsx
  - frontend/src/app/book/[shopId]/layout.tsx
  - frontend/src/app/clients/layout.tsx
  - frontend/src/app/dashboard/layout.tsx
  - frontend/src/app/layout.tsx
  - frontend/src/app/login/layout.tsx

- **page-complex** found in:
  - frontend/src/app/analytics/page-complex.tsx
  - frontend/src/app/barber-payments/page-complex.tsx
  - frontend/src/app/barbers/page-complex.tsx
  - frontend/src/app/page-complex.tsx

- **route** found in:
  - frontend/src/app/api/auth/google/callback/route.ts
  - frontend/src/app/api/auth/google/refresh/route.ts
  - frontend/src/app/api/auth/google/token/route.ts
  - frontend/src/app/api/contact/route.ts
  - frontend/src/app/api/debug-contact/route.ts
  - frontend/src/app/api/debug-env/route.ts
  - frontend/src/app/api/health/route.ts
  - frontend/src/app/api/list-pages/route.ts
  - frontend/src/app/api/proxy/[...path]/route.ts
  - frontend/src/app/api/v1/errors/route.ts
  - frontend/src/app/api/verify-pages/route.ts
  - frontend/src/app/api/webhooks/google-calendar/route.ts

- **page-backup** found in:
  - frontend/src/app/barbers/page-backup.tsx
  - frontend/src/app/dashboard/clients/page-backup.tsx

- **DashboardLayout** found in:
  - frontend/src/components/DashboardLayout.tsx
  - frontend/src/components/layouts/DashboardLayout.tsx

- **ErrorBoundary** found in:
  - frontend/src/components/ErrorBoundary.tsx
  - frontend/src/components/error/ErrorBoundary.tsx

- **NotificationCenter** found in:
  - frontend/src/components/NotificationCenter.tsx
  - frontend/src/components/notifications/NotificationCenter.tsx

- **index** found in:
  - frontend/src/components/ai-analytics/index.ts
  - frontend/src/components/booking/index.ts
  - frontend/src/components/calendar/index.ts
  - frontend/src/components/communications/index.ts
  - frontend/src/components/error/index.ts
  - frontend/src/components/gift-certificates/index.ts
  - frontend/src/components/homepage/index.ts
  - frontend/src/components/layouts/index.ts
  - frontend/src/components/modals/index.ts
  - frontend/src/components/notifications/index.ts
  - frontend/src/components/payments/index.ts
  - frontend/src/components/payouts/index.ts
  - frontend/src/components/pos/index.ts
  - frontend/src/components/trial/index.ts
  - frontend/src/lib/api/index.ts
  - frontend/src/lib/availability/index.ts
  - frontend/src/lib/error-handling/index.ts


### 📦 Bundle Size Analysis

- **Frontend Total:** 0 Bytes
- **Backend Size:** 32.19 MB


#### Page Bundle Sizes:
| Page | Size |
|------|------|
| /_app | 0 Bytes |



### 🔧 Dependencies
#### Frontend
- **Dependencies:** 42
- **Dev Dependencies:** 15
- **Outdated:** 17

- **Vulnerabilities:**
  - Critical: 0
  - High: 0
  - Moderate: 0
  - Low: 0


#### Backend
- **Dependencies:** 52
- **Outdated:** 38

### 🧩 Code Complexity
- **Total Files Analyzed:** 1145
- **Average Complexity:** 14.29
- **Max Complexity:** 214
- **Files Over Threshold:** 309


#### Most Complex Files:
- frontend/src/components/booking/BookingFlow.tsx (complexity: 214, lines: 1360)
- frontend/src/components/calendar/_archived/EnterpriseCalendar.tsx (complexity: 208, lines: 1509)
- frontend/scripts/preemptive-issue-detector.js (complexity: 169, lines: 1712)
- frontend/src/components/ModernCalendar.tsx (complexity: 162, lines: 975)
- frontend/src/app/book/[shopId]/booking/page.tsx (complexity: 161, lines: 1243)
- frontend/src/app/dashboard/calendar/page.tsx (complexity: 160, lines: 1318)
- frontend/src/lib/api/client.ts (complexity: 142, lines: 786)
- frontend/src/components/calendar/_archived/DragDropCalendar.tsx (complexity: 140, lines: 1540)
- frontend/src/components/CompensationPlanForm.tsx (complexity: 138, lines: 1887)
- frontend/src/app/dashboard/calendar/_archived/page-premium.tsx (complexity: 128, lines: 756)


### 🧪 Test Coverage


#### Frontend Coverage
- **Lines:** 0%
- **Statements:** 0%
- **Functions:** 0%
- **Branches:** 0%



#### Backend Coverage
{}


### 📝 TODO/FIXME Comments
- **Total:** 55


#### By Type:
- TODO: 45
- XXX: 2
- BUG: 8

#### Recent TODOs:
- [TODO] backend/api/analytics.py:12 - Add authentication dependency to get current barber_id
- [TODO] backend/api/appointments.py:247 - Implement Trafft webhook handling
- [TODO] backend/api/v1/analytics.py:696 - Calculate actual growth
- [TODO] backend/api/v1/analytics.py:698 - Calculate actual retention
- [TODO] backend/api/v1/analytics.py:701 - Get from settings
- [TODO] backend/api/v1/analytics.py:711 - Calculate from ratings
- [TODO] backend/api/v1/analytics.py:1104 - Implement PDF export with charts
- [TODO] backend/api/v1/analytics.py:1108 - Implement Excel export with multiple sheets
- [TODO] backend/api/v1/appointments.py:1595 - Implement holiday checking
- [TODO] backend/api/v1/appointments.py:1705 - Send confirmation email/webhook for recurring appointments




## 💡 Recommendations

- 🚨 Address critical issues immediately
- 🔄 Refactor duplicate components into shared modules
- 🧩 Refactor complex files to improve maintainability
- 📝 Schedule time to address accumulated TODOs
- 📦 Update outdated dependencies to get latest features and security fixes

---
*Report generated by Codebase Health Monitor*

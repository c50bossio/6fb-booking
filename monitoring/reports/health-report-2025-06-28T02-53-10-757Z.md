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
  - backend-v2/frontend-v2/src/app/barber-payments/minimal.tsx
  - backend-v2/frontend-v2/src/app/barber-payments/page.tsx

- **page** found in:
  - backend-v2/frontend-v2/src/app/(auth)/pos/page.tsx
  - backend-v2/frontend-v2/src/app/about/page.tsx
  - backend-v2/frontend-v2/src/app/analytics/ai/page.tsx
  - backend-v2/frontend-v2/src/app/analytics/page.tsx
  - backend-v2/frontend-v2/src/app/app/analytics/page.tsx
  - backend-v2/frontend-v2/src/app/app/appointments/page.tsx
  - backend-v2/frontend-v2/src/app/app/barbers/page.tsx
  - backend-v2/frontend-v2/src/app/app/calendar/page.tsx
  - backend-v2/frontend-v2/src/app/app/clients/page.tsx
  - backend-v2/frontend-v2/src/app/app/page.tsx
  - backend-v2/frontend-v2/src/app/app/payments/page.tsx
  - backend-v2/frontend-v2/src/app/app/payouts/dashboard/page.tsx
  - backend-v2/frontend-v2/src/app/app/payouts/management/page.tsx
  - backend-v2/frontend-v2/src/app/app/payouts/page.tsx
  - backend-v2/frontend-v2/src/app/appointments/page.tsx
  - backend-v2/frontend-v2/src/app/auth-test/page.tsx
  - backend-v2/frontend-v2/src/app/barber-payments/page.tsx
  - backend-v2/frontend-v2/src/app/barbers/page.tsx
  - backend-v2/frontend-v2/src/app/billing/page.tsx
  - backend-v2/frontend-v2/src/app/book/[shopId]/booking/page.tsx
  - backend-v2/frontend-v2/src/app/book/[shopId]/mobile-booking/page.tsx
  - backend-v2/frontend-v2/src/app/book/[shopId]/page.tsx
  - backend-v2/frontend-v2/src/app/book/confirmation/[token]/page.tsx
  - backend-v2/frontend-v2/src/app/book/confirmation/demo/page.tsx
  - backend-v2/frontend-v2/src/app/book/page.tsx
  - backend-v2/frontend-v2/src/app/booking-calendar-demo/page.tsx
  - backend-v2/frontend-v2/src/app/booking-demo/page.tsx
  - backend-v2/frontend-v2/src/app/calendar-demo/page.tsx
  - backend-v2/frontend-v2/src/app/calendar-google-demo/page.tsx
  - backend-v2/frontend-v2/src/app/calendar-test/page.tsx
  - backend-v2/frontend-v2/src/app/clients/[id]/page.tsx
  - backend-v2/frontend-v2/src/app/clients/page.tsx
  - backend-v2/frontend-v2/src/app/communications/page.tsx
  - backend-v2/frontend-v2/src/app/contact/page.tsx
  - backend-v2/frontend-v2/src/app/customer/appointments/page.tsx
  - backend-v2/frontend-v2/src/app/customer/dashboard/page.tsx
  - backend-v2/frontend-v2/src/app/customer/history/page.tsx
  - backend-v2/frontend-v2/src/app/customer/login/page.tsx
  - backend-v2/frontend-v2/src/app/customer/profile/page.tsx
  - backend-v2/frontend-v2/src/app/customer/reset-password/page.tsx
  - backend-v2/frontend-v2/src/app/customer/signup/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/appointments/new/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/appointments/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/calendar/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/calendar-demo/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/calendar-settings/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/clients/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/enhanced/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/financial/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/gift-certificates/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/notifications/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/services/page.tsx
  - backend-v2/frontend-v2/src/app/dashboard/trafft-connect/page.tsx
  - backend-v2/frontend-v2/src/app/demo-google-calendar/page.tsx
  - backend-v2/frontend-v2/src/app/email-campaigns/page.tsx
  - backend-v2/frontend-v2/src/app/enhanced-calendar-demo/page.tsx
  - backend-v2/frontend-v2/src/app/example-dashboard/page.tsx
  - backend-v2/frontend-v2/src/app/gift-certificates/page.tsx
  - backend-v2/frontend-v2/src/app/gift-certificates/purchase/page.tsx
  - backend-v2/frontend-v2/src/app/google-test/page.tsx
  - backend-v2/frontend-v2/src/app/landing/page.tsx
  - backend-v2/frontend-v2/src/app/local-seo/page.tsx
  - backend-v2/frontend-v2/src/app/locations/page.tsx
  - backend-v2/frontend-v2/src/app/login/page.tsx
  - backend-v2/frontend-v2/src/app/notifications/page.tsx
  - backend-v2/frontend-v2/src/app/page.tsx
  - backend-v2/frontend-v2/src/app/payment/failure/page.tsx
  - backend-v2/frontend-v2/src/app/payment/success/page.tsx
  - backend-v2/frontend-v2/src/app/payments/failed/page.tsx
  - backend-v2/frontend-v2/src/app/payments/page.tsx
  - backend-v2/frontend-v2/src/app/payments/success/page.tsx
  - backend-v2/frontend-v2/src/app/payout-schedules/page.tsx
  - backend-v2/frontend-v2/src/app/payouts/page.tsx
  - backend-v2/frontend-v2/src/app/privacy/page.tsx
  - backend-v2/frontend-v2/src/app/recurring-bookings/page.tsx
  - backend-v2/frontend-v2/src/app/reset-password/page.tsx
  - backend-v2/frontend-v2/src/app/security/page.tsx
  - backend-v2/frontend-v2/src/app/seo/local/page.tsx
  - backend-v2/frontend-v2/src/app/settings/compensation/page.tsx
  - backend-v2/frontend-v2/src/app/settings/google-calendar/page.tsx
  - backend-v2/frontend-v2/src/app/settings/page.tsx
  - backend-v2/frontend-v2/src/app/settings/payments/page.tsx
  - backend-v2/frontend-v2/src/app/signup/page.tsx
  - backend-v2/frontend-v2/src/app/simple-calendar-demo/page.tsx
  - backend-v2/frontend-v2/src/app/subscription/[token]/page.tsx
  - backend-v2/frontend-v2/src/app/support/page.tsx
  - backend-v2/frontend-v2/src/app/terms/page.tsx
  - backend-v2/frontend-v2/src/app/test/page.tsx
  - backend-v2/frontend-v2/src/app/test-calendar/page.tsx
  - backend-v2/frontend-v2/src/app/test-dashboard/page.tsx
  - backend-v2/frontend-v2/src/app/test-public/page.tsx
  - backend-v2/frontend-v2/src/app/upgrade/page.tsx

- **layout** found in:
  - backend-v2/frontend-v2/src/app/analytics/layout.tsx
  - backend-v2/frontend-v2/src/app/app/layout.tsx
  - backend-v2/frontend-v2/src/app/barbers/layout.tsx
  - backend-v2/frontend-v2/src/app/book/[shopId]/layout.tsx
  - backend-v2/frontend-v2/src/app/clients/layout.tsx
  - backend-v2/frontend-v2/src/app/dashboard/layout.tsx
  - backend-v2/frontend-v2/src/app/layout.tsx
  - backend-v2/frontend-v2/src/app/login/layout.tsx

- **page-complex** found in:
  - backend-v2/frontend-v2/src/app/analytics/page-complex.tsx
  - backend-v2/frontend-v2/src/app/barber-payments/page-complex.tsx
  - backend-v2/frontend-v2/src/app/barbers/page-complex.tsx
  - backend-v2/frontend-v2/src/app/page-complex.tsx

- **route** found in:
  - backend-v2/frontend-v2/src/app/api/auth/google/callback/route.ts
  - backend-v2/frontend-v2/src/app/api/auth/google/refresh/route.ts
  - backend-v2/frontend-v2/src/app/api/auth/google/token/route.ts
  - backend-v2/frontend-v2/src/app/api/contact/route.ts
  - backend-v2/frontend-v2/src/app/api/debug-contact/route.ts
  - backend-v2/frontend-v2/src/app/api/debug-env/route.ts
  - backend-v2/frontend-v2/src/app/api/health/route.ts
  - backend-v2/frontend-v2/src/app/api/list-pages/route.ts
  - backend-v2/frontend-v2/src/app/api/proxy/[...path]/route.ts
  - backend-v2/frontend-v2/src/app/api/v1/errors/route.ts
  - backend-v2/frontend-v2/src/app/api/verify-pages/route.ts
  - backend-v2/frontend-v2/src/app/api/webhooks/google-calendar/route.ts

- **page-backup** found in:
  - backend-v2/frontend-v2/src/app/barbers/page-backup.tsx
  - backend-v2/frontend-v2/src/app/dashboard/clients/page-backup.tsx

- **DashboardLayout** found in:
  - backend-v2/frontend-v2/src/components/DashboardLayout.tsx
  - backend-v2/frontend-v2/src/components/layouts/DashboardLayout.tsx

- **ErrorBoundary** found in:
  - backend-v2/frontend-v2/src/components/ErrorBoundary.tsx
  - backend-v2/frontend-v2/src/components/error/ErrorBoundary.tsx

- **NotificationCenter** found in:
  - backend-v2/frontend-v2/src/components/NotificationCenter.tsx
  - backend-v2/frontend-v2/src/components/notifications/NotificationCenter.tsx

- **index** found in:
  - backend-v2/frontend-v2/src/components/ai-analytics/index.ts
  - backend-v2/frontend-v2/src/components/booking/index.ts
  - backend-v2/frontend-v2/src/components/calendar/index.ts
  - backend-v2/frontend-v2/src/components/communications/index.ts
  - backend-v2/frontend-v2/src/components/error/index.ts
  - backend-v2/frontend-v2/src/components/gift-certificates/index.ts
  - backend-v2/frontend-v2/src/components/homepage/index.ts
  - backend-v2/frontend-v2/src/components/layouts/index.ts
  - backend-v2/frontend-v2/src/components/modals/index.ts
  - backend-v2/frontend-v2/src/components/notifications/index.ts
  - backend-v2/frontend-v2/src/components/payments/index.ts
  - backend-v2/frontend-v2/src/components/payouts/index.ts
  - backend-v2/frontend-v2/src/components/pos/index.ts
  - backend-v2/frontend-v2/src/components/trial/index.ts
  - backend-v2/frontend-v2/src/lib/api/index.ts
  - backend-v2/frontend-v2/src/lib/availability/index.ts
  - backend-v2/frontend-v2/src/lib/error-handling/index.ts


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
- backend-v2/frontend-v2/src/components/booking/BookingFlow.tsx (complexity: 214, lines: 1360)
- backend-v2/frontend-v2/src/components/calendar/_archived/EnterpriseCalendar.tsx (complexity: 208, lines: 1509)
- backend-v2/frontend-v2/scripts/preemptive-issue-detector.js (complexity: 169, lines: 1712)
- backend-v2/frontend-v2/src/components/ModernCalendar.tsx (complexity: 162, lines: 975)
- backend-v2/frontend-v2/src/app/book/[shopId]/booking/page.tsx (complexity: 161, lines: 1243)
- backend-v2/frontend-v2/src/app/dashboard/calendar/page.tsx (complexity: 160, lines: 1318)
- backend-v2/frontend-v2/src/lib/api/client.ts (complexity: 142, lines: 786)
- backend-v2/frontend-v2/src/components/calendar/_archived/DragDropCalendar.tsx (complexity: 140, lines: 1540)
- backend-v2/frontend-v2/src/components/CompensationPlanForm.tsx (complexity: 138, lines: 1887)
- backend-v2/frontend-v2/src/app/dashboard/calendar/_archived/page-premium.tsx (complexity: 128, lines: 756)


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
- [TODO] backend-v2/api/analytics.py:12 - Add authentication dependency to get current barber_id
- [TODO] backend-v2/api/appointments.py:247 - Implement Trafft webhook handling
- [TODO] backend-v2/api/v1/analytics.py:696 - Calculate actual growth
- [TODO] backend-v2/api/v1/analytics.py:698 - Calculate actual retention
- [TODO] backend-v2/api/v1/analytics.py:701 - Get from settings
- [TODO] backend-v2/api/v1/analytics.py:711 - Calculate from ratings
- [TODO] backend-v2/api/v1/analytics.py:1104 - Implement PDF export with charts
- [TODO] backend-v2/api/v1/analytics.py:1108 - Implement Excel export with multiple sheets
- [TODO] backend-v2/api/v1/appointments.py:1595 - Implement holiday checking
- [TODO] backend-v2/api/v1/appointments.py:1705 - Send confirmation email/webhook for recurring appointments




## 💡 Recommendations

- 🚨 Address critical issues immediately
- 🔄 Refactor duplicate components into shared modules
- 🧩 Refactor complex files to improve maintainability
- 📝 Schedule time to address accumulated TODOs
- 📦 Update outdated dependencies to get latest features and security fixes

---
*Report generated by Codebase Health Monitor*

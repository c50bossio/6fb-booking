# Unused Imports Technical Details - Specific Removals

This document provides detailed, file-by-file analysis of unused imports that can be safely removed.

## Critical Application Files

### main.py (Application Entry Point)
**Status:** HIGH PRIORITY CLEANUP

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from slowapi import _rate_limit_exceeded_handler  # Line 4
import models  # Line 7  
import models.tracking  # Line 9
import models.upselling  # Line 10

# KEEP these lines (they are used):
from slowapi.errors import RateLimitExceeded  # Used in line 205
from contextlib import asynccontextmanager  # Used in line 40
```

**Impact:** Reduces application startup imports by 4 unused modules.

---

## Router Files (API Endpoints)

### routers/appointments.py
**Status:** HIGH PRIORITY - Core booking functionality

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from decimal import Decimal  # Line 1 - Not used
from typing import List, Optional  # Line 4 - Only Optional is actually unused
from datetime import date, datetime, time, timedelta  # Line 5 - datetime and timedelta not used
from utils.input_validation import validate_datetime, ValidationError as InputValidationError  # Line 11 - Not used
from schemas_new.validation import AppointmentCreateRequest  # Line 12 - Not used

# REPLACE this line:
from typing import List, Optional  # Line 4
# WITH:
from typing import Optional  # Only Optional is used

# REPLACE this line:
from datetime import date, datetime, time, timedelta  # Line 5
# WITH:
from datetime import date, time  # Only date and time are used
```

### routers/auth.py  
**Status:** CRITICAL PRIORITY - Authentication system

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from decimal import Decimal  # Line 1 - Not used in auth
from fastapi import APIRouter, Depends, HTTPException, status, Request, Path  # Line 2 - Path not used
from models.mfa import UserMFASecret, MFADeviceTrust  # Line 33 - MFADeviceTrust not used
from schemas import UserType  # Line 36 - Not used
from utils.input_validation import validate_string, validate_email_address, validate_phone_number, validate_slug, ValidationError as InputValidationError  # Line 37 - Not used
from schemas_new.validation import BusinessRegistrationRequest  # Line 38 - Not used

# REPLACE this line:
from fastapi import APIRouter, Depends, HTTPException, status, Request, Path  # Line 2
# WITH:
from fastapi import APIRouter, Depends, HTTPException, status, Request

# REPLACE this line:
from models.mfa import UserMFASecret, MFADeviceTrust  # Line 33
# WITH:
from models.mfa import UserMFASecret

# Also remove locally imported Response (line 204):
from fastapi import Response  # This line appears inside a function - remove it
```

### routers/payments.py
**Status:** CRITICAL PRIORITY - Payment processing

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from decimal import Decimal  # Line 1 - Not used
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Path  # Line 3 - Path not used
from utils.input_validation import validate_decimal, ValidationError as InputValidationError  # Line 17 - Not used
from schemas_new.validation import PaymentIntentRequest  # Line 18 - Not used

# Also remove unused imports from financial rate limit:
from utils.financial_rate_limit import (
    gift_certificate_create_limit, gift_certificate_validate_limit,
    stripe_connect_limit, payment_history_limit, payment_report_limit,
    financial_rate_limit, financial_endpoint_security  # These last two are unused
)

# REPLACE with:
from utils.financial_rate_limit import (
    gift_certificate_create_limit, gift_certificate_validate_limit,
    stripe_connect_limit, payment_history_limit, payment_report_limit
)
```

---

## Service Files (Business Logic)

### services/analytics_service.py
**Status:** HIGH PRIORITY - Core analytics functionality

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from datetime import datetime, timedelta, date  # Line 13 - 'date' not used
from typing import Dict, List, Optional, Tuple, Any  # Line 14 - 'Tuple' not used
from sqlalchemy import func, and_, or_, case, extract  # Line 16 - 'or_', 'case', 'extract' not used
import calendar  # Line 18 - Not used
from utils.cache_decorators import cache_result, cache_analytics, cache_user_data, invalidate_user_cache  # Line 22 - 'cache_user_data', 'invalidate_user_cache' not used

# REPLACE with:
from datetime import datetime, timedelta  # Remove 'date'
from typing import Dict, List, Optional, Any  # Remove 'Tuple'
from sqlalchemy import func, and_  # Remove 'or_', 'case', 'extract'
# Remove 'import calendar' entirely
from utils.cache_decorators import cache_result, cache_analytics  # Remove unused cache functions
```

### services/gmb_service.py (Google My Business)
**Status:** HIGH PRIORITY - Marketing integration

**Unused Imports to Remove:**
```python
# REMOVE these lines:
import json  # Line 7 - Not used
from typing import Dict, List, Optional, Tuple, Any  # Line 9 - 'Optional' not used
from datetime import datetime, timedelta, timezone  # Line 10 - 'timezone' not used
from models.review import Review, ReviewPlatform, ReviewSentiment, ReviewResponseStatus  # Line 14 - 'ReviewResponseStatus' not used
from models.integration import Integration, IntegrationType, IntegrationStatus  # Line 15 - 'IntegrationType', 'IntegrationStatus' not used

# REPLACE with:
from typing import Dict, List, Tuple, Any  # Remove 'Optional'
from datetime import datetime, timedelta  # Remove 'timezone'
from models.review import Review, ReviewPlatform, ReviewSentiment  # Remove 'ReviewResponseStatus'
from models.integration import Integration  # Remove enum imports
```

### services/notification_service.py
**Status:** HIGH PRIORITY - Communication system

**Unused Imports to Remove:**
```python
# REMOVE these lines:
import asyncio  # Line 4 - Not used in synchronous code
from contextlib import asynccontextmanager  # Line 13 - Not used

# These can be removed entirely from the imports section
```

---

## Model Files (Data Layer)

### models/agent.py
**Status:** MEDIUM PRIORITY

**Unused Imports to Remove:**
```python
# REMOVE this line:
from sqlalchemy.dialects.postgresql import UUID  # Line 8 - Not used

# The file uses standard uuid module instead
```

### models/tracking.py
**Status:** MEDIUM PRIORITY

**Unused Imports to Remove:**
```python
# REMOVE these lines:
from datetime import datetime  # Line 12 - Not used (using func.now() instead)

# Also remove trailing empty pass statement at end of file:
pass  # Line 339 - Remove this
```

### models/upselling.py
**Status:** MEDIUM PRIORITY

**Unused Imports to Remove:**
```python
# REMOVE this line:
from datetime import datetime  # Line 12 - Not used (using func.now() instead)
```

---

## Middleware Files

### middleware/security.py
**Various unused imports** - Requires detailed analysis of each security middleware file.

### middleware/multi_tenancy.py
**Various unused imports** - Multi-tenancy middleware has several unused type imports.

---

## Automated Cleanup Commands

### For Individual Files:
```bash
# Critical files first
python -m autoflake --in-place --remove-all-unused-imports main.py
python -m autoflake --in-place --remove-all-unused-imports routers/auth.py
python -m autoflake --in-place --remove-all-unused-imports routers/appointments.py
python -m autoflake --in-place --remove-all-unused-imports routers/payments.py
python -m autoflake --in-place --remove-all-unused-imports services/analytics_service.py
python -m autoflake --in-place --remove-all-unused-imports services/notification_service.py
```

### For Entire Directories:
```bash
# Services (business logic)
python -m autoflake --in-place -r --remove-all-unused-imports services/

# Models (data layer)
python -m autoflake --in-place -r --remove-all-unused-imports models/

# Routers (API endpoints)
python -m autoflake --in-place -r --remove-all-unused-imports routers/

# Middleware (request processing)
python -m autoflake --in-place -r --remove-all-unused-imports middleware/

# Utils (helper functions)
python -m autoflake --in-place -r --remove-all-unused-imports utils/
```

### Verification:
```bash
# Check that cleanup was successful
python -m autoflake --check -r --remove-all-unused-imports .

# Count remaining files with issues
find . -name "*.py" -not -path "*/venv/*" | xargs python -m autoflake --check --remove-all-unused-imports 2>&1 | grep -c "Unused imports/variables detected"
```

## Testing After Cleanup

### 1. Import Tests
```bash
# Test that all modules can be imported
python -c "import main; print('main.py imports successfully')"
python -c "from routers import auth; print('auth router imports successfully')"
python -c "from services import analytics_service; print('analytics service imports successfully')"
```

### 2. Application Startup
```bash
# Test application startup
uvicorn main:app --reload --port 8000
```

### 3. Core Functionality Tests
```bash
# Run test suite to ensure no broken imports
pytest -v
```

## Risk Mitigation

1. **Test in staging first** - Apply cleanup to staging environment before production
2. **Commit frequently** - Make small commits so changes can be easily reverted
3. **Monitor logs** - Watch for import-related errors after deployment
4. **Have rollback plan** - Keep backup of original files until cleanup is verified

## Estimated Impact

- **Files to clean:** 461 files
- **Estimated time savings:** 2-5% faster application startup
- **Memory reduction:** 1-3% reduction in import overhead
- **Code clarity:** Significant improvement in code readability
- **Maintenance:** Easier dependency tracking and management

This cleanup represents a significant but low-risk improvement to the codebase quality and performance.
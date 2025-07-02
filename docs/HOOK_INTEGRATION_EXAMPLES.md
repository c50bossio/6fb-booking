# BookedBarber V2 - Hook Integration Examples

This guide provides real-world examples and advanced configurations for the BookedBarber V2 hooks system, demonstrating practical usage scenarios and integration patterns.

## Table of Contents

1. [Development Workflow Examples](#development-workflow-examples)
2. [Feature Development Scenarios](#feature-development-scenarios)
3. [Bug Fix Workflows](#bug-fix-workflows)
4. [Team Collaboration](#team-collaboration)
5. [CI/CD Integration Examples](#cicd-integration-examples)
6. [Custom Configurations](#custom-configurations)
7. [Troubleshooting Real Issues](#troubleshooting-real-issues)
8. [Performance Optimization Examples](#performance-optimization-examples)

## Development Workflow Examples

### Example 1: Adding a New Payment Feature

**Scenario**: Implementing Stripe refund functionality with proper validation

```bash
# 1. Create feature branch
git checkout -b feature/stripe-refunds

# 2. Create the service
cat > backend-v2/services/refund_service.py << 'EOF'
from stripe import Refund
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.payment import Payment
from models.refund import Refund as RefundModel

class RefundService:
    """Service for processing payment refunds through Stripe."""
    
    async def process_refund(
        self,
        payment_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer",
        db: Session = None
    ) -> RefundModel:
        """
        Process a refund for a payment.
        
        Args:
            payment_id: The payment to refund
            amount: Partial refund amount (None for full refund)
            reason: Refund reason for Stripe
            db: Database session
            
        Returns:
            RefundModel: Created refund record
            
        Raises:
            ValueError: If payment not found or already refunded
            StripeError: If Stripe API fails
        """
        # Implementation here
        pass
EOF

# 3. Add API endpoint
cat > backend-v2/routers/refunds.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from schemas.refund import RefundCreate, RefundResponse
from services.refund_service import RefundService
from auth.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/refunds", tags=["refunds"])

@router.post("/", response_model=RefundResponse)
async def create_refund(
    refund_data: RefundCreate,
    current_user = Depends(get_current_admin),
    refund_service: RefundService = Depends()
):
    """
    Create a new refund for a payment.
    
    This endpoint allows admins to process full or partial refunds
    for completed payments. Refunds are processed immediately through
    Stripe and cannot be reversed.
    
    Args:
        refund_data: Refund creation parameters
        current_user: Admin user initiating the refund
        
    Returns:
        RefundResponse: Created refund details
        
    Raises:
        HTTPException 404: Payment not found
        HTTPException 400: Payment already refunded
        HTTPException 500: Stripe processing error
    """
    try:
        refund = await refund_service.process_refund(
            payment_id=refund_data.payment_id,
            amount=refund_data.amount,
            reason=refund_data.reason
        )
        return RefundResponse.from_orm(refund)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Refund processing failed")
EOF

# 4. Add tests
cat > backend-v2/tests/test_refund_service.py << 'EOF'
import pytest
from services.refund_service import RefundService
from tests.fixtures import test_payment, test_db

@pytest.mark.asyncio
async def test_full_refund(test_payment, test_db):
    """Test processing a full refund."""
    service = RefundService()
    refund = await service.process_refund(
        payment_id=test_payment.id,
        db=test_db
    )
    assert refund.amount == test_payment.amount
    assert refund.status == "completed"

@pytest.mark.asyncio
async def test_partial_refund(test_payment, test_db):
    """Test processing a partial refund."""
    service = RefundService()
    refund_amount = test_payment.amount / 2
    refund = await service.process_refund(
        payment_id=test_payment.id,
        amount=refund_amount,
        db=test_db
    )
    assert refund.amount == refund_amount
EOF

# 5. Create database migration
cd backend-v2
alembic revision -m "add refund table and fields"

# 6. Commit changes
git add .
git commit -m "feat(payment): add Stripe refund functionality with API endpoints"
```

**Hook Interactions**:
- ✅ **pre-commit-v2-only**: Validates all files are in backend-v2/
- ✅ **pre-commit-api-docs**: Ensures endpoint has documentation
- ✅ **pre-commit-migrations**: Reminds about migration for new model
- ✅ **commit-msg**: Validates conventional commit format
- ✅ **pre-commit-security**: Scans for exposed Stripe keys

### Example 2: Frontend Performance Optimization

**Scenario**: Optimizing a slow component while monitoring bundle size

```bash
# 1. Create optimization branch
git checkout -b perf/optimize-booking-calendar

# 2. Analyze current performance
cd backend-v2/frontend-v2
npm run analyze

# 3. Optimize the component
cat > components/booking/OptimizedCalendar.tsx << 'EOF'
import React, { memo, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useVirtualizer } from '@tanstack/react-virtual';

// Lazy load heavy dependencies
const CalendarGrid = dynamic(() => import('./CalendarGrid'), {
  loading: () => <CalendarSkeleton />
});

export const OptimizedCalendar = memo(({ 
  appointments,
  onDateSelect 
}: CalendarProps) => {
  // Memoize expensive calculations
  const sortedAppointments = useMemo(() => 
    appointments.sort((a, b) => a.date - b.date),
    [appointments]
  );

  // Use callback for event handlers
  const handleDateSelect = useCallback((date: Date) => {
    onDateSelect(date);
  }, [onDateSelect]);

  // Virtualize long lists
  const virtualizer = useVirtualizer({
    count: sortedAppointments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <CalendarGrid 
        appointments={sortedAppointments}
        onSelect={handleDateSelect}
        virtualizer={virtualizer}
      />
    </div>
  );
});

OptimizedCalendar.displayName = 'OptimizedCalendar';
EOF

# 4. Add performance tests
cat > components/booking/__tests__/OptimizedCalendar.perf.test.tsx << 'EOF'
import { render } from '@testing-library/react';
import { OptimizedCalendar } from '../OptimizedCalendar';
import { measureRenderTime } from '@/lib/test-utils';

describe('OptimizedCalendar Performance', () => {
  it('renders large datasets efficiently', () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      date: new Date(2024, 0, i % 30 + 1),
      time: '10:00',
      service: 'Haircut'
    }));

    const renderTime = measureRenderTime(() => {
      render(<OptimizedCalendar appointments={largeDataset} />);
    });

    expect(renderTime).toBeLessThan(100); // ms
  });
});
EOF

# 5. Check bundle impact
npm run build
# Hook will validate bundle size increase is < 10%

# 6. Commit optimizations
git add .
git commit -m "perf(calendar): optimize booking calendar with virtualization and memoization"
```

**Hook Interactions**:
- ✅ **pre-commit-performance**: Monitors bundle size changes
- ✅ **pre-commit-v2-only**: Ensures frontend changes in correct directory
- 📊 Performance output shows improvement metrics

## Feature Development Scenarios

### Example 3: Google My Business Integration

**Scenario**: Adding GMB integration with proper security and testing

```bash
# 1. Create integration branch
git checkout -b feature/gmb-integration

# 2. Add secure configuration
cat > backend-v2/config/integrations/gmb.py << 'EOF'
import os
from typing import Optional
from pydantic import BaseSettings, SecretStr

class GMBSettings(BaseSettings):
    """Google My Business integration settings."""
    
    client_id: str = os.getenv("GMB_CLIENT_ID", "")
    client_secret: SecretStr = os.getenv("GMB_CLIENT_SECRET", "")
    redirect_uri: str = os.getenv("GMB_REDIRECT_URI", "")
    
    class Config:
        env_file = ".env"
        
    def is_configured(self) -> bool:
        """Check if GMB is properly configured."""
        return all([
            self.client_id,
            self.client_secret.get_secret_value(),
            self.redirect_uri
        ])
EOF

# 3. Create integration service with security
cat > backend-v2/services/gmb_integration.py << 'EOF'
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from typing import List, Dict
import logging

# Configure secure logging
logger = logging.getLogger(__name__)
logger.addFilter(lambda record: not any(
    sensitive in str(record.msg) 
    for sensitive in ['access_token', 'refresh_token', 'client_secret']
))

class GMBIntegrationService:
    """Service for Google My Business integration."""
    
    def __init__(self, credentials: Credentials):
        """Initialize with OAuth2 credentials."""
        self.service = build('mybusiness', 'v4', credentials=credentials)
        
    async def fetch_reviews(self, location_id: str) -> List[Dict]:
        """
        Fetch reviews for a business location.
        
        Args:
            location_id: GMB location identifier
            
        Returns:
            List of review dictionaries
        """
        try:
            # Log without sensitive data
            logger.info(f"Fetching reviews for location {location_id[:8]}...")
            
            response = self.service.accounts().locations().reviews().list(
                parent=f"locations/{location_id}"
            ).execute()
            
            reviews = response.get('reviews', [])
            
            # Mask PII in logs
            logger.info(f"Fetched {len(reviews)} reviews")
            
            return reviews
            
        except Exception as e:
            logger.error(f"GMB API error: {str(e)}")
            raise
EOF

# 4. Add frontend integration component
cat > backend-v2/frontend-v2/components/integrations/GMBConnect.tsx << 'EOF'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle } from 'lucide-react';

export function GMBConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Initiate OAuth flow
      const response = await fetch('/api/v1/integrations/gmb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { authUrl } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
      
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Google My Business",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold">Google My Business</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Connect your Google My Business account to manage reviews and insights
      </p>
      
      <Button 
        onClick={handleConnect} 
        disabled={isConnecting}
        className="w-full"
      >
        {isConnecting ? "Connecting..." : "Connect Account"}
      </Button>
      
      <div className="mt-4 text-xs text-gray-500">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Secure OAuth 2.0 connection
      </div>
    </div>
  );
}
EOF

# 5. Add integration tests
cat > backend-v2/tests/test_gmb_integration.py << 'EOF'
import pytest
from unittest.mock import Mock, patch
from services.gmb_integration import GMBIntegrationService

@pytest.mark.asyncio
async def test_fetch_reviews_masks_pii():
    """Test that PII is properly masked in logs."""
    mock_creds = Mock()
    service = GMBIntegrationService(mock_creds)
    
    with patch('services.gmb_integration.logger') as mock_logger:
        # Mock API response with PII
        mock_response = {
            'reviews': [{
                'reviewer': {'displayName': 'John Doe'},
                'comment': 'Great service!',
                'starRating': 'FIVE'
            }]
        }
        
        with patch.object(service.service.accounts().locations().reviews(), 
                         'list') as mock_list:
            mock_list.return_value.execute.return_value = mock_response
            
            reviews = await service.fetch_reviews('locations/12345678901234')
            
            # Verify PII not in logs
            log_messages = [call[0][0] for call in mock_logger.info.call_args_list]
            assert not any('John Doe' in msg for msg in log_messages)
            assert 'Fetched 1 reviews' in log_messages[1]

@pytest.mark.asyncio
async def test_oauth_token_not_logged():
    """Test that OAuth tokens are never logged."""
    # Test implementation
    pass
EOF

# 6. Commit with proper documentation
git add .
git commit -m "feat(integration): add Google My Business integration with OAuth2

- Secure OAuth2 flow implementation
- Review fetching and management
- PII masking in logs
- Comprehensive test coverage
- Frontend connection component"
```

**Hook Interactions**:
- ✅ **pre-commit-secrets**: Validates no API keys in code
- ✅ **pre-commit-compliance**: Checks PII handling
- ✅ **pre-commit-integration**: Validates integration config
- ✅ **pre-commit-security**: Scans OAuth implementation

## Bug Fix Workflows

### Example 4: Critical Production Bug Fix

**Scenario**: Emergency fix for payment processing error

```bash
# 1. Create hotfix branch
git checkout -b hotfix/payment-timeout-error

# 2. Quick diagnosis and fix
cat > backend-v2/services/payment_service_fix.py << 'EOF'
# Locate the issue in payment processing
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

class PaymentService:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def process_payment_with_retry(self, payment_data):
        """
        Process payment with retry logic for transient failures.
        
        Fixes issue #1234 where payments were failing due to 
        temporary network timeouts with Stripe API.
        """
        try:
            # Add timeout to prevent hanging
            async with asyncio.timeout(30):  # 30 second timeout
                result = await self._stripe_charge(payment_data)
                
            # Add idempotency key to prevent duplicate charges
            if not payment_data.get('idempotency_key'):
                payment_data['idempotency_key'] = f"payment_{payment_data['id']}"
                
            return result
            
        except asyncio.TimeoutError:
            logger.error(f"Payment timeout for {payment_data['id'][:8]}***")
            raise
        except Exception as e:
            logger.error(f"Payment failed: {type(e).__name__}")
            raise
EOF

# 3. Add regression test
cat > backend-v2/tests/test_payment_timeout_fix.py << 'EOF'
import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from services.payment_service import PaymentService

@pytest.mark.asyncio
async def test_payment_timeout_handling():
    """Test that payment timeouts are handled correctly."""
    service = PaymentService()
    
    # Mock Stripe to hang
    with patch.object(service, '_stripe_charge') as mock_charge:
        async def slow_charge(*args):
            await asyncio.sleep(35)  # Longer than timeout
            
        mock_charge.side_effect = slow_charge
        
        with pytest.raises(asyncio.TimeoutError):
            await service.process_payment_with_retry({
                'id': 'test_payment_123',
                'amount': 5000
            })

@pytest.mark.asyncio
async def test_payment_retry_on_transient_error():
    """Test retry logic for transient failures."""
    service = PaymentService()
    
    # Mock to fail twice then succeed
    with patch.object(service, '_stripe_charge') as mock_charge:
        mock_charge.side_effect = [
            Exception("Network error"),
            Exception("Network error"),
            {'status': 'succeeded', 'id': 'ch_123'}
        ]
        
        result = await service.process_payment_with_retry({
            'id': 'test_payment_456',
            'amount': 3000
        })
        
        assert result['status'] == 'succeeded'
        assert mock_charge.call_count == 3
EOF

# 4. Emergency commit with bypass (documented)
git add .
git commit -m "hotfix(payment): add timeout and retry logic for Stripe API calls

EMERGENCY FIX for production issue #1234
- Add 30-second timeout to prevent hanging payments
- Implement exponential backoff retry (3 attempts)
- Add idempotency keys to prevent duplicate charges
- Include regression tests

Bypassing normal review due to critical production impact
Incident: INC-2024-001" --no-verify

# 5. Document the bypass
git commit -m "docs: document emergency bypass for payment hotfix

Emergency bypass was necessary due to:
- Critical production impact (500+ failed payments)
- Simple, well-tested fix
- Incident response protocol followed
- Post-incident review scheduled"

# 6. Run full test suite post-fix
cd backend-v2
pytest tests/ -v
```

**Hook Behavior**:
- ⚠️ Hooks bypassed with `--no-verify` for emergency
- 📝 Bypass documented in follow-up commit
- ✅ Tests still run manually to verify fix

## Team Collaboration

### Example 5: Coordinated Feature Development

**Scenario**: Multiple developers working on related features

```bash
# Developer 1: Backend API
git checkout -b feature/analytics-api

cat > backend-v2/routers/analytics.py << 'EOF'
from fastapi import APIRouter, Depends, Query
from datetime import datetime, date
from typing import Optional, List
from schemas.analytics import (
    RevenueReport, 
    BarberPerformance,
    ServiceBreakdown
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

@router.get("/revenue", response_model=RevenueReport)
async def get_revenue_report(
    start_date: date = Query(..., description="Start date for report"),
    end_date: date = Query(..., description="End date for report"),
    location_id: Optional[str] = Query(None, description="Filter by location"),
    current_user = Depends(get_current_user)
):
    """
    Generate comprehensive revenue report for date range.
    
    Includes:
    - Total revenue breakdown (services vs retail)
    - Daily/weekly/monthly trends
    - Top performing services
    - Commission calculations
    
    Args:
        start_date: Report start date
        end_date: Report end date  
        location_id: Optional location filter
        
    Returns:
        RevenueReport: Comprehensive revenue analytics
    """
    # Implementation
    pass

@router.get("/barbers/{barber_id}/performance", response_model=BarberPerformance)
async def get_barber_performance(
    barber_id: str,
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    current_user = Depends(get_current_admin)
):
    """
    Get detailed performance metrics for a specific barber.
    
    Tracks:
    - Service count and revenue
    - Client retention rate
    - Average service time
    - Rebooking rate
    - Product sales performance
    
    Args:
        barber_id: Barber identifier
        period: Time period for metrics
        
    Returns:
        BarberPerformance: Detailed performance data
    """
    # Implementation
    pass
EOF

git add .
git commit -m "feat(analytics): add comprehensive analytics API endpoints

- Revenue reporting with date ranges
- Barber performance tracking
- Service breakdown analysis
- Location-based filtering"

# Developer 2: Frontend Dashboard (parallel work)
git checkout -b feature/analytics-dashboard

cat > backend-v2/frontend-v2/app/(auth)/analytics/page.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { BarChart, LineChart, PieChart } from '@/components/charts';
import { useAnalytics } from '@/hooks/use-analytics';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)),
    end: new Date()
  });
  
  const { revenue, barbers, services, isLoading } = useAnalytics(dateRange);
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
      
      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="barbers">Barbers</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
              <LineChart data={revenue?.trend} />
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
              <PieChart data={revenue?.breakdown} />
            </Card>
          </div>
        </TabsContent>
        
        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
EOF

git add .
git commit -m "feat(analytics): create analytics dashboard with charts

- Revenue trend visualization
- Service breakdown charts  
- Barber performance metrics
- Date range filtering"

# Developer 3: Shared hooks and utilities
git checkout -b feature/analytics-shared

cat > backend-v2/frontend-v2/hooks/use-analytics.ts << 'EOF'
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { DateRange } from '@/types/common';

export function useAnalytics(dateRange: DateRange) {
  const revenue = useQuery({
    queryKey: ['analytics', 'revenue', dateRange],
    queryFn: () => analyticsApi.getRevenue(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const barbers = useQuery({
    queryKey: ['analytics', 'barbers', dateRange],
    queryFn: () => analyticsApi.getBarberPerformance(dateRange),
    staleTime: 5 * 60 * 1000,
  });
  
  const services = useQuery({
    queryKey: ['analytics', 'services', dateRange],
    queryFn: () => analyticsApi.getServiceBreakdown(dateRange),
    staleTime: 5 * 60 * 1000,
  });
  
  return {
    revenue: revenue.data,
    barbers: barbers.data,
    services: services.data,
    isLoading: revenue.isLoading || barbers.isLoading || services.isLoading,
    error: revenue.error || barbers.error || services.error,
  };
}
EOF

git add .
git commit -m "feat(analytics): add shared analytics hooks and API client"

# Merge coordination
git checkout develop
git merge feature/analytics-api
git merge feature/analytics-dashboard  
git merge feature/analytics-shared

# Run integration tests
./scripts/test-integration.sh analytics
```

**Hook Coordination**:
- ✅ All developers follow same commit conventions
- ✅ API documentation enforced across team
- ✅ No conflicts due to V2-only structure
- ✅ Performance monitored for dashboard components

## CI/CD Integration Examples

### Example 6: GitHub Actions with Hooks

**Scenario**: PR validation with automated feedback

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation with Hooks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  validate-hooks:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for hook validation
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend-v2/frontend-v2/package-lock.json
          
      - name: Install Hook Dependencies
        run: |
          pip install safety pip-audit
          cd backend-v2/frontend-v2 && npm ci
          
      - name: Run Hook Validation Suite
        id: hooks
        run: |
          # Export PR context
          export PR_BRANCH="${{ github.head_ref }}"
          export BASE_BRANCH="${{ github.base_ref }}"
          
          # Run hooks test suite
          ./hooks/test-hooks-system.sh --ci-mode
          
      - name: Generate Hook Report
        if: always()
        run: |
          # Create markdown report
          cat > hook-report.md << 'EOF'
          ## 🪝 Hook Validation Report
          
          ### Summary
          - Total Hooks: 12
          - Passed: ${{ env.HOOKS_PASSED }}
          - Failed: ${{ env.HOOKS_FAILED }}
          - Skipped: ${{ env.HOOKS_SKIPPED }}
          
          ### Details
          $(cat hooks/test-results.log | grep -E "^\[PASS\]|\[FAIL\]" | sed 's/^/- /')
          
          ### Recommendations
          $(./hooks/generate-recommendations.sh)
          EOF
          
      - name: Comment PR
        uses: actions/github-script@v6
        if: always()
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('hook-report.md', 'utf8');
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
            
      - name: Set Status Check
        if: always()
        run: |
          if [[ "${{ env.HOOKS_FAILED }}" -gt 0 ]]; then
            echo "❌ Hook validation failed"
            exit 1
          else
            echo "✅ All hooks passed"
          fi
```

**Integration Features**:
- 📊 Automated hook validation on every PR
- 💬 Detailed feedback as PR comments
- ✅ Status checks block merge if hooks fail
- 📈 Performance metrics included

## Custom Configurations

### Example 7: Project-Specific Hook Configuration

**Scenario**: Customizing hooks for specific team needs

```bash
# 1. Create project configuration
cat > .hookrc << 'EOF'
# BookedBarber V2 Hook Configuration
# Team-specific settings and overrides

# Performance thresholds (stricter for production)
export BUNDLE_SIZE_LIMIT=1500000  # 1.5MB
export API_RESPONSE_LIMIT=1500    # 1.5s
export DB_QUERY_LIMIT=300         # 300ms

# Security settings
export SECURITY_SCAN_LEVEL=strict
export DEPENDENCY_CHECK_LEVEL=high
export SECRETS_PATTERNS_EXTRA="/Users/bossio/6fb-booking/hooks/config/custom-secrets.json"

# Team preferences
export COMMIT_SCOPE_REQUIRED=true
export TICKET_ID_REQUIRED=true
export MIN_TEST_COVERAGE=80

# Feature flags
export ENABLE_PERFORMANCE_PROFILING=true
export ENABLE_BUNDLE_ANALYSIS=true
export ENABLE_AI_CODE_REVIEW=true

# Bypass settings (restricted)
export ALLOW_EMERGENCY_BYPASS=true
export BYPASS_REQUIRES_TICKET=true
export BYPASS_NOTIFICATION_WEBHOOK="https://hooks.slack.com/services/XXX/YYY/ZZZ"
EOF

# 2. Create custom secrets patterns
cat > hooks/config/custom-secrets.json << 'EOF'
{
  "patterns": {
    "barber_license": {
      "pattern": "BL[0-9]{8}",
      "message": "Barber license number detected"
    },
    "shop_tax_id": {
      "pattern": "\\d{2}-\\d{7}",
      "message": "Business tax ID detected"
    },
    "square_token": {
      "pattern": "sq[a-z]{2}_[a-zA-Z0-9]{22}",
      "message": "Square API token detected"
    }
  },
  "exclusions": [
    "docs/examples/",
    "tests/fixtures/"
  ]
}
EOF

# 3. Create team-specific commit scope
cat > hooks/config/commit-scopes.json << 'EOF'
{
  "scopes": {
    "booking": "Appointment booking features",
    "payment": "Payment processing and payouts",
    "auth": "Authentication and authorization",
    "calendar": "Calendar and scheduling",
    "analytics": "Business analytics and reporting",
    "integration": "Third-party integrations",
    "review": "Review management system",
    "marketing": "Marketing and campaigns",
    "commission": "Commission calculations",
    "retail": "Retail product features",
    "barber": "Barber management",
    "client": "Client management",
    "admin": "Admin panel features",
    "mobile": "Mobile app specific",
    "performance": "Performance optimizations",
    "security": "Security enhancements",
    "infrastructure": "Infrastructure and DevOps"
  },
  "requireScope": true,
  "allowCustomScope": false
}
EOF

# 4. Apply configuration
source .hookrc
./hooks/install-hooks.sh --with-config
```

**Configuration Benefits**:
- 🎯 Team-specific thresholds
- 🔒 Custom security patterns
- 📝 Enforced ticket references
- 🚀 Feature flag control

### Example 8: AI-Assisted Code Review Hook

**Scenario**: Integrating AI code review into pre-commit

```bash
# Create AI review hook
cat > hooks/pre-commit-ai-review << 'EOF'
#!/bin/bash

source "$(dirname "$0")/common.sh"

# Only run if enabled
if [[ "${ENABLE_AI_CODE_REVIEW}" != "true" ]]; then
    exit 0
fi

echo "🤖 AI Code Review in progress..."

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(py|ts|tsx|js|jsx)$')

if [[ -z "$CHANGED_FILES" ]]; then
    exit 0
fi

# Prepare review request
REVIEW_REQUEST=$(cat << END
{
  "files": [
    $(echo "$CHANGED_FILES" | while read file; do
        echo "{\"path\": \"$file\", \"content\": $(git show :$file | jq -Rs .)}"
    done | paste -sd ",")
  ],
  "checks": [
    "security_vulnerabilities",
    "performance_issues",
    "code_quality",
    "best_practices",
    "potential_bugs"
  ]
}
END
)

# Call AI review service (example)
REVIEW_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AI_REVIEW_TOKEN" \
    -d "$REVIEW_REQUEST" \
    https://ai-review.internal/api/review)

# Parse response
ISSUES=$(echo "$REVIEW_RESPONSE" | jq -r '.issues[]')

if [[ -n "$ISSUES" ]]; then
    echo "❌ AI Review found issues:"
    echo "$ISSUES" | while IFS= read -r issue; do
        echo "  - $issue"
    done
    
    echo ""
    echo "💡 Fix these issues or use --no-verify to bypass"
    exit 1
fi

echo "✅ AI Review passed!"
exit 0
EOF

chmod +x hooks/pre-commit-ai-review

# Add to git hooks
ln -sf ../../hooks/pre-commit-ai-review .git/hooks/pre-commit-ai-review
```

## Performance Optimization Examples

### Example 9: Hook Performance Tuning

**Scenario**: Optimizing slow hook execution

```bash
# 1. Profile hook performance
cat > hooks/profile-hooks.sh << 'EOF'
#!/bin/bash

echo "🔍 Profiling hook performance..."

# Create test scenario
TEST_DIR="/tmp/hook-profile-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize git repo with test data
git init
cp -r /Users/bossio/6fb-booking/backend-v2 .
git add .

# Profile each hook
for hook in /Users/bossio/6fb-booking/hooks/pre-commit-*; do
    if [[ -x "$hook" ]]; then
        hook_name=$(basename "$hook")
        
        echo "Profiling $hook_name..."
        
        # Run with time command
        /usr/bin/time -l "$hook" 2>&1 | grep -E "real|user|sys|maximum resident" > "${hook_name}.profile"
        
        # Run with bash profiling
        bash -x "$hook" 2> "${hook_name}.trace"
    fi
done

# Generate report
echo ""
echo "📊 Performance Report:"
echo "====================="

for profile in *.profile; do
    hook_name=${profile%.profile}
    echo ""
    echo "$hook_name:"
    cat "$profile"
    
    # Identify slow operations
    if [[ -f "${hook_name}.trace" ]]; then
        echo "  Slowest operations:"
        grep "^+" "${hook_name}.trace" | sort | uniq -c | sort -rn | head -5
    fi
done

# Cleanup
cd -
rm -rf "$TEST_DIR"
EOF

chmod +x hooks/profile-hooks.sh

# 2. Optimize identified bottlenecks
# Example: Optimizing security scan
cat > hooks/pre-commit-security-optimized << 'EOF'
#!/bin/bash

source "$(dirname "$0")/common.sh"

# Cache directory for scan results
CACHE_DIR="${HOME}/.cache/bookedbarber-hooks"
mkdir -p "$CACHE_DIR"

# Get list of changed dependency files
CHANGED_DEPS=$(git diff --cached --name-only | grep -E "(requirements\.txt|package\.json|package-lock\.json)$")

if [[ -z "$CHANGED_DEPS" ]]; then
    # No dependency changes, check cache
    CACHE_KEY=$(git diff --cached --name-only | sort | sha256sum | cut -d' ' -f1)
    CACHE_FILE="$CACHE_DIR/security-scan-$CACHE_KEY"
    
    if [[ -f "$CACHE_FILE" ]] && [[ $(find "$CACHE_FILE" -mtime -1 -print) ]]; then
        echo "✅ Security scan (cached): No issues found"
        exit 0
    fi
fi

echo "🔍 Scanning dependencies for vulnerabilities..."

# Parallel scanning
SCAN_FAILED=0

# Python dependencies (if changed)
if echo "$CHANGED_DEPS" | grep -q "requirements.txt"; then
    (
        cd backend-v2
        if command -v safety &> /dev/null; then
            safety check --json > "$CACHE_DIR/python-scan.json" 2>/dev/null || SCAN_FAILED=1
        fi
    ) &
    PY_PID=$!
fi

# Node dependencies (if changed)
if echo "$CHANGED_DEPS" | grep -q "package"; then
    (
        cd backend-v2/frontend-v2
        npm audit --json > "$CACHE_DIR/node-scan.json" 2>/dev/null
        # Check only high/critical
        VULNS=$(jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' "$CACHE_DIR/node-scan.json")
        if [[ "$VULNS" -gt 0 ]]; then
            SCAN_FAILED=1
        fi
    ) &
    NODE_PID=$!
fi

# Wait for parallel scans
[[ -n "$PY_PID" ]] && wait $PY_PID
[[ -n "$NODE_PID" ]] && wait $NODE_PID

if [[ $SCAN_FAILED -eq 1 ]]; then
    echo "❌ Security vulnerabilities detected!"
    [[ -f "$CACHE_DIR/python-scan.json" ]] && jq -r '.[] | "  Python: \(.package) \(.vulnerability)"' "$CACHE_DIR/python-scan.json"
    [[ -f "$CACHE_DIR/node-scan.json" ]] && jq -r '.vulnerabilities | to_entries[] | "  Node: \(.key) - \(.value.severity)"' "$CACHE_DIR/node-scan.json"
    exit 1
fi

# Cache successful result
touch "$CACHE_FILE"
echo "✅ Security scan passed!"
exit 0
EOF

# 3. Benchmark improvements
./hooks/profile-hooks.sh
```

**Optimization Techniques**:
- 💾 Caching scan results
- ⚡ Parallel execution
- 🎯 Smart triggering
- 📊 Performance monitoring

## Troubleshooting Real Issues

### Example 10: Debugging Hook Failures

**Scenario**: Investigating why commits are failing

```bash
# 1. Enable debug mode
export HOOK_DEBUG=true
export HOOK_LOG_LEVEL=DEBUG

# 2. Create debug wrapper
cat > hooks/debug-commit.sh << 'EOF'
#!/bin/bash

echo "🔍 Debug mode enabled"
echo "Environment:"
env | grep -E "(HOOK|GIT|USER)" | sort

echo ""
echo "Git status:"
git status --porcelain

echo ""
echo "Staged files:"
git diff --cached --name-only

echo ""
echo "Running hooks with trace..."
set -x

# Run pre-commit hooks
for hook in .git/hooks/pre-commit*; do
    if [[ -x "$hook" ]]; then
        echo ""
        echo "Running: $hook"
        time "$hook" || {
            echo "❌ Hook failed: $hook"
            echo "Exit code: $?"
            exit 1
        }
    fi
done

# Test commit message
echo "feat(test): debug commit message" > .git/COMMIT_EDITMSG
.git/hooks/commit-msg .git/COMMIT_EDITMSG || {
    echo "❌ Commit message validation failed"
    exit 1
}

set +x
echo ""
echo "✅ All hooks passed in debug mode"
EOF

chmod +x hooks/debug-commit.sh

# 3. Run debug session
./hooks/debug-commit.sh 2>&1 | tee debug-session.log

# 4. Analyze common issues
grep -E "(ERROR|FAIL|Warning)" debug-session.log

# 5. Check hook permissions
ls -la .git/hooks/ | grep -v "sample$"

# 6. Verify hook symlinks
for hook in .git/hooks/*; do
    if [[ -L "$hook" ]]; then
        target=$(readlink "$hook")
        if [[ ! -e "$target" ]]; then
            echo "❌ Broken symlink: $hook -> $target"
        fi
    fi
done
```

**Common Issues Found**:
- 🔗 Broken symlinks after moving repos
- 📂 Missing dependencies in CI
- 🔑 Permission issues on hooks
- 🌍 Environment variable differences

---

## Best Practices Summary

### 1. **Commit Workflow**
```bash
# Always follow this pattern
git checkout -b feature/descriptive-name
# Make changes
git add .
git commit -m "type(scope): clear description"
git push origin feature/descriptive-name
```

### 2. **Hook Compliance**
- Fix issues rather than bypassing
- Document any necessary bypasses
- Keep hooks updated
- Report false positives

### 3. **Performance Awareness**
- Monitor bundle sizes
- Profile slow operations
- Use caching strategically
- Parallelize where possible

### 4. **Security First**
- Never commit secrets
- Use environment variables
- Follow PII handling rules
- Keep dependencies updated

### 5. **Team Coordination**
- Consistent commit messages
- Clear branch naming
- Regular hook updates
- Share knowledge

---

## Conclusion

These examples demonstrate real-world usage of the BookedBarber V2 hooks system across various development scenarios. By following these patterns and best practices, teams can maintain high code quality, security, and performance standards while developing efficiently.

For more examples or specific scenarios, consult the team leads or submit a PR with your own examples!

---

*Last Updated: 2025-07-02*
*Version: 1.0.0*
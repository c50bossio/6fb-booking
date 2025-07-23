# 🔌 Hybrid Payment System API Reference

## 📋 API Overview

The Hybrid Payment System provides comprehensive REST APIs for managing payment processing, external processor connections, commission collection, and unified analytics. All endpoints are secured with JWT authentication and support role-based access control.

### Base URL
- **Development**: `http://localhost:8000/api/v1`
- **Staging**: `https://api-staging.bookedbarber.com/api/v1`
- **Production**: `https://api.bookedbarber.com/api/v1`

### Authentication
All API endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Content Type
All requests and responses use JSON:
```
Content-Type: application/json
```

## 🏦 Hybrid Payments API

### Base Path: `/hybrid-payments`

Manages intelligent payment routing and processing across centralized and decentralized payment methods.

---

### **POST** `/hybrid-payments/process`
Process a payment using hybrid routing logic.

#### Request Body
```json
{
  "appointment_id": 123,
  "amount": 75.00,
  "currency": "USD",
  "payment_method_data": {
    "card_token": "tok_1234567890",
    "save_payment_method": true
  },
  "client_preference": "external",
  "metadata": {
    "service_type": "haircut",
    "client_notes": "VIP client"
  }
}
```

#### Response
```json
{
  "payment_id": "pi_1234567890abcdef",
  "payment_type": "external",
  "status": "completed",
  "amount": 75.00,
  "currency": "USD",
  "processing_fee": 2.18,
  "net_amount": 72.82,
  "commission_amount": 15.00,
  "commission_collected": false,
  "routing_decision": "external",
  "external_processor": "square",
  "processed_at": "2025-07-22T14:30:00Z",
  "routing_details": {
    "processor": "square",
    "connection_id": 5,
    "fallback_available": true,
    "processing_time": "1.2s"
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid payment data or routing failure
- **403 Forbidden**: Insufficient permissions
- **500 Internal Server Error**: Payment processing failure

---

### **POST** `/hybrid-payments/route`
Get payment routing information without processing.

#### Request Body
```json
{
  "appointment_id": 123,
  "amount": 75.00,
  "currency": "USD",
  "client_preference": "platform"
}
```

#### Response
```json
{
  "routing_decision": "centralized",
  "recommended_processor": "platform",
  "routing_details": {
    "payment_mode": "centralized",
    "processor": "stripe_platform",
    "commission_rate": 20.0,
    "fallback_available": true
  },
  "estimated_fees": {
    "processing_fee": 2.48,
    "commission_fee": 15.00,
    "total_fees": 17.48,
    "net_amount": 57.52
  },
  "processing_time_estimate": "Instant (real-time)"
}
```

---

### **GET** `/hybrid-payments/options/{barber_id}`
Get available payment options for a specific barber.

#### Path Parameters
- `barber_id` (integer): ID of the barber

#### Query Parameters
- `appointment_id` (integer, optional): Appointment ID for context
- `amount` (decimal, optional): Amount for fee calculations

#### Response
```json
{
  "barber_id": 123,
  "payment_mode": "hybrid",
  "available_methods": [
    {
      "type": "platform",
      "processor": "stripe",
      "display_name": "BookedBarber Payments",
      "processing_fee_rate": 0.029,
      "commission_rate": 0.20,
      "supports_saved_cards": true,
      "processing_time": "instant"
    },
    {
      "type": "external",
      "processor": "square",
      "display_name": "Square POS",
      "processing_fee_rate": 0.026,
      "commission_rate": 0.20,
      "supports_saved_cards": true,
      "processing_time": "1-3 seconds"
    }
  ],
  "default_method": "external",
  "fallback_enabled": true,
  "external_connections": [
    {
      "id": 5,
      "processor_type": "square",
      "account_name": "Main Square Account",
      "status": "connected",
      "last_transaction": "2025-07-22T10:15:00Z"
    }
  ],
  "fee_breakdown": {
    "platform_total_fee": 0.249,
    "external_total_fee": 0.226,
    "savings_with_external": 0.023
  }
}
```

---

### **GET** `/hybrid-payments/my-options`
Get payment options for the current authenticated barber.

#### Query Parameters
- `appointment_id` (integer, optional): Appointment ID for context
- `amount` (decimal, optional): Amount for fee calculations

#### Response
Same as `/hybrid-payments/options/{barber_id}` but for the current user.

---

### **GET** `/hybrid-payments/routing-stats/{barber_id}`
Get payment routing statistics and analytics.

#### Path Parameters
- `barber_id` (integer): ID of the barber

#### Query Parameters
- `days` (integer, default 30): Number of days to analyze (1-365)

#### Response
```json
{
  "barber_id": 123,
  "period_days": 30,
  "total_payments": 245,
  "routing_breakdown": {
    "centralized": {
      "count": 98,
      "percentage": 40.0,
      "total_volume": 3920.00
    },
    "external": {
      "count": 132,
      "percentage": 53.9,
      "total_volume": 6600.00
    },
    "fallback": {
      "count": 15,
      "percentage": 6.1,
      "total_volume": 450.00
    }
  },
  "success_rates": {
    "centralized": 99.2,
    "external": 97.8,
    "overall": 98.4
  },
  "average_processing_times": {
    "centralized": "1.2s",
    "external": "2.1s"
  },
  "fee_comparison": {
    "total_fees_saved": 127.50,
    "average_processing_fee": 2.43,
    "commission_collected": 2194.00
  }
}
```

---

### **POST** `/hybrid-payments/test-routing`
Test payment routing without processing (development only).

#### Request Body
Same as `/hybrid-payments/process`

#### Response
```json
{
  "test_timestamp": "2025-07-22T14:30:00Z",
  "input_parameters": {
    "appointment_id": 123,
    "amount": 75.00,
    "currency": "USD",
    "client_preference": "external"
  },
  "routing_decision": "external",
  "routing_details": {
    "processor": "square",
    "connection_id": 5,
    "commission_rate": 20.0
  },
  "would_succeed": true,
  "estimated_processing_time": "2.1 seconds",
  "estimated_fees": {
    "processing_fee": 2.175,
    "commission_fee": 15.00,
    "total_cost": 17.175
  }
}
```

---

## 🔗 External Payments API

### Base Path: `/external-payments`

Manages connections to external payment processors and transaction synchronization.

---

### **GET** `/external-payments/connections`
Get all external payment processor connections for the current barber.

#### Response
```json
{
  "connections": [
    {
      "id": 5,
      "processor_type": "square",
      "account_id": "L123456789",
      "account_name": "Main Square Location",
      "status": "connected",
      "supports_payments": true,
      "supports_refunds": true,
      "supports_recurring": false,
      "default_currency": "USD",
      "last_sync_at": "2025-07-22T14:00:00Z",
      "last_transaction_at": "2025-07-22T13:45:00Z",
      "total_transactions": 156,
      "total_volume": 7800.00,
      "connected_at": "2025-06-15T09:30:00Z"
    }
  ],
  "total_connections": 1,
  "supported_processors": ["stripe", "square", "paypal", "clover"]
}
```

---

### **POST** `/external-payments/connections`
Create a new external payment processor connection.

#### Request Body
```json
{
  "processor_type": "square",
  "account_id": "L123456789",
  "account_name": "Main Square Location",
  "connection_config": {
    "access_token": "EAAAE...",
    "application_id": "sq0idp-...",
    "location_id": "L123456789",
    "environment": "production"
  },
  "webhook_notifications": true
}
```

#### Response
```json
{
  "id": 6,
  "processor_type": "square",
  "account_id": "L123456789",
  "account_name": "Main Square Location",
  "status": "connected",
  "webhook_url": "https://api.bookedbarber.com/api/v1/webhooks/square/6",
  "created_at": "2025-07-22T14:30:00Z",
  "validation_result": {
    "connection_valid": true,
    "permissions_verified": true,
    "webhook_configured": true
  }
}
```

#### Error Responses
- **400 Bad Request**: Invalid connection configuration
- **409 Conflict**: Connection already exists for this processor/account
- **424 Failed Dependency**: External processor validation failed

---

### **GET** `/external-payments/connections/{connection_id}`
Get details for a specific connection.

#### Path Parameters
- `connection_id` (integer): ID of the connection

#### Response
```json
{
  "id": 5,
  "processor_type": "square",
  "account_id": "L123456789",
  "account_name": "Main Square Location",
  "status": "connected",
  "supports_payments": true,
  "supports_refunds": true,
  "supports_recurring": false,
  "default_currency": "USD",
  "processing_fees": {
    "card_present": 0.026,
    "card_not_present": 0.029,
    "per_transaction": 0.10
  },
  "last_sync_at": "2025-07-22T14:00:00Z",
  "last_transaction_at": "2025-07-22T13:45:00Z",
  "total_transactions": 156,
  "total_volume": 7800.00,
  "connected_at": "2025-06-15T09:30:00Z",
  "health_status": {
    "connection_healthy": true,
    "last_health_check": "2025-07-22T14:30:00Z",
    "recent_errors": 0
  }
}
```

---

### **PUT** `/external-payments/connections/{connection_id}`
Update an existing connection.

#### Path Parameters
- `connection_id` (integer): ID of the connection

#### Request Body
```json
{
  "account_name": "Updated Square Location Name",
  "webhook_notifications": false,
  "connection_config": {
    "access_token": "new_token_here"
  }
}
```

#### Response
```json
{
  "id": 5,
  "account_name": "Updated Square Location Name",
  "updated_at": "2025-07-22T14:30:00Z",
  "validation_result": {
    "connection_valid": true,
    "configuration_updated": true
  }
}
```

---

### **DELETE** `/external-payments/connections/{connection_id}`
Remove an external payment processor connection.

#### Path Parameters
- `connection_id` (integer): ID of the connection

#### Response
```json
{
  "message": "Connection removed successfully",
  "connection_id": 5,
  "disconnected_at": "2025-07-22T14:30:00Z",
  "cleanup_result": {
    "webhooks_removed": true,
    "credentials_revoked": true,
    "data_archived": true
  }
}
```

---

### **POST** `/external-payments/connections/{connection_id}/sync`
Manually sync transactions from external processor.

#### Path Parameters
- `connection_id` (integer): ID of the connection

#### Query Parameters
- `since` (ISO datetime, optional): Sync transactions since this timestamp
- `force` (boolean, default false): Force full resync

#### Response
```json
{
  "sync_started_at": "2025-07-22T14:30:00Z",
  "sync_completed_at": "2025-07-22T14:30:45Z",
  "transactions_synced": 15,
  "new_transactions": 12,
  "updated_transactions": 3,
  "sync_errors": 0,
  "next_sync_at": "2025-07-22T15:30:00Z"
}
```

---

### **GET** `/external-payments/transactions`
Get external transactions for the current barber.

#### Query Parameters
- `connection_id` (integer, optional): Filter by connection
- `status` (string, optional): Filter by status (pending, completed, failed, refunded)
- `since` (ISO datetime, optional): Transactions since this date
- `until` (ISO datetime, optional): Transactions until this date
- `limit` (integer, default 50): Maximum number of results
- `offset` (integer, default 0): Pagination offset

#### Response
```json
{
  "transactions": [
    {
      "id": 1234,
      "connection_id": 5,
      "processor_type": "square",
      "external_transaction_id": "sq_123456789",
      "amount": 75.00,
      "currency": "USD",
      "status": "completed",
      "barber_id": 123,
      "appointment_id": 456,
      "client_id": 789,
      "external_customer_id": "sq_cust_123",
      "processor_fees": 2.18,
      "processed_at": "2025-07-22T13:45:00Z",
      "reconciled_at": "2025-07-22T14:00:00Z",
      "reconciliation_status": "matched"
    }
  ],
  "total_transactions": 156,
  "total_amount": 7800.00,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

---

### **GET** `/external-payments/transactions/{transaction_id}`
Get details for a specific external transaction.

#### Path Parameters
- `transaction_id` (integer): ID of the transaction

#### Response
```json
{
  "id": 1234,
  "connection_id": 5,
  "processor_type": "square",
  "external_transaction_id": "sq_123456789",
  "amount": 75.00,
  "currency": "USD",
  "status": "completed",
  "barber_id": 123,
  "appointment_id": 456,
  "client_id": 789,
  "external_customer_id": "sq_cust_123",
  "external_metadata": {
    "card_brand": "VISA",
    "last_four": "1234",
    "entry_method": "CHIP"
  },
  "processor_fees": 2.18,
  "processed_at": "2025-07-22T13:45:00Z",
  "reconciled_at": "2025-07-22T14:00:00Z",
  "reconciliation_status": "matched",
  "commission_collection": {
    "collection_id": 567,
    "commission_amount": 15.00,
    "collection_status": "pending"
  },
  "related_appointment": {
    "id": 456,
    "service_name": "Haircut & Style",
    "start_time": "2025-07-22T13:30:00Z"
  }
}
```

---

## 💰 Platform Collections API

### Base Path: `/platform-collections`

Manages commission and fee collection from decentralized barbers.

---

### **GET** `/platform-collections/my-collections`
Get commission collections for the current barber.

#### Query Parameters
- `status` (string, optional): Filter by status (pending, due, processing, collected, failed)
- `since` (ISO datetime, optional): Collections since this date
- `until` (ISO datetime, optional): Collections until this date
- `limit` (integer, default 50): Maximum number of results
- `offset` (integer, default 0): Pagination offset

#### Response
```json
{
  "collections": [
    {
      "id": 567,
      "amount": 75.00,
      "collection_type": "commission",
      "status": "collected",
      "external_transaction_ids": ["sq_123", "sq_456", "sq_789"],
      "commission_rate": 20.0,
      "due_date": "2025-07-22T00:00:00Z",
      "collection_method": "stripe_connect",
      "collected_at": "2025-07-22T14:00:00Z",
      "created_at": "2025-07-21T00:00:00Z"
    }
  ],
  "summary": {
    "total_collections": 45,
    "total_amount": 2250.00,
    "pending_amount": 150.00,
    "collected_amount": 2100.00,
    "failed_amount": 0.00
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

---

### **GET** `/platform-collections/collections/{collection_id}`
Get details for a specific collection.

#### Path Parameters
- `collection_id` (integer): ID of the collection

#### Response
```json
{
  "id": 567,
  "barber_id": 123,
  "amount": 75.00,
  "collection_type": "commission",
  "status": "collected",
  "external_transaction_ids": ["sq_123", "sq_456", "sq_789"],
  "commission_rate": 20.0,
  "due_date": "2025-07-22T00:00:00Z",
  "collection_method": "stripe_connect",
  "stripe_invoice_id": "in_1234567890",
  "payment_intent_id": "pi_1234567890",
  "collected_at": "2025-07-22T14:00:00Z",
  "created_at": "2025-07-21T00:00:00Z",
  "related_transactions": [
    {
      "external_transaction_id": "sq_123",
      "amount": 25.00,
      "processed_at": "2025-07-21T10:00:00Z"
    },
    {
      "external_transaction_id": "sq_456",
      "amount": 30.00,
      "processed_at": "2025-07-21T14:00:00Z"
    },
    {
      "external_transaction_id": "sq_789",
      "amount": 20.00,
      "processed_at": "2025-07-21T16:00:00Z"
    }
  ],
  "collection_breakdown": {
    "subtotal": 75.00,
    "processing_fee": 2.48,
    "total_charged": 77.48
  }
}
```

---

### **POST** `/platform-collections/collections/{collection_id}/retry`
Retry a failed collection.

#### Path Parameters
- `collection_id` (integer): ID of the collection to retry

#### Request Body
```json
{
  "collection_method": "stripe_connect",
  "retry_reason": "Updated payment method"
}
```

#### Response
```json
{
  "collection_id": 567,
  "retry_initiated": true,
  "new_status": "processing",
  "retry_attempt": 2,
  "estimated_completion": "2025-07-22T15:00:00Z"
}
```

---

### **GET** `/platform-collections/summary`
Get commission collection summary for the current barber.

#### Query Parameters
- `period` (string, default "30_days"): Summary period (7_days, 30_days, 90_days, 1_year)

#### Response
```json
{
  "period": "30_days",
  "date_range": {
    "start": "2025-06-22T00:00:00Z",
    "end": "2025-07-22T23:59:59Z"
  },
  "collection_summary": {
    "total_collections": 12,
    "total_amount": 600.00,
    "pending_amount": 75.00,
    "collected_amount": 525.00,
    "failed_amount": 0.00,
    "average_collection_amount": 50.00
  },
  "commission_breakdown": {
    "commission_rate": 20.0,
    "total_revenue_tracked": 3750.00,
    "commission_due": 750.00,
    "commission_collected": 675.00,
    "collection_rate": 90.0
  },
  "trends": {
    "collections_vs_previous_period": 8.5,
    "amount_vs_previous_period": 12.3,
    "collection_rate_vs_previous_period": -2.1
  }
}
```

---

## 📊 Unified Payment Analytics API

### Base Path: `/unified-payment-analytics`

Provides comprehensive analytics combining data from all payment sources.

---

### **GET** `/unified-payment-analytics/dashboard`
Get real-time dashboard data for the current barber.

#### Response
```json
{
  "today": {
    "total_transactions": 8,
    "total_volume": 400.00,
    "total_net_earnings": 320.00,
    "centralized_volume": 150.00,
    "external_volume": 250.00,
    "commission_activity": 50.00
  },
  "month_to_date": {
    "total_transactions": 156,
    "total_volume": 7800.00,
    "total_net_earnings": 6240.00,
    "success_rate": 98.4,
    "average_transaction": 50.00
  },
  "outstanding_commission": {
    "pending_collections": 3,
    "total_amount": 150.00,
    "next_collection_date": "2025-07-29T00:00:00Z"
  },
  "recent_transactions": [
    {
      "id": 1234,
      "amount": 75.00,
      "payment_type": "external",
      "processor": "square",
      "status": "completed",
      "processed_at": "2025-07-22T13:45:00Z"
    }
  ],
  "last_updated": "2025-07-22T14:30:00Z"
}
```

---

### **GET** `/unified-payment-analytics/analytics`
Get comprehensive unified analytics.

#### Query Parameters
- `period` (string, default "30_days"): Analytics period (7_days, 30_days, 90_days, 6_months, 1_year, all_time)
- `include_projections` (boolean, default false): Include revenue projections
- `include_six_figure_insights` (boolean, default true): Include Six Figure Barber insights

#### Response
```json
{
  "period": "30_days",
  "date_range": {
    "start": "2025-06-22T00:00:00Z",
    "end": "2025-07-22T23:59:59Z"
  },
  "centralized_payments": {
    "total_transactions": 98,
    "total_volume": 3920.00,
    "net_earnings": 3136.00,
    "success_rate": 99.2,
    "average_transaction": 40.00,
    "processing_fees": 113.68,
    "commission_deducted": 784.00
  },
  "decentralized_payments": {
    "total_transactions": 132,
    "total_volume": 6600.00,
    "success_rate": 97.8,
    "average_transaction": 50.00,
    "external_processor_fees": 191.40,
    "commission_collected": 1320.00
  },
  "commission_data": {
    "total_amount": 1320.00,
    "amount_collected": 1170.00,
    "amount_pending": 150.00,
    "success_rate": 88.6,
    "collection_frequency": "weekly"
  },
  "combined_metrics": {
    "total_transactions": 230,
    "total_volume": 10520.00,
    "total_net_earnings": 7856.00,
    "total_commission_activity": 1170.00,
    "weighted_success_rate": 98.4,
    "effective_take_rate": 25.3
  },
  "trend_analysis": {
    "total_volume_trend": 15.8,
    "total_transactions_trend": 12.5,
    "net_earnings_trend": 18.2,
    "success_rate_trend": 0.5
  },
  "mode_comparison": {
    "centralized_efficiency": 80.0,
    "decentralized_efficiency": 74.7,
    "optimal_mode": "hybrid",
    "volume_distribution": {
      "centralized_percentage": 37.3,
      "decentralized_percentage": 62.7
    }
  },
  "six_figure_insights": {
    "target_annual_revenue": 100000.0,
    "target_monthly_revenue": 8333.33,
    "current_monthly_revenue": 7856.00,
    "progress_percentage": 94.3,
    "projected_annual": 94272.00,
    "gap_to_target": 5728.00,
    "recommendations": [
      "Increase average transaction value by $5 to reach target",
      "Focus on client retention to improve monthly consistency",
      "Consider premium service offerings for higher margins"
    ]
  },
  "recommendations": [
    "Continue using hybrid mode for optimal fee savings",
    "Monitor external processor success rates closely",
    "Consider increasing commission collection frequency"
  ]
}
```

---

### **GET** `/unified-payment-analytics/revenue-optimization`
Get revenue optimization insights and recommendations.

#### Response
```json
{
  "current_mode": "hybrid",
  "optimal_mode": "hybrid",
  "potential_monthly_increase": 127.50,
  "switching_roi": {
    "investment_required": 0.00,
    "monthly_savings": 127.50,
    "annual_savings": 1530.00,
    "payback_period": "immediate"
  },
  "recommendations": [
    {
      "type": "fee_optimization",
      "recommendation": "Increase external payment usage during peak hours",
      "potential_savings": 45.00,
      "implementation_difficulty": "easy"
    },
    {
      "type": "service_pricing",
      "recommendation": "Increase premium service prices by 8%",
      "potential_increase": 82.50,
      "implementation_difficulty": "medium"
    }
  ],
  "analysis_period": "90_days",
  "confidence_score": 0.87,
  "scenario_analysis": {
    "all_centralized": {
      "monthly_revenue": 7856.00,
      "monthly_fees": 235.68,
      "net_monthly": 7620.32
    },
    "all_external": {
      "monthly_revenue": 7856.00,
      "monthly_fees": 191.40,
      "net_monthly": 7664.60,
      "commission_impact": -1571.20
    },
    "current_hybrid": {
      "monthly_revenue": 7856.00,
      "monthly_fees": 205.08,
      "net_monthly": 7650.92,
      "commission_impact": -1170.00
    }
  }
}
```

---

### **GET** `/unified-payment-analytics/six-figure-insights`
Get insights specifically aligned with Six Figure Barber methodology.

#### Response
```json
{
  "program_status": {
    "enrolled": true,
    "tier": "advanced",
    "start_date": "2025-01-15T00:00:00Z",
    "current_phase": "growth"
  },
  "revenue_tracking": {
    "annual_target": 100000.0,
    "current_annual_pace": 94272.0,
    "monthly_target": 8333.33,
    "current_monthly_average": 7856.0,
    "progress_percentage": 94.3,
    "months_to_target": 8.2
  },
  "key_metrics": {
    "average_client_value": 127.50,
    "client_retention_rate": 78.5,
    "service_mix_optimization": 65.2,
    "pricing_power_index": 82.1,
    "operational_efficiency": 91.3
  },
  "growth_recommendations": [
    {
      "category": "pricing",
      "recommendation": "Implement tiered pricing for peak hours",
      "impact": "$285/month",
      "difficulty": "medium",
      "timeframe": "2-4 weeks"
    },
    {
      "category": "services",
      "recommendation": "Add premium beard grooming package",
      "impact": "$450/month",
      "difficulty": "easy",
      "timeframe": "1 week"
    },
    {
      "category": "retention",
      "recommendation": "Implement monthly membership program",
      "impact": "$320/month",
      "difficulty": "hard",
      "timeframe": "6-8 weeks"
    }
  ],
  "milestone_tracking": {
    "milestones_achieved": 7,
    "milestones_total": 12,
    "next_milestone": {
      "name": "Consistent $8K Monthly Revenue",
      "target_value": 8000.0,
      "current_value": 7856.0,
      "progress": 98.2,
      "estimated_completion": "2025-08-15"
    }
  },
  "peer_comparison": {
    "revenue_percentile": 87.2,
    "efficiency_percentile": 91.8,
    "growth_rate_percentile": 76.4,
    "market_position": "top_performer"
  }
}
```

---

## 🔗 Webhook Endpoints

### Base Path: `/webhooks`

Handles webhook notifications from external payment processors.

---

### **POST** `/webhooks/stripe/{connection_id}`
Handle Stripe webhook notifications.

#### Path Parameters
- `connection_id` (integer): ID of the Stripe connection

#### Headers
- `Stripe-Signature`: Webhook signature for verification

#### Request Body
Raw Stripe webhook payload (varies by event type)

#### Response
```json
{
  "received": true,
  "event_type": "payment_intent.succeeded",
  "processed_at": "2025-07-22T14:30:00Z"
}
```

---

### **POST** `/webhooks/square/{connection_id}`
Handle Square webhook notifications.

#### Path Parameters
- `connection_id` (integer): ID of the Square connection

#### Headers
- `X-Square-Signature`: Webhook signature for verification

#### Request Body
Raw Square webhook payload (varies by event type)

#### Response
```json
{
  "received": true,
  "event_type": "payment.created",
  "processed_at": "2025-07-22T14:30:00Z"
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "PAYMENT_ROUTING_FAILED",
    "message": "Unable to route payment: No external processors available",
    "details": {
      "appointment_id": 123,
      "barber_id": 456,
      "available_processors": []
    },
    "timestamp": "2025-07-22T14:30:00Z",
    "request_id": "req_1234567890"
  }
}
```

### HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| **200** | Success | Request completed successfully |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request data, validation errors |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Insufficient permissions for requested action |
| **404** | Not Found | Requested resource does not exist |
| **409** | Conflict | Resource already exists, conflicting operation |
| **422** | Unprocessable Entity | Valid request with business logic errors |
| **424** | Failed Dependency | External service dependency failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Unexpected server error |
| **502** | Bad Gateway | External service unavailable |
| **503** | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `PAYMENT_ROUTING_FAILED` | Unable to determine payment routing | Check barber configuration and processor availability |
| `EXTERNAL_PROCESSOR_UNAVAILABLE` | External processor connection failed | Verify processor connection and credentials |
| `INVALID_PAYMENT_AMOUNT` | Payment amount outside allowed range | Check amount against business rules |
| `COMMISSION_CALCULATION_ERROR` | Unable to calculate commission | Verify commission rate and transaction data |
| `WEBHOOK_SIGNATURE_INVALID` | Webhook signature verification failed | Check webhook secret configuration |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Verify user role and permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement exponential backoff |
| `EXTERNAL_API_ERROR` | External service returned error | Check external service status |

## 🔒 Authentication & Authorization

### JWT Token Structure

JWT tokens contain the following claims:

```json
{
  "sub": "123",
  "email": "barber@example.com",
  "role": "barber",
  "permissions": ["payment:read", "payment:write", "analytics:read"],
  "exp": 1692715200,
  "iat": 1692628800
}
```

### Required Permissions

| Endpoint Category | Required Permission | Roles |
|------------------|-------------------|-------|
| Hybrid Payments | `payment:write` | barber, shop_owner, enterprise_owner |
| Payment Routing | `payment:read` | barber, shop_owner, enterprise_owner |
| External Connections | `connection:write` | barber, shop_owner, enterprise_owner |
| Platform Collections | `collection:read` | barber, shop_owner, enterprise_owner |
| Analytics | `analytics:read` | barber, shop_owner, enterprise_owner, admin |
| Admin Functions | `admin:write` | admin |

### Role-Based Access Control

- **barber**: Can manage own payments and connections
- **shop_owner**: Can manage payments for barbers in their shop
- **enterprise_owner**: Can manage payments for all shops they own
- **admin**: Full access to all payment data and system configuration

## 📝 Rate Limiting

### Rate Limit Headers

All responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1692715200
```

### Rate Limits by Endpoint Category

| Category | Limit | Window |
|----------|-------|---------|
| Payment Processing | 100 requests | 1 hour |
| Payment Routing | 1000 requests | 1 hour |
| Connection Management | 50 requests | 1 hour |
| Analytics | 500 requests | 1 hour |
| Webhooks | 10,000 requests | 1 hour |

## 🧪 Testing

### Test Environment

Use the following base URL for testing:
```
https://api-staging.bookedbarber.com/api/v1
```

### Test Credentials

Test payment processor credentials are available in the development environment. Contact support for access.

### Example Test Requests

```bash
# Test payment routing
curl -X POST "https://api-staging.bookedbarber.com/api/v1/hybrid-payments/route" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "amount": 75.00,
    "currency": "USD"
  }'

# Test analytics
curl -X GET "https://api-staging.bookedbarber.com/api/v1/unified-payment-analytics/dashboard" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN"
```

---

## 📚 Additional Resources

- [System Documentation](./HYBRID_PAYMENT_SYSTEM.md)
- [Migration Guide](./HYBRID_PAYMENT_MIGRATION_GUIDE.md)
- [Troubleshooting Guide](./HYBRID_PAYMENT_TROUBLESHOOTING.md)
- [Integration Examples](./examples/)

## 🆘 API Support

For API-related questions or issues:

1. **Check Error Response**: Review the error code and message
2. **Verify Authentication**: Ensure JWT token is valid and has required permissions
3. **Check Rate Limits**: Verify you haven't exceeded rate limits
4. **Review Documentation**: Check endpoint requirements and expected formats
5. **Test in Staging**: Use staging environment to test integration

---

**API Version**: 1.0.0  
**Last Updated**: 2025-07-22  
**OpenAPI Specification**: Available at `/api/v1/docs`
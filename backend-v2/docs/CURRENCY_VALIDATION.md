# Currency Validation System

This document describes the currency validation system implemented in the BookedBarber V2 backend.

## Overview

The currency validation system ensures that all financial amounts and currency codes in the application are properly validated and formatted according to international standards.

## Components

### 1. Validators (`utils/validators.py`)

#### Currency Code Validation
- **Function**: `validate_currency_code(currency: str) -> str`
- **Purpose**: Validates currency codes against ISO 4217 standard
- **Features**:
  - Accepts 3-character currency codes only
  - Normalizes to uppercase
  - Validates against comprehensive ISO 4217 currency list
  - Raises `ValueError` for invalid codes

**Example**:
```python
validate_currency_code("usd")  # Returns "USD"
validate_currency_code("XYZ")  # Raises ValueError
```

#### Decimal Precision Validation
- **Function**: `validate_decimal_precision(value, precision=2) -> Decimal`
- **Purpose**: Ensures financial amounts have exactly 2 decimal places
- **Features**:
  - Converts various input types to Decimal
  - Validates precision (max decimal places)
  - Quantizes to exactly 2 decimal places
  - Raises `ValueError` for invalid inputs

**Example**:
```python
validate_decimal_precision("19.99")    # Returns Decimal("19.99")
validate_decimal_precision("19.999")   # Raises ValueError
validate_decimal_precision(100)        # Returns Decimal("100.00")
```

#### Currency Normalization
- **Function**: `normalize_currency(currency: str) -> str`
- **Purpose**: Normalize currency without strict validation
- **Features**:
  - Converts to uppercase
  - Strips whitespace
  - Defaults to "USD" for empty values
  - Less strict than validation for existing data

#### Financial Formatting
- **Function**: `format_financial_amount(value) -> str`
- **Purpose**: Format amounts for display
- **Returns**: String with exactly 2 decimal places

### 2. Pydantic Validators

Pre-built Pydantic validators for use in schemas:

```python
from utils.validators import currency_validator, financial_amount_validator

class MySchema(BaseModel):
    amount: Decimal
    currency: str
    
    _validate_amount = validator('amount', allow_reuse=True)(financial_amount_validator)
    _validate_currency = validator('currency', allow_reuse=True)(currency_validator)
```

## Supported Currency Codes

The system supports all major ISO 4217 currency codes including:

- **USD** - US Dollar
- **EUR** - Euro
- **GBP** - British Pound Sterling
- **CAD** - Canadian Dollar
- **AUD** - Australian Dollar
- **JPY** - Japanese Yen
- **CHF** - Swiss Franc
- **CNY** - Chinese Yuan
- And 150+ other ISO 4217 codes

## Schema Integration

### Product Schemas (`schemas_new/product.py`)

All financial fields in product-related schemas now include validation:

- `ProductBase`: price, compare_at_price, cost_per_item
- `ProductUpdate`: price, compare_at_price, cost_per_item
- `ProductVariantBase`: price, compare_at_price, cost_per_item
- `ProductVariantUpdate`: price, compare_at_price, cost_per_item
- `InventoryItemBase`: cost_per_item, currency
- `InventoryItemUpdate`: cost_per_item, currency
- `OrderItemBase`: price, total_discount
- `OrderBase`: subtotal, tax_amount, shipping_amount, discount_amount, total_amount, currency
- `POSTransactionBase`: subtotal, tax_amount, discount_amount, tip_amount, total_amount
- `ProductCatalogFilter`: min_price, max_price

### Commission Schemas (`schemas_new/commission.py`)

All commission-related financial fields include validation:

- `CommissionItemBarber`: commission_amount, line_total
- `CommissionSummaryBarber`: total_commission, service_commission, retail_commission, paid_amount, pending_amount
- `CommissionReportBarber`: retail_commission, service_commission, total_commission
- `CommissionReportAdmin`: retail_commission, service_commission, total_commission
- `PayoutPreviewBarber`: total_payout
- `PayoutPreviewAdmin`: service_amount, retail_amount, total_payout

## Error Handling

### Common Validation Errors

1. **Invalid Currency Code**:
   ```
   ValueError: 'XYZ' is not a valid ISO 4217 currency code
   ```

2. **Invalid Decimal Precision**:
   ```
   ValueError: Value 19.999 has more than 2 decimal places. Financial amounts must have exactly 2 decimal places.
   ```

3. **Invalid Decimal Value**:
   ```
   ValueError: Invalid decimal value: abc
   ```

### Client-Side Error Handling

When validation fails, the API returns structured error responses:

```json
{
  "detail": [
    {
      "loc": ["currency"],
      "msg": "'XYZ' is not a valid ISO 4217 currency code",
      "type": "value_error"
    }
  ]
}
```

## Testing

### Running Validation Tests

```bash
cd backend-v2
python test_validators_only.py
```

### Test Coverage

The validation system includes comprehensive tests:

- Valid and invalid currency codes
- Decimal precision validation
- Currency normalization
- Financial amount formatting
- Edge cases and error conditions

## Usage Examples

### Creating a Product with Validation

```python
from schemas_new.product import ProductBase
from models.product import ProductType
from decimal import Decimal

# Valid product
product = ProductBase(
    name="Premium Haircut",
    product_type=ProductType.SERVICE,
    price=Decimal("25.00"),
    compare_at_price=Decimal("30.00")
)

# Invalid product (will raise ValidationError)
try:
    invalid_product = ProductBase(
        name="Premium Haircut",
        product_type=ProductType.SERVICE,
        price=Decimal("25.999")  # Too many decimal places
    )
except ValidationError as e:
    print("Price validation failed:", e)
```

### Creating an Order with Currency Validation

```python
from schemas_new.product import OrderBase
from models.product import OrderSource
from decimal import Decimal

# Valid order
order = OrderBase(
    source=OrderSource.ONLINE,
    subtotal=Decimal("100.00"),
    tax_amount=Decimal("8.50"),
    total_amount=Decimal("108.50"),
    currency="USD"
)

# Invalid order (will raise ValidationError)
try:
    invalid_order = OrderBase(
        source=OrderSource.ONLINE,
        subtotal=Decimal("100.00"),
        total_amount=Decimal("108.50"),
        currency="INVALID"  # Invalid currency code
    )
except ValidationError as e:
    print("Currency validation failed:", e)
```

## Migration Guide

### For Existing Code

If you have existing schemas that handle financial data:

1. **Import validators**:
   ```python
   from utils.validators import currency_validator, financial_amount_validator
   ```

2. **Add validators to Decimal fields**:
   ```python
   class MySchema(BaseModel):
       amount: Decimal
       
       _validate_amount = validator('amount', allow_reuse=True)(financial_amount_validator)
   ```

3. **Add validators to currency fields**:
   ```python
   class MySchema(BaseModel):
       currency: str = "USD"
       
       _validate_currency = validator('currency', allow_reuse=True)(currency_validator)
   ```

### For New Schemas

Always include financial validators for:
- Any field containing monetary amounts
- Any field containing currency codes
- Any field that requires precise decimal formatting

## Performance Considerations

- Validators are optimized for performance
- ISO 4217 currency codes are stored in a set for O(1) lookup
- Decimal operations use Python's built-in decimal module for precision
- Validators use `allow_reuse=True` to minimize overhead

## Future Enhancements

1. **Dynamic Currency Support**: Load supported currencies from external API
2. **Exchange Rate Integration**: Add currency conversion capabilities
3. **Localization**: Support locale-specific formatting
4. **Audit Trail**: Track currency validation failures for monitoring

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure `utils/validators.py` is in your Python path
2. **Validation Failures**: Check that amounts have exactly 2 decimal places
3. **Currency Codes**: Verify currency codes are valid ISO 4217 codes
4. **Decimal Precision**: Use `Decimal` type for all financial calculations

### Debug Tips

- Use `test_validators_only.py` to verify validator behavior
- Check validation error messages for specific failure reasons
- Ensure all financial amounts are passed as strings or Decimal objects
- Verify currency codes are exactly 3 characters and valid ISO 4217 codes
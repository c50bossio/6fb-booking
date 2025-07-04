# Multi-Step Registration Flow

This directory contains the complete multi-step registration flow for BookedBarber's new business hierarchy system. The registration process is designed to onboard different types of barbering businesses with appropriate plans and pricing.

## Overview

The registration flow consists of 5 steps:
1. **Business Type Selection** - Choose between Individual Barber, Barbershop Owner, or Enterprise Multi-location
2. **Account Setup** - Basic personal information and login credentials
3. **Business Details** - Business information, location, and chair count
4. **Pricing Confirmation** - Review and confirm plan with dynamic pricing calculator
5. **Payment Setup** - Start 14-day free trial and add payment method

## Components

### MultiStepRegistration.tsx
The main orchestrator component that manages the entire registration flow.

**Props:**
- `onComplete?: (data: RegistrationData) => void` - Called when registration is completed
- `onCancel?: () => void` - Called when user cancels registration

**Features:**
- Step navigation with progress indicator
- State management for all registration data
- Responsive design with mobile support
- Automatic step validation

### BusinessTypeSelection.tsx
First step where users choose their business type.

**Business Types:**
- **Individual Barber** - Solo practitioners
- **Barbershop Owner** - Single location with multiple chairs
- **Enterprise Multi-location** - Multiple locations/franchises

**Features:**
- Visual cards with icons and feature lists
- Pricing information for each tier
- Responsive grid layout

### AccountSetup.tsx
Second step for creating user credentials and consent.

**Features:**
- Personal information collection
- Password strength validation
- Terms of Service and Privacy Policy consent
- Optional marketing consent
- Test data creation option

### BusinessInformation.tsx
Third step for business details and location.

**Features:**
- Business name and address
- Contact information
- Chair and barber count
- Optional business description
- Validation for all required fields

### PricingConfirmation.tsx
Fourth step integrating the PricingCalculator for plan confirmation.

**Features:**
- Interactive chair count selection
- Real-time pricing updates
- Competitor pricing comparison
- Plan feature overview
- Trial information display

### PaymentSetup.tsx
Final step for trial setup and payment method.

**Features:**
- Three sub-steps: trial → payment → complete
- Mock Stripe integration
- Security badges and trust indicators
- Trial timeline display
- Success confirmation

## Usage

### Basic Implementation
```tsx
import { MultiStepRegistration } from '@/components/registration'

function RegisterPage() {
  const handleComplete = (data: RegistrationData) => {
    // Send to API, create account, redirect to dashboard
    console.log('Registration data:', data)
  }

  const handleCancel = () => {
    // Redirect to home page
    window.location.href = '/'
  }

  return (
    <MultiStepRegistration
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  )
}
```

### Individual Components
```tsx
import { 
  BusinessTypeSelection, 
  AccountSetup, 
  PricingConfirmation 
} from '@/components/registration'

// Use individual components for custom flows
```

## Data Flow

The registration flow collects and manages the following data structure:

```typescript
interface RegistrationData {
  businessType: 'solo' | 'single_location' | 'multi_location' | null
  accountInfo: {
    firstName: string
    lastName: string
    email: string
    password: string
    confirmPassword: string
    consent: {
      terms: boolean
      privacy: boolean
      marketing: boolean
      testData: boolean
    }
  }
  businessInfo: {
    businessName: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
    phone: string
    website?: string
    chairCount: number
    barberCount: number
    description?: string
  }
  pricingInfo: {
    chairs: number
    monthlyTotal: number
    tier: string
  } | null
  paymentInfo: {
    trialStarted: boolean
    paymentMethodAdded: boolean
  } | null
}
```

## Styling

The components use Tailwind CSS with the existing design system:
- Consistent spacing and typography
- Dark mode support
- Responsive breakpoints
- Color-coded business types (blue/green/purple)
- Accessible form controls

## Integration Points

### Backend API
The flow is designed to integrate with these expected endpoints:
- `POST /api/v1/auth/register` - Create user account
- `POST /api/v1/organizations` - Create business/organization
- `POST /api/v1/trials/start` - Start free trial
- `POST /api/v1/payment-methods` - Add payment method

### PricingCalculator
Integrates the existing `PricingCalculator` component for dynamic pricing based on chair count with volume discounts.

### Payment Processing
Mock Stripe integration ready for real payment processing. Supports:
- Credit card validation
- Secure payment method storage
- Trial period management
- Subscription billing setup

## Validation

Each step includes comprehensive validation:
- **Business Type**: Required selection
- **Account Setup**: Email format, password strength, required consents
- **Business Info**: Address validation, phone format, chair/barber counts
- **Pricing**: Chair count within limits
- **Payment**: Card validation (when real Stripe is integrated)

## Accessibility

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatible
- High contrast colors
- Focus management

## Testing

To test the registration flow:
1. Navigate to `/demo/registration`
2. Complete all 5 steps
3. Check browser console for final registration data
4. Verify responsive behavior on mobile devices

## Future Enhancements

- Email verification step
- Phone number verification
- Social login options (Google, Apple)
- Business verification for enterprises
- Integration with real Stripe API
- A/B testing different flows
- Analytics tracking for conversion optimization
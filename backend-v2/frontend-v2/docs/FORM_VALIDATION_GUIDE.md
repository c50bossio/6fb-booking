# BookedBarber Form Validation System

## Overview

The BookedBarber form validation system provides real-time, user-friendly validation with visual feedback. It's built on a custom React hook that manages form state, validation rules, and error handling.

## Features

- ✅ Real-time validation as users type
- ✅ Visual feedback with success/error states
- ✅ Built-in validators for common fields
- ✅ Custom validation rules support
- ✅ Accessible error messages
- ✅ Touch/dirty state tracking
- ✅ Form-level validation
- ✅ Password strength indicator
- ✅ Character counters for text areas
- ✅ Loading states during async validation

## Quick Start

### Basic Usage

```tsx
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { ValidatedInput } from '@/components/forms/ValidatedInput';
import { Form, FormField } from '@/components/forms/Form';

function MyForm() {
  const {
    values,
    errors,
    isFormValid,
    getFieldProps,
    validateForm,
  } = useFormValidation({
    email: {
      value: '',
      rules: [
        validators.required('Email is required'),
        validators.email('Invalid email format'),
      ],
    },
    password: {
      value: '',
      rules: [
        validators.required('Password is required'),
        validators.minLength(8, 'At least 8 characters'),
      ],
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    // Submit form data
    console.log('Form values:', values);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormField>
        <ValidatedInput
          id="email"
          type="email"
          label="Email"
          {...getFieldProps('email')}
        />
      </FormField>
      
      <FormField>
        <ValidatedInput
          id="password"
          type="password"
          label="Password"
          showPasswordToggle
          {...getFieldProps('password')}
        />
      </FormField>
      
      <Button type="submit" disabled={!isFormValid}>
        Submit
      </Button>
    </Form>
  );
}
```

## Built-in Validators

### Required Fields
```tsx
validators.required('This field is required')
```

### Email Validation
```tsx
validators.email('Please enter a valid email')
```

### Length Validation
```tsx
validators.minLength(8, 'At least 8 characters')
validators.maxLength(100, 'Maximum 100 characters')
```

### Pattern Matching
```tsx
validators.pattern(/^[A-Z0-9]+$/, 'Only uppercase letters and numbers')
```

### Phone Numbers
```tsx
validators.phone('Invalid phone number')
```

### Password Strength
```tsx
validators.password('Password must include uppercase, lowercase, and numbers')
```

### Field Matching
```tsx
validators.match('password', 'Passwords must match')
```

### Custom Validation
```tsx
validators.custom(
  (value) => value !== 'admin',
  'Username cannot be "admin"'
)
```

## Custom Validators

Create domain-specific validators:

```tsx
import { ValidationRule } from '@/hooks/useFormValidation';

// ZIP code validator
export const zipCode: ValidationRule = {
  validate: (value) => /^\d{5}(-\d{4})?$/.test(value),
  message: 'Invalid ZIP code',
};

// Future date validator
export const futureDate: ValidationRule = {
  validate: (value) => new Date(value) > new Date(),
  message: 'Date must be in the future',
};

// Use in your form
const form = useFormValidation({
  zip: {
    value: '',
    rules: [validators.required(), zipCode],
  },
  appointmentDate: {
    value: '',
    rules: [validators.required(), futureDate],
  },
});
```

## Input Components

### ValidatedInput

Basic input with validation feedback:

```tsx
<ValidatedInput
  id="email"
  type="email"
  label="Email Address"
  placeholder="john@example.com"
  leftIcon={<Mail className="h-4 w-4" />}
  helperText="We'll never share your email"
  showSuccess={true}
  {...getFieldProps('email')}
/>
```

### Password Input with Strength Indicator

```tsx
<ValidatedInput
  id="password"
  type="password"
  label="Password"
  showPasswordToggle
  {...getFieldProps('password')}
/>
<PasswordStrengthIndicator 
  password={values.password} 
  show={values.password.length > 0}
/>
```

### ValidatedTextarea

Textarea with character counter:

```tsx
<ValidatedTextarea
  id="bio"
  label="Bio"
  rows={4}
  maxLength={500}
  showCharCount
  helperText="Tell us about yourself"
  {...getFieldProps('bio')}
/>
```

### ValidatedSelect

Dropdown with validation:

```tsx
<ValidatedSelect
  id="businessType"
  label="Business Type"
  placeholder="Select a type"
  options={[
    { value: 'barbershop', label: 'Barbershop' },
    { value: 'salon', label: 'Hair Salon' },
  ]}
  {...getFieldProps('businessType')}
/>
```

## Advanced Features

### Conditional Validation

```tsx
const form = useFormValidation({
  hasWebsite: {
    value: false,
    rules: [],
  },
  websiteUrl: {
    value: '',
    rules: [
      validators.custom(
        (value, formState) => {
          // Only validate if hasWebsite is true
          if (!formState?.hasWebsite?.value) return true;
          return validators.url().validate(value);
        },
        'Please enter a valid URL'
      ),
    ],
  },
});
```

### Async Validation

```tsx
const checkEmailAvailable = async (email: string) => {
  const response = await fetch(`/api/check-email?email=${email}`);
  const data = await response.json();
  return data.available;
};

const form = useFormValidation({
  email: {
    value: '',
    rules: [
      validators.required(),
      validators.email(),
      validators.custom(
        async (value) => await checkEmailAvailable(value),
        'Email is already taken'
      ),
    ],
  },
});
```

### Form-Level Validation

```tsx
const form = useFormValidation({
  startTime: { value: '', rules: [] },
  endTime: { value: '', rules: [] },
});

// Validate before submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Custom form-level validation
  if (values.startTime >= values.endTime) {
    // Handle error
    return;
  }
  
  const isValid = await validateForm();
  if (!isValid) return;
  
  // Submit form
};
```

## Styling

### Success States
- Green border and check icon when valid
- Only shown after field is touched

### Error States
- Red border and X icon when invalid
- Error message with alert icon
- Only shown after field is touched

### Loading States
- Spinning loader icon during async validation
- Disabled state during form submission

### Helper Text
- Shown below input when no errors
- Replaced by error message when invalid

## Accessibility

- Proper ARIA attributes for screen readers
- Error messages linked to inputs
- Keyboard navigation support
- Focus management
- Clear visual indicators

## Best Practices

1. **Progressive Enhancement**: Start with basic HTML validation attributes, enhance with JavaScript
2. **Clear Messages**: Write helpful, specific error messages
3. **Immediate Feedback**: Validate on change for better UX
4. **Touch Tracking**: Only show errors after user interaction
5. **Loading States**: Show validation progress for async operations
6. **Success Feedback**: Confirm when fields are valid
7. **Form Summary**: Show overall form status before submission

## Example: Complete Registration Form

See `/components/forms/ExampleRegistrationForm.tsx` for a full implementation including:
- Multiple field types
- Grid layouts
- Password confirmation
- Optional fields
- Character limits
- Custom validators
- Form reset functionality
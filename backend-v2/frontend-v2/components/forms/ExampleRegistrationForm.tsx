"use client";

import React, { useState } from 'react';
import { useFormValidation, validators } from '@/hooks/useFormValidation';
import { ValidatedInput, PasswordStrengthIndicator } from '@/components/forms/ValidatedInput';
import { ValidatedTextarea } from '@/components/forms/ValidatedTextarea';
import { ValidatedSelect } from '@/components/forms/ValidatedSelect';
import { Form, FormField, FormActions, FormError, FormSuccess } from '@/components/forms/Form';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, User, Phone, Briefcase, Hash } from 'lucide-react';

// Example registration form demonstrating all validation capabilities
export const ExampleRegistrationForm: React.FC = () => {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    values,
    errors,
    isFormValid,
    isFormDirty,
    getFieldProps,
    validateForm,
    reset,
    setIsSubmitting,
  } = useFormValidation({
    firstName: {
      value: '',
      rules: [
        validators.required('First name is required'),
        validators.minLength(2, 'First name must be at least 2 characters'),
        validators.pattern(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
      ],
    },
    lastName: {
      value: '',
      rules: [
        validators.required('Last name is required'),
        validators.minLength(2, 'Last name must be at least 2 characters'),
        validators.pattern(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
      ],
    },
    email: {
      value: '',
      rules: [
        validators.required('Email is required'),
        validators.email('Please enter a valid email address'),
      ],
    },
    phone: {
      value: '',
      rules: [
        validators.required('Phone number is required'),
        validators.phone('Please enter a valid 10-digit phone number'),
      ],
    },
    businessName: {
      value: '',
      rules: [
        validators.required('Business name is required'),
        validators.minLength(3, 'Business name must be at least 3 characters'),
        validators.maxLength(100, 'Business name must be less than 100 characters'),
      ],
    },
    businessType: {
      value: '',
      rules: [
        validators.required('Please select a business type'),
      ],
    },
    password: {
      value: '',
      rules: [
        validators.required('Password is required'),
        validators.password('Password must be at least 8 characters with uppercase, lowercase, and number'),
      ],
    },
    confirmPassword: {
      value: '',
      rules: [
        validators.required('Please confirm your password'),
        validators.match('password', 'Passwords must match'),
      ],
    },
    bio: {
      value: '',
      rules: [
        validators.maxLength(500, 'Bio must be less than 500 characters'),
      ],
    },
    referralCode: {
      value: '',
      rules: [
        validators.pattern(/^[A-Z0-9]{6}$/, 'Referral code must be 6 uppercase letters or numbers'),
      ],
    },
  });

  const businessTypeOptions = [
    { value: '', label: 'Select a business type' },
    { value: 'barbershop', label: 'Barbershop' },
    { value: 'salon', label: 'Hair Salon' },
    { value: 'spa', label: 'Spa & Wellness' },
    { value: 'nails', label: 'Nail Salon' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    // Validate form
    const isValid = await validateForm();
    if (!isValid) {
      setSubmitError('Please fix the errors above before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      console.log('Form submitted with values:', values);
      setSubmitSuccess(true);
      reset();
    } catch (error) {
      setSubmitError('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {submitSuccess && (
        <FormSuccess message="Registration successful! Check your email to verify your account." />
      )}
      
      {submitError && <FormError error={submitError} />}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField>
          <ValidatedInput
            id="firstName"
            type="text"
            label="First Name"
            placeholder="John"
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
            {...getFieldProps('firstName')}
          />
        </FormField>

        <FormField>
          <ValidatedInput
            id="lastName"
            type="text"
            label="Last Name"
            placeholder="Doe"
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
            {...getFieldProps('lastName')}
          />
        </FormField>
      </div>

      <FormField>
        <ValidatedInput
          id="email"
          type="email"
          label="Email Address"
          placeholder="john@example.com"
          leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
          helperText="We'll never share your email with anyone else."
          {...getFieldProps('email')}
        />
      </FormField>

      <FormField>
        <ValidatedInput
          id="phone"
          type="tel"
          label="Phone Number"
          placeholder="(555) 123-4567"
          leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
          helperText="US phone numbers only"
          {...getFieldProps('phone')}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FormField>
          <ValidatedInput
            id="businessName"
            type="text"
            label="Business Name"
            placeholder="Elite Cuts Barbershop"
            leftIcon={<Briefcase className="h-4 w-4 text-gray-400" />}
            {...getFieldProps('businessName')}
          />
        </FormField>

        <FormField>
          <ValidatedSelect
            id="businessType"
            label="Business Type"
            options={businessTypeOptions}
            {...getFieldProps('businessType')}
          />
        </FormField>
      </div>

      <FormField>
        <ValidatedInput
          id="password"
          type="password"
          label="Password"
          placeholder="Create a strong password"
          leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
          showPasswordToggle
          {...getFieldProps('password')}
        />
        <PasswordStrengthIndicator 
          password={values.password} 
          show={values.password.length > 0}
          className="mt-2"
        />
      </FormField>

      <FormField>
        <ValidatedInput
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Re-enter your password"
          leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
          showPasswordToggle
          {...getFieldProps('confirmPassword')}
        />
      </FormField>

      <FormField>
        <ValidatedTextarea
          id="bio"
          label="About Your Business (Optional)"
          placeholder="Tell us about your business..."
          rows={4}
          showCharCount
          maxLength={500}
          helperText="This will be displayed on your public profile"
          {...getFieldProps('bio')}
        />
      </FormField>

      <FormField>
        <ValidatedInput
          id="referralCode"
          type="text"
          label="Referral Code (Optional)"
          placeholder="ABC123"
          leftIcon={<Hash className="h-4 w-4 text-gray-400" />}
          helperText="Enter a referral code if you have one"
          inputClassName="uppercase"
          {...getFieldProps('referralCode')}
        />
      </FormField>

      <FormActions align="between">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={!isFormDirty}
        >
          Reset Form
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid}
        >
          Create Account
        </Button>
      </FormActions>
    </Form>
  );
};
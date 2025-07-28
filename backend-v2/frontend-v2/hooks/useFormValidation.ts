import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
  validate: (value: any, formState?: any) => boolean;
  message: string;
}

export interface FieldConfig {
  value: any;
  rules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  validating: boolean;
}

export interface FormState {
  [key: string]: FieldState;
}

// Common validators
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      
      // Comprehensive email validation
      try {
        // Basic format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return false;
        
        // Additional checks for common issues
        const trimmedValue = value.trim();
        if (trimmedValue !== value) return false; // No leading/trailing spaces
        if (trimmedValue.includes('..')) return false; // No consecutive dots
        if (trimmedValue.startsWith('.') || trimmedValue.endsWith('.')) return false; // No leading/trailing dots
        if (trimmedValue.includes('@.') || trimmedValue.includes('.@')) return false; // No dots adjacent to @
        
        return true;
      } catch (error) {
        console.error('Email validation error:', error);
        // Fallback to basic regex if there's any error
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      }
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      return value.length <= max;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      return regex.test(value);
    },
    message,
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      // Check if it's a valid US phone number (10 digits)
      return digits.length === 10 || digits.length === 11;
    },
    message,
  }),

  password: (message = 'Password must be at least 8 characters with uppercase, lowercase, and number'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required validator handle empty values
      if (value.length < 8) return false;
      if (!/[a-z]/.test(value)) return false;
      if (!/[A-Z]/.test(value)) return false;
      if (!/[0-9]/.test(value)) return false;
      return true;
    },
    message,
  }),

  match: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value, formState) => {
      if (!formState || !formState[fieldName]) return true;
      return value === formState[fieldName].value;
    },
    message: message || `Must match ${fieldName}`,
  }),

  custom: (validateFn: (value: any, formState?: FormState) => boolean, message: string): ValidationRule => ({
    validate: validateFn,
    message,
  }),
};

export function useFormValidation<T extends Record<string, FieldConfig>>(
  initialFields: T,
  options?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    validateOnSubmit?: boolean;
  }
) {
  const defaultOptions = {
    validateOnChange: true,
    validateOnBlur: true,
    validateOnSubmit: true,
    ...options,
  };

  // Initialize form state
  const initializeFormState = (): FormState => {
    const state: FormState = {};
    Object.keys(initialFields).forEach((key) => {
      state[key] = {
        value: initialFields[key].value,
        error: null,
        touched: false,
        dirty: false,
        valid: true,
        validating: false,
      };
    });
    return state;
  };

  const [formState, setFormState] = useState<FormState>(initializeFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    async (fieldName: string, value: any): Promise<string | null> => {
      const fieldConfig = initialFields[fieldName];
      if (!fieldConfig || !fieldConfig.rules) return null;

      for (const rule of fieldConfig.rules) {
        const isValid = await Promise.resolve(
          rule.validate(value, formState)
        );
        if (!isValid) {
          return rule.message;
        }
      }
      return null;
    },
    [initialFields, formState]
  );

  // Update field value
  const setValue = useCallback(
    async (fieldName: string, value: any) => {
      const fieldConfig = initialFields[fieldName];
      const shouldValidate =
        fieldConfig?.validateOnChange ?? defaultOptions.validateOnChange;

      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
          dirty: true,
          validating: shouldValidate,
        },
      }));

      if (shouldValidate) {
        const error = await validateField(fieldName, value);
        setFormState((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            error,
            valid: !error,
            validating: false,
          },
        }));
      }
    },
    [initialFields, defaultOptions.validateOnChange, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    async (fieldName: string) => {
      const fieldConfig = initialFields[fieldName];
      const shouldValidate =
        fieldConfig?.validateOnBlur ?? defaultOptions.validateOnBlur;

      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          touched: true,
        },
      }));

      if (shouldValidate && !formState[fieldName].error) {
        const error = await validateField(fieldName, formState[fieldName].value);
        setFormState((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            error,
            valid: !error,
          },
        }));
      }
    },
    [initialFields, defaultOptions.validateOnBlur, validateField, formState]
  );

  // Validate all fields
  const validateForm = useCallback(async (): Promise<boolean> => {
    const errors: Record<string, string | null> = {};
    let isValid = true;

    for (const fieldName of Object.keys(initialFields)) {
      const error = await validateField(fieldName, formState[fieldName].value);
      errors[fieldName] = error;
      if (error) isValid = false;
    }

    setFormState((prev) => {
      const newState = { ...prev };
      Object.keys(errors).forEach((fieldName) => {
        newState[fieldName] = {
          ...newState[fieldName],
          error: errors[fieldName],
          valid: !errors[fieldName],
          touched: true,
        };
      });
      return newState;
    });

    return isValid;
  }, [initialFields, formState, validateField]);

  // Reset form
  const reset = useCallback(() => {
    setFormState(initializeFormState());
  }, []);

  // Reset specific field
  const resetField = useCallback(
    (fieldName: string) => {
      setFormState((prev) => ({
        ...prev,
        [fieldName]: {
          value: initialFields[fieldName].value,
          error: null,
          touched: false,
          dirty: false,
          valid: true,
          validating: false,
        },
      }));
    },
    [initialFields]
  );

  // Get field props for easy integration
  const getFieldProps = useCallback(
    (fieldName: string) => ({
      value: formState[fieldName]?.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(fieldName, e.target.value),
      onBlur: () => handleBlur(fieldName),
      error: formState[fieldName]?.error,
      touched: formState[fieldName]?.touched || false,
      dirty: formState[fieldName]?.dirty || false,
      valid: formState[fieldName]?.valid ?? true,
      validating: formState[fieldName]?.validating || false,
    }),
    [formState, setValue, handleBlur]
  );

  // Check if form is valid
  const isFormValid = Object.values(formState).every(
    (field) => field.valid && !field.validating
  );

  // Check if form is dirty
  const isFormDirty = Object.values(formState).some((field) => field.dirty);

  // Check if form has been touched
  const isFormTouched = Object.values(formState).some((field) => field.touched);

  // Get form values
  const values = Object.keys(formState).reduce((acc, key) => {
    acc[key] = formState[key].value;
    return acc;
  }, {} as Record<string, any>);

  // Get form errors
  const errors = Object.keys(formState).reduce((acc, key) => {
    if (formState[key].error) {
      acc[key] = formState[key].error;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    formState,
    values,
    errors,
    isFormValid,
    isFormDirty,
    isFormTouched,
    isSubmitting,
    setValue,
    handleBlur,
    validateField,
    validateForm,
    reset,
    resetField,
    getFieldProps,
    setIsSubmitting,
  };
}
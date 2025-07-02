"use client";

import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

export interface FormContextValue {
  isSubmitting?: boolean;
  isValidating?: boolean;
}

const FormContext = createContext<FormContextValue>({});

export const useFormContext = () => useContext(FormContext);

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  isSubmitting?: boolean;
  isValidating?: boolean;
}

export const Form: React.FC<FormProps> = ({
  children,
  isSubmitting = false,
  isValidating = false,
  className,
  ...props
}) => {
  return (
    <FormContext.Provider value={{ isSubmitting, isValidating }}>
      <form
        className={cn('space-y-6', className)}
        noValidate
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};

export interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ children, className }) => {
  return <div className={cn('space-y-2', className)}>{children}</div>;
};

export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  align = 'right',
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn('flex items-center gap-4', alignmentClasses[align], className)}>
      {children}
    </div>
  );
};

export interface FormErrorProps {
  error?: string | null;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ error, className }) => {
  if (!error) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800',
        className
      )}
      role="alert"
    >
      {error}
    </div>
  );
};

export interface FormSuccessProps {
  message?: string | null;
  className?: string;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800',
        className
      )}
      role="status"
    >
      {message}
    </div>
  );
};
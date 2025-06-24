'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin rounded-full border-solid border-current',
  {
    variants: {
      size: {
        xs: 'h-3 w-3 border-[1px]',
        sm: 'h-4 w-4 border-[1.5px]',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-12 w-12 border-[3px]',
        '2xl': 'h-16 w-16 border-4',
      },
      variant: {
        default: 'border-primary border-t-transparent',
        secondary: 'border-muted-foreground border-t-transparent',
        destructive: 'border-destructive border-t-transparent',
        success: 'border-green-600 border-t-transparent',
        warning: 'border-yellow-600 border-t-transparent',
        light: 'border-white border-t-transparent',
        dark: 'border-gray-900 border-t-transparent',
      },
      speed: {
        slow: 'animate-spin duration-1000',
        normal: '',
        fast: 'animate-spin duration-300',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      speed: 'normal',
    },
  }
);

const pulseVariants = cva(
  'animate-pulse rounded-full bg-current',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
        '2xl': 'h-16 w-16',
      },
      variant: {
        default: 'bg-primary/60',
        secondary: 'bg-muted-foreground/60',
        destructive: 'bg-destructive/60',
        success: 'bg-green-600/60',
        warning: 'bg-yellow-600/60',
        light: 'bg-white/60',
        dark: 'bg-gray-900/60',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  type?: 'spinner' | 'pulse' | 'dots' | 'bars';
  label?: string;
  overlay?: boolean;
  center?: boolean;
}

const DotsSpinner = ({ size, variant, className }: any) => {
  const dotClass = cn(
    'rounded-full animate-pulse',
    size === 'xs' && 'h-1 w-1',
    size === 'sm' && 'h-1.5 w-1.5',
    size === 'md' && 'h-2 w-2',
    size === 'lg' && 'h-2.5 w-2.5',
    size === 'xl' && 'h-3 w-3',
    size === '2xl' && 'h-4 w-4',
    variant === 'default' && 'bg-primary',
    variant === 'secondary' && 'bg-muted-foreground',
    variant === 'destructive' && 'bg-destructive',
    variant === 'success' && 'bg-green-600',
    variant === 'warning' && 'bg-yellow-600',
    variant === 'light' && 'bg-white',
    variant === 'dark' && 'bg-gray-900'
  );

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className={cn(dotClass, 'animation-delay-0')} />
      <div className={cn(dotClass, 'animation-delay-150')} />
      <div className={cn(dotClass, 'animation-delay-300')} />
    </div>
  );
};

const BarsSpinner = ({ size, variant, className }: any) => {
  const barClass = cn(
    'rounded-sm animate-pulse',
    size === 'xs' && 'h-3 w-0.5',
    size === 'sm' && 'h-4 w-0.5',
    size === 'md' && 'h-6 w-1',
    size === 'lg' && 'h-8 w-1',
    size === 'xl' && 'h-12 w-1.5',
    size === '2xl' && 'h-16 w-2',
    variant === 'default' && 'bg-primary',
    variant === 'secondary' && 'bg-muted-foreground',
    variant === 'destructive' && 'bg-destructive',
    variant === 'success' && 'bg-green-600',
    variant === 'warning' && 'bg-yellow-600',
    variant === 'light' && 'bg-white',
    variant === 'dark' && 'bg-gray-900'
  );

  return (
    <div className={cn('flex items-end space-x-1', className)}>
      <div className={cn(barClass, 'animation-delay-0')} />
      <div className={cn(barClass, 'animation-delay-150')} />
      <div className={cn(barClass, 'animation-delay-300')} />
      <div className={cn(barClass, 'animation-delay-450')} />
    </div>
  );
};

export const LoadingSpinner = React.forwardRef<
  HTMLDivElement,
  LoadingSpinnerProps
>(
  (
    {
      className,
      size,
      variant,
      speed,
      type = 'spinner',
      label,
      overlay = false,
      center = false,
      ...props
    },
    ref
  ) => {
    const renderSpinner = () => {
      switch (type) {
        case 'pulse':
          return <div className={pulseVariants({ size, variant })} />;
        case 'dots':
          return <DotsSpinner size={size} variant={variant} />;
        case 'bars':
          return <BarsSpinner size={size} variant={variant} />;
        default:
          return (
            <div className={spinnerVariants({ size, variant, speed })} />
          );
      }
    };

    const content = (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          center && 'justify-center',
          label && 'space-x-2',
          className
        )}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        {renderSpinner()}
        {label && (
          <span className="text-sm text-muted-foreground">{label}</span>
        )}
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    );

    if (overlay) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          {content}
        </div>
      );
    }

    return content;
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

// Skeleton loading patterns
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'default',
      width,
      height,
      lines = 1,
      style,
      ...props
    },
    ref
  ) => {
    if (variant === 'text' && lines > 1) {
      return (
        <div className={cn('space-y-2', className)} ref={ref} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className="h-4 bg-muted animate-pulse rounded"
              style={{
                width: index === lines - 1 ? '75%' : '100%',
                ...style,
              }}
            />
          ))}
        </div>
      );
    }

    const baseClasses = 'bg-muted animate-pulse';
    const variantClasses = {
      default: 'rounded',
      text: 'rounded h-4',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
    };

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        style={{
          width: width || (variant === 'circular' ? height || 40 : '100%'),
          height: height || (variant === 'text' ? 16 : 40),
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Calendar-specific skeleton
export const CalendarSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={120} />
        <div className="flex space-x-2">
          <Skeleton variant="rectangular" width={32} height={32} />
          <Skeleton variant="rectangular" width={32} height={32} />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={`header-${index}`} variant="text" height={24} />
        ))}

        {/* Calendar days */}
        {Array.from({ length: 35 }).map((_, index) => (
          <Skeleton
            key={`day-${index}`}
            variant="rectangular"
            height={80}
            className="min-h-[80px]"
          />
        ))}
      </div>
    </div>
  );
};

// Appointment list skeleton
export const AppointmentListSkeleton = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center space-x-3 p-3 border rounded-lg"
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

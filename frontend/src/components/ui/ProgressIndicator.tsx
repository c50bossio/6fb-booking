'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Circle, AlertCircle, Clock } from 'lucide-react';

const progressVariants = cva(
  'w-full bg-secondary rounded-full overflow-hidden',
  {
    variants: {
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
      variant: {
        default: '',
        success: '',
        error: '',
        warning: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const progressBarVariants = cva(
  'h-full transition-all duration-500 ease-out',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        success: 'bg-green-600',
        error: 'bg-destructive',
        warning: 'bg-yellow-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  progress: number;
  showLabel?: boolean;
  animated?: boolean;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      size,
      variant,
      progress,
      showLabel = false,
      animated = true,
      ...props
    },
    ref
  ) => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={progressVariants({ size, variant, className })}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          {...props}
        >
          <div
            className={cn(
              progressBarVariants({ variant }),
              animated && 'transition-all duration-500 ease-out'
            )}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1 text-sm text-muted-foreground text-right">
            {Math.round(clampedProgress)}%
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

// Step status type
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error' | 'skipped';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  error?: string;
  duration?: number;
}

export interface StepProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep?: number;
  orientation?: 'horizontal' | 'vertical';
  showConnectors?: boolean;
  showDuration?: boolean;
  compact?: boolean;
}

const getStepIcon = (status: StepStatus, index: number, currentStep?: number) => {
  const isActive = currentStep !== undefined && index === currentStep;
  const size = 'h-5 w-5';

  switch (status) {
    case 'completed':
      return <CheckCircle2 className={cn(size, 'text-green-600')} />;
    case 'error':
      return <XCircle className={cn(size, 'text-destructive')} />;
    case 'in-progress':
      return (
        <div className={cn(size, 'rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center')}>
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      );
    case 'skipped':
      return <AlertCircle className={cn(size, 'text-muted-foreground')} />;
    default:
      return (
        <Circle
          className={cn(
            size,
            isActive
              ? 'text-primary fill-primary/20'
              : 'text-muted-foreground'
          )}
        />
      );
  }
};

const getStepTextColor = (status: StepStatus, index: number, currentStep?: number) => {
  const isActive = currentStep !== undefined && index === currentStep;

  switch (status) {
    case 'completed':
      return 'text-foreground';
    case 'error':
      return 'text-destructive';
    case 'in-progress':
      return 'text-primary font-medium';
    case 'skipped':
      return 'text-muted-foreground line-through';
    default:
      return isActive ? 'text-primary' : 'text-muted-foreground';
  }
};

export const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  (
    {
      className,
      steps,
      currentStep,
      orientation = 'vertical',
      showConnectors = true,
      showDuration = false,
      compact = false,
      ...props
    },
    ref
  ) => {
    const isHorizontal = orientation === 'horizontal';

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          isHorizontal ? 'flex items-center' : 'space-y-4',
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isActive = currentStep !== undefined && index === currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                'relative flex',
                isHorizontal ? 'flex-col items-center' : 'items-start space-x-3'
              )}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0">
                {getStepIcon(step.status, index, currentStep)}
              </div>

              {/* Step Content */}
              <div
                className={cn(
                  'flex-grow',
                  isHorizontal && 'text-center mt-2',
                  !isHorizontal && 'min-w-0'
                )}
              >
                <div
                  className={cn(
                    'font-medium',
                    compact ? 'text-sm' : 'text-base',
                    getStepTextColor(step.status, index, currentStep)
                  )}
                >
                  {step.title}
                </div>

                {!compact && step.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </div>
                )}

                {step.error && (
                  <div className="text-sm text-destructive mt-1">
                    {step.error}
                  </div>
                )}

                {showDuration && step.duration && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {step.duration}ms
                  </div>
                )}
              </div>

              {/* Connector */}
              {showConnectors && !isLast && (
                <div
                  className={cn(
                    'absolute',
                    isHorizontal
                      ? 'top-2.5 left-full w-full h-0.5 bg-border'
                      : 'left-2.5 top-5 w-0.5 h-full bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

StepProgress.displayName = 'StepProgress';

// Combined progress indicator for operations
export interface OperationProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  steps: Step[];
  currentStep?: number;
  progress?: number;
  showProgressBar?: boolean;
  showSteps?: boolean;
  variant?: 'default' | 'success' | 'error' | 'warning';
  compact?: boolean;
}

export const OperationProgress = React.forwardRef<
  HTMLDivElement,
  OperationProgressProps
>(
  (
    {
      className,
      title,
      steps,
      currentStep,
      progress,
      showProgressBar = true,
      showSteps = true,
      variant = 'default',
      compact = false,
      ...props
    },
    ref
  ) => {
    // Calculate progress from steps if not provided
    const calculatedProgress = progress !== undefined
      ? progress
      : steps.length > 0
      ? (steps.filter(step => step.status === 'completed').length / steps.length) * 100
      : 0;

    const hasError = steps.some(step => step.status === 'error');
    const isComplete = steps.every(step =>
      step.status === 'completed' || step.status === 'skipped'
    );

    const finalVariant = hasError ? 'error' : isComplete ? 'success' : variant;

    return (
      <div
        ref={ref}
        className={cn(
          'space-y-4 p-4 border rounded-lg',
          hasError && 'border-destructive/20 bg-destructive/5',
          isComplete && !hasError && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className={cn(
            'font-semibold',
            compact ? 'text-sm' : 'text-base',
            hasError ? 'text-destructive' : isComplete ? 'text-green-700 dark:text-green-300' : 'text-foreground'
          )}>
            {title}
          </h3>
          {showProgressBar && (
            <div className="text-sm text-muted-foreground">
              {Math.round(calculatedProgress)}%
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgressBar && (
          <ProgressBar
            progress={calculatedProgress}
            variant={finalVariant}
            size={compact ? 'sm' : 'md'}
          />
        )}

        {/* Steps */}
        {showSteps && (
          <StepProgress
            steps={steps}
            currentStep={currentStep}
            compact={compact}
            showDuration={!compact}
          />
        )}
      </div>
    );
  }
);

OperationProgress.displayName = 'OperationProgress';

// Calendar-specific progress indicators
export const CalendarSyncProgress = ({ isLoading, progress, message }: {
  isLoading: boolean;
  progress?: number;
  message?: string;
}) => {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <div className="flex-1">
        <div className="text-sm font-medium">Syncing Calendar</div>
        {message && (
          <div className="text-xs text-muted-foreground">{message}</div>
        )}
      </div>
      {progress !== undefined && (
        <div className="text-sm text-muted-foreground">{progress}%</div>
      )}
    </div>
  );
};

export const AppointmentActionProgress = ({
  action,
  isLoading,
  error
}: {
  action: 'creating' | 'updating' | 'deleting';
  isLoading: boolean;
  error?: string;
}) => {
  if (!isLoading && !error) return null;

  const actionLabels = {
    creating: 'Creating appointment',
    updating: 'Updating appointment',
    deleting: 'Deleting appointment',
  };

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded text-sm',
      error
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
    )}>
      {error ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span>{error || actionLabels[action]}...</span>
    </div>
  );
};

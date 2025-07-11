'use client';

import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  variant?: 'horizontal' | 'vertical';
  showDescriptions?: boolean;
  onStepClick?: (stepIndex: number) => void;
  announceChanges?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  className = '',
  variant = 'horizontal',
  showDescriptions = false,
  onStepClick,
  announceChanges = true
}) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<number>(currentStep);

  // Announce step changes to screen readers
  useEffect(() => {
    if (announceChanges && previousStepRef.current !== currentStep && liveRegionRef.current) {
      const step = steps[currentStep - 1];
      if (step) {
        const message = `Step ${currentStep} of ${steps.length}: ${step.title}`;
        liveRegionRef.current.textContent = message;
        
        // Clear announcement after delay
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = '';
          }
        }, 3000);
      }
    }
    previousStepRef.current = currentStep;
  }, [currentStep, steps, announceChanges]);

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'upcoming' => {
    if (stepIndex < currentStep - 1) return 'completed';
    if (stepIndex === currentStep - 1) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (stepIndex: number) => {
    if (onStepClick && stepIndex < currentStep) {
      onStepClick(stepIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, stepIndex: number) => {
    if ((e.key === 'Enter' || e.key === ' ') && onStepClick && stepIndex < currentStep) {
      e.preventDefault();
      onStepClick(stepIndex + 1);
    }
  };

  if (variant === 'horizontal') {
    return (
      <nav 
        aria-label="Progress" 
        className={`w-full ${className}`}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuetext={`Step ${currentStep} of ${steps.length}: ${steps[currentStep - 1]?.title}`}
      >
        {/* Live region for announcements */}
        <div
          ref={liveRegionRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        />

        <ol className="flex items-center w-full">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = onStepClick && index < currentStep - 1;
            
            return (
              <li 
                key={step.id}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div className="flex items-center">
                  {/* Step circle */}
                  <div
                    className={`
                      relative flex items-center justify-center w-8 h-8 rounded-full border-2
                      transition-all duration-200
                      ${status === 'completed' 
                        ? 'bg-primary-600 border-primary-600 text-white' 
                        : status === 'current'
                        ? 'bg-primary-50 border-primary-600 text-primary-600'
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                      }
                      ${isClickable 
                        ? 'cursor-pointer hover:bg-primary-700 hover:border-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' 
                        : ''
                      }
                    `}
                    onClick={() => handleStepClick(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    tabIndex={isClickable ? 0 : -1}
                    role={isClickable ? 'button' : undefined}
                    aria-label={
                      status === 'completed' 
                        ? `Completed step: ${step.title}` 
                        : status === 'current'
                        ? `Current step: ${step.title}`
                        : `Upcoming step: ${step.title}`
                    }
                    aria-describedby={showDescriptions ? `step-${index}-desc` : undefined}
                  >
                    {status === 'completed' ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <span className="text-sm font-medium" aria-hidden="true">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Step label */}
                  <div className="ml-3 min-w-0">
                    <p 
                      className={`
                        text-sm font-medium
                        ${status === 'current' 
                          ? 'text-primary-600' 
                          : status === 'completed'
                          ? 'text-gray-900'
                          : 'text-gray-500'
                        }
                      `}
                    >
                      {step.title}
                    </p>
                    
                    {showDescriptions && step.description && (
                      <p 
                        id={`step-${index}-desc`}
                        className="text-xs text-gray-500"
                      >
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`
                      flex-1 h-0.5 mx-4 transition-colors duration-200
                      ${index < currentStep - 1 
                        ? 'bg-primary-600' 
                        : 'bg-gray-300'
                      }
                    `}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Vertical variant
  return (
    <nav 
      aria-label="Progress" 
      className={`${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuetext={`Step ${currentStep} of ${steps.length}: ${steps[currentStep - 1]?.title}`}
    >
      {/* Live region for announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <ol className="space-y-6">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isClickable = onStepClick && index < currentStep - 1;
          
          return (
            <li key={step.id} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={`
                    absolute left-4 top-8 w-0.5 h-6 transition-colors duration-200
                    ${index < currentStep - 1 
                      ? 'bg-primary-600' 
                      : 'bg-gray-300'
                    }
                  `}
                  aria-hidden="true"
                />
              )}

              <div className="flex items-start">
                {/* Step circle */}
                <div
                  className={`
                    relative flex items-center justify-center w-8 h-8 rounded-full border-2
                    transition-all duration-200
                    ${status === 'completed' 
                      ? 'bg-primary-600 border-primary-600 text-white' 
                      : status === 'current'
                      ? 'bg-primary-50 border-primary-600 text-primary-600'
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                    }
                    ${isClickable 
                      ? 'cursor-pointer hover:bg-primary-700 hover:border-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500' 
                      : ''
                    }
                  `}
                  onClick={() => handleStepClick(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  tabIndex={isClickable ? 0 : -1}
                  role={isClickable ? 'button' : undefined}
                  aria-label={
                    status === 'completed' 
                      ? `Completed step: ${step.title}` 
                      : status === 'current'
                      ? `Current step: ${step.title}`
                      : `Upcoming step: ${step.title}`
                  }
                  aria-describedby={showDescriptions ? `step-${index}-desc` : undefined}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-medium" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step content */}
                <div className="ml-4 min-w-0 flex-1">
                  <p 
                    className={`
                      text-sm font-medium
                      ${status === 'current' 
                        ? 'text-primary-600' 
                        : status === 'completed'
                        ? 'text-gray-900'
                        : 'text-gray-500'
                      }
                    `}
                  >
                    {step.title}
                  </p>
                  
                  {showDescriptions && step.description && (
                    <p 
                      id={`step-${index}-desc`}
                      className="text-xs text-gray-500 mt-1"
                    >
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Simplified progress bar for compact spaces
export const ProgressBar: React.FC<{
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}> = ({ 
  current, 
  total, 
  label = 'Progress', 
  showPercentage = false,
  className = '' 
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500">
            {percentage}%
          </span>
        )}
      </div>
      
      <div 
        className="w-full bg-gray-200 rounded-full h-2"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`${current} of ${total} steps completed`}
      >
        <div 
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="sr-only" aria-live="polite">
        Step {current} of {total} completed
      </div>
    </div>
  );
};

// Booking-specific progress indicator
export const BookingProgressIndicator: React.FC<{
  currentStep: number;
  onStepClick?: (step: number) => void;
}> = ({ currentStep, onStepClick }) => {
  const bookingSteps: Step[] = [
    {
      id: 'service',
      title: 'Select Service',
      description: 'Choose your barbering service'
    },
    {
      id: 'date',
      title: 'Pick Date',
      description: 'Select your preferred date'
    },
    {
      id: 'time',
      title: 'Choose Time',
      description: 'Pick an available time slot'
    },
    {
      id: 'details',
      title: 'Your Details',
      description: 'Enter your information'
    },
    {
      id: 'confirm',
      title: 'Confirm',
      description: 'Review and confirm booking'
    }
  ];

  return (
    <ProgressIndicator
      steps={bookingSteps}
      currentStep={currentStep}
      showDescriptions={true}
      onStepClick={onStepClick}
      className="mb-8"
    />
  );
};
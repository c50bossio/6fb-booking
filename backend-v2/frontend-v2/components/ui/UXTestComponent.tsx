import React from 'react';
import { cn } from '@/lib/utils';

interface UXTestComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * UX Test Component for triggering UX Designer Agent
 * This component demonstrates accessibility features and mobile-responsive design
 * aligned with Six Figure Barber methodology principles
 */
export const UXTestComponent: React.FC<UXTestComponentProps> = ({ 
  className,
  children 
}) => {
  return (
    <div 
      className={cn(
        // Base styles for accessibility and mobile optimization
        "relative flex items-center justify-center",
        "min-h-[44px] min-w-[44px]", // Minimum touch target size
        "rounded-lg border border-gray-200",
        "bg-white hover:bg-gray-50 transition-colors duration-200",
        "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        "text-gray-900 font-medium",
        // Mobile responsiveness
        "sm:min-h-[48px] sm:min-w-[48px]",
        "md:px-4 md:py-2",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label="UX Test Component for Six Figure Barber methodology"
    >
      <span className="sr-only">UX Designer Agent Test Component</span>
      {children || "UX Test"}
    </div>
  );
};

export default UXTestComponent;
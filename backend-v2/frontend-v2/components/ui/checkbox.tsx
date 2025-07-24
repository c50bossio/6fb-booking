"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base styles with enhanced micro-interactions
      "peer h-4 w-4 shrink-0 rounded-sm border-2 border-gray-300 dark:border-gray-600", 
      "bg-white dark:bg-gray-800 shadow-sm",
      // Enhanced hover and focus states
      "hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
      // Active state with subtle scale
      "active:scale-95 transform-gpu will-change-transform",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked state with enhanced styling
      "data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 data-[state=checked]:text-white",
      "data-[state=checked]:shadow-md data-[state=checked]:hover:bg-primary-700 data-[state=checked]:hover:border-primary-700",
      "dark:data-[state=checked]:bg-primary-500 dark:data-[state=checked]:border-primary-500",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        "flex items-center justify-center text-current",
        // Enhanced animation for check mark
        "transition-all duration-200 ease-out transform-gpu",
        "data-[state=checked]:scale-100 data-[state=unchecked]:scale-75 data-[state=unchecked]:opacity-0"
      )}
    >
      <Check className="h-3 w-3 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
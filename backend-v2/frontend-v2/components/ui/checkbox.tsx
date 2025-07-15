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
      "peer h-4 w-4 shrink-0 rounded-sm border-2 border-black bg-white dark:border-gray-100 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500",
      "checkbox-forced-visible", // Add a class for targeting
      className
    )}
    style={{
      // Force inline styles for maximum priority - works in both light and dark mode
      border: "2px solid #e5e7eb", // gray-200 - visible in both themes
      width: "16px",
      height: "16px",
      display: "inline-block",
      visibility: "visible",
      opacity: 1,
      minWidth: "16px",
      minHeight: "16px"
    }}
    role="checkbox"
    aria-checked={props.checked}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
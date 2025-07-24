import * as React from "react"
import { cn } from "@/lib/utils"
import { keyboardHelpers } from "@/lib/accessibility"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "primary" | "secondary" | "elevated" | "outlined" | "hero"
    padding?: "none" | "sm" | "md" | "lg"
    animated?: boolean
    animationDelay?: number
    interactive?: boolean
    onClick?: () => void
    selected?: boolean
    ariaLabel?: string
    borderAccent?: boolean
  }
>(({ 
  className, 
  variant = "default", 
  padding = "md", 
  animated = false, 
  animationDelay = 0, 
  interactive = false,
  onClick,
  selected = false,
  ariaLabel,
  borderAccent = false,
  ...props 
}, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onClick) {
      keyboardHelpers.onEnterOrSpace(onClick)(event as any)
    }
    props.onKeyDown?.(event)
  }

  const Element = interactive ? 'button' : 'div'
  const interactiveProps = interactive ? {
    role: 'button',
    tabIndex: 0,
    'aria-label': ariaLabel,
    'aria-pressed': selected,
    onKeyDown: handleKeyDown,
    onClick,
  } : {}

  return (
    <Element
      ref={ref as any}
      className={cn(
        "rounded-lg border bg-card text-card-foreground transition-all duration-200",
        {
          // Default variant - clean, minimal
          "border-gray-200 bg-white shadow-sm hover:shadow-md": variant === "default",
          
          // Primary variant - for hero/important content (used sparingly)
          "border-primary-200 bg-primary-50 shadow-md hover:shadow-lg dark:bg-primary-900/10 dark:border-primary-800": variant === "primary",
          
          // Secondary variant - for supportive content
          "border-gray-200 bg-gray-50 shadow-sm hover:shadow-md dark:bg-gray-800/50 dark:border-gray-700": variant === "secondary",
          
          // Elevated variant - for focused/active states
          "border-gray-200 bg-white shadow-lg hover:shadow-xl dark:bg-gray-800 dark:border-gray-700": variant === "elevated",
          
          // Hero variant - maximum one per page
          "border-primary-300 bg-gradient-to-br from-primary-50 to-white shadow-lg hover:shadow-xl dark:from-primary-900/20 dark:to-gray-800": variant === "hero",
          
          // Outlined variant - minimal emphasis
          "border-2 border-gray-300 bg-transparent shadow-none hover:border-primary-300": variant === "outlined",
          
          // Border accent for left-side accent
          "border-l-4 border-l-primary-500": borderAccent,
          
          // Padding variants
          "p-0": padding === "none",
          "p-3": padding === "sm",
          "p-6": padding === "md", 
          "p-8": padding === "lg",
          
          // Subtle animation (following restraint principles)
          "animate-in fade-in-0 slide-in-from-bottom-2 duration-300": animated,
          
          // Interactive styles (tasteful, not flashy)
          "cursor-pointer": interactive,
          "hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500": interactive,
          "border-primary-500 bg-primary-50 dark:bg-primary-900/20": interactive && selected,
        },
        className
      )}
      style={{
        animationDelay: animated ? `${animationDelay}ms` : undefined,
        ...props.style
      }}
      {...interactiveProps}
      {...(interactive ? {} : props)}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
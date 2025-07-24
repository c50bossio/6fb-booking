import * as React from "react"
import { cn } from "@/lib/utils"
import { keyboardHelpers } from "@/lib/accessibility"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "elevated" | "outlined"
    padding?: "none" | "sm" | "md" | "lg"
    animated?: boolean
    animationDelay?: number
    interactive?: boolean
    onClick?: () => void
    selected?: boolean
    ariaLabel?: string
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
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        {
          "border-border bg-background": variant === "default",
          "border-border bg-background shadow-md": variant === "elevated", 
          "border-2 border-border bg-transparent": variant === "outlined",
          "p-0": padding === "none",
          "p-3": padding === "sm",
          "p-6": padding === "md", 
          "p-8": padding === "lg",
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-300": animated,
          // Interactive styles
          "cursor-pointer transition-all duration-200": interactive,
          "hover:border-primary-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500": interactive,
          "border-primary-500 bg-primary-50 dark:bg-primary-900/20": interactive && selected,
        },
        className
      )}
      style={{
        animationDelay: animated ? `${animationDelay}ms` : undefined,
        ...props.style
      }}
      {...interactiveProps}
      {...(interactive ? { children: props.children } : props)}
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
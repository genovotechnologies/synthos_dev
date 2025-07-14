import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 shadow-sm hover:shadow-md",
        outline:
          "border border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground active:scale-95 hover:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 shadow-sm hover:shadow-md",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground active:scale-95",
        link: 
          "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-primary to-blue-600 text-primary-foreground hover:from-primary/90 hover:to-blue-600/90 active:scale-95 shadow-lg hover:shadow-xl",
        success:
          "bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-sm hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 rounded-md px-3 text-xs min-w-[64px]",
        lg: "h-12 rounded-lg px-6 text-base min-w-[120px] sm:px-8",
        xl: "h-14 rounded-xl px-8 text-lg min-w-[140px] sm:px-12",
        icon: "h-10 w-10 min-w-[40px]",
        "icon-sm": "h-8 w-8 min-w-[32px]",
        "icon-lg": "h-12 w-12 min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false, 
    leftIcon, 
    rightIcon, 
    children, 
    disabled, 
    fullWidth = false,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const buttonClass = cn(
      buttonVariants({ variant, size, className }),
      fullWidth && "w-full",
      // Mobile-specific improvements
      "select-none tap-highlight-transparent",
      // Prevent text selection and improve touch response
      "-webkit-tap-highlight-color: transparent",
      // Ensure text doesn't wrap in buttons
      "text-center",
      // Better spacing for mobile
      size === "sm" && "gap-1.5",
      size === "default" && "gap-2",
      size === "lg" && "gap-2.5",
      size === "xl" && "gap-3"
    )
    
    // When asChild is true, just render the children as-is to avoid React.Children.only error
    if (asChild) {
      return (
        <Comp
          className={buttonClass}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    
    // Normal button rendering with all features
    return (
      <Comp
        className={buttonClass}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className="truncate min-w-0">
          {children}
        </span>
        {!loading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// Enhanced button group component for better mobile handling
const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
    size?: "sm" | "default" | "lg"
    variant?: "default" | "outline" | "ghost"
    fullWidth?: boolean
  }
>(({ className, orientation = "horizontal", size = "default", fullWidth = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        orientation === "horizontal" && "flex-wrap sm:flex-nowrap",
        fullWidth && "w-full",
        // Responsive gaps
        orientation === "horizontal" ? "gap-2 sm:gap-3" : "gap-2",
        // Ensure buttons don't overflow on mobile
        orientation === "horizontal" && "max-w-full overflow-hidden",
        className
      )}
      {...props}
    />
  )
})
ButtonGroup.displayName = "ButtonGroup"

// Enhanced responsive button wrapper
const ResponsiveButtonWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode
    stackOnMobile?: boolean
  }
>(({ className, children, stackOnMobile = true, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex gap-3",
        stackOnMobile ? "flex-col sm:flex-row" : "flex-row flex-wrap",
        "justify-center lg:justify-start",
        "w-full sm:w-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
ResponsiveButtonWrapper.displayName = "ResponsiveButtonWrapper"

export { Button, buttonVariants, ButtonGroup, ResponsiveButtonWrapper }

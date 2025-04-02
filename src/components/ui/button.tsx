import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "success";
  size?: "default" | "sm" | "md" | "lg" | "icon" | "action";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button";
    
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          {
            // Variants
            "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 focus-visible:ring-emerald-500":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500":
              variant === "destructive",
            "border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 focus-visible:ring-gray-400":
              variant === "outline",
            "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-400":
              variant === "secondary",
            "text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200": 
              variant === "ghost",
            "underline-offset-4 hover:underline text-emerald-600 hover:text-emerald-700 focus-visible:ring-emerald-500":
              variant === "link",
            "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500":
              variant === "success",
            
            // Sizes with consistent height and padding
            "h-10 px-4 py-0 text-sm": size === "default",
            "h-9 px-3 py-0 text-xs rounded-md": size === "sm",
            "h-10 px-5 py-0 text-sm": size === "md",
            "h-11 px-6 py-0 text-base font-medium rounded-md": size === "lg",
            "h-10 w-10 p-0 flex items-center justify-center": size === "icon",
            "h-11 px-5 py-0 text-sm font-medium": size === "action",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
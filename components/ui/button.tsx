import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "destructive" | "add";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          {
            "bg-primary text-primary-foreground hover:bg-primary-dark shadow-md shadow-primary/30":
              variant === "primary",
            "bg-transparent border border-border text-foreground hover:bg-muted":
              variant === "outline",
            "bg-transparent text-foreground hover:bg-muted": variant === "ghost",
            "bg-destructive text-white hover:bg-destructive/90":
              variant === "destructive",
            "bg-card text-primary border border-dashed border-primary hover:bg-accent disabled:bg-muted disabled:text-muted-foreground disabled:border-border":
              variant === "add",
          },
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

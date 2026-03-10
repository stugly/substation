import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

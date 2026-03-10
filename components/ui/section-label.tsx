import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionLabelProps {
  icon: LucideIcon;
  number?: number;
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({
  icon: Icon,
  number,
  children,
  className,
}: SectionLabelProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-primary font-semibold text-sm",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {number && <span>{number}.</span>}
      <span>{children}</span>
    </label>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicRowProps {
  index: number;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
  showRemove?: boolean;
}

export function DynamicRow({
  index,
  onRemove,
  children,
  className,
  showRemove = true,
}: DynamicRowProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-2", className)}>
      <div className="flex-shrink-0 w-8 text-sm font-semibold text-foreground">
        {index}.
      </div>
      <div className="flex-1 flex items-center gap-2">{children}</div>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

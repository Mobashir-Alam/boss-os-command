import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  size?: "xs" | "sm";
}

// Compact "?" icon that pops a definition / explanation on hover.
// Reused across the analytics tabs (Pulse / Audience / Retention) so every
// non-obvious metric has a self-contained explanation an analyst can read.
export default function InfoTooltip({
  title, children, className, side = "top", size = "sm",
}: Props) {
  const iconCls = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={title ? `What is ${title}?` : "More information"}
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors shrink-0",
            className,
          )}
        >
          <HelpCircle className={iconCls} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-popover-foreground/90">{children}</div>
      </TooltipContent>
    </Tooltip>
  );
}

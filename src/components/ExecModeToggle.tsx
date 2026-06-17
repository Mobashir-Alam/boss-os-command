import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useExecTheme } from "@/contexts/ExecThemeContext";

/** Routes where the executive re-skin applies (the three connector dashboards). */
const EXEC_ROUTES = ["/team/github", "/team/slack", "/team/social-media"];

/**
 * Navbar toggle that flips Executive ("CEO") mode on the connector dashboards.
 * Only shown on those routes so it never appears where it would do nothing.
 */
export default function ExecModeToggle() {
  const { exec, toggle } = useExecTheme();
  const { pathname } = useLocation();

  if (!EXEC_ROUTES.includes(pathname)) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          aria-pressed={exec}
          className={cn(
            "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all",
            exec
              ? "exec-pulse border-transparent text-black [background-image:linear-gradient(135deg,hsl(0_84%_55%),hsl(45_95%_55%))]"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          <Sparkles className={cn("h-3.5 w-3.5 transition-transform group-hover:rotate-12", exec && "fill-current")} />
          <span className="hidden sm:inline">{exec ? "Executive" : "CEO View"}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[200px]">
        {exec ? "Switch back to the classic editorial UI" : "Switch to the bold Executive UI"}
      </TooltipContent>
    </Tooltip>
  );
}

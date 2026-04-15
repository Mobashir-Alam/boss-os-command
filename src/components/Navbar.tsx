import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NavTabs from "./NavTabs";

const SCORE = 78;
const scoreColor = SCORE >= 80 ? "hsl(142 71% 45%)" : SCORE >= 50 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left — Logo + Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background text-xs font-bold">F</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Founder OS</span>
          </div>
          <div className="hidden sm:block">
            <NavTabs />
          </div>
        </div>

        {/* Center — Focus Score */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden md:flex items-center gap-3 cursor-default">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Focus Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight" style={{ color: scoreColor }}>{SCORE}</span>
                  <span className="text-sm text-muted-foreground font-medium">/100</span>
                </div>
              </div>
              <div className="h-6 w-1.5 rounded-full" style={{ backgroundColor: scoreColor, opacity: 0.7 }} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[220px]">
            Based on risk, growth, and urgency across all startups
          </TooltipContent>
        </Tooltip>

        {/* Right — Actions */}
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 transition-all duration-150 hover:bg-muted active:scale-95">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
              3
            </span>
          </button>
          <Avatar className="h-8 w-8 cursor-pointer transition-transform duration-150 hover:scale-105">
            <AvatarFallback className="bg-muted text-xs font-semibold">AK</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

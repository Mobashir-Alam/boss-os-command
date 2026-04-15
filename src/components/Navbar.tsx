import { Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left — Logo */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background text-xs font-bold">F</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Founder OS</span>
        </div>

        {/* Center — Focus Score */}
        <div className="hidden sm:flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Focus Score</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">78</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 transition-colors hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          </button>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-muted text-xs font-semibold">AK</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

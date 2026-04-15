import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import NavTabs from "./NavTabs";
import NotificationDropdown from "./NotificationDropdown";
import InviteModal from "./InviteModal";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, User } from "lucide-react";

const SCORE = 78;
const scoreColor = SCORE >= 80 ? "hsl(142 71% 45%)" : SCORE >= 50 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

const roleLabels: Record<string, string> = {
  founder: "Founder",
  mfo: "MFO",
  functional_head: "Functional Head",
  project_manager: "Project Manager",
  team_member: "Team Member",
};

const Navbar = () => {
  const { profile, signOut } = useAuth();
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
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

        <div className="flex items-center gap-3">
          <InviteModal />
          <NotificationDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors">
                <Avatar className="h-8 w-8">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-medium leading-none">{profile?.full_name || profile?.email || "User"}</span>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0 h-4">
                    {roleLabels[profile?.role || "mfo"]}
                  </Badge>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2">
                <User className="h-3.5 w-3.5" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Settings className="h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

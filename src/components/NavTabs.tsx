import { useLocation } from "react-router-dom";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const roleNavItems: Record<string, { label: string; path: string }[]> = {
  founder: [
    { label: "Dashboard", path: "/" },
    { label: "Focus", path: "/focus" },
    { label: "Decisions", path: "/decisions" },
  ],
  mfo: [
    { label: "Control Panel", path: "/mfo" },
    { label: "Dashboard", path: "/" },
    { label: "Focus", path: "/focus" },
  ],
  functional_head: [
    { label: "Domain Dashboard", path: "/my-domain" },
    { label: "Tasks", path: "/decisions" },
  ],
  project_manager: [
    { label: "Project Board", path: "/project-board" },
  ],
  team_member: [
    { label: "My Work", path: "/my-work" },
  ],
  cfo: [
    { label: "Financial Command", path: "/cfo" },
  ],
};

const NavTabs = () => {
  const location = useLocation();
  const { role } = useAuth();

  const navItems = roleNavItems[role || "founder"] || roleNavItems.founder;

  // Don't render pill container for single-tab roles
  if (navItems.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/50 p-0.5 bg-muted/30">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <RouterNavLink
            key={item.path}
            to={item.path}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </RouterNavLink>
        );
      })}
    </div>
  );
};

export default NavTabs;

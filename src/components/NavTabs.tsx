import { useLocation } from "react-router-dom";
import { NavLink as RouterNavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NavTabs = () => {
  const location = useLocation();
  const { isPm, isTeamMember, role } = useAuth();
  const isFunctionalHead = role === "functional_head";

  const navItems = isPm
    ? [{ label: "Execution Board", path: "/pm" }]
    : isTeamMember
    ? [{ label: "My Work", path: "/my-tasks" }]
    : isFunctionalHead
    ? [
        { label: "My Domain", path: "/my-domain" },
        { label: "Decisions", path: "/decisions" },
        { label: "Dashboard", path: "/" },
      ]
    : role === "mfo"
    ? [
        { label: "Control Panel", path: "/mfo" },
        { label: "Dashboard", path: "/" },
        { label: "Focus", path: "/focus" },
      ]
    : [
        { label: "Dashboard", path: "/" },
        { label: "Focus", path: "/focus" },
        { label: "Decisions", path: "/decisions" },
      ];

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

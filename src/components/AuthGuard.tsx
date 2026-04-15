import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const roleDefaultRoutes: Record<string, string> = {
  founder: "/",
  mfo: "/mfo",
  functional_head: "/my-domain",
  project_manager: "/pm",
  team_member: "/my-tasks",
};

// Routes each role is allowed to access
const roleAllowedRoutes: Record<string, string[]> = {
  founder: ["/", "/focus", "/decisions", "/mfo", "/my-domain", "/pm", "/my-tasks"],
  mfo: ["/mfo", "/", "/focus"],
  functional_head: ["/my-domain", "/decisions", "/"],
  project_manager: ["/pm"],
  team_member: ["/my-tasks"],
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  // Wait for both auth AND profile to resolve
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Redirect to onboarding if not completed
  const onboardingDone = localStorage.getItem("onboarding_complete");
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;

  // Role-based route protection — applies to ALL roles including founder
  const role = profile?.role;
  if (role) {
    const currentPath = location.pathname;
    const isStartupRoute = currentPath.startsWith("/startup/");
    const allowed = roleAllowedRoutes[role] || [];

    if (!isStartupRoute && !allowed.includes(currentPath)) {
      const defaultRoute = roleDefaultRoutes[role] || "/";
      return <Navigate to={defaultRoute} replace />;
    }
  }

  return <>{children}</>;
};

export default AuthGuard;

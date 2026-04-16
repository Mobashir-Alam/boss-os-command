import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const roleDefaultRoutes: Record<string, string> = {
  founder: "/",
  mfo: "/mfo",
  functional_head: "/my-domain",
  project_manager: "/project-board",
  team_member: "/my-work",
  cfo: "/cfo",
};

const roleAllowedRoutes: Record<string, string[]> = {
  founder: ["/", "/focus", "/decisions"],
  mfo: ["/mfo", "/", "/focus"],
  functional_head: ["/my-domain", "/decisions"],
  project_manager: ["/pm", "/project-board"],
  team_member: ["/my-work"],
  cfo: ["/cfo"],
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const onboardingDone = localStorage.getItem("onboarding_complete");
  if (!onboardingDone) return <Navigate to="/onboarding" replace />;

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

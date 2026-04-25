import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

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

  // Send team members to their dashboard instead of the CEO panel
  if (profile?.role === "team_member" && location.pathname === "/") {
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;

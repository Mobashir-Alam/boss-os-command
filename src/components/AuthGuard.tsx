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

  // A user is "onboarded" if their profile has a role in the DB.
  // localStorage is a per-browser fallback for the very first sign-up flow.
  const dbOnboarded = !!profile?.role;
  const localOnboarded = !!localStorage.getItem("onboarding_complete");
  if (!dbOnboarded && !localOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  // The CEO panel ("/") is for founders only. Everyone else lands on /employee.
  if (profile?.role && profile.role !== "founder" && location.pathname === "/") {
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;

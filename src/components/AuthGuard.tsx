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

  // 2FA gate: if mfa_required is on for this profile and they haven't
  // verified in this browser session, route them to /verify.
  const mfaVerifiedThisSession = sessionStorage.getItem("mfa_verified") === "true";
  if (
    (profile as any)?.mfa_required &&
    !mfaVerifiedThisSession &&
    location.pathname !== "/verify"
  ) {
    return <Navigate to="/verify" state={{ from: location }} replace />;
  }

  // Tech functional heads (department leads) get the Tech Team dashboard as
  // their home — not the generic /my-domain or /employee view.
  const isTechLead = profile?.role === "functional_head" && profile?.department === "tech";
  if (isTechLead && (location.pathname === "/" || location.pathname === "/my-domain")) {
    return <Navigate to="/team/tech" replace />;
  }

  // The CEO panel ("/") is for founders only. Everyone else lands on /employee.
  if (profile?.role && profile.role !== "founder" && location.pathname === "/") {
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;

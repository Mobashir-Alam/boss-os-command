import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Restricts a route to:
//   - founder
//   - functional_head with department='social_media'
//   - any team_member with department='social_media' (view-only inside the page)
//
// The page itself further gates writes (Add Channel, Sync Now, etc.) to
// founder + functional_head only.
const SocialMediaGuard = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFounder = profile.role === "founder";
  const isSMHead = profile.role === "functional_head" && profile.department === "social_media";
  const isSMMember = profile.role === "team_member" && profile.department === "social_media";

  if (!isFounder && !isSMHead && !isSMMember) {
    const fallback = profile.role === "team_member" ? "/employee" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default SocialMediaGuard;

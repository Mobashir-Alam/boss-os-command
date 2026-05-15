import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Restricts a route to: founder OR (functional_head AND department='hr').
const HRGuard = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFounder = profile.role === "founder";
  const isHRHead = profile.role === "functional_head" && profile.department === "hr";
  if (!isFounder && !isHRHead) {
    const fallback = profile.role === "team_member" ? "/employee" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default HRGuard;

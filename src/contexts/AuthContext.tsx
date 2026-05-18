import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "founder" | "mfo" | "functional_head" | "project_manager" | "team_member";

type Department =
  | "social_media"
  | "video_production_editing"
  | "content_management"
  | "studio"
  | "tech"
  | "creators_brands_outreach"
  | "hr"
  | "graphic_designing"
  | "office_management"
  | "finance"
  | null;

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  department: Department;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  department: Department;
  loading: boolean;
  isFounder: boolean;
  isMfo: boolean;
  isPm: boolean;
  isTeamMember: boolean;
  isFunctionalHead: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If the refresh ever fails Supabase fires SIGNED_OUT with null session.
        // Clean up our session-scoped flags too.
        if (event === "SIGNED_OUT" || !session) {
          sessionStorage.removeItem("mfa_verified");
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        // If getSession errors (e.g. dead refresh token in localStorage),
        // wipe everything and force the user back to login instead of
        // running with a half-broken session.
        if (error) {
          console.warn("getSession failed — clearing local auth:", error.message);
          void supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        }
        setLoading(false);
      })
      .catch((e) => {
        console.warn("getSession threw — clearing local auth:", e?.message ?? e);
        void supabase.auth.signOut().catch(() => {});
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear the per-session 2FA flag so the next person to sign in on this
    // browser is forced to verify again.
    sessionStorage.removeItem("mfa_verified");
    await supabase.auth.signOut();
    setProfile(null);
  };

  const role = profile?.role ?? null;
  const department = profile?.department as Department ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        department,
        loading,
        isFounder: role === "founder",
        isMfo: role === "mfo",
        isPm: role === "project_manager",
        isTeamMember: role === "team_member",
        isFunctionalHead: role === "functional_head",
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

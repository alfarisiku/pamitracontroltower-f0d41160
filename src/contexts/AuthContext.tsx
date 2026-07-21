import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "management" | "team" | "client";

interface UserProfile {
  display_name: string;
  avatar_url: string | null;
  assigned_project_id: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  loading: boolean;
  assignedProjectIds: string[];
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManagement: boolean;
  isTeam: boolean;
  isClient: boolean;
  isPending: boolean;
  hasNoProject: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// System accounts that cannot be modified
export const SYSTEM_EMAILS = ["admin@pamitra.co.id", "director@pamitra.co.id"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    const [profileRes, roleRes, assignmentsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, assigned_project_id, status").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
      supabase.from("user_project_assignments").select("project_id").eq("user_id", userId),
    ]);
    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    if (roleRes.data) setRole((roleRes.data as any).role as AppRole);
    else setRole(null);
    
    // Set assigned project IDs from junction table
    if (assignmentsRes.data && assignmentsRes.data.length > 0) {
      setAssignedProjectIds(assignmentsRes.data.map((a: any) => a.project_id));
    } else if (profileRes.data?.assigned_project_id) {
      // Fallback to legacy single assignment
      setAssignedProjectIds([profileRes.data.assigned_project_id]);
    } else {
      setAssignedProjectIds([]);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRole(user.id);
  };

  useEffect(() => {
    // "Remember Me" enforcement: if user chose not to remember, sign out when a new browser session starts.
    const noRemember = localStorage.getItem("auth_no_remember") === "1";
    const sessionActive = sessionStorage.getItem("auth_session_active") === "1";
    if (noRemember && !sessionActive) {
      supabase.auth.signOut();
      localStorage.removeItem("auth_no_remember");
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfileAndRole(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setAssignedProjectIds([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfileAndRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      sessionStorage.setItem("auth_session_active", "1");
      if (rememberMe) {
        localStorage.removeItem("auth_no_remember");
      } else {
        localStorage.setItem("auth_no_remember", "1");
      }
    }
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", data.user.id);
      await fetchProfileAndRole(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setAssignedProjectIds([]);
  };

  const isPending = !!user && (!profile || profile.status !== "active");
  const isTeamRole = role === "team";
  const hasNoProject = !!user && !isPending && isTeamRole && assignedProjectIds.length === 0;

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, assignedProjectIds, signIn, signUp, signOut, refreshProfile,
      isAdmin: role === "admin",
      isManagement: role === "management",
      isTeam: isTeamRole,
      isClient: role === "client",
      isPending,
      hasNoProject,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

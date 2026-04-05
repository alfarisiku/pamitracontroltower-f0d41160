import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "management" | "team" | "client";

interface UserProfile {
  display_name: string;
  avatar_url: string | null;
  assigned_project_id: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, role: AppRole, assignedProjectId?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManagement: boolean;
  isTeam: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, assigned_project_id").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
    ]);
    if (profileRes.data) setProfile(profileRes.data as UserProfile);
    if (roleRes.data) setRole((roleRes.data as any).role as AppRole);
    else setRole(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        setTimeout(() => fetchProfileAndRole(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string, role: AppRole, assignedProjectId?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Update profile display name
      await supabase.from("profiles").update({ display_name: displayName, assigned_project_id: assignedProjectId || null }).eq("user_id", data.user.id);
      // Assign role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role });
      await fetchProfileAndRole(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading, signIn, signUp, signOut,
      isAdmin: role === "admin",
      isManagement: role === "management",
      isTeam: role === "team",
      isClient: role === "client",
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

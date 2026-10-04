import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name" | "grade" | "role"
>;
export type PlatformRole = Database["public"]["Enums"]["app_role"]; // admin | moderator
export type AppRole = "admin" | "moderator" | "mentor" | "student";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** admin/moderator grants from user_roles */
  platformRoles: PlatformRole[];
  /** highest effective role: admin > moderator > mentor > student */
  role: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isMentor: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The Supabase client is loaded on demand so public pages (e.g. the landing
// page) do not pay for it in their initial bundle.
const loadClient = () => import("@/integrations/supabase/client").then((m) => m.supabase);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [platformRoles, setPlatformRoles] = useState<PlatformRole[]>([]);
  const [rolesLoadedFor, setRolesLoadedFor] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    loadClient()
      .then((supabase) => {
        if (cancelled) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          // Only synchronous state updates here; Supabase recommends not
          // awaiting other supabase calls inside this callback.
          setSession(nextSession);
          setSessionLoaded(true);
        });
        unsubscribe = () => subscription.unsubscribe();

        return supabase.auth.getSession().then(({ data }) => {
          if (cancelled) return;
          setSession(data.session);
          setSessionLoaded(true);
        });
      })
      .catch((error) => {
        console.error("Failed to initialise authentication", error);
        if (!cancelled) setSessionLoaded(true);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const loadIdentity = useCallback(async (id: string) => {
    const supabase = await loadClient();
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, grade, role").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
    ]);

    if (profileResult.error) console.error("Failed to load profile", profileResult.error);
    if (rolesResult.error) console.error("Failed to load roles", rolesResult.error);

    setProfile(profileResult.data ?? null);
    setPlatformRoles((rolesResult.data ?? []).map((r) => r.role));
    setRolesLoadedFor(id);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setPlatformRoles([]);
      setRolesLoadedFor(null);
      return;
    }
    loadIdentity(userId);
  }, [userId, loadIdentity]);

  const refresh = useCallback(async () => {
    if (userId) await loadIdentity(userId);
  }, [userId, loadIdentity]);

  const signOut = useCallback(async () => {
    const supabase = await loadClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = platformRoles.includes("admin");
    const isModerator = platformRoles.includes("moderator");
    const isMentor = profile?.role === "mentor";
    const role: AppRole | null = !userId
      ? null
      : isAdmin
        ? "admin"
        : isModerator
          ? "moderator"
          : isMentor
            ? "mentor"
            : "student";

    return {
      user: session?.user ?? null,
      session,
      profile,
      platformRoles,
      role,
      loading: !sessionLoaded || (userId !== null && rolesLoadedFor !== userId),
      isAuthenticated: !!userId,
      isAdmin,
      isModerator,
      isMentor,
      refresh,
      signOut,
    };
  }, [session, sessionLoaded, profile, platformRoles, rolesLoadedFor, userId, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}

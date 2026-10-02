import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthState = {
  user: User | null;
  roles: Role[];
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  hasRole: (r: Role) => boolean;
};

const AuthCtx = createContext<AuthState>({
  user: null, roles: [], profile: null, loading: true, refresh: async () => {}, hasRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User | null) => {
    if (!u) { setRoles([]); setProfile(null); setLoading(false); return; }
    await supabase.rpc("ensure_profile", { _full_name: (u.user_metadata?.['full_name'] as string) ?? undefined });
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
    ]);
    setRoles((r ?? []).map((x) => x.role));
    setProfile(p ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      const u = session?.user ?? null;
      setUser(u);
      setTimeout(() => load(u), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      load(data.session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(() => load(user), [load, user]);
  return (
    <AuthCtx.Provider value={{ user, roles, profile, loading, refresh, hasRole: (r) => roles.includes(r) }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function homeFor(roles: Role[]) {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("doctor")) return "/doctor";
  if (roles.includes("staff")) return "/staff";
  return "/patient";
}

export const todayUTC = () => new Date().toISOString().slice(0, 10);

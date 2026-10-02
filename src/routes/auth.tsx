import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangToggle } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Shifa Queue" },
      { name: "description", content: "Sign in or create a patient account to book hospital appointments." },
      { property: "og:title", content: "Sign in — Shifa Queue" },
      { property: "og:description", content: "Sign in or create a patient account to book hospital appointments." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && roles.length) navigate({ to: homeFor(roles), replace: true });
  }, [user, roles, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) toast.success(t("checkEmail"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary"><Activity className="h-5 w-5" />{t("appName")}</Link>
        <div className="ms-auto"><LangToggle /></div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-7 shadow-sm">
          <h1 className="text-2xl font-bold">{mode === "in" ? t("signIn") : t("signUp")}</h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "up" && (
              <div className="space-y-1.5"><Label>{t("fullName")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
            )}
            <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" disabled={busy}>{mode === "in" ? t("signIn") : t("signUp")}</Button>
          </form>
          <Button variant="outline" className="mt-3 w-full" onClick={google}>{t("continueGoogle")}</Button>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "in" ? t("noAccount") : t("haveAccount")}{" "}
            <button className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? t("signUp") : t("signIn")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Languages, LogOut, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homeFor, type Role } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NAV: Record<Role, { to: LinkProps["to"] & string; k: string }[]> = {
  patient: [
    { to: "/patient", k: "myQueue" }, { to: "/patient/book", k: "book" },
    { to: "/patient/history", k: "history" }, { to: "/patient/profile", k: "profile" },
  ],
  staff: [{ to: "/staff", k: "reception" }],
  doctor: [{ to: "/doctor", k: "doctorQueue" }, { to: "/doctor/emergency", k: "emergency" }],
  admin: [
    { to: "/admin", k: "overview" }, { to: "/admin/people", k: "people" }, { to: "/admin/departments", k: "departments" },
    { to: "/admin/settings", k: "queueRules" }, { to: "/admin/audit", k: "audit" },
  ],
};

type Notif = { id: string; title_en: string; title_ur: string; body_en: string; body_ur: string; read: boolean; created_at: string };

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ur" : "en")} aria-label="Language">
      <Languages className="h-4 w-4" /> {lang === "en" ? "اردو" : "English"}
    </Button>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const [items, setItems] = useState<Notif[]>([]);
  useEffect(() => {
    if (!user) return;
    const load = () => supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setItems((data as Notif[]) ?? []));
    load();
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (p) => {
        const n = p.new as Notif;
        toast(lang === "ur" ? n.title_ur : n.title_en, { description: lang === "ur" ? n.body_ur : n.body_en });
        if ("vibrate" in navigator) navigator.vibrate?.(300);
        load();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, lang]);
  const unread = items.filter((i) => !i.read).length;
  const markRead = async () => {
    if (!unread) return;
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setItems((x) => x.map((i) => ({ ...i, read: true })));
  };
  return (
    <Popover onOpenChange={(o) => o && markRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications")}>
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute -top-0.5 -end-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2 text-sm font-semibold">{t("notifications")}</div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("noNotifications")}</p>}
          {items.map((n) => (
            <div key={n.id} className="border-b px-4 py-3 last:border-0">
              <p className="text-sm font-medium">{lang === "ur" ? n.title_ur : n.title_en}</p>
              <p className="text-xs text-muted-foreground">{lang === "ur" ? n.body_ur : n.body_en}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { roles, profile, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const allowed = roles.includes(role);
  const switchable = (["admin", "doctor", "staff", "patient"] as Role[]).filter((r) => roles.includes(r) && r !== role);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <Activity className="h-5 w-5" /> {t("appName")}
          </Link>
          <nav className="ms-4 hidden gap-1 md:flex">
            {NAV[role].map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}>
                {t(n.k)}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1">
            {switchable.map((r) => (
              <Link key={r} to={homeFor([r])} className="hidden rounded-md border px-2 py-1 text-xs capitalize text-muted-foreground hover:bg-muted sm:block">{r}</Link>
            ))}
            <LangToggle />
            <NotificationBell />
            <span className="hidden text-sm text-muted-foreground lg:inline">{profile?.full_name}</span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("signOut")}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {NAV[role].map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-muted-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground font-semibold" }}>{t(n.k)}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? <p className="text-muted-foreground">…</p> : allowed ? children : (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{t("notAllowed")}</div>
        )}
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const cls: Record<string, string> = {
    booked: "bg-muted text-muted-foreground",
    checked_in: "bg-secondary text-secondary-foreground",
    in_consultation: "bg-accent text-accent-foreground",
    completed: "bg-success/15 text-success",
    no_show: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground line-through",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls[status] ?? ""}`}>{t(`st_${status}`)}</span>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-foreground">{children}</h1>
      {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
    </div>
  );
}

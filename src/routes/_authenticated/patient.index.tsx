import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageTitle, StatusBadge } from "@/components/AppShell";
import { useAuth, todayUTC } from "@/lib/auth";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/patient/")({ component: PatientHome });

type Appt = { id: string; token_number: number; appt_date: string; status: string; doctor_id: string; doctors: { full_name: string; specialty: string | null } | null };
type Pos = { ahead: number; info: { current_token: number | null; last_called: number | null; waiting: number; total: number; slot_minutes: number } };

function PatientHome() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [appts, setAppts] = useState<Appt[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("appointments").select("id,token_number,appt_date,status,doctor_id,doctors(full_name,specialty)")
      .gte("appt_date", todayUTC()).in("status", ["booked", "checked_in", "in_consultation"]).order("appt_date").order("token_number");
    setAppts((data as Appt[]) ?? []);
  }, []);
  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`pappt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  return (
    <div>
      <PageTitle sub={profile?.full_name}>{t("myQueue")}</PageTitle>
      {!profile?.photo_locked_at && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-warning bg-warning/15 p-4">
          <p className="text-sm font-medium">{t("photoNeeded")}</p>
          <Button size="sm" asChild><Link to="/patient/profile">{t("addPhoto")}</Link></Button>
        </div>
      )}
      {appts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">{t("noActive")}</p>
          <Button className="mt-4" asChild><Link to="/patient/book">{t("bookNow")}</Link></Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">{appts.map((a) => <TrackerCard key={a.id} a={a} onChange={load} />)}</div>
      )}
    </div>
  );
}

function TrackerCard({ a, onChange }: { a: Appt; onChange: () => void }) {
  const { t } = useI18n();
  const [pos, setPos] = useState<Pos | null>(null);
  useEffect(() => {
    const f = () => supabase.rpc("my_queue_position", { _appointment_id: a.id }).then(({ data }) => setPos(data as unknown as Pos));
    f();
    const i = setInterval(f, 10000);
    return () => clearInterval(i);
  }, [a.id, a.status]);
  const cancel = async () => {
    const { error } = await supabase.rpc("cancel_appointment", { _id: a.id });
    if (error) toast.error(errText(error, t)); else onChange();
  };
  const current = pos?.info.current_token ?? pos?.info.last_called ?? 0;
  const pct = a.token_number ? Math.min(100, Math.round((current / a.token_number) * 100)) : 0;
  const myTurn = a.status === "in_consultation";
  const wait = (pos?.ahead ?? 0) * (pos?.info.slot_minutes ?? 10);
  return (
    <div className={`rounded-3xl border bg-card p-6 shadow-sm ${myTurn ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{a.doctors?.full_name}</p>
          <p className="text-sm text-muted-foreground">{a.doctors?.specialty} · {a.appt_date}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      {myTurn && <p className="mt-4 rounded-lg bg-accent/20 p-3 text-center font-semibold">{t("yourTurn")}</p>}
      <div className="mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("nowServing")}</p>
          <p className="token-num text-5xl font-bold text-primary">{current ? `#${current}` : "—"}</p>
        </div>
        <div className="text-end">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("yourToken")}</p>
          <p className="token-num text-5xl font-bold text-accent">#{a.token_number}</p>
        </div>
      </div>
      <Progress value={pct} className="my-5 h-3" />
      <div className="flex justify-between text-sm">
        <span><b>{pos?.ahead ?? "…"}</b> {t("ahead")}</span>
        <span>{t("estWait")}: <b>~{wait} {t("minutes")}</b></span>
      </div>
      {a.status === "booked" && <Button variant="ghost" size="sm" className="mt-3 text-destructive" onClick={cancel}>{t("cancel")}</Button>}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { todayUTC } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Overview });

type A = { id: string; doctor_id: string; appt_date: string; status: string; is_walkin: boolean; created_at: string; checked_in_at: string | null; called_at: string | null };
type Doc = { user_id: string; full_name: string; specialty: string | null };

function Overview() {
  const { t } = useI18n();
  const [rows, setRows] = useState<A[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data } = await supabase.from("appointments").select("id,doctor_id,appt_date,status,is_walkin,created_at,checked_in_at,called_at").gte("appt_date", since).limit(5000);
    setRows(data ?? []);
  }, []);
  useEffect(() => {
    load();
    supabase.from("doctors").select("user_id,full_name,specialty").then(({ data }) => setDocs(data ?? []));
    const ch = supabase.channel("admin-live").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const s = useMemo(() => {
    const today = rows.filter((r) => r.appt_date === todayUTC());
    const past = rows.filter((r) => r.appt_date < todayUTC() || ["completed", "no_show"].includes(r.status));
    const closed = past.filter((r) => ["completed", "no_show"].includes(r.status));
    const noShows = closed.filter((r) => r.status === "no_show").length;
    const waits = rows.filter((r) => r.checked_in_at && r.called_at).map((r) => (new Date(r.called_at!).getTime() - new Date(r.checked_in_at!).getTime()) / 60000);
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, patients: 0 }));
    rows.forEach((r) => { const ts = r.checked_in_at ?? r.created_at; const slot = hours[(new Date(ts).getUTCHours() + 5) % 24]; if (slot) slot.patients++; });
    return {
      today,
      served: rows.filter((r) => r.status === "completed").length,
      noShowRate: closed.length ? Math.round((noShows / closed.length) * 100) : 0,
      avgWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
      hours: hours.filter((h, i) => i >= 7 && i <= 22),
      load: docs.map((d) => ({ name: d.full_name, patients: rows.filter((r) => r.doctor_id === d.user_id && r.status === "completed").length })),
    };
  }, [rows, docs]);

  const stat = (label: string, value: string | number) => (
    <div className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="token-num mt-1 text-4xl font-bold">{value}</p></div>
  );

  return (
    <div className="space-y-6">
      <PageTitle sub="Live queues today and the last 30 days of operations">{t("overview")}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Patients today", s.today.filter((r) => r.status !== "cancelled").length)}
        {stat("Served (30d)", s.served)}
        {stat("Avg wait (min)", s.avgWait)}
        {stat("No-show rate", `${s.noShowRate}%`)}
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Live queues</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => {
            const mine = s.today.filter((r) => r.doctor_id === d.user_id);
            const cur = mine.find((r) => r.status === "in_consultation");
            return (
              <div key={d.user_id} className="rounded-xl border bg-card p-4">
                <p className="font-semibold">{d.full_name}</p><p className="text-xs text-muted-foreground">{d.specialty}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span>{cur ? "In consultation" : "Idle"}</span>
                  <span><b>{mine.filter((r) => r.status === "checked_in").length}</b> waiting · {mine.filter((r) => r.status === "completed").length} done</span>
                </div>
              </div>
            );
          })}
          {docs.length === 0 && <p className="text-muted-foreground">No doctors yet — add them under People.</p>}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Peak hours (Pakistan time)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.hours}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="hour" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="patients" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Doctor load (completed, 30d)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.load}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="patients" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

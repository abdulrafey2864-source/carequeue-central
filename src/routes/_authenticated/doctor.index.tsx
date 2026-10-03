import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTitle, StatusBadge } from "@/components/AppShell";
import { useAuth, todayUTC } from "@/lib/auth";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/doctor/")({ component: DoctorQueue });

type Row = { id: string; token_number: number; status: string; is_walkin: boolean; walkin_name: string | null; profiles: { full_name: string } | null };

function DoctorQueue() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("appointments").select("id,token_number,status,is_walkin,walkin_name,profiles(full_name)")
      .eq("doctor_id", user.id).eq("appt_date", todayUTC()).order("token_number");
    setRows((data as unknown as Row[]) ?? []);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`doc-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const callNext = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("call_next_patient");
    setBusy(false);
    if (error) { toast.error(errText(error, t)); return; }
    navigate({ to: "/doctor/visit/$id", params: { id: data as string } });
  };

  const current = rows.find((r) => r.status === "in_consultation");
  const waiting = rows.filter((r) => r.status === "checked_in");
  const done = rows.filter((r) => r.status === "completed").length;
  const name = (r: Row) => r.profiles?.full_name ?? r.walkin_name ?? "—";

  return (
    <div>
      <PageTitle sub={todayUTC()}>{t("doctorQueue")}</PageTitle>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 md:col-span-2">
          <p className="text-sm text-muted-foreground">{t("nowServing")}</p>
          {current ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div><p className="token-num text-5xl font-bold text-primary">#{current.token_number}</p><p className="font-medium">{name(current)}</p></div>
              <Button asChild size="lg"><Link to="/doctor/visit/$id" params={{ id: current.id }}>Open consultation</Link></Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground">No patient with you right now.</p>
              <Button size="lg" onClick={callNext} disabled={busy || waiting.length === 0}><Megaphone className="h-5 w-5" />Call Next Patient</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Waiting</p><p className="token-num text-4xl font-bold">{waiting.length}</p></div>
          <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Seen</p><p className="token-num text-4xl font-bold text-success">{done}</p></div>
        </div>
      </div>
      <div className="divide-y rounded-2xl border bg-card">
        {rows.length === 0 && <p className="p-6 text-muted-foreground">No patients booked today.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-4 p-4">
            <span className="token-num w-14 text-2xl font-bold text-primary">#{r.token_number}</span>
            <p className="flex-1 font-medium">{name(r)} {r.is_walkin && <span className="ms-1 rounded bg-muted px-1.5 text-xs">walk-in</span>}</p>
            <StatusBadge status={r.status} />
            {r.status === "completed" && <Button size="sm" variant="ghost" asChild><Link to="/doctor/visit/$id" params={{ id: r.id }}>View</Link></Button>}
          </div>
        ))}
      </div>
    </div>
  );
}

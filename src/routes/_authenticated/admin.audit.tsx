import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/audit")({ component: Audit });

type Log = { id: number; actor_name: string | null; action: string; entity: string | null; entity_id: string | null; details: unknown; priority: string; created_at: string };

const ACTIONS = ["photo_locked", "photo_reset", "photo_removed", "triage_recorded", "queue_advanced", "break_glass_access", "transcript_finalized", "patient_checked_in", "walkin_registered", "appointment_booked", "role_assigned"];

function Audit() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  useEffect(() => {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
    if (action) q = q.eq("action", action);
    q.then(({ data }) => setLogs((data as Log[]) ?? []));
  }, [action]);
  const pri: Record<string, string> = { high: "bg-destructive text-destructive-foreground", elevated: "bg-warning text-foreground", normal: "bg-muted text-muted-foreground" };
  return (
    <div>
      <PageTitle sub="Append-only. Entries cannot be edited or deleted by anyone.">{t("audit")}</PageTitle>
      <select className="mb-4 h-9 rounded-md border border-input bg-card px-3 text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
        <option value="">All actions</option>{ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
      </select>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-start text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-start">Time</th><th className="p-3 text-start">Actor</th><th className="p-3 text-start">Action</th><th className="p-3 text-start">Priority</th><th className="p-3 text-start">Details</th></tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((l) => (
              <tr key={l.id} className={l.priority === "high" ? "bg-destructive/5" : ""}>
                <td className="whitespace-nowrap p-3">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3">{l.actor_name ?? "—"}</td>
                <td className="p-3 font-medium">{l.action.replace(/_/g, " ")}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${pri[l.priority] ?? pri.normal}`}>{l.priority}</span></td>
                <td className="max-w-md truncate p-3 font-mono text-xs text-muted-foreground" title={JSON.stringify(l.details)}>{JSON.stringify(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="p-6 text-muted-foreground">No entries.</p>}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, StatusBadge } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/patient/history")({ component: History });

type Row = { id: string; token_number: number; appt_date: string; status: string; doctors: { full_name: string; specialty: string | null } | null };

function History() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    supabase.from("appointments").select("id,token_number,appt_date,status,doctors(full_name,specialty)")
      .order("appt_date", { ascending: false }).then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);
  return (
    <div>
      <PageTitle>{t("history")}</PageTitle>
      <div className="divide-y rounded-2xl border bg-card">
        {rows.length === 0 && <p className="p-6 text-muted-foreground">{t("noActive")}</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-4 p-4">
            <span className="token-num w-14 text-2xl font-bold text-primary">#{r.token_number}</span>
            <div className="flex-1">
              <p className="font-medium">{r.doctors?.full_name}</p>
              <p className="text-sm text-muted-foreground">{r.doctors?.specialty} · {r.appt_date}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

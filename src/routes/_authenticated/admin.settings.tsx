import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

function Settings() {
  const { t } = useI18n();
  const [f, setF] = useState({ slot_minutes: 10, max_daily_patients: 40, walkins_allowed: true, max_daily_walkins: 15 });
  useEffect(() => {
    supabase.from("queue_settings").select("*").eq("id", 1).single().then(({ data }) => data && setF(data));
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("queue_settings").update({ ...f, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success(t("saved"));
  };
  const num = (k: "slot_minutes" | "max_daily_patients" | "max_daily_walkins", label: string) => (
    <div className="space-y-1.5"><Label>{label}</Label><Input type="number" min={1} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></div>
  );
  return (
    <div>
      <PageTitle sub="These rules apply to all doctors' queues.">{t("queueRules")}</PageTitle>
      <form onSubmit={save} className="max-w-md space-y-4 rounded-2xl border bg-card p-6">
        {num("slot_minutes", "Slot duration (minutes) — used for wait estimates")}
        {num("max_daily_patients", "Max patients per doctor per day")}
        <label className="flex items-center justify-between"><span className="text-sm font-medium">Allow walk-ins</span>
          <Switch checked={f.walkins_allowed} onCheckedChange={(v) => setF({ ...f, walkins_allowed: v })} /></label>
        {num("max_daily_walkins", "Max walk-ins per doctor per day")}
        <Button>{t("save")}</Button>
      </form>
    </div>
  );
}

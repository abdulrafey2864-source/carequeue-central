import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/AppShell";
import { PatientPhoto } from "@/components/PatientPhoto";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/staff/photos")({ component: Photos });

type P = { id: string; full_name: string; email: string | null; phone: string | null; photo_path: string | null; photo_locked_at: string | null };

function Photos() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<P[]>([]);
  const [target, setTarget] = useState<{ p: P; remove: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data: pr } = await supabase.from("user_roles").select("user_id").eq("role", "patient");
    const ids = (pr ?? []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); return; }
    let query = supabase.from("profiles").select("id,full_name,email,phone,photo_path,photo_locked_at").in("id", ids).order("full_name").limit(60);
    if (q.trim()) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data } = await query;
    setRows(data ?? []);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!target) return;
    if (target.remove && target.p.photo_path) {
      await supabase.storage.from("patient-photos").remove([target.p.photo_path]);
    }
    const { error } = await supabase.rpc("reset_patient_photo", { _patient_id: target.p.id, _reason: reason, _remove: target.remove });
    if (error) { toast.error(errText(error, t)); return; }
    toast.success("Done — the patient has been asked to retake their photo.");
    setTarget(null); setReason(""); load();
  };

  return (
    <div>
      <PageTitle sub="Reset or remove blurred / invalid identity photos. Every action is recorded with your justification.">{t("photos")}</PageTitle>
      <Input className="mb-4 max-w-sm" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="flex gap-4 rounded-xl border bg-card p-4">
            <PatientPhoto path={p.photo_path} className="h-20 w-20" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{p.email} {p.phone}</p>
              <p className="mt-1 text-xs">{p.photo_locked_at ? "🔒 Locked" : p.photo_path ? "Unlocked" : "No photo"}</p>
              {p.photo_path && (
                <div className="mt-2 flex gap-2">
                  {p.photo_locked_at && <Button size="sm" variant="outline" onClick={() => setTarget({ p, remove: false })}>Soft reset</Button>}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setTarget({ p, remove: true })}>Remove</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{target?.remove ? "Remove photo" : "Soft reset photo"} — {target?.p.full_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Justification (min. 10 characters) is permanently stored in the audit log.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photo is blurred, face not visible" />
          <Button disabled={reason.trim().length < 10} onClick={submit}>Confirm</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

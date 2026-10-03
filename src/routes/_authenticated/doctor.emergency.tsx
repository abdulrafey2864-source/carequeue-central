import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/AppShell";
import { PatientPhoto } from "@/components/PatientPhoto";
import { ClinicalHistory } from "@/components/ClinicalHistory";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/doctor/emergency")({ component: BreakGlass });

type Hit = { id: string; full_name: string; email: string | null; phone: string | null };
type Prof = { id: string; full_name: string; phone: string | null; gender: string | null; date_of_birth: string | null; photo_path: string | null };

function BreakGlass() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState<Hit | null>(null);
  const [why, setWhy] = useState("");
  const [granted, setGranted] = useState<Prof | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.rpc("find_patient", { _q: q });
    if (error) toast.error(errText(error, t)); else setHits(data ?? []);
  };
  const request = async () => {
    if (!sel) return;
    const { error } = await supabase.rpc("request_break_glass", { _patient_id: sel.id, _justification: why });
    if (error) { toast.error(errText(error, t)); return; }
    const { data } = await supabase.from("profiles").select("id,full_name,phone,gender,date_of_birth,photo_path").eq("id", sel.id).single();
    setGranted(data); setWhy("");
    toast.warning("Emergency access granted for 4 hours. This has been logged as high priority.");
  };

  return (
    <div>
      <PageTitle sub="Emergency access to an unassigned patient's records. Requires clinical justification and creates a high-priority audit entry.">
        <span className="flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-destructive" />{t("emergency")}</span>
      </PageTitle>
      {granted ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-destructive/40 bg-card p-5 text-center">
            <PatientPhoto path={granted.photo_path} className="mx-auto h-40 w-40" />
            <h2 className="mt-3 text-xl font-bold">{granted.full_name}</h2>
            <p className="text-sm text-muted-foreground">{[granted.gender, granted.date_of_birth, granted.phone].filter(Boolean).join(" · ")}</p>
            <Button variant="outline" className="mt-4" onClick={() => { setGranted(null); setSel(null); }}>Close record</Button>
          </div>
          <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
            <h3 className="mb-3 text-lg font-semibold">Clinical history</h3>
            <ClinicalHistory patientId={granted.id} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <form onSubmit={search} className="flex gap-2">
              <Input placeholder="Patient name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button>Search</Button>
            </form>
            <div className="mt-4 divide-y">
              {hits.map((h) => (
                <button key={h.id} onClick={() => setSel(h)} className={`block w-full p-3 text-start ${sel?.id === h.id ? "bg-secondary" : ""}`}>
                  <p className="font-medium">{h.full_name}</p><p className="text-xs text-muted-foreground">{h.email} {h.phone}</p>
                </button>
              ))}
            </div>
          </div>
          {sel && (
            <div className="space-y-3 rounded-2xl border border-destructive/40 bg-card p-5">
              <p className="font-semibold">Access records of {sel.full_name}</p>
              <Textarea rows={4} placeholder="Clinical justification (min. 20 characters)" value={why} onChange={(e) => setWhy(e.target.value)} />
              <Button variant="destructive" disabled={why.trim().length < 20} onClick={request}>Break glass & open records</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

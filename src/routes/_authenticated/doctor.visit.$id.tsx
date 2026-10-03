import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/AppShell";
import { PatientPhoto } from "@/components/PatientPhoto";
import { ClinicalHistory } from "@/components/ClinicalHistory";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/doctor/visit/$id")({ component: Visit });

type Appt = {
  id: string; token_number: number; status: string; patient_id: string | null; walkin_name: string | null; walkin_phone: string | null; appt_date: string;
  profiles: { full_name: string; phone: string | null; date_of_birth: string | null; gender: string | null; photo_path: string | null } | null;
};
type Triage = { blood_pressure: string | null; temperature: number | null; pulse: number | null; weight: number | null; chief_complaint: string | null };

function Visit() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [a, setA] = useState<Appt | null>(null);
  const [tri, setTri] = useState<Triage | null>(null);
  const [rec, setRec] = useState({ notes: "", diagnosis: "", prescription: "", finalized: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ap }, { data: tr }, { data: cr }] = await Promise.all([
      supabase.from("appointments").select("id,token_number,status,patient_id,walkin_name,walkin_phone,appt_date,profiles(full_name,phone,date_of_birth,gender,photo_path)").eq("id", id).maybeSingle(),
      supabase.from("triage_records").select("*").eq("appointment_id", id).maybeSingle(),
      supabase.from("clinical_records").select("notes,diagnosis,prescription,finalized").eq("appointment_id", id).maybeSingle(),
    ]);
    setA(ap as unknown as Appt); setTri(tr); if (cr) setRec(cr);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const saveDraft = async () => {
    const { error } = await supabase.from("clinical_records").update({ notes: rec.notes, diagnosis: rec.diagnosis, prescription: rec.prescription }).eq("appointment_id", id);
    if (error) throw error;
  };
  const onSave = async () => {
    try { await saveDraft(); toast.success(t("saved")); } catch (e) { toast.error(errText(e, t)); }
  };
  const complete = async () => {
    if (!confirm("Finalize this transcript? It will be permanently locked.")) return;
    setBusy(true);
    try {
      await saveDraft();
      const { error } = await supabase.rpc("complete_visit", { _id: id });
      if (error) throw error;
      toast.success("Visit completed and transcript locked");
      navigate({ to: "/doctor" });
    } catch (e) { toast.error(errText(e, t)); } finally { setBusy(false); }
  };
  const noShow = async () => {
    const { error } = await supabase.rpc("mark_no_show", { _id: id });
    if (error) toast.error(errText(error, t)); else navigate({ to: "/doctor" });
  };

  if (!a) return <p className="text-muted-foreground">Loading…</p>;
  const p = a.profiles;
  const age = p?.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / 3.15576e10) : null;
  const editable = a.status === "in_consultation" && !rec.finalized;

  return (
    <div>
      <Link to="/doctor" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t("doctorQueue")}</Link>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 text-center">
            <PatientPhoto path={p?.photo_path} className="mx-auto h-40 w-40" />
            <p className="token-num mt-3 text-3xl font-bold text-primary">#{a.token_number}</p>
            <h1 className="text-xl font-bold">{p?.full_name ?? a.walkin_name}</h1>
            <p className="text-sm text-muted-foreground">{[p?.gender, age !== null ? `${age} yrs` : null, p?.phone ?? a.walkin_phone].filter(Boolean).join(" · ")}</p>
            <div className="mt-2"><StatusBadge status={a.status} /></div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Triage vitals</h2>
            {tri ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">BP</dt><dd className="font-semibold">{tri.blood_pressure}</dd></div>
                <div><dt className="text-muted-foreground">Temp</dt><dd className="font-semibold">{tri.temperature}°F</dd></div>
                <div><dt className="text-muted-foreground">Pulse</dt><dd className="font-semibold">{tri.pulse} bpm</dd></div>
                <div><dt className="text-muted-foreground">Weight</dt><dd className="font-semibold">{tri.weight} kg</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Chief complaint</dt><dd>{tri.chief_complaint}</dd></div>
              </dl>
            ) : <p className="text-sm text-muted-foreground">Not recorded.</p>}
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Consultation transcript</h2>
              {rec.finalized && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Lock className="h-4 w-4" />Finalized</span>}
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Clinical notes</Label><Textarea rows={5} disabled={!editable} value={rec.notes} onChange={(e) => setRec({ ...rec, notes: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Diagnosis *</Label><Textarea rows={2} disabled={!editable} value={rec.diagnosis} onChange={(e) => setRec({ ...rec, diagnosis: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Prescription</Label><Textarea rows={4} disabled={!editable} value={rec.prescription} onChange={(e) => setRec({ ...rec, prescription: e.target.value })} /></div>
            </div>
            {editable && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" onClick={onSave}>Save draft</Button>
                <Button onClick={complete} disabled={busy}><Lock className="h-4 w-4" />Complete visit & lock</Button>
                <Button variant="ghost" className="ms-auto text-destructive" onClick={noShow}>No-show</Button>
              </div>
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-lg font-semibold">Previous visits</h2>
            {a.patient_id ? <ClinicalHistory patientId={a.patient_id} excludeAppointment={a.id} /> : <p className="text-sm text-muted-foreground">Walk-in without an account — no history.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

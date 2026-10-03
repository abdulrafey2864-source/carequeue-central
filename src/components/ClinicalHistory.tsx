import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Rec = { id: string; appointment_id: string; diagnosis: string; notes: string; prescription: string; finalized: boolean; finalized_at: string | null; created_at: string; doctor_id: string; doctors: { full_name: string } | null };

/** Previous consultation transcripts. Visible only to doctors permitted by database policy. */
export function ClinicalHistory({ patientId, excludeAppointment }: { patientId: string; excludeAppointment?: string }) {
  const [recs, setRecs] = useState<Rec[]>([]);
  useEffect(() => {
    supabase.from("clinical_records").select("id,appointment_id,diagnosis,notes,prescription,finalized,finalized_at,created_at,doctor_id")
      .eq("patient_id", patientId).eq("finalized", true).order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const list = ((data as unknown as Rec[]) ?? []).filter((r) => r.appointment_id !== excludeAppointment);
        const { data: docs } = await supabase.from("doctors").select("user_id,full_name");
        const m = new Map((docs ?? []).map((d) => [d.user_id, d.full_name]));
        setRecs(list.map((r) => ({ ...r, doctors: { full_name: m.get(r.doctor_id) ?? "Doctor" } })));
      });
  }, [patientId, excludeAppointment]);
  if (!recs.length) return <p className="text-sm text-muted-foreground">No previous visits on record.</p>;
  return (
    <div className="space-y-3">
      {recs.map((r) => (
        <div key={r.id} className="rounded-xl border bg-background p-4 text-sm">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>{new Date(r.created_at).toLocaleDateString()} · {r.doctors?.full_name ?? "Doctor"}</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Finalized</span>
          </div>
          <p><b>Diagnosis:</b> {r.diagnosis}</p>
          {r.notes && <p className="mt-1 whitespace-pre-wrap"><b>Notes:</b> {r.notes}</p>}
          {r.prescription && <p className="mt-1 whitespace-pre-wrap"><b>Rx:</b> {r.prescription}</p>}
        </div>
      ))}
    </div>
  );
}

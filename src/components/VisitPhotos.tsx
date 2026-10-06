import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PatientPhoto } from "@/components/PatientPhoto";
import { useAuth } from "@/lib/auth";

type Photo = { id: string; path: string; created_at: string };

/** Lists photos taken during a visit. When `canAdd`, the doctor can optionally take any number of photos (with patient consent). */
export function VisitPhotos({ appointmentId, patientId, canAdd }: { appointmentId: string; patientId: string; canAdd?: boolean }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [consent, setConsent] = useState(false);
  const [live, setLive] = useState(false);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("visit_photos").select("id,path,created_at").eq("appointment_id", appointmentId).order("created_at");
    setPhotos(data ?? []);
  }, [appointmentId]);
  useEffect(() => { load(); }, [load]);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setLive(false); };
  useEffect(() => stop, []);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 960 } });
      streamRef.current = s; setLive(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } });
    } catch { toast.error("Camera not available"); }
  };
  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) { setShot({ blob: b, url: URL.createObjectURL(b) }); stop(); } }, "image/jpeg", 0.85);
  };
  const discard = () => { if (shot) URL.revokeObjectURL(shot.url); setShot(null); };
  const save = async () => {
    if (!shot || !user) return;
    setBusy(true);
    try {
      const path = `${patientId}/visit-${appointmentId}-${Date.now()}.jpg`;
      const { error: up } = await supabase.storage.from("patient-photos").upload(path, shot.blob, { contentType: "image/jpeg" });
      if (up) throw up;
      const { error } = await supabase.from("visit_photos").insert({ appointment_id: appointmentId, patient_id: patientId, path, taken_by: user.id });
      if (error) throw error;
      discard(); toast.success("Photo saved"); load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">{photos.map((p) => <PatientPhoto key={p.id} path={p.path} className="h-24 w-24" />)}</div>
      ) : <p className="text-sm text-muted-foreground">No photos for this visit.</p>}
      {canAdd && (
        <div className="space-y-3 rounded-xl border bg-secondary/40 p-4">
          <p className="text-sm">Optional: take photos at the end of treatment (e.g. wound, dressing, affected area). Only with the patient's agreement.</p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} /> Patient agrees to photos · مریض تصویر کے لیے رضامند ہے
          </label>
          {consent && (
            <>
              {(live || shot) && (
                <div className="aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl border bg-muted">
                  {shot ? <img src={shot.url} alt="Preview" className="h-full w-full object-cover" />
                    : <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {!live && !shot && <Button variant="outline" onClick={start}><Camera className="h-4 w-4" />Take photo</Button>}
                {live && <><Button onClick={capture}><Camera className="h-4 w-4" />Capture</Button><Button variant="ghost" onClick={stop}><X className="h-4 w-4" />Cancel</Button></>}
                {shot && <>
                  <Button variant="outline" onClick={() => { discard(); start(); }} disabled={busy}><RotateCcw className="h-4 w-4" />Retake</Button>
                  <Button onClick={save} disabled={busy}><Save className="h-4 w-4" />Save photo</Button>
                </>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

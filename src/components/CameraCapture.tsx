import { useEffect, useRef, useState } from "react";
import { Camera, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n, errText } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const EN_CONSENT = "Your photo is used only to verify your identity at reception and in the doctor's room. It is stored privately and visible only to hospital staff and doctors treating you. Once you lock it, you cannot change it yourself.";
const UR_CONSENT = "آپ کی تصویر صرف استقبالیہ اور ڈاکٹر کے کمرے میں آپ کی شناخت کی تصدیق کے لیے استعمال ہوتی ہے۔ یہ نجی طور پر محفوظ کی جاتی ہے اور صرف ہسپتال کے عملے اور آپ کا علاج کرنے والے ڈاکٹروں کو نظر آتی ہے۔ لاک کرنے کے بعد آپ اسے خود تبدیل نہیں کر سکتے۔";

export function CameraCapture({ onLocked }: { onLocked: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [consent, setConsent] = useState(false);
  const [live, setLive] = useState(false);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = () => { streamRef.current?.getTracks().forEach((tr) => tr.stop()); streamRef.current = null; setLive(false); };
  useEffect(() => stop, []);

  const start = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 720 } });
      streamRef.current = s;
      setLive(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); } });
    } catch {
      toast.error(t("cameraError"));
    }
  };

  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas"); c.width = 600; c.height = 600;
    c.getContext("2d")!.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 600, 600);
    c.toBlob((b) => { if (b) { setShot({ blob: b, url: URL.createObjectURL(b) }); stop(); } }, "image/jpeg", 0.88);
  };

  const retake = () => { if (shot) URL.revokeObjectURL(shot.url); setShot(null); start(); };

  const lock = async () => {
    if (!shot || !user) return;
    setBusy(true);
    try {
      const path = `${user.id}/identity-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("patient-photos").upload(path, shot.blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error } = await supabase.rpc("lock_photo", { _path: path });
      if (error) throw error;
      onLocked();
    } catch (e) {
      toast.error(errText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-secondary/40 p-4">
        <h3 className="font-semibold">Photo identity verification · تصویری شناخت کی تصدیق</h3>
        <p className="mt-2 text-sm" dir="ltr">{EN_CONSENT}</p>
        <p className="mt-2 text-sm leading-loose" dir="rtl" style={{ fontFamily: '"Noto Nastaliq Urdu", serif' }}>{UR_CONSENT}</p>
        <label className="mt-3 flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} /> {t("consentAgree")}
        </label>
      </div>
      {consent && (
        <div className="flex flex-col items-center gap-3">
          <div className="aspect-square w-full max-w-xs overflow-hidden rounded-2xl border bg-muted">
            {shot ? <img src={shot.url} alt="Preview" className="h-full w-full object-cover" />
              : live ? <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              : <div className="flex h-full items-center justify-center text-muted-foreground"><Camera className="h-12 w-12" /></div>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {!live && !shot && <Button onClick={start}><Camera className="h-4 w-4" />{t("startCamera")}</Button>}
            {live && <Button onClick={capture}><Camera className="h-4 w-4" />{t("capture")}</Button>}
            {shot && <>
              <Button variant="outline" onClick={retake} disabled={busy}><RotateCcw className="h-4 w-4" />{t("retake")}</Button>
              <Button onClick={lock} disabled={busy}><Lock className="h-4 w-4" />{t("confirmLock")}</Button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}

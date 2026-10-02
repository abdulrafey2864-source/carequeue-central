import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/AppShell";
import { PatientPhoto } from "@/components/PatientPhoto";
import { CameraCapture } from "@/components/CameraCapture";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/patient/profile")({ component: ProfilePage });

function ProfilePage() {
  const { profile, refresh, user } = useAuth();
  const { t } = useI18n();
  const [f, setF] = useState({ full_name: "", phone: "", date_of_birth: "", gender: "" });
  useEffect(() => {
    if (profile) setF({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", date_of_birth: profile.date_of_birth ?? "", gender: profile.gender ?? "" });
  }, [profile]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ ...f, date_of_birth: f.date_of_birth || null }).eq("id", user!.id);
    if (error) toast.error(error.message); else { toast.success(t("saved")); refresh(); }
  };
  return (
    <div>
      <PageTitle>{t("profile")}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="space-y-1.5"><Label>{t("fullName")}</Label><Input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t("phone")}</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("dob")}</Label><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("gender")}</Label>
              <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
                <option value="">—</option><option value="female">Female / خاتون</option><option value="male">Male / مرد</option><option value="other">Other / دیگر</option>
              </select>
            </div>
          </div>
          <Button>{t("save")}</Button>
        </form>
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">{t("consentTitle")}</h2>
          {profile?.photo_locked_at ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <PatientPhoto path={profile.photo_path} className="h-48 w-48" />
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" />{t("photoLocked")}</p>
            </div>
          ) : (
            <CameraCapture onLocked={() => { toast.success(t("saved")); refresh(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

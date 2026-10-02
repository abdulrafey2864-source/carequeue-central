import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/AppShell";
import { useAuth, todayUTC } from "@/lib/auth";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/patient/book")({ component: Book });

type Dept = { id: string; name_en: string; name_ur: string; description: string | null };
type Doc = { user_id: string; full_name: string; specialty: string | null; department_id: string | null };

function Book() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dept, setDept] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [date, setDate] = useState(todayUTC());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("departments").select("*").order("name_en").then(({ data }) => setDepts(data ?? []));
    supabase.from("doctors").select("user_id,full_name,specialty,department_id").eq("active", true).then(({ data }) => setDocs(data ?? []));
  }, []);

  const book = async () => {
    if (!doc) return;
    setBusy(true);
    const { data: id, error } = await supabase.rpc("book_appointment", { _doctor_id: doc, _date: date });
    setBusy(false);
    if (error) { toast.error(errText(error, t)); return; }
    const { data } = await supabase.from("appointments").select("token_number").eq("id", id as string).single();
    toast.success(`${t("booked")} #${data?.token_number}`);
    navigate({ to: "/patient" });
  };

  if (!profile?.photo_locked_at) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <p>{t("photoNeeded")}</p>
        <Button className="mt-4" asChild><Link to="/patient/profile">{t("addPhoto")}</Link></Button>
      </div>
    );
  }

  const deptDocs = docs.filter((d) => d.department_id === dept);
  return (
    <div className="space-y-8">
      <PageTitle>{t("bookNow")}</PageTitle>
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. {t("chooseDept")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {depts.map((d) => (
            <button key={d.id} onClick={() => { setDept(d.id); setDoc(null); }}
              className={`rounded-xl border p-4 text-start transition ${dept === d.id ? "border-primary bg-secondary" : "bg-card hover:border-primary/50"}`}>
              <p className="font-semibold">{lang === "ur" && d.name_ur ? d.name_ur : d.name_en}</p>
              <p className="text-xs text-muted-foreground">{d.description}</p>
            </button>
          ))}
        </div>
      </section>
      {dept && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">2. {t("chooseDoctor")}</h2>
          {deptDocs.length === 0 ? <p className="text-muted-foreground">{t("noDoctors")}</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deptDocs.map((d) => (
                <button key={d.user_id} onClick={() => setDoc(d.user_id)}
                  className={`rounded-xl border p-4 text-start ${doc === d.user_id ? "border-primary bg-secondary" : "bg-card hover:border-primary/50"}`}>
                  <p className="font-semibold">{d.full_name}</p>
                  <p className="text-sm text-muted-foreground">{d.specialty}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {doc && (
        <section className="max-w-xs space-y-3">
          <h2 className="text-lg font-semibold">3. {t("chooseDate")}</h2>
          <Input type="date" min={todayUTC()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Button className="w-full" size="lg" disabled={busy} onClick={book}>{t("confirmBooking")}</Button>
        </section>
      )}
    </div>
  );
}

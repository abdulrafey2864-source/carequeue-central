import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HeartPulse, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle, StatusBadge } from "@/components/AppShell";
import { PatientPhoto } from "@/components/PatientPhoto";
import { todayUTC } from "@/lib/auth";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/staff/")({ component: Reception });

type Row = {
  id: string; token_number: number; status: string; is_walkin: boolean; walkin_name: string | null; walkin_phone: string | null;
  doctor_id: string; doctors: { full_name: string } | null;
  profiles: { full_name: string; phone: string | null; photo_path: string | null } | null;
  triage_records: { id: string } | { id: string }[] | null;
};
type Doc = { user_id: string; full_name: string; specialty: string | null };

const hasTriage = (r: Row) => (Array.isArray(r.triage_records) ? r.triage_records.length > 0 : !!r.triage_records);

function Reception() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState("all");
  const [walkin, setWalkin] = useState(false);
  const [triageFor, setTriageFor] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("appointments")
      .select("id,token_number,status,is_walkin,walkin_name,walkin_phone,doctor_id,doctors(full_name),profiles(full_name,phone,photo_path),triage_records(id)")
      .eq("appt_date", todayUTC()).order("token_number");
    setRows((data as unknown as Row[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    supabase.from("doctors").select("user_id,full_name,specialty").eq("active", true).order("full_name").then(({ data }) => setDocs(data ?? []));
    const ch = supabase.channel("staff-queue").on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const act = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    const { error } = await fn();
    if (error) toast.error(errText(error, t)); else { toast.success(ok); load(); }
  };

  const shown = rows.filter((r) => filter === "all" || r.doctor_id === filter);
  const summary = useMemo(() => docs.map((d) => {
    const mine = rows.filter((r) => r.doctor_id === d.user_id);
    return {
      d,
      current: mine.find((r) => r.status === "in_consultation")?.token_number,
      waiting: mine.filter((r) => r.status === "checked_in").length,
      booked: mine.filter((r) => r.status === "booked").length,
    };
  }), [docs, rows]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub={todayUTC()}>{t("reception")}</PageTitle>
        <Button onClick={() => setWalkin(true)}><UserPlus className="h-4 w-4" />Register walk-in · واک اِن</Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ d, current, waiting, booked }) => (
          <div key={d.user_id} className="rounded-xl border bg-card p-4">
            <p className="font-semibold">{d.full_name}</p>
            <p className="text-xs text-muted-foreground">{d.specialty}</p>
            <div className="mt-3 flex items-end justify-between">
              <div><p className="text-xs text-muted-foreground">{t("nowServing")}</p><p className="token-num text-3xl font-bold text-primary">{current ? `#${current}` : "—"}</p></div>
              <div className="text-end text-sm"><p><b>{waiting}</b> checked in</p><p className="text-muted-foreground">{booked} not arrived</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All doctors</option>
          {docs.map((d) => <option key={d.user_id} value={d.user_id}>{d.full_name}</option>)}
        </select>
      </div>

      <div className="divide-y rounded-2xl border bg-card">
        {shown.length === 0 && <p className="p-6 text-muted-foreground">No appointments today.</p>}
        {shown.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
            <span className="token-num w-14 text-2xl font-bold text-primary">#{r.token_number}</span>
            <PatientPhoto path={r.profiles?.photo_path} className="h-12 w-12" />
            <div className="min-w-40 flex-1">
              <p className="font-medium">{r.profiles?.full_name ?? r.walkin_name} {r.is_walkin && <span className="ms-1 rounded bg-muted px-1.5 text-xs">walk-in</span>}</p>
              <p className="text-sm text-muted-foreground">{r.doctors?.full_name} · {r.profiles?.phone ?? r.walkin_phone ?? ""}</p>
            </div>
            <StatusBadge status={r.status} />
            {hasTriage(r) && <span className="flex items-center gap-1 text-xs text-success"><HeartPulse className="h-3.5 w-3.5" />vitals</span>}
            <div className="flex gap-2">
              {r.status === "booked" && <Button size="sm" onClick={() => act(() => supabase.rpc("check_in_patient", { _id: r.id }), "Checked in")}>Check in</Button>}
              {["booked", "checked_in"].includes(r.status) && <>
                <Button size="sm" variant="outline" onClick={() => setTriageFor(r)}>Vitals</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => act(() => supabase.rpc("mark_no_show", { _id: r.id }), "Marked no-show")}>No-show</Button>
              </>}
            </div>
          </div>
        ))}
      </div>

      <WalkinDialog open={walkin} onClose={() => setWalkin(false)} docs={docs} onDone={load} />
      <TriageDialog row={triageFor} onClose={() => setTriageFor(null)} onDone={load} />
    </div>
  );
}

function WalkinDialog({ open, onClose, docs, onDone }: { open: boolean; onClose: () => void; docs: Doc[]; onDone: () => void }) {
  const { t } = useI18n();
  const [doc, setDoc] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: id, error } = await supabase.rpc("register_walkin", { _doctor_id: doc, _name: name, _phone: phone });
    if (error) { toast.error(errText(error, t)); return; }
    const { data } = await supabase.from("appointments").select("token_number").eq("id", id as string).single();
    toast.success(`Walk-in token #${data?.token_number}`);
    setName(""); setPhone(""); onDone(); onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Register walk-in patient</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>Doctor</Label>
            <select required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={doc} onChange={(e) => setDoc(e.target.value)}>
              <option value="">—</option>{docs.map((d) => <option key={d.user_id} value={d.user_id}>{d.full_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>{t("fullName")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <Button className="w-full">Generate token</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TriageDialog({ row, onClose, onDone }: { row: Row | null; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ bp: "", temp: "", pulse: "", weight: "", complaint: "" });
  useEffect(() => {
    setF({ bp: "", temp: "", pulse: "", weight: "", complaint: "" });
    if (!row) return;
    supabase.from("triage_records").select("*").eq("appointment_id", row.id).maybeSingle().then(({ data }) => {
      if (data) setF({ bp: data.blood_pressure ?? "", temp: data.temperature?.toString() ?? "", pulse: data.pulse?.toString() ?? "", weight: data.weight?.toString() ?? "", complaint: data.chief_complaint ?? "" });
    });
  }, [row]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    const { error } = await supabase.rpc("record_triage", {
      _appointment_id: row.id, _bp: f.bp, _temp: Number(f.temp) || 0, _pulse: Number(f.pulse) || 0, _weight: Number(f.weight) || 0, _complaint: f.complaint,
    });
    if (error) { toast.error(errText(error, t)); return; }
    toast.success("Vitals recorded"); onDone(); onClose();
  };
  const field = (k: keyof typeof f, label: string, ph: string) => (
    <div className="space-y-1.5"><Label>{label}</Label><Input required placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Triage vitals — #{row?.token_number} {row?.profiles?.full_name ?? row?.walkin_name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field("bp", "Blood pressure", "120/80")}
            {field("temp", "Temperature (°F)", "98.6")}
            {field("pulse", "Pulse (bpm)", "72")}
            {field("weight", "Weight (kg)", "70")}
          </div>
          <div className="space-y-1.5"><Label>Chief complaint</Label><Textarea required value={f.complaint} onChange={(e) => setF({ ...f, complaint: e.target.value })} /></div>
          <Button className="w-full">Save vitals</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

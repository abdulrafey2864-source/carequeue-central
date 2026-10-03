import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/AppShell";
import type { Role } from "@/lib/auth";
import { useI18n, errText } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/people")({ component: People });

type Dept = { id: string; name_en: string };
type Member = { user_id: string; role: Role; name: string; email: string | null; extra: string };

function People() {
  const { t } = useI18n();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [f, setF] = useState({ email: "", role: "doctor" as Role, dept: "", specialty: "" });

  const load = useCallback(async () => {
    const [{ data: roles }, { data: docs }, { data: staff }, { data: d }] = await Promise.all([
      supabase.from("user_roles").select("user_id,role").neq("role", "patient"),
      supabase.from("doctors").select("user_id,specialty,active,department_id"),
      supabase.from("staff_members").select("user_id,department_id"),
      supabase.from("departments").select("id,name_en").order("name_en"),
    ]);
    setDepts(d ?? []);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
    const pm = new Map((profs ?? []).map((p) => [p.id, p]));
    const dm = new Map((d ?? []).map((x) => [x.id, x.name_en]));
    setMembers((roles ?? []).map((r) => {
      const doc = docs?.find((x) => x.user_id === r.user_id);
      const st = staff?.find((x) => x.user_id === r.user_id);
      const extra = r.role === "doctor" && doc ? `${dm.get(doc.department_id ?? "") ?? "—"} · ${doc.specialty ?? ""}` : r.role === "staff" && st ? dm.get(st.department_id ?? "") ?? "—" : "";
      return { user_id: r.user_id, role: r.role, name: pm.get(r.user_id)?.full_name ?? "—", email: pm.get(r.user_id)?.email ?? null, extra };
    }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc("assign_role", { _email: f.email, _role: f.role, _department_id: f.dept || undefined, _specialty: f.specialty || undefined });
    if (error) { toast.error(errText(error, t)); return; }
    toast.success("Role assigned"); setF({ ...f, email: "", specialty: "" }); load();
  };
  const revoke = async (m: Member) => {
    if (!confirm(`Remove ${m.role} role from ${m.name}?`)) return;
    const { error } = await supabase.rpc("revoke_role", { _user_id: m.user_id, _role: m.role });
    if (error) toast.error(errText(error, t)); else load();
  };

  return (
    <div>
      <PageTitle sub="Doctors and staff sign up with their email first, then you assign their role here.">{t("people")}</PageTitle>
      <form onSubmit={assign} className="mb-8 grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-5 md:items-end">
        <div className="space-y-1.5 md:col-span-2"><Label>{t("email")}</Label><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Role</Label>
          <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            <option value="doctor">Doctor</option><option value="staff">Staff</option><option value="admin">Admin</option>
          </select>
        </div>
        <div className="space-y-1.5"><Label>Department</Label>
          <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}>
            <option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name_en}</option>)}
          </select>
        </div>
        {f.role === "doctor" ? <div className="space-y-1.5"><Label>Specialty</Label><Input value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} /></div> : <div />}
        <Button className="md:col-span-5 md:w-40">Assign role</Button>
      </form>
      {(["doctor", "staff", "admin"] as Role[]).map((role) => (
        <section key={role} className="mb-6">
          <h2 className="mb-2 text-lg font-semibold capitalize">{role}s</h2>
          <div className="divide-y rounded-2xl border bg-card">
            {members.filter((m) => m.role === role).map((m) => (
              <div key={m.user_id + role} className="flex items-center gap-3 p-4">
                <div className="flex-1"><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email} {m.extra && `· ${m.extra}`}</p></div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(m)}>Remove</Button>
              </div>
            ))}
            {members.filter((m) => m.role === role).length === 0 && <p className="p-4 text-sm text-muted-foreground">None yet.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

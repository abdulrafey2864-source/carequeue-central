import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/departments")({ component: Departments });

type Dept = { id: string; name_en: string; name_ur: string; description: string | null };

function Departments() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Dept[]>([]);
  const [f, setF] = useState({ name_en: "", name_ur: "", description: "" });
  const load = useCallback(() => supabase.from("departments").select("*").order("name_en").then(({ data }) => setRows(data ?? [])), []);
  useEffect(() => { load(); }, [load]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("departments").insert(f);
    if (error) toast.error(error.message); else { setF({ name_en: "", name_ur: "", description: "" }); load(); }
  };
  const update = async (d: Dept) => {
    const { error } = await supabase.from("departments").update({ name_en: d.name_en, name_ur: d.name_ur, description: d.description }).eq("id", d.id);
    if (error) toast.error(error.message); else toast.success(t("saved"));
  };
  const del = async (d: Dept) => {
    if (!confirm(`Delete ${d.name_en}?`)) return;
    const { error } = await supabase.from("departments").delete().eq("id", d.id);
    if (error) toast.error(error.message); else load();
  };
  const set = (id: string, patch: Partial<Dept>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div>
      <PageTitle>{t("departments")}</PageTitle>
      <form onSubmit={add} className="mb-6 grid gap-2 rounded-2xl border bg-card p-4 md:grid-cols-4">
        <Input required placeholder="Name (English)" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} />
        <Input dir="rtl" placeholder="نام (اردو)" value={f.name_ur} onChange={(e) => setF({ ...f, name_ur: e.target.value })} />
        <Input placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Button>Add department</Button>
      </form>
      <div className="divide-y rounded-2xl border bg-card">
        {rows.map((d) => (
          <div key={d.id} className="grid gap-2 p-3 md:grid-cols-[1fr_1fr_2fr_auto_auto]">
            <Input value={d.name_en} onChange={(e) => set(d.id, { name_en: e.target.value })} />
            <Input dir="rtl" value={d.name_ur} onChange={(e) => set(d.id, { name_ur: e.target.value })} />
            <Input value={d.description ?? ""} onChange={(e) => set(d.id, { description: e.target.value })} />
            <Button variant="outline" onClick={() => update(d)}>{t("save")}</Button>
            <Button variant="ghost" className="text-destructive" onClick={() => del(d)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

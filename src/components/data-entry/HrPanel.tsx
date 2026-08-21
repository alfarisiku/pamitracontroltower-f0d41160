import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Save, X, Pencil, Trash2 } from "lucide-react";
import { supabase, logActivity, DbHrPersonnel, HR_CATEGORIES } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const inputCls = "px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";
const catLabel = (c: string) => HR_CATEGORIES.find(x => x.value === c)?.label || c;

export function useHrPersonnel(projectId?: string) {
  return useQuery<DbHrPersonnel[]>({
    queryKey: ["hr_personnel", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_personnel").select("*").eq("project_id", projectId!)
        .order("category").order("sort_order").order("created_at");
      if (error) throw error;
      return (data ?? []) as DbHrPersonnel[];
    },
  });
}

const emptyForm = { category: "staff", position: "", headcount: "1", notes: "" };
type Form = typeof emptyForm;

function FormFields({ f, set }: { f: Form; set: (v: Form) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div>
        <label className={labelCls}>Kategori</label>
        <select value={f.category} onChange={e => set({ ...f, category: e.target.value })} className={`w-full ${inputCls}`}>
          {HR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>Jabatan / Posisi</label><input value={f.position} onChange={e => set({ ...f, position: e.target.value })} className={`w-full ${inputCls}`} placeholder="Site Manager" /></div>
      <div><label className={labelCls}>Jumlah Orang</label><input type="number" min="0" value={f.headcount} onChange={e => set({ ...f, headcount: e.target.value })} className={`w-full ${inputCls}`} /></div>
      <div><label className={labelCls}>Catatan</label><input value={f.notes} onChange={e => set({ ...f, notes: e.target.value })} className={`w-full ${inputCls}`} placeholder="opsional" /></div>
    </div>
  );
}

export function HrPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useHrPersonnel(projectId || undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["hr_personnel"] });

  const payload = (f: Form, sortOrder: number) => ({
    project_id: projectId,
    category: f.category,
    position: f.position,
    headcount: Math.max(0, Math.round(Number(f.headcount) || 0)),
    notes: f.notes || null,
    sort_order: sortOrder,
  });

  const totalOf = (cat: string) => rows.filter(r => r.category === cat).reduce((s, r) => s + (r.headcount || 0), 0);

  const add = async () => {
    if (!form.position) { toast({ title: "Isi jabatan", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("hr_personnel").insert(payload(form, rows.length));
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "hr", "create", `SDM ${form.position} (${form.headcount} orang) ditambahkan`, projectId);
    setForm(emptyForm); setAddOpen(false); refresh();
    toast({ title: "✅ SDM ditambahkan" });
  };

  const save = async (id: string) => {
    setSaving(true);
    const { project_id, sort_order, ...patch } = payload(editForm, 0) as any;
    const { error } = await (supabase as any).from("hr_personnel").update(patch).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "hr", "update", `SDM ${editForm.position} diupdate`, projectId, id);
    setEditingId(null); refresh(); toast({ title: "✅ Tersimpan" });
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"?`)) return;
    await (supabase as any).from("hr_personnel").delete().eq("id", id);
    await logActivity(supabase, "hr", "delete", `SDM ${name} dihapus`, projectId, id);
    refresh(); toast({ title: "🗑️ Dihapus" });
  };

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> SDM — Staff & Manpower</h3>
          <p className="text-[10px] text-muted-foreground">Jumlah karyawan staff (struktural) dan manpower lapangan pada proyek ini.</p>
        </div>
        <button onClick={() => setAddOpen(o => !o)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Tambah SDM</button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { l: "Karyawan Staff", v: totalOf("staff") },
          { l: "Manpower Lapangan", v: totalOf("manpower") },
          { l: "Total Orang", v: totalOf("staff") + totalOf("manpower") },
        ].map(k => (
          <div key={k.l} className="rounded border border-border bg-card p-2">
            <p className="text-[9px] uppercase text-muted-foreground">{k.l}</p>
            <p className="text-sm font-semibold text-foreground font-mono-data">{k.v}</p>
          </div>
        ))}
      </div>

      {addOpen && (
        <div className="mb-3 p-3 bg-muted/30 rounded border border-border/50">
          <FormFields f={form} set={setForm} />
          <div className="flex gap-2 mt-3">
            <button onClick={add} disabled={saving} className="px-3 py-1 bg-success text-success-foreground rounded text-xs disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />Simpan</button>
            <button onClick={() => setAddOpen(false)} className="px-3 py-1 bg-muted text-foreground rounded text-xs border border-border">Batal</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Belum ada data SDM. Klik "Tambah SDM".</p>
      ) : (
        <div className="space-y-4">
          {HR_CATEGORIES.map(cat => {
            const list = rows.filter(r => r.category === cat.value);
            if (list.length === 0) return null;
            return (
              <div key={cat.value}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">{cat.label} · {totalOf(cat.value)} orang</p>
                <div className="space-y-1.5">
                  {list.map(r => editingId === r.id ? (
                    <div key={r.id} className="p-3 bg-muted/30 rounded border border-border/50">
                      <FormFields f={editForm} set={setEditForm} />
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => save(r.id)} disabled={saving} className="px-3 py-1 bg-success text-success-foreground rounded text-xs disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />Simpan</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-muted text-foreground rounded text-xs border border-border"><X className="h-3 w-3 inline mr-1" />Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div key={r.id} className="rounded border border-border bg-card p-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground flex-1 min-w-[140px]">{r.position}</span>
                      <span className="text-[11px] font-mono-data text-primary">{r.headcount} orang</span>
                      {r.notes && <span className="text-[10px] text-muted-foreground">{r.notes}</span>}
                      <button onClick={() => { setEditingId(r.id); setEditForm({ category: r.category, position: r.position, headcount: String(r.headcount), notes: r.notes || "" }); }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3 w-3 text-primary" /></button>
                      <button onClick={() => del(r.id, r.position)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

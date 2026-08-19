import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Save, X, Pencil, Trash2 } from "lucide-react";
import { supabase, logActivity, formatIDR, DbBilling, BILLING_STATUSES, BILLING_STATUS_CLASS } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const inputCls = "px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";
const fmtD = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
const statusLabel = (s: string) => BILLING_STATUSES.find(x => x.value === s)?.label || s;

export function useBillings(projectId?: string) {
  return useQuery<DbBilling[]>({
    queryKey: ["project_billings", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_billings").select("*").eq("project_id", projectId!)
        .order("sort_order").order("created_at");
      if (error) throw error;
      return (data ?? []) as DbBilling[];
    },
  });
}

const emptyForm = {
  termin_code: "", description: "", status: "plan",
  progress_pct: "", amount: "", po_date: "", invoice_date: "", cash_in_date: "",
};
type Form = typeof emptyForm;

const toForm = (b: DbBilling): Form => ({
  termin_code: b.termin_code || "",
  description: b.description || "",
  status: b.status || "plan",
  progress_pct: String(b.plan_progress_pct ?? ""),
  amount: String(b.plan_amount ?? ""),
  po_date: b.plan_po_date || "",
  invoice_date: b.plan_invoice_date || "",
  cash_in_date: b.plan_cash_in_date || "",
});

const toPayload = (f: Form, projectId: string, sortOrder: number) => ({
  project_id: projectId,
  termin_code: f.termin_code,
  description: f.description || null,
  status: f.status,
  sort_order: sortOrder,
  plan_progress_pct: Number(f.progress_pct) || 0,
  plan_amount: Math.round(Number(f.amount) || 0),
  plan_po_date: f.po_date || null,
  plan_invoice_date: f.invoice_date || null,
  plan_cash_in_date: f.cash_in_date || null,
});

function FormFields({ f, set }: { f: Form; set: (v: Form) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div><label className={labelCls}>Termin</label><input value={f.termin_code} onChange={e => set({ ...f, termin_code: e.target.value })} className={`w-full ${inputCls}`} placeholder="Termin 1 / DP" /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Deskripsi</label><input value={f.description} onChange={e => set({ ...f, description: e.target.value })} className={`w-full ${inputCls}`} placeholder="Pembayaran uang muka" /></div>
        <div><label className={labelCls}>Status</label>
          <select value={f.status} onChange={e => set({ ...f, status: e.target.value })} className={`w-full ${inputCls}`}>
            {BILLING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Progress Ditagih (%)</label><input type="number" value={f.progress_pct} onChange={e => set({ ...f, progress_pct: e.target.value })} className={`w-full ${inputCls}`} placeholder="20" /></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div><label className={labelCls}>Nominal (Rp)</label><input type="number" value={f.amount} onChange={e => set({ ...f, amount: e.target.value })} className={`w-full ${inputCls}`} placeholder="500000000" />
          {f.amount && <p className="text-[9px] text-muted-foreground mt-0.5">≈ {formatIDR(Number(f.amount))}</p>}
        </div>
        <div><label className={labelCls}>Tgl PO</label><input type="date" value={f.po_date} onChange={e => set({ ...f, po_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
        <div><label className={labelCls}>Tgl Invoice</label><input type="date" value={f.invoice_date} onChange={e => set({ ...f, invoice_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
        <div><label className={labelCls}>Tgl Cash In</label><input type="date" value={f.cash_in_date} onChange={e => set({ ...f, cash_in_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
      </div>
    </div>
  );
}

export function BillingPanel({ projectId, mode = "full", onLogged }: {
  projectId: string;
  /** "status" = hanya update status & tanggal (dipakai di Quick Weekly Update) */
  mode?: "full" | "status";
  onLogged?: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useBillings(projectId || undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["project_billings"] });

  const total = rows.reduce((s, r) => s + (r.plan_amount || 0), 0);
  const paid = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.plan_amount || 0), 0);
  const onProgress = rows.filter(r => r.status === "progress").reduce((s, r) => s + (r.plan_amount || 0), 0);

  const add = async () => {
    if (!form.termin_code) { toast({ title: "Isi nama termin", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("project_billings").insert(toPayload(form, projectId, rows.length));
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "billing", "create", `Billing ${form.termin_code} ditambahkan`, projectId);
    onLogged?.(`Termin ${form.termin_code} ditambahkan`);
    setForm(emptyForm); setAddOpen(false); refresh();
    toast({ title: "✅ Billing ditambahkan" });
  };

  const save = async (id: string) => {
    setSaving(true);
    const { project_id, sort_order, ...patch } = toPayload(editForm, projectId, 0) as any;
    const { error } = await (supabase as any).from("project_billings").update(patch).eq("id", id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "billing", "update", `Billing ${editForm.termin_code} diupdate`, projectId, id);
    onLogged?.(`Termin ${editForm.termin_code} diupdate`);
    setEditingId(null); refresh(); toast({ title: "✅ Tersimpan" });
  };

  /** Patch cepat (status / tanggal) — dipakai mode "status" */
  const patchRow = async (r: DbBilling, patch: Record<string, any>, human: string) => {
    const { error } = await (supabase as any).from("project_billings").update(patch).eq("id", r.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "billing", "update", `${r.termin_code}: ${human}`, projectId, r.id);
    onLogged?.(`${r.termin_code}: ${human}`);
    refresh(); qc.invalidateQueries({ queryKey: ["activity_logs"] });
    toast({ title: "✅ Tersimpan" });
  };

  const del = async (id: string, code: string) => {
    if (!confirm(`Hapus billing "${code}"?`)) return;
    await (supabase as any).from("project_billings").delete().eq("id", id);
    await logActivity(supabase, "billing", "delete", `Billing ${code} dihapus`, projectId, id);
    refresh(); toast({ title: "🗑️ Dihapus" });
  };

  // ==== MODE: STATUS ONLY (Quick Weekly Update) ====
  if (mode === "status") {
    if (rows.length === 0) return <p className="text-xs text-muted-foreground">Belum ada termin. Tambahkan lewat tab Billing (Termin).</p>;
    return (
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {["Termin", "Deskripsi", "Nominal", "Progress", "Status", "Tgl PO", "Tgl Invoice", "Tgl Cash In"].map(h => (
                <th key={h} className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-border/30">
                <td className="py-1.5 px-2 font-mono-data text-primary whitespace-nowrap">{r.termin_code}</td>
                <td className="py-1.5 px-2 text-foreground">{r.description || "—"}</td>
                <td className="py-1.5 px-2 font-mono-data text-foreground whitespace-nowrap">{formatIDR(r.plan_amount)}</td>
                <td className="py-1.5 px-2 font-mono-data text-muted-foreground">{r.plan_progress_pct}%</td>
                <td className="py-1.5 px-2">
                  <select value={r.status} onChange={e => patchRow(r, { status: e.target.value }, `status → ${statusLabel(e.target.value)}`)}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-transparent ${BILLING_STATUS_CLASS[r.status] || "border-border text-muted-foreground"}`}>
                    {BILLING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </td>
                {([
                  ["plan_po_date", "Tgl PO"],
                  ["plan_invoice_date", "Tgl Invoice"],
                  ["plan_cash_in_date", "Tgl Cash In"],
                ] as const).map(([field, lbl]) => (
                  <td key={field} className="py-1.5 px-2">
                    <input type="date" defaultValue={(r as any)[field] || ""}
                      onBlur={e => e.target.value !== ((r as any)[field] || "") && patchRow(r, { [field]: e.target.value || null }, `${lbl} → ${e.target.value || "—"}`)}
                      className="px-1.5 py-0.5 text-[11px] bg-card border border-border rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ==== MODE: FULL ====
  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Billing — Termin Pembayaran Klien</h3>
          <p className="text-[10px] text-muted-foreground">Status termin (Plan → Di Progress → Terbayar), nominal, % progress ditagih, dan tanggal PO / Invoice / Cash In.</p>
        </div>
        <button onClick={() => setAddOpen(o => !o)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Tambah Termin</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { l: "Total Termin", v: formatIDR(total) },
          { l: "Di Progress", v: formatIDR(onProgress) },
          { l: "Terbayar", v: formatIDR(paid) },
          { l: "Belum Terbayar", v: formatIDR(total - paid) },
        ].map(k => (
          <div key={k.l} className="rounded border border-border bg-card p-2">
            <p className="text-[9px] uppercase text-muted-foreground">{k.l}</p>
            <p className="text-xs font-semibold text-foreground font-mono-data">{k.v}</p>
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
        <p className="text-xs text-muted-foreground text-center py-4">Belum ada data billing. Klik "Tambah Termin".</p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            if (editingId === r.id) {
              return (
                <div key={r.id} className="p-3 bg-muted/30 rounded border border-border/50">
                  <FormFields f={editForm} set={setEditForm} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => save(r.id)} disabled={saving} className="px-3 py-1 bg-success text-success-foreground rounded text-xs disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />Simpan</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-muted text-foreground rounded text-xs border border-border"><X className="h-3 w-3 inline mr-1" />Batal</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={r.id} className="rounded border border-border bg-card p-2.5">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{r.termin_code}</span>
                  <span className="text-xs font-semibold text-foreground flex-1 min-w-[120px]">{r.description || "—"}</span>
                  <span className="text-[11px] font-mono-data text-foreground">{formatIDR(r.plan_amount)}</span>
                  <span className="text-[11px] font-mono-data text-muted-foreground">{r.plan_progress_pct}%</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${BILLING_STATUS_CLASS[r.status] || "bg-muted text-muted-foreground border-border"}`}>
                    {statusLabel(r.status)}
                  </span>
                  <button onClick={() => { setEditingId(r.id); setEditForm(toForm(r)); }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3 w-3 text-primary" /></button>
                  <button onClick={() => del(r.id, r.termin_code)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
                  <span>Tgl PO: <span className="text-foreground font-mono-data">{fmtD(r.plan_po_date)}</span></span>
                  <span>Tgl Invoice: <span className="text-foreground font-mono-data">{fmtD(r.plan_invoice_date)}</span></span>
                  <span>Tgl Cash In: <span className="text-foreground font-mono-data">{fmtD(r.plan_cash_in_date)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

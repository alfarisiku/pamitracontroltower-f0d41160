import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Save, X, Pencil, Trash2 } from "lucide-react";
import { supabase, logActivity, formatIDR, DbBilling, BILLING_STATUSES } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const inputCls = "px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";
const fmtD = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

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
  plan_progress_pct: "", plan_amount: "", plan_po_date: "", plan_invoice_date: "", plan_cash_in_date: "",
  actual_progress_pct: "", actual_amount: "", paid_amount: "", actual_po_date: "", actual_invoice_date: "", actual_cash_in_date: "",
  notes: "",
};
type Form = typeof emptyForm;

const toForm = (b: DbBilling): Form => ({
  termin_code: b.termin_code || "",
  description: b.description || "",
  status: b.status || "plan",
  plan_progress_pct: String(b.plan_progress_pct ?? ""),
  plan_amount: String(b.plan_amount ?? ""),
  plan_po_date: b.plan_po_date || "",
  plan_invoice_date: b.plan_invoice_date || "",
  plan_cash_in_date: b.plan_cash_in_date || "",
  actual_progress_pct: String(b.actual_progress_pct ?? ""),
  actual_amount: String(b.actual_amount ?? ""),
  paid_amount: String(b.paid_amount ?? ""),
  actual_po_date: b.actual_po_date || "",
  actual_invoice_date: b.actual_invoice_date || "",
  actual_cash_in_date: b.actual_cash_in_date || "",
  notes: b.notes || "",
});

const toPayload = (f: Form, projectId: string, sortOrder: number) => ({
  project_id: projectId,
  termin_code: f.termin_code,
  description: f.description || null,
  status: f.status,
  sort_order: sortOrder,
  plan_progress_pct: Number(f.plan_progress_pct) || 0,
  plan_amount: Math.round(Number(f.plan_amount) || 0),
  plan_po_date: f.plan_po_date || null,
  plan_invoice_date: f.plan_invoice_date || null,
  plan_cash_in_date: f.plan_cash_in_date || null,
  actual_progress_pct: Number(f.actual_progress_pct) || 0,
  actual_amount: Math.round(Number(f.actual_amount) || 0),
  paid_amount: Math.round(Number(f.paid_amount) || 0),
  actual_po_date: f.actual_po_date || null,
  actual_invoice_date: f.actual_invoice_date || null,
  actual_cash_in_date: f.actual_cash_in_date || null,
  notes: f.notes || null,
});

function FormFields({ f, set }: { f: Form; set: (v: Form) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div><label className={labelCls}>Termin</label><input value={f.termin_code} onChange={e => set({ ...f, termin_code: e.target.value })} className={`w-full ${inputCls}`} placeholder="Termin 1 / DP" /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Deskripsi</label><input value={f.description} onChange={e => set({ ...f, description: e.target.value })} className={`w-full ${inputCls}`} placeholder="Pembayaran uang muka" /></div>
        <div><label className={labelCls}>Status</label>
          <select value={f.status} onChange={e => set({ ...f, status: e.target.value })} className={`w-full ${inputCls}`}>
            {BILLING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded border border-border/60 p-2 bg-muted/20">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Plan (Rencana Tagihan)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div><label className={labelCls}>Progress Ditagih (%)</label><input type="number" value={f.plan_progress_pct} onChange={e => set({ ...f, plan_progress_pct: e.target.value })} className={`w-full ${inputCls}`} placeholder="20" /></div>
          <div><label className={labelCls}>Nominal (Rp)</label><input type="number" value={f.plan_amount} onChange={e => set({ ...f, plan_amount: e.target.value })} className={`w-full ${inputCls}`} placeholder="500000000" />
            {f.plan_amount && <p className="text-[9px] text-muted-foreground mt-0.5">≈ {formatIDR(Number(f.plan_amount))}</p>}
          </div>
          <div><label className={labelCls}>Tgl PO</label><input type="date" value={f.plan_po_date} onChange={e => set({ ...f, plan_po_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
          <div><label className={labelCls}>Tgl Invoice</label><input type="date" value={f.plan_invoice_date} onChange={e => set({ ...f, plan_invoice_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
          <div><label className={labelCls}>Tgl Cash In</label><input type="date" value={f.plan_cash_in_date} onChange={e => set({ ...f, plan_cash_in_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
        </div>
      </div>

      <div className="rounded border border-border/60 p-2 bg-muted/20">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Actual (Realisasi)</p>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <div><label className={labelCls}>Progress Ditagih (%)</label><input type="number" value={f.actual_progress_pct} onChange={e => set({ ...f, actual_progress_pct: e.target.value })} className={`w-full ${inputCls}`} /></div>
          <div><label className={labelCls}>Nominal Invoice (Rp)</label><input type="number" value={f.actual_amount} onChange={e => set({ ...f, actual_amount: e.target.value })} className={`w-full ${inputCls}`} />
            {f.actual_amount && <p className="text-[9px] text-muted-foreground mt-0.5">≈ {formatIDR(Number(f.actual_amount))}</p>}
          </div>
          <div><label className={labelCls}>Dibayar (Rp)</label><input type="number" value={f.paid_amount} onChange={e => set({ ...f, paid_amount: e.target.value })} className={`w-full ${inputCls}`} />
            {f.paid_amount && <p className="text-[9px] text-muted-foreground mt-0.5">≈ {formatIDR(Number(f.paid_amount))}</p>}
          </div>
          <div><label className={labelCls}>Tgl PO</label><input type="date" value={f.actual_po_date} onChange={e => set({ ...f, actual_po_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
          <div><label className={labelCls}>Tgl Invoice</label><input type="date" value={f.actual_invoice_date} onChange={e => set({ ...f, actual_invoice_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
          <div><label className={labelCls}>Tgl Cash In</label><input type="date" value={f.actual_cash_in_date} onChange={e => set({ ...f, actual_cash_in_date: e.target.value })} className={`w-full ${inputCls}`} /></div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Sisa / Kurang Bayar: <span className="font-semibold text-foreground">{formatIDR((Number(f.actual_amount) || 0) - (Number(f.paid_amount) || 0))}</span>
        </p>
      </div>

      <div><label className={labelCls}>Catatan Tambahan</label><input value={f.notes} onChange={e => set({ ...f, notes: e.target.value })} className={`w-full ${inputCls}`} placeholder="Retensi 5% ditahan sampai serah terima" /></div>
    </div>
  );
}

export function BillingPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useBillings(projectId || undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["project_billings"] });

  const totalPlan = rows.reduce((s, r) => s + (r.plan_amount || 0), 0);
  const totalInvoiced = rows.reduce((s, r) => s + (r.actual_amount || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.paid_amount || 0), 0);

  const add = async () => {
    if (!form.termin_code) { toast({ title: "Isi nama termin", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("project_billings").insert(toPayload(form, projectId, rows.length));
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "billing", "create", `Billing ${form.termin_code} ditambahkan`, projectId);
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
    setEditingId(null); refresh(); toast({ title: "✅ Tersimpan" });
  };

  const del = async (id: string, code: string) => {
    if (!confirm(`Hapus billing "${code}"?`)) return;
    await (supabase as any).from("project_billings").delete().eq("id", id);
    await logActivity(supabase, "billing", "delete", `Billing ${code} dihapus`, projectId, id);
    refresh(); toast({ title: "🗑️ Dihapus" });
  };

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Billing — Termin Pembayaran Klien</h3>
          <p className="text-[10px] text-muted-foreground">Monitoring pengakuan pembayaran: rencana vs realisasi termin, invoice, dan cash in.</p>
        </div>
        <button onClick={() => setAddOpen(o => !o)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Tambah Termin</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { l: "Total Plan", v: formatIDR(totalPlan) },
          { l: "Total Invoice", v: formatIDR(totalInvoiced) },
          { l: "Total Dibayar", v: formatIDR(totalPaid) },
          { l: "Sisa Bayar", v: formatIDR(totalInvoiced - totalPaid) },
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
            const remaining = (r.actual_amount || 0) - (r.paid_amount || 0);
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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${r.status === "paid" ? "bg-success/15 text-success border-success/30" : r.status === "partial" ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground border-border"}`}>
                    {BILLING_STATUSES.find(s => s.value === r.status)?.label || r.status}
                  </span>
                  <button onClick={() => { setEditingId(r.id); setEditForm(toForm(r)); }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3 w-3 text-primary" /></button>
                  <button onClick={() => del(r.id, r.termin_code)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-[9px] uppercase text-muted-foreground border-b border-border/40">
                      <th className="text-left py-1 pr-2"></th>
                      <th className="text-right py-1 px-2">Progress</th>
                      <th className="text-right py-1 px-2">Nominal</th>
                      <th className="text-left py-1 px-2">Tgl PO</th>
                      <th className="text-left py-1 px-2">Tgl Invoice</th>
                      <th className="text-left py-1 px-2">Tgl Cash In</th>
                    </tr></thead>
                    <tbody>
                      <tr className="border-b border-border/20">
                        <td className="py-1 pr-2 text-muted-foreground">Plan</td>
                        <td className="py-1 px-2 text-right font-mono-data">{r.plan_progress_pct}%</td>
                        <td className="py-1 px-2 text-right font-mono-data">{formatIDR(r.plan_amount)}</td>
                        <td className="py-1 px-2">{fmtD(r.plan_po_date)}</td>
                        <td className="py-1 px-2">{fmtD(r.plan_invoice_date)}</td>
                        <td className="py-1 px-2">{fmtD(r.plan_cash_in_date)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2 text-muted-foreground">Actual</td>
                        <td className="py-1 px-2 text-right font-mono-data text-foreground">{r.actual_progress_pct}%</td>
                        <td className="py-1 px-2 text-right font-mono-data text-foreground">{formatIDR(r.actual_amount)}</td>
                        <td className="py-1 px-2">{fmtD(r.actual_po_date)}</td>
                        <td className="py-1 px-2">{fmtD(r.actual_invoice_date)}</td>
                        <td className="py-1 px-2">{fmtD(r.actual_cash_in_date)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[10px]">
                  <span className="text-muted-foreground">Dibayar: <span className="font-mono-data text-foreground">{formatIDR(r.paid_amount)}</span></span>
                  <span className={remaining > 0 ? "text-warning" : "text-success"}>
                    {remaining > 0 ? "Kurang bayar" : remaining < 0 ? "Lebih bayar" : "Lunas"}: <span className="font-mono-data">{formatIDR(Math.abs(remaining))}</span>
                  </span>
                  {r.notes && <span className="text-muted-foreground italic">“{r.notes}”</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

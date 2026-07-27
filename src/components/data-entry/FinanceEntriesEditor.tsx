import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Wallet, Filter, Search, Edit3, X, Download } from "lucide-react";
import { supabase, formatRupiah, formatIDR, jutaToRupiah, rupiahToJuta, logActivity, FINANCE_CATEGORIES, DbFinanceEntry, FinanceCategory, FinanceDirection } from "@/lib/supabase";
import { DateRangeInput } from "@/components/ui/date-range-input";
import { useFinanceEntries } from "@/hooks/useProjects";
import { useProjectPeriods, ProjectPeriod } from "@/hooks/useProjectPeriods";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

type PlanKind = "rap" | "actual"; // rap = planning
type Form = {
  direction: FinanceDirection;
  category: FinanceCategory;
  entry_kind: PlanKind;
  period_id: string; // id of s_curve baseline row
  amount: string;
  description: string;
};

const emptyForm = (): Form => ({
  direction: "out", category: "material", entry_kind: "actual",
  period_id: "",
  amount: "", description: "",
});

function fmtDMY(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function periodOptionLabel(p: ProjectPeriod) {
  return `${p.period_label} — ${fmtDMY(p.period_start)} → ${fmtDMY(p.period_end)}`;
}

export function FinanceEntriesEditor({ projectId }: { projectId: string }) {
  const { data: entries = [], isLoading } = useFinanceEntries(projectId);
  const { periods, nextUnfilled } = useProjectPeriods(projectId);
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const [fDir, setFDir] = useState<"all"|FinanceDirection>("all");
  const [fKind, setFKind] = useState<"all"|PlanKind>("all");
  const [fCat, setFCat] = useState<"all"|FinanceCategory>("all");
  const [fFreq, setFFreq] = useState<"all"|"weekly"|"monthly">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!form.period_id && nextUnfilled) setForm(f => ({ ...f, period_id: nextUnfilled.id }));
  }, [nextUnfilled, form.period_id]);

  const periodById = useMemo(() => {
    const m = new Map<string, ProjectPeriod>();
    periods.forEach(p => m.set(p.id, p));
    return m;
  }, [periods]);

  // Match a raw period_date (ISO) to a baseline period whose range contains it.
  const findPeriodByDate = (iso: string): ProjectPeriod | undefined => {
    if (!iso) return undefined;
    return periods.find(p => iso >= p.period_start && iso <= p.period_end)
      ?? periods.find(p => p.period_end === iso);
  };

  // Filter entries: only show plan (rap) & actual entries (drop legacy po/forecast)
  const visible = useMemo(() => entries.filter(e => e.entry_kind === "rap" || e.entry_kind === "actual"), [entries]);

  const filtered = useMemo(() => visible.filter(e =>
    (fDir === "all" || e.direction === fDir) &&
    (fKind === "all" || e.entry_kind === fKind) &&
    (fCat === "all" || e.category === fCat) &&
    (!dateFrom || e.period_date >= dateFrom) &&
    (!dateTo || e.period_date <= dateTo) &&
    (!search || (e.description || "").toLowerCase().includes(search.toLowerCase()) || e.period_label.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b) => b.period_date.localeCompare(a.period_date)), [visible, fDir, fKind, fCat, dateFrom, dateTo, search]);

  const totals = useMemo(() => {
    const t = { plan_in:0, actual_in:0, plan_out:0, actual_out:0 };
    for (const e of visible) {
      const amt = Number(e.amount) || 0;
      if (e.direction === "in") {
        if (e.entry_kind === "rap") t.plan_in += amt; else t.actual_in += amt;
      } else {
        if (e.entry_kind === "rap") t.plan_out += amt; else t.actual_out += amt;
      }
    }
    return t;
  }, [visible]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const rp = parseFloat(form.amount) || 0;
      if (rp <= 0) throw new Error("Amount (Rp) harus > 0");
      const amt = rupiahToJuta(rp); // store in Juta for backwards compat
      const { monthLabel } = periodLabels(form.period_date);
      const { error } = await (supabase as any).from("finance_entries").insert({
        project_id: projectId,
        direction: form.direction,
        category: form.direction === "in" ? null : form.category,
        entry_kind: form.entry_kind,
        frequency: "monthly",
        period_date: form.period_date,
        period_label: monthLabel,
        amount: amt,
        description: form.description || null,
      });
      if (error) throw error;
      await logActivity(supabase, "finance", "create", `${form.entry_kind === "rap" ? "Plan" : "Actual"} ${form.direction === "in" ? "In" : `Out (${form.category})`} ${formatIDR(rp)} on ${form.period_date}`, projectId);
      qc.invalidateQueries({ queryKey: ["finance_entries"] });
      qc.invalidateQueries({ queryKey: ["finance_entries_all"] });
      qc.invalidateQueries({ queryKey: ["project_cashflow"] });
      toast({ title: "✅ Saved" });
      setForm(emptyForm()); setShowAdd(false);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveEdit = async (id: string) => {
    const rp = parseFloat(edit.amount) || 0;
    const amt = rupiahToJuta(rp);
    const { monthLabel } = periodLabels(edit.period_date);
    const { error } = await (supabase as any).from("finance_entries").update({
      direction: edit.direction, category: edit.direction === "in" ? null : edit.category,
      entry_kind: edit.entry_kind, period_date: edit.period_date, period_label: monthLabel,
      amount: amt, description: edit.description || null,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "finance", "update", `Finance entry updated ${formatIDR(rp)}`, projectId, id);
    qc.invalidateQueries({ queryKey: ["finance_entries"] });
    qc.invalidateQueries({ queryKey: ["finance_entries_all"] });
    setEditingId(null); toast({ title: "✅ Updated" });
  };


  const handleDelete = async (e: DbFinanceEntry) => {
    if (!confirm(`Hapus entry ${formatRupiah(Number(e.amount))} (${e.period_label})?`)) return;
    await (supabase as any).from("finance_entries").delete().eq("id", e.id);
    await logActivity(supabase, "finance", "delete", `Finance entry deleted: ${formatRupiah(Number(e.amount))}`, projectId, e.id);
    qc.invalidateQueries({ queryKey: ["finance_entries"] });
    qc.invalidateQueries({ queryKey: ["finance_entries_all"] });
  };

  const exportCSV = () => {
    const header = ["Date","Direction","Kind","Category","Amount (Jt)","Description"];
    const rows = filtered.map(e => [e.period_date, e.direction, e.entry_kind === "rap" ? "Plan" : "Actual", e.category || "", e.amount, (e.description||"").replace(/,/g," ")]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `finance_${projectId}_${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="glass-card rounded-lg p-3 border border-primary/30"><p className="text-[9px] uppercase text-muted-foreground">Plan Cash In</p><p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totals.plan_in)}</p></div>
        <div className="glass-card rounded-lg p-3 border border-success/30"><p className="text-[9px] uppercase text-muted-foreground">Actual Cash In</p><p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totals.actual_in)}</p></div>
        <div className="glass-card rounded-lg p-3 border border-warning/30"><p className="text-[9px] uppercase text-muted-foreground">Plan Cash Out</p><p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(totals.plan_out)}</p></div>
        <div className="glass-card rounded-lg p-3 border border-destructive/30"><p className="text-[9px] uppercase text-muted-foreground">Actual Cash Out</p><p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(totals.actual_out)}</p></div>
      </div>

      <div className="glass-card rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Cash Flow Transactions ({filtered.length}/{visible.length})</h3>
          <div className="flex gap-1">
            <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 bg-success text-success-foreground rounded text-[10px]"><Download className="h-3 w-3" /> CSV</button>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px]"><Plus className="h-3 w-3" /> Add</button>
          </div>
        </div>

        {showAdd && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><label className={labelCls}>Cash Flow Type</label>
                <select value={form.direction} onChange={e => setForm({...form, direction: e.target.value as FinanceDirection})} className={inputCls}>
                  <option value="in">Cash In</option><option value="out">Cash Out</option>
                </select>
              </div>
              <div><label className={labelCls}>Planning / Actual</label>
                <select value={form.entry_kind} onChange={e => setForm({...form, entry_kind: e.target.value as PlanKind})} className={inputCls}>
                  <option value="rap">Planning</option><option value="actual">Actual</option>
                </select>
              </div>
              {form.direction === "out" && (
                <div><label className={labelCls}>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as FinanceCategory})} className={inputCls}>
                    {FINANCE_CATEGORIES.filter(c => c.value !== "other").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div><label className={labelCls}>Transaction Date*</label><input type="date" value={form.period_date} onChange={e => setForm({...form, period_date: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Amount (Rp — utuh)*</label>
                <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} placeholder="mis. 150000000" />
                {form.amount && <p className="text-[9px] text-muted-foreground mt-0.5">= {formatIDR(parseFloat(form.amount) || 0)}</p>}
              </div>
              <div className="sm:col-span-3"><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inputCls} placeholder="Termin dari client / Bayar vendor XYZ / …" /></div>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 italic">💡 Input dalam Rupiah utuh (mis. 150.000.000). Ditampilkan singkat (Jt/M/T) di dashboard proyek.</p>
            <div className="flex gap-2 mt-2">
              <button onClick={handleAdd} disabled={saving || !form.amount} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />{saving ? "..." : "Save"}</button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-muted rounded text-xs border border-border">Cancel</button>
            </div>
          </div>
        )}

        {/* Filters — reorganized: labeled grid */}
        <div className="bg-muted/20 border border-border/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold mb-2"><Filter className="h-3 w-3" /> Filter & Search</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div><label className={labelCls}>Type</label>
              <select value={fDir} onChange={e => setFDir(e.target.value as any)} className={inputCls}><option value="all">All</option><option value="in">Cash In</option><option value="out">Cash Out</option></select>
            </div>
            <div><label className={labelCls}>Plan / Actual</label>
              <select value={fKind} onChange={e => setFKind(e.target.value as any)} className={inputCls}><option value="all">Plan + Actual</option><option value="rap">Planning</option><option value="actual">Actual</option></select>
            </div>
            <div><label className={labelCls}>Category</label>
              <select value={fCat} onChange={e => setFCat(e.target.value as any)} className={inputCls}>
                <option value="all">All Category</option>
                {FINANCE_CATEGORIES.filter(c => c.value !== "other").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Date Range</label>
              <DateRangeInput startISO={dateFrom} endISO={dateTo} onChange={(s, e) => { setDateFrom(s); setDateTo(e); }} />
            </div>
            <div><label className={labelCls}>Search</label>
              <div className="flex items-center gap-1"><Search className="h-3 w-3 text-muted-foreground shrink-0" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Description..." className={inputCls} /></div>
            </div>
          </div>
        </div>


        {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada transaksi yang cocok.</p>
        ) : (
          <div className="overflow-auto max-h-[520px] border border-border rounded-md">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10"><tr className="bg-muted border-b border-border">
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Date</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Type</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Plan/Act</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Category</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Amount</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Description</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-16"></th>
              </tr></thead>
              <tbody>
                {filtered.map(e => editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border/30 bg-muted/20">
                    <td className="py-1 px-1"><input type="date" value={edit.period_date} onChange={ev => setEdit({...edit, period_date: ev.target.value})} className={inputCls} /></td>
                    <td className="py-1 px-1"><select value={edit.direction} onChange={ev => setEdit({...edit, direction: ev.target.value})} className={inputCls}><option value="in">In</option><option value="out">Out</option></select></td>
                    <td className="py-1 px-1"><select value={edit.entry_kind} onChange={ev => setEdit({...edit, entry_kind: ev.target.value})} className={inputCls}><option value="rap">Plan</option><option value="actual">Actual</option></select></td>
                    <td className="py-1 px-1">{edit.direction === "out" ? (<select value={edit.category || ""} onChange={ev => setEdit({...edit, category: ev.target.value})} className={inputCls}>{FINANCE_CATEGORIES.filter(c => c.value !== "other").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>) : "—"}</td>
                    <td className="py-1 px-1"><input type="number" value={edit.amount} onChange={ev => setEdit({...edit, amount: ev.target.value})} className={inputCls + " text-right"} /></td>
                    <td className="py-1 px-1"><input value={edit.description || ""} onChange={ev => setEdit({...edit, description: ev.target.value})} className={inputCls} /></td>
                    <td className="py-1 px-1 flex gap-1"><button onClick={() => saveEdit(e.id)} className="p-1 bg-success/15 rounded"><Save className="h-3 w-3 text-success" /></button><button onClick={() => setEditingId(null)} className="p-1 bg-muted rounded"><X className="h-3 w-3" /></button></td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-1.5 px-2 font-medium text-foreground">{new Date(e.period_date).toLocaleDateString('id-ID')}</td>
                    <td className="py-1.5 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${e.direction === "in" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>{e.direction === "in" ? "IN" : "OUT"}</span></td>
                    <td className="py-1.5 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${e.entry_kind === "rap" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/15 text-primary border-primary/30"}`}>{e.entry_kind === "rap" ? "PLAN" : "ACTUAL"}</span></td>
                    <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{e.category ? (FINANCE_CATEGORIES.find(c => c.value === e.category)?.label || e.category) : "—"}</td>
                    <td className={`py-1.5 px-2 text-right font-mono-data font-medium ${e.direction === "in" ? "text-success" : "text-destructive"}`}>{formatIDR(jutaToRupiah(Number(e.amount)))}</td>
                    <td className="py-1.5 px-2 text-[10px] text-muted-foreground truncate max-w-[240px]">{e.description || "—"}</td>
                    <td className="py-1.5 px-2 flex gap-1"><button onClick={() => { setEditingId(e.id); setEdit({...e, amount: jutaToRupiah(Number(e.amount))}); }} className="p-1 hover:bg-primary/10 rounded"><Edit3 className="h-3 w-3 text-primary" /></button><button onClick={() => handleDelete(e)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                  </tr>

                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

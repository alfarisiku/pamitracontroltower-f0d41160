import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Wallet, Filter, Search } from "lucide-react";
import { supabase, formatRupiah, logActivity, FINANCE_CATEGORIES, FINANCE_KIND_LABELS, DbFinanceEntry, FinanceCategory, FinanceEntryKind, FinanceDirection, FinanceFrequency } from "@/lib/supabase";
import { useFinanceEntries } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

type Form = {
  direction: FinanceDirection;
  category: FinanceCategory;
  entry_kind: FinanceEntryKind;
  frequency: FinanceFrequency;
  period_date: string;
  period_label: string;
  amount: string;
  description: string;
  related_activity: string;
};

const emptyForm = (): Form => ({
  direction: "out", category: "material", entry_kind: "actual", frequency: "monthly",
  period_date: new Date().toISOString().slice(0,10), period_label: "",
  amount: "", description: "", related_activity: "",
});

export function FinanceEntriesEditor({ projectId }: { projectId: string }) {
  const { data: entries = [], isLoading } = useFinanceEntries(projectId);
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [fDir, setFDir] = useState<"all"|FinanceDirection>("all");
  const [fKind, setFKind] = useState<"all"|FinanceEntryKind>("all");
  const [fCat, setFCat] = useState<"all"|FinanceCategory>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => entries.filter(e =>
    (fDir === "all" || e.direction === fDir) &&
    (fKind === "all" || e.entry_kind === fKind) &&
    (fCat === "all" || e.category === fCat) &&
    (!search || (e.description || "").toLowerCase().includes(search.toLowerCase()) || (e.related_activity||"").toLowerCase().includes(search.toLowerCase()) || e.period_label.toLowerCase().includes(search.toLowerCase()))
  ), [entries, fDir, fKind, fCat, search]);

  const totals = useMemo(() => {
    const t = { rap_out:0, po_out:0, actual_out:0, forecast_out:0, actual_in:0, forecast_in:0 };
    for (const e of entries) {
      const amt = Number(e.amount) || 0;
      if (e.direction === "out") {
        if (e.entry_kind === "rap") t.rap_out += amt;
        else if (e.entry_kind === "po") t.po_out += amt;
        else if (e.entry_kind === "actual") t.actual_out += amt;
        else if (e.entry_kind === "forecast") t.forecast_out += amt;
      } else {
        if (e.entry_kind === "actual") t.actual_in += amt;
        else if (e.entry_kind === "forecast") t.forecast_in += amt;
      }
    }
    return t;
  }, [entries]);

  const remaining = Math.max(totals.rap_out - totals.actual_out, 0);
  const rapVsActualPct = totals.rap_out > 0 ? Math.round((totals.actual_out / totals.rap_out) * 100) : 0;

  const autoLabel = (dateStr: string, freq: FinanceFrequency): string => {
    const d = new Date(dateStr);
    if (freq === "monthly") return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    // weekly: Wk of Mon dd
    return `Wk ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const amt = parseFloat(form.amount) || 0;
      if (amt <= 0) throw new Error("Amount harus > 0");
      const label = form.period_label || autoLabel(form.period_date, form.frequency);
      const { error } = await (supabase as any).from("finance_entries").insert({
        project_id: projectId,
        direction: form.direction,
        category: form.direction === "in" ? null : form.category,
        entry_kind: form.entry_kind,
        frequency: form.frequency,
        period_date: form.period_date,
        period_label: label,
        amount: amt,
        description: form.description || null,
        related_activity: form.related_activity || null,
      });
      if (error) throw error;
      await logActivity(supabase, "finance", "create", `Finance entry: ${form.entry_kind.toUpperCase()} ${form.direction} ${form.direction==='in'?'':form.category+' '}${formatRupiah(amt)} (${label})`, projectId);
      queryClient.invalidateQueries({ queryKey: ["finance_entries"] });
      queryClient.invalidateQueries({ queryKey: ["finance_entries_all"] });
      queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Saved", description: "Finance entry ditambahkan" });
      setForm(emptyForm());
      setShowAdd(false);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (e: DbFinanceEntry) => {
    if (!confirm(`Hapus entry ${e.entry_kind} ${e.direction} ${formatRupiah(Number(e.amount))} (${e.period_label})?`)) return;
    const { error } = await (supabase as any).from("finance_entries").delete().eq("id", e.id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "finance", "delete", `Finance entry deleted: ${e.entry_kind} ${formatRupiah(Number(e.amount))}`, projectId, e.id);
    queryClient.invalidateQueries({ queryKey: ["finance_entries"] });
    queryClient.invalidateQueries({ queryKey: ["finance_entries_all"] });
    queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
  };

  const kindBadge = (k: FinanceEntryKind) => {
    const cls: Record<FinanceEntryKind,string> = {
      rap: "bg-warning/15 text-warning border-warning/30",
      po: "bg-primary/15 text-primary border-primary/30",
      actual: "bg-success/15 text-success border-success/30",
      forecast: "bg-info/15 text-info border-info/30",
    };
    return <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${cls[k]}`}>{k.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <div className="glass-card rounded-lg p-3 border border-warning/30">
          <p className="text-[9px] text-muted-foreground uppercase">RAP (Plan Out)</p>
          <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(totals.rap_out)}</p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-primary/30">
          <p className="text-[9px] text-muted-foreground uppercase">PO Committed</p>
          <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totals.po_out)}</p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-success/30">
          <p className="text-[9px] text-muted-foreground uppercase">Actual Out</p>
          <p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totals.actual_out)}</p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-info/30">
          <p className="text-[9px] text-muted-foreground uppercase">Forecast Out</p>
          <p className="text-sm font-bold font-mono-data text-info">{formatRupiah(totals.forecast_out)}</p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-success/30">
          <p className="text-[9px] text-muted-foreground uppercase">Cash In (Actual)</p>
          <p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totals.actual_in)}</p>
        </div>
        <div className={`glass-card rounded-lg p-3 border ${rapVsActualPct > 100 ? "border-destructive/40" : "border-border"}`}>
          <p className="text-[9px] text-muted-foreground uppercase">Actual vs RAP</p>
          <p className={`text-sm font-bold font-mono-data ${rapVsActualPct > 100 ? "text-destructive" : rapVsActualPct > 80 ? "text-warning" : "text-foreground"}`}>{rapVsActualPct}%</p>
          <p className="text-[9px] text-muted-foreground">Sisa: {formatRupiah(remaining)}</p>
        </div>
      </div>

      <div className="glass-card rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Finance Entries ({filtered.length}/{entries.length})</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add Entry</button>
        </div>

        {showAdd && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div><label className={labelCls}>Direction</label>
                <select value={form.direction} onChange={e => setForm({...form, direction: e.target.value as FinanceDirection})} className={inputCls}>
                  <option value="out">Out (Cash Out)</option><option value="in">In (Cash In)</option>
                </select>
              </div>
              <div><label className={labelCls}>Kind</label>
                <select value={form.entry_kind} onChange={e => setForm({...form, entry_kind: e.target.value as FinanceEntryKind})} className={inputCls}>
                  <option value="rap">RAP (Plan)</option><option value="po">PO (Committed)</option><option value="actual">Actual</option><option value="forecast">Forecast</option>
                </select>
              </div>
              {form.direction === "out" && (
                <div><label className={labelCls}>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as FinanceCategory})} className={inputCls}>
                    {FINANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )}
              <div><label className={labelCls}>Frequency</label>
                <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as FinanceFrequency})} className={inputCls}>
                  <option value="monthly">Monthly</option><option value="weekly">Weekly</option>
                </select>
              </div>
              <div><label className={labelCls}>Period Date*</label><input type="date" value={form.period_date} onChange={e => setForm({...form, period_date: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Period Label (opt)</label><input value={form.period_label} onChange={e => setForm({...form, period_label: e.target.value})} className={inputCls} placeholder="auto" /></div>
              <div><label className={labelCls}>Amount (Rp Juta)*</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Related Activity</label><input value={form.related_activity} onChange={e => setForm({...form, related_activity: e.target.value})} className={inputCls} placeholder="WBS/Piping/…" /></div>
              <div className="sm:col-span-4"><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inputCls} placeholder="Termin 1 dari client / Bayar vendor XYZ / …" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving || !form.amount} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />{saving ? "..." : "Save Entry"}</button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-muted text-foreground rounded text-xs border border-border">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <select value={fDir} onChange={e => setFDir(e.target.value as any)} className={inputCls + " w-auto"}>
            <option value="all">All Direction</option><option value="out">Out</option><option value="in">In</option>
          </select>
          <select value={fKind} onChange={e => setFKind(e.target.value as any)} className={inputCls + " w-auto"}>
            <option value="all">All Kind</option>
            {(Object.keys(FINANCE_KIND_LABELS) as FinanceEntryKind[]).map(k => <option key={k} value={k}>{FINANCE_KIND_LABELS[k]}</option>)}
          </select>
          <select value={fCat} onChange={e => setFCat(e.target.value as any)} className={inputCls + " w-auto"}>
            <option value="all">All Category</option>
            {FINANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="flex items-center gap-1 flex-1 min-w-[160px]">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search description / activity / period…" className={inputCls} />
          </div>
        </div>

        {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada finance entries yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Period</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Freq</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Dir</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Kind</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Category</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Amount</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Description</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-10"></th>
              </tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border/30">
                    <td className="py-1.5 px-2 font-medium text-foreground">{e.period_label}</td>
                    <td className="py-1.5 px-2 text-[10px] capitalize text-muted-foreground">{e.frequency}</td>
                    <td className="py-1.5 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${e.direction === "in" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>{e.direction.toUpperCase()}</span></td>
                    <td className="py-1.5 px-2">{kindBadge(e.entry_kind)}</td>
                    <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{e.category ? (FINANCE_CATEGORIES.find(c => c.value === e.category)?.label || e.category) : "—"}</td>
                    <td className={`py-1.5 px-2 text-right font-mono-data font-medium ${e.direction === "in" ? "text-success" : "text-destructive"}`}>{formatRupiah(Number(e.amount))}</td>
                    <td className="py-1.5 px-2 text-[10px] text-muted-foreground truncate max-w-[240px]">{e.description || "—"}{e.related_activity ? <span className="text-primary"> · {e.related_activity}</span> : null}</td>
                    <td className="py-1.5 px-2"><button onClick={() => handleDelete(e)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
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

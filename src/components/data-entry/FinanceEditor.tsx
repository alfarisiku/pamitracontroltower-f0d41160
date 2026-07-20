import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Save, Trash2, Lock, Unlock, Info } from "lucide-react";
import { supabase, formatRupiah, logActivity, DbProject } from "@/lib/supabase";
import { usePurchaseOrders } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";
import { FormulaTooltip } from "@/components/dashboard/FormulaTooltip";

export function FinanceEditor({ projectId, projects }: { projectId: string; projects: DbProject[] }) {
  const { data: poItems = [], isLoading: poLoading } = usePurchaseOrders(projectId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAddPO, setShowAddPO] = useState(false);
  const [poForm, setPoForm] = useState({ description: "", amount: "", po_date: "", vendor: "", related_activity: "", category: "material", status: "committed" });

  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  // When PO is created/marked paid, ALSO record a finance_entries actual cash-out
  const recordFinanceOut = async (opts: { amount: number; date: string; description: string; category: string; poId?: string; related?: string }) => {
    const d = new Date(opts.date || Date.now());
    const period_date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
    const period_label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    await (supabase as any).from("finance_entries").insert({
      project_id: projectId, direction: "out", category: opts.category,
      entry_kind: "actual", frequency: "monthly",
      period_date, period_label, amount: opts.amount,
      description: opts.description, related_activity: opts.related || null, po_id: opts.poId || null,
    });
    queryClient.invalidateQueries({ queryKey: ["finance_entries"] });
    queryClient.invalidateQueries({ queryKey: ["finance_entries_all"] });
    queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
  };

  const handleAddPO = async () => {
    setSaving(true);
    try {
      const amt = parseInt(poForm.amount) || 0;
      const { data: inserted, error } = await supabase.from("purchase_orders").insert({
        project_id: projectId, description: poForm.description, amount: amt,
        po_date: poForm.po_date || null, vendor: poForm.vendor, related_activity: poForm.related_activity,
        category: poForm.category, status: poForm.status,
      }).select().single();
      if (error) throw error;
      await logActivity(supabase, "purchase_order", "create", `PO added: ${poForm.description} (${formatRupiah(amt)}, ${poForm.status})`, projectId);

      if (poForm.status === "paid" && amt > 0) {
        const cat = ["material","equipment","services","other"].includes(poForm.category) ? poForm.category : "material";
        await recordFinanceOut({ amount: amt, date: poForm.po_date || "", description: `PO Paid: ${poForm.description}`, category: cat, poId: inserted?.id, related: poForm.related_activity });
        await logActivity(supabase, "finance", "auto_create", `Auto Actual cash-out from PO paid: ${formatRupiah(amt)}`, projectId);
      }

      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: poForm.status === "paid" ? "PO + Actual cash-out tercatat" : "Purchase Order ditambahkan" });
      setShowAddPO(false);
      setPoForm({ description: "", amount: "", po_date: "", vendor: "", related_activity: "", category: "material", status: "committed" });
    } catch (e: any) { toast({ title: "❌ Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleMarkPOPaid = async (po: any) => {
    if (po.status === "paid") return;
    if (!confirm(`Tandai PO "${po.description}" sebagai PAID?\n\nAkan otomatis membuat entri Actual cash-out di Finance module.`)) return;
    setSaving(true);
    try {
      await supabase.from("purchase_orders").update({ status: "paid" }).eq("id", po.id);
      const cat = ["material","equipment","services","other"].includes(po.category) ? po.category : "material";
      await recordFinanceOut({ amount: po.amount, date: po.po_date || "", description: `PO Paid: ${po.description}`, category: cat, poId: po.id, related: po.related_activity });
      await logActivity(supabase, "purchase_order", "mark_paid", `PO PAID: ${po.description} (${formatRupiah(po.amount)}) → Actual cash-out`, projectId, po.id);
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Paid", description: `Actual cash-out ${formatRupiah(po.amount)} tercatat` });
    } catch (e: any) { toast({ title: "❌ Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeletePO = async (id: string, desc: string) => {
    if (!confirm(`Hapus PO "${desc}"?`)) return;
    await supabase.from("purchase_orders").delete().eq("id", id);
    await logActivity(supabase, "purchase_order", "delete", `PO deleted: ${desc}`, projectId, id);
    queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const totalPO = poItems.reduce((s, po) => s + po.amount, 0);
  const p = projects.find(pr => pr.id === projectId);

  const cv = p ? (p.contract_value || p.budget) : 0;
  const computedMarginPct = cv > 0 ? Math.round(((cv - (p?.spent || 0)) / cv) * 100) : 0;
  const computedMarginRp = cv - (p?.spent || 0);

  const handleToggleMarginLock = async () => {
    if (!p) return;
    const newVal = !p.margin_locked;
    const { error } = await supabase.from("projects").update({ margin_locked: newVal }).eq("id", p.id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "project", newVal ? "margin_locked" : "margin_unlocked", `Margin ${newVal ? "LOCKED" : "UNLOCKED"} for ${p.project_code}`, p.id, p.id);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project", p.id] });
  };

  return (
    <div className="space-y-5">
      {p && (
        <div className="glass-card rounded-lg shadow-card p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Financial Overview & Margin Control</h3>
            <button onClick={handleToggleMarginLock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium border transition-colors ${p.margin_locked ? "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25" : "bg-success/15 text-success border-success/30 hover:bg-success/25"}`}>
              {p.margin_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {p.margin_locked ? "Margin Locked" : "Lock Margin"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Contract Value<FormulaTooltip title="Contract Value" formula="contract_value" description="Nilai kontrak resmi client." /></p>
              <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(p.contract_value || p.budget)}</p>
            </div>
            <div className="bg-muted rounded-lg p-3 border border-border text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Budget</p>
              <p className="text-sm font-bold font-mono-data text-foreground">{formatRupiah(p.budget)}</p>
            </div>
            <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">RAP</p>
              <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(p.rap)}</p>
            </div>
            <div className="bg-info/5 rounded-lg p-3 border border-border text-center">
              <p className="text-[9px] text-muted-foreground uppercase">PO Committed</p>
              <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totalPO)}</p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Actual Spent</p>
              <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(p.spent)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-lg p-3 border text-center ${computedMarginPct > 10 ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase">Actual Margin %</p>
              <p className={`text-lg font-bold font-mono-data ${computedMarginPct > 10 ? "text-success" : computedMarginPct > 0 ? "text-warning" : "text-destructive"}`}>{computedMarginPct}%</p>
            </div>
            <div className={`rounded-lg p-3 border text-center ${computedMarginRp > 0 ? "bg-success/5 border-success/30" : "bg-destructive/5 border-destructive/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase">Actual Margin Rp</p>
              <p className={`text-lg font-bold font-mono-data ${computedMarginRp > 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(computedMarginRp)}</p>
            </div>
            <div className="bg-info/5 rounded-lg p-3 border border-info/30 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Target Margin %</p>
              <p className="text-lg font-bold font-mono-data text-info">{p.profit_margin_target}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">📋 Purchase Orders ({poItems.length})</h3>
          <button onClick={() => setShowAddPO(!showAddPO)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add PO</button>
        </div>
        {showAddPO && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div><label className={labelCls}>Description*</label><input value={poForm.description} onChange={e => setPoForm({...poForm, description: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Vendor</label><input value={poForm.vendor} onChange={e => setPoForm({...poForm, vendor: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Amount (Rp Juta)</label><input type="number" value={poForm.amount} onChange={e => setPoForm({...poForm, amount: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>PO Date</label><input type="date" value={poForm.po_date} onChange={e => setPoForm({...poForm, po_date: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Category</label>
                <select value={poForm.category} onChange={e => setPoForm({...poForm, category: e.target.value})} className={inputCls}>
                  <option value="material">Material</option><option value="equipment">Equipment</option><option value="services">Services</option><option value="other">Other</option>
                </select>
              </div>
              <div><label className={labelCls}>Related Activity</label><input value={poForm.related_activity} onChange={e => setPoForm({...poForm, related_activity: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Status</label>
                <select value={poForm.status} onChange={e => setPoForm({...poForm, status: e.target.value})} className={inputCls}>
                  <option value="committed">Committed</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddPO} disabled={saving || !poForm.description} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />{saving ? "..." : "Save PO"}</button>
              <button onClick={() => setShowAddPO(false)} className="px-3 py-1.5 bg-muted text-foreground rounded text-xs border border-border">Cancel</button>
            </div>
          </div>
        )}
        {poLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : poItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada Purchase Order.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Description</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Vendor</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Amount</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Category</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Date</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Status</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-10"></th>
              </tr></thead>
              <tbody>
                {poItems.map(po => (
                  <tr key={po.id} className="border-b border-border/30">
                    <td className="py-1.5 px-2 font-medium text-foreground">{po.description}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{po.vendor}</td>
                    <td className="py-1.5 px-2 text-right font-mono-data text-accent">{formatRupiah(po.amount)}</td>
                    <td className="py-1.5 px-2 capitalize text-muted-foreground">{po.category}</td>
                    <td className="py-1.5 px-2 text-[9px] font-mono-data text-muted-foreground">{po.po_date ? new Date(po.po_date).toLocaleDateString("id-ID", {day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
                    <td className="py-1.5 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${po.status === "paid" ? "bg-success/15 text-success border-success/30" : po.status === "cancelled" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-primary/15 text-primary border-primary/30"}`}>{po.status}</span></td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1">
                        {po.status !== "paid" && po.status !== "cancelled" && (
                          <button onClick={() => handleMarkPOPaid(po)} title="Mark Paid → Actual cash-out" className="text-[9px] px-1.5 py-0.5 bg-success/10 text-success rounded border border-success/30 hover:bg-success/20 font-medium">Pay</button>
                        )}
                        <button onClick={() => handleDeletePO(po.id, po.description)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card rounded-lg shadow-card p-3 bg-info/5 border border-info/20">
        <p className="text-[11px] text-info flex items-center gap-2">
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Untuk detailed cash-in / cash-out per kategori (RAP • PO • Actual • Forecast, weekly/monthly), gunakan tab <strong>Finance Entries</strong> atau halaman <strong>Finance</strong>.</span>
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Save, Trash2, Lock, Unlock } from "lucide-react";
import { supabase, formatRupiah, logActivity, DbProject } from "@/lib/supabase";
import { usePurchaseOrders, useProjectCashflow } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";
import { FormulaTooltip } from "@/components/dashboard/FormulaTooltip";

export function FinanceEditor({ projectId, projects }: { projectId: string; projects: DbProject[] }) {
  const { data: poItems = [], isLoading: poLoading } = usePurchaseOrders(projectId);
  const { data: cfItems = [], isLoading: cfLoading } = useProjectCashflow(projectId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAddPO, setShowAddPO] = useState(false);
  const [showAddCF, setShowAddCF] = useState(false);
  const [poForm, setPoForm] = useState({ description: "", amount: "", po_date: "", vendor: "", related_activity: "", category: "material", status: "committed" });
  const [cfForm, setCfForm] = useState({ period_label: "", period_order: "", cash_in: "", cash_out: "", planned_progress: "", actual_progress: "" });

  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  const handleAddPO = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("purchase_orders").insert({
        project_id: projectId, description: poForm.description, amount: parseInt(poForm.amount) || 0,
        po_date: poForm.po_date || null, vendor: poForm.vendor, related_activity: poForm.related_activity,
        category: poForm.category, status: poForm.status,
      });
      if (error) throw error;
      await logActivity(supabase, "purchase_order", "create", `PO added: ${poForm.description} (${formatRupiah(parseInt(poForm.amount) || 0)})`, projectId);
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Purchase Order ditambahkan" });
      setShowAddPO(false);
      setPoForm({ description: "", amount: "", po_date: "", vendor: "", related_activity: "", category: "material", status: "committed" });
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

  const handleAddCF = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("project_cashflow").insert({
        project_id: projectId, period_label: cfForm.period_label, period_order: parseInt(cfForm.period_order) || cfItems.length,
        cash_in: parseInt(cfForm.cash_in) || 0, cash_out: parseInt(cfForm.cash_out) || 0,
        planned_progress: parseFloat(cfForm.planned_progress) || 0, actual_progress: parseFloat(cfForm.actual_progress) || 0,
      });
      if (error) throw error;
      await logActivity(supabase, "cashflow", "create", `Cashflow period added: ${cfForm.period_label}`, projectId);
      queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Cashflow period ditambahkan" });
      setShowAddCF(false);
      setCfForm({ period_label: "", period_order: "", cash_in: "", cash_out: "", planned_progress: "", actual_progress: "" });
    } catch (e: any) { toast({ title: "❌ Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteCF = async (id: string, label: string) => {
    if (!confirm(`Hapus period "${label}"?`)) return;
    await supabase.from("project_cashflow").delete().eq("id", id);
    await logActivity(supabase, "cashflow", "delete", `Cashflow deleted: ${label}`, projectId, id);
    queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const totalPO = poItems.reduce((s, po) => s + po.amount, 0);
  const p = projects.find(pr => pr.id === projectId);

  return (
    <div className="space-y-5">
      {p && (
        <div className="glass-card rounded-lg shadow-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Financial Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Contract Value</p>
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
        </div>
      )}

      {/* Purchase Orders */}
      <div className="glass-card rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">📋 Purchase Orders ({poItems.length})</h3>
          <button onClick={() => setShowAddPO(!showAddPO)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add PO</button>
        </div>
        {showAddPO && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div><label className={labelCls}>Description*</label><input value={poForm.description} onChange={e => setPoForm({...poForm, description: e.target.value})} className={inputCls} placeholder="Steel material" /></div>
              <div><label className={labelCls}>Vendor</label><input value={poForm.vendor} onChange={e => setPoForm({...poForm, vendor: e.target.value})} className={inputCls} placeholder="PT Vendor" /></div>
              <div><label className={labelCls}>Amount (Rp Juta)</label><input type="number" value={poForm.amount} onChange={e => setPoForm({...poForm, amount: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>PO Date</label><input type="date" value={poForm.po_date} onChange={e => setPoForm({...poForm, po_date: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Category</label>
                <select value={poForm.category} onChange={e => setPoForm({...poForm, category: e.target.value})} className={inputCls}>
                  <option value="material">Material</option><option value="equipment">Equipment</option><option value="subcontractor">Subcontractor</option><option value="service">Service</option><option value="other">Other</option>
                </select>
              </div>
              <div><label className={labelCls}>Related Activity</label><input value={poForm.related_activity} onChange={e => setPoForm({...poForm, related_activity: e.target.value})} className={inputCls} placeholder="Piping works" /></div>
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
                    <td className="py-1.5 px-2"><button onClick={() => handleDeletePO(po.id, po.description)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cashflow Editor */}
      <div className="glass-card rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">📊 Monthly Cashflow ({cfItems.length} periods)</h3>
          <button onClick={() => setShowAddCF(!showAddCF)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add Period</button>
        </div>
        {showAddCF && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              <div><label className={labelCls}>Period Label*</label><input value={cfForm.period_label} onChange={e => setCfForm({...cfForm, period_label: e.target.value})} className={inputCls} placeholder="Jan 2026" /></div>
              <div><label className={labelCls}>Order</label><input type="number" value={cfForm.period_order} onChange={e => setCfForm({...cfForm, period_order: e.target.value})} className={inputCls} placeholder={String(cfItems.length)} /></div>
              <div><label className={labelCls}>Cash In (Rp Juta)</label><input type="number" value={cfForm.cash_in} onChange={e => setCfForm({...cfForm, cash_in: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Cash Out (Rp Juta)</label><input type="number" value={cfForm.cash_out} onChange={e => setCfForm({...cfForm, cash_out: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Planned Progress %</label><input type="number" step="0.1" value={cfForm.planned_progress} onChange={e => setCfForm({...cfForm, planned_progress: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Actual Progress %</label><input type="number" step="0.1" value={cfForm.actual_progress} onChange={e => setCfForm({...cfForm, actual_progress: e.target.value})} className={inputCls} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddCF} disabled={saving || !cfForm.period_label} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />{saving ? "..." : "Save"}</button>
              <button onClick={() => setShowAddCF(false)} className="px-3 py-1.5 bg-muted text-foreground rounded text-xs border border-border">Cancel</button>
            </div>
          </div>
        )}
        {cfLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : cfItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada data cashflow.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Period</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Cash In</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Cash Out</th>
                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Net</th>
                <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Plan %</th>
                <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Actual %</th>
                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-10"></th>
              </tr></thead>
              <tbody>
                {cfItems.map(cf => (
                  <tr key={cf.id} className="border-b border-border/30">
                    <td className="py-1.5 px-2 font-medium text-foreground">{cf.period_label}</td>
                    <td className="py-1.5 px-2 text-right font-mono-data text-success">{formatRupiah(cf.cash_in)}</td>
                    <td className="py-1.5 px-2 text-right font-mono-data text-destructive">{formatRupiah(cf.cash_out)}</td>
                    <td className={`py-1.5 px-2 text-right font-mono-data ${cf.cash_in - cf.cash_out >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(cf.cash_in - cf.cash_out)}</td>
                    <td className="py-1.5 px-2 text-center font-mono-data">{cf.planned_progress}%</td>
                    <td className="py-1.5 px-2 text-center font-mono-data">{cf.actual_progress}%</td>
                    <td className="py-1.5 px-2"><button onClick={() => handleDeleteCF(cf.id, cf.period_label)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
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

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
      const amt = parseInt(poForm.amount) || 0;
      const { error } = await supabase.from("purchase_orders").insert({
        project_id: projectId, description: poForm.description, amount: amt,
        po_date: poForm.po_date || null, vendor: poForm.vendor, related_activity: poForm.related_activity,
        category: poForm.category, status: poForm.status,
      });
      if (error) throw error;
      await logActivity(supabase, "purchase_order", "create", `PO added: ${poForm.description} (${formatRupiah(amt)}, ${poForm.status})`, projectId);

      // If PO is created already as "paid", auto-create cash_out for current month
      if (poForm.status === "paid" && amt > 0) {
        const periodLabel = new Date(poForm.po_date || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        await supabase.from("project_cashflow").insert({
          project_id: projectId, period_label: periodLabel, period_order: cfItems.length,
          cash_in: 0, cash_out: amt, planned_progress: 0, actual_progress: 0,
        });
        await logActivity(supabase, "cashflow", "auto_create", `Auto cash_out from PO paid: ${formatRupiah(amt)} (${periodLabel})`, projectId);
      }

      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: poForm.status === "paid" ? "PO + cash_out auto-generated" : "Purchase Order ditambahkan" });
      setShowAddPO(false);
      setPoForm({ description: "", amount: "", po_date: "", vendor: "", related_activity: "", category: "material", status: "committed" });
    } catch (e: any) { toast({ title: "❌ Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleMarkPOPaid = async (po: any) => {
    if (po.status === "paid") return;
    if (!confirm(`Tandai PO "${po.description}" sebagai PAID?\n\nIni akan otomatis membuat entri cash_out di Cashflow.`)) return;
    setSaving(true);
    try {
      await supabase.from("purchase_orders").update({ status: "paid" }).eq("id", po.id);
      const periodLabel = new Date(po.po_date || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      await supabase.from("project_cashflow").insert({
        project_id: projectId, period_label: periodLabel, period_order: cfItems.length,
        cash_in: 0, cash_out: po.amount, planned_progress: 0, actual_progress: 0,
      });
      await logActivity(supabase, "purchase_order", "mark_paid", `PO marked PAID: ${po.description} (${formatRupiah(po.amount)}) → cash_out ${periodLabel}`, projectId, po.id);
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["project_cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Paid", description: `Cash out ${formatRupiah(po.amount)} ditambahkan untuk ${periodLabel}` });
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

  const totalCashIn = cfItems.reduce((s, c) => s + (c.cash_in || 0), 0);
  const totalCashOut = cfItems.reduce((s, c) => s + (c.cash_out || 0), 0);
  const cumulativeNet = totalCashIn - totalCashOut;

  const cv = p ? (p.contract_value || p.budget) : 0;
  const computedMarginPct = cv > 0 ? Math.round(((cv - (p?.spent || 0)) / cv) * 100) : 0;
  const computedMarginRp = cv - (p?.spent || 0);

  const handleToggleMarginLock = async () => {
    if (!p) return;
    const newVal = !p.margin_locked;
    const { error } = await supabase.from("projects").update({ margin_locked: newVal }).eq("id", p.id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "project", newVal ? "margin_locked" : "margin_unlocked", `Margin ${newVal ? "LOCKED (manual override)" : "UNLOCKED (auto-calc)"} for ${p.project_code} — current: ${computedMarginPct}% / ${formatRupiah(computedMarginRp)}`, p.id, p.id);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project", p.id] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    toast({ title: newVal ? "🔒 Margin Locked" : "🔓 Margin Unlocked", description: newVal ? "Margin sekarang manual override (admin only)" : "Margin kembali auto-calculate" });
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
              {p.margin_locked ? "Margin Locked (admin override)" : "Lock Margin (admin only)"}
            </button>
          </div>
          {p.margin_locked && (
            <div className="bg-warning/10 border border-warning/30 rounded p-2 mb-3 text-[11px] text-warning flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              <span><strong>Margin Manually Overridden</strong> — perubahan margin tidak akan auto-recalculate dari Contract & Spent. Setiap perubahan tercatat di Activity Log.</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Contract Value<FormulaTooltip title="Contract Value" formula="contract_value" description="Nilai kontrak resmi yang ditandatangani dengan client (sudah termasuk addendum yang approved)." /></p>
              <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(p.contract_value || p.budget)}</p>
            </div>
            <div className="bg-muted rounded-lg p-3 border border-border text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Budget<FormulaTooltip title="Approved Budget" formula="budget" description="Anggaran resmi yang disetujui untuk pelaksanaan proyek." /></p>
              <p className="text-sm font-bold font-mono-data text-foreground">{formatRupiah(p.budget)}</p>
            </div>
            <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">RAP<FormulaTooltip title="RAP" formula="rap" description="Rencana Anggaran Pelaksanaan — estimasi internal biaya. Selisih dengan Contract = target margin." /></p>
              <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(p.rap)}</p>
            </div>
            <div className="bg-info/5 rounded-lg p-3 border border-border text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">PO Committed<FormulaTooltip title="PO Committed" formula="Σ purchase_orders.amount" description="Total PO yang sudah diterbitkan ke vendor — biaya committed walaupun belum dibayar." /></p>
              <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totalPO)}</p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Actual Spent<FormulaTooltip title="Actual Spent" formula="spent" description="Realisasi biaya yang sudah dibayar (cash out aktual)." /></p>
              <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(p.spent)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`rounded-lg p-3 border text-center ${p.margin_locked ? "bg-warning/5 border-warning/30" : computedMarginPct > 10 ? "bg-success/5 border-success/30" : computedMarginPct > 0 ? "bg-warning/5 border-warning/30" : "bg-destructive/5 border-destructive/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                Actual Margin %{p.margin_locked && <Lock className="h-2.5 w-2.5 text-warning" />}
                <FormulaTooltip title="Actual Margin %" formula="((Contract − Spent) / Contract) × 100%" description="Auto-calculated dari Contract & Actual Spent. Selalu real-time, tidak bisa diedit manual kecuali mode Lock." interpretation="> 15% Sehat • 5–15% Normal • < 5% Tipis • Negatif Rugi" />
              </p>
              <p className={`text-lg font-bold font-mono-data ${p.margin_locked ? "text-warning" : computedMarginPct > 10 ? "text-success" : computedMarginPct > 0 ? "text-warning" : "text-destructive"}`}>{computedMarginPct}%</p>
              {p.margin_locked && <p className="text-[9px] text-warning mt-0.5">Manually Overridden</p>}
            </div>
            <div className={`rounded-lg p-3 border text-center ${computedMarginRp > 0 ? "bg-success/5 border-success/30" : "bg-destructive/5 border-destructive/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Actual Margin Nominal<FormulaTooltip title="Actual Margin Nominal" formula="Contract − Spent" description="Profit margin aktual dalam rupiah, auto-calc dari data." /></p>
              <p className={`text-lg font-bold font-mono-data ${computedMarginRp > 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(computedMarginRp)}</p>
            </div>
            <div className="bg-info/5 rounded-lg p-3 border border-info/30 text-center">
              <p className="text-[9px] text-muted-foreground uppercase flex items-center justify-center">Target Margin %<FormulaTooltip title="Target Margin" formula="profit_margin_target (Master Data)" description="Target profit margin yang ditetapkan saat planning. Edit di tab Manage Projects → Edit Project → Financial." interpretation="Bandingkan dengan Actual Margin untuk evaluasi performa." /></p>
              <p className="text-lg font-bold font-mono-data text-info">{p.profit_margin_target}%</p>
              {Math.abs(computedMarginPct - p.profit_margin_target) > 5 && !p.margin_locked && (
                <p className={`text-[9px] mt-0.5 font-medium ${computedMarginPct < p.profit_margin_target ? "text-destructive" : "text-success"}`}>
                  ⚠ Deviasi {(computedMarginPct - p.profit_margin_target).toFixed(1)}% vs target
                </p>
              )}
            </div>
          </div>
          {Math.abs(computedMarginPct - p.profit_margin_target) > 10 && !p.margin_locked && (
            <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded p-2 text-[11px] text-destructive flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              <span><strong>Margin Inkonsisten:</strong> Actual {computedMarginPct}% berbeda jauh dari Target {p.profit_margin_target}%. Review budget atau update Target Margin di Manage Projects.</span>
            </div>
          )}
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div className="bg-success/5 rounded p-2 border border-success/20">
                <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Total Cash In<FormulaTooltip title="Cash In" formula="Σ cash_in (semua periode)" description="Total uang masuk dari pembayaran client (termin, DP, retensi)." interpretation="Sumber: invoice ke client" /></p>
                <p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totalCashIn)}</p>
              </div>
              <div className="bg-destructive/5 rounded p-2 border border-destructive/20">
                <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Total Cash Out<FormulaTooltip title="Cash Out" formula="Σ cash_out (semua periode)" description="Total uang keluar untuk vendor (PO), gaji, dan biaya operasional." interpretation="Termasuk pembayaran PO + opex" /></p>
                <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(totalCashOut)}</p>
              </div>
              <div className={`rounded p-2 border ${cumulativeNet >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/30"}`}>
                <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Cumulative Net<FormulaTooltip title="Cumulative Net Cashflow" formula="Σ (Cash In − Cash Out)" description="Akumulasi net cashflow dari semua periode." interpretation="Positif = surplus kas, Negatif = perlu pendanaan eksternal" /></p>
                <p className={`text-sm font-bold font-mono-data ${cumulativeNet >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(cumulativeNet)}</p>
              </div>
              <div className="bg-info/5 rounded p-2 border border-info/20">
                <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Avg Net/Periode<FormulaTooltip title="Avg Net per Period" formula="Cumulative Net / jumlah periode" description="Rata-rata net cashflow per periode." /></p>
                <p className={`text-sm font-bold font-mono-data ${cumulativeNet >= 0 ? "text-success" : "text-destructive"}`}>{cfItems.length > 0 ? formatRupiah(Math.round(cumulativeNet / cfItems.length)) : "—"}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Period</th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground"><span className="inline-flex items-center">Cash In<FormulaTooltip title="Cash In" formula="Pembayaran dari client" description="Termin pembayaran client (DP, progress, retensi)." /></span></th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground"><span className="inline-flex items-center">Cash Out<FormulaTooltip title="Cash Out" formula="Pembayaran ke vendor + opex" description="Pembayaran PO + biaya operasional bulanan." /></span></th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground"><span className="inline-flex items-center">Net<FormulaTooltip title="Monthly Net" formula="Cash In − Cash Out" description="Selisih cash bulan tersebut." /></span></th>
                  <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground"><span className="inline-flex items-center">Cumulative<FormulaTooltip title="Cumulative Net" formula="Running total Net" description="Akumulasi Net cashflow dari periode pertama sampai sekarang." /></span></th>
                  <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Plan %</th>
                  <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Actual %</th>
                  <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-10"></th>
                </tr></thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return cfItems.map(cf => {
                      const net = cf.cash_in - cf.cash_out;
                      running += net;
                      return (
                        <tr key={cf.id} className="border-b border-border/30">
                          <td className="py-1.5 px-2 font-medium text-foreground">{cf.period_label}</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-success">{formatRupiah(cf.cash_in)}</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-destructive">{formatRupiah(cf.cash_out)}</td>
                          <td className={`py-1.5 px-2 text-right font-mono-data ${net >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(net)}</td>
                          <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${running >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(running)}</td>
                          <td className="py-1.5 px-2 text-center font-mono-data">{cf.planned_progress}%</td>
                          <td className="py-1.5 px-2 text-center font-mono-data">{cf.actual_progress}%</td>
                          <td className="py-1.5 px-2"><button onClick={() => handleDeleteCF(cf.id, cf.period_label)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

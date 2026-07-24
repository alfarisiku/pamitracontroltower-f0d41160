import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Save, Trash2 } from "lucide-react";
import { supabase, formatIDR, logActivity } from "@/lib/supabase";
import { useProcurementItems } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

export function ProcurementPanel({ projectId }: { projectId: string }) {
  const { data: items = [], isLoading } = useProcurementItems(projectId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    item_name: "", description: "", amount: "", unit: "unit", qty: "1",
    rfq_date: "", approval_date: "", po_date: "", fabrication_date: "",
    delivery_date: "", install_date: "", status: "planned", vendor: "",
  });

  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  const statusLabels: Record<string, string> = {
    planned: "Planned", "rfq-sent": "RFQ Sent", approval: "Approval", "po-issued": "PO Issued",
    fabrication: "Fabrication", delivery: "Delivery", installed: "Installed",
  };
  const statusColors: Record<string, string> = {
    planned: "bg-muted text-muted-foreground", "rfq-sent": "bg-primary/15 text-primary",
    approval: "bg-warning/15 text-warning", "po-issued": "bg-info/15 text-info",
    fabrication: "bg-accent/15 text-accent-foreground", delivery: "bg-success/15 text-success",
    installed: "bg-success/20 text-success",
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("procurement_items").insert({
        project_id: projectId, item_name: form.item_name, description: form.description,
        amount: parseInt(form.amount) || 0, unit: form.unit, qty: parseFloat(form.qty) || 1,
        rfq_date: form.rfq_date || null, approval_date: form.approval_date || null,
        po_date: form.po_date || null, fabrication_date: form.fabrication_date || null,
        delivery_date: form.delivery_date || null, install_date: form.install_date || null,
        status: form.status, vendor: form.vendor,
      });
      if (error) throw error;
      await logActivity(supabase, "procurement", "create", `Added procurement: ${form.item_name}`, projectId);
      queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Procurement item ditambahkan" });
      setShowAdd(false);
      setForm({ item_name: "", description: "", amount: "", unit: "unit", qty: "1", rfq_date: "", approval_date: "", po_date: "", fabrication_date: "", delivery_date: "", install_date: "", status: "planned", vendor: "" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus item "${name}"?`)) return;
    await supabase.from("procurement_items").delete().eq("id", id);
    await logActivity(supabase, "procurement", "delete", `Deleted procurement: ${name}`, projectId, id);
    queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const handleStatusUpdate = async (id: string, newStatus: string, name: string) => {
    const dateField: Record<string, string> = {
      "rfq-sent": "rfq_date", approval: "approval_date", "po-issued": "po_date",
      fabrication: "fabrication_date", delivery: "delivery_date", installed: "install_date",
    };
    const updates: any = { status: newStatus };
    if (dateField[newStatus]) updates[dateField[newStatus]] = new Date().toISOString().slice(0, 10);
    await supabase.from("procurement_items").update(updates).eq("id", id);
    await logActivity(supabase, "procurement", "update", `Procurement "${name}" status → ${newStatus}`, projectId, id);
    queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Procurement Tracking</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Total: <span className="font-bold text-foreground">{formatIDR(totalAmount)}</span></span>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add Item</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
          <p className="text-[10px] text-muted-foreground mb-2 italic">
            Amount diisi dalam <strong className="text-foreground">Rupiah utuh (IDR mentah)</strong> — bukan Juta. Contoh: <code>250.000.000</code> = Rp 250 Jt • <code>5.000.000.000</code> = Rp 5,00 M (Miliar) • <code>1.500.000.000.000</code> = Rp 1,50 T (Triliun). Semua tanggal (RFQ, Approval, PO, Fabrication, Delivery, Install) dapat diisi manual / custom dan bisa <strong>diedit langsung di tabel</strong> jika terlewat.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div><label className={labelCls}>Item Name*</label><input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={inputCls} placeholder="Steel Pipe 12&quot;" /></div>
            <div><label className={labelCls}>Vendor</label><input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className={inputCls} placeholder="PT Vendor" /></div>
            <div>
              <label className={labelCls}>Amount (Rp / IDR utuh)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} placeholder="mis. 250000000" />
              {form.amount && <p className="text-[9px] text-primary mt-0.5">= {formatIDR(parseFloat(form.amount)||0)}</p>}
            </div>
            <div><label className={labelCls}>Qty</label><input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Unit</label><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputCls} placeholder="unit / m / kg" /></div>
            <div><label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inputCls} placeholder="Spesifikasi / catatan" /></div>
            <div><label className={labelCls}>RFQ Date</label><input type="date" value={form.rfq_date} onChange={e => setForm({...form, rfq_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Approval Date</label><input type="date" value={form.approval_date} onChange={e => setForm({...form, approval_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>PO Date</label><input type="date" value={form.po_date} onChange={e => setForm({...form, po_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Fabrication Date</label><input type="date" value={form.fabrication_date} onChange={e => setForm({...form, fabrication_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Delivery Date</label><input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Install Date</label><input type="date" value={form.install_date} onChange={e => setForm({...form, install_date: e.target.value})} className={inputCls} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !form.item_name} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"><Save className="h-3 w-3 inline mr-1" />{saving ? "..." : "Save"}</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-muted text-foreground rounded text-xs border border-border">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada item procurement.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Item</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Vendor</th>
              <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Amount</th>
              <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Status</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">RFQ</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">PO</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Delivery</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Install</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-20">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(item => {
                const patch = async (field: string, value: any, human: string) => {
                  await supabase.from("procurement_items").update({ [field]: value }).eq("id", item.id);
                  await logActivity(supabase, "procurement", "update", `${item.item_name} ${human}`, projectId, item.id);
                  queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
                  queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
                };
                const editCls = "bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 focus:outline-none";
                const dateInput = (field: keyof typeof item, current: string | null) => (
                  <input type="date" defaultValue={current || ""}
                    onBlur={async e => {
                      const v = e.target.value || null;
                      if (v === (current || null)) return;
                      await patch(String(field), v, `${String(field)} → ${v || "cleared"}`);
                    }}
                    className={`${editCls} text-[10px] font-mono-data text-foreground w-[120px]`} />
                );
                return (
                <tr key={item.id} className="border-b border-border/30">
                  <td className="py-1.5 px-2 font-medium text-foreground">
                    <input defaultValue={item.item_name}
                      onBlur={e => e.target.value !== item.item_name && e.target.value && patch("item_name", e.target.value, `renamed → ${e.target.value}`)}
                      className={`${editCls} text-xs font-medium text-foreground w-full`} />
                    <div className="flex items-center gap-1 mt-0.5">
                      <input type="number" defaultValue={item.qty} step="0.01"
                        onBlur={e => Number(e.target.value) !== Number(item.qty) && patch("qty", parseFloat(e.target.value) || 0, `qty → ${e.target.value}`)}
                        className={`${editCls} text-[9px] text-muted-foreground w-14 font-mono-data`} />
                      <input defaultValue={item.unit}
                        onBlur={e => e.target.value !== item.unit && patch("unit", e.target.value, `unit → ${e.target.value}`)}
                        className={`${editCls} text-[9px] text-muted-foreground w-12`} />
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    <input defaultValue={item.vendor || ""}
                      onBlur={e => e.target.value !== (item.vendor || "") && patch("vendor", e.target.value, `vendor → ${e.target.value}`)}
                      className={`${editCls} text-xs text-muted-foreground w-full`} placeholder="—" />
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono-data text-accent">
                    <input type="number" defaultValue={item.amount}
                      onBlur={e => Number(e.target.value) !== item.amount && patch("amount", parseInt(e.target.value) || 0, `amount → ${formatIDR(parseInt(e.target.value)||0)}`)}
                      className={`${editCls} text-right font-mono-data text-accent w-[110px] text-xs`} />
                    <div className="text-[9px] text-muted-foreground">{formatIDR(item.amount)}</div>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <select value={item.status} onChange={e => handleStatusUpdate(item.id, e.target.value, item.item_name)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${statusColors[item.status] || ""} border-border bg-transparent cursor-pointer`}>
                      {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-2">{dateInput("rfq_date", item.rfq_date)}</td>
                  <td className="py-1.5 px-2">{dateInput("po_date", item.po_date)}</td>
                  <td className="py-1.5 px-2">{dateInput("delivery_date", item.delivery_date)}</td>
                  <td className="py-1.5 px-2">{dateInput("install_date", item.install_date)}</td>
                  <td className="py-1.5 px-2"><button onClick={() => handleDelete(item.id, item.item_name)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

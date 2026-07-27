import { Fragment } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Save, Trash2, Pencil, X } from "lucide-react";
import { supabase, formatIDR, logActivity } from "@/lib/supabase";
import { useProcurementItems } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

/**
 * Procurement lifecycle status options:
 *   DED → BQ → PR → RFQ → PO → Delivery → Onsite
 * Legacy statuses (planned/approval/fabrication/po-issued/installed/rfq-sent) still
 * displayed for backward compatibility with existing records.
 */
const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "ded",       label: "DED",      color: "bg-muted text-muted-foreground" },
  { value: "bq",        label: "BQ",       color: "bg-muted/70 text-muted-foreground" },
  { value: "pr",        label: "PR",       color: "bg-primary/15 text-primary" },
  { value: "rfq",       label: "RFQ",      color: "bg-warning/15 text-warning" },
  { value: "po",        label: "PO",       color: "bg-info/15 text-info" },
  { value: "delivery",  label: "Delivery", color: "bg-success/15 text-success" },
  { value: "onsite",    label: "Onsite",   color: "bg-success/25 text-success" },
];
// Alias map for legacy values loaded from DB.
const LEGACY_STATUS: Record<string, string> = {
  planned: "ded", "rfq-sent": "pr", approval: "rfq", "po-issued": "po",
  fabrication: "po", installed: "onsite",
};
const normalizeStatus = (s: string) => LEGACY_STATUS[s] ?? s;
const statusLabels: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));
const statusColors: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.color]));

// Column definitions for the paired plan / actual dates.
const DATE_PAIRS: { key: string; label: string; planField: string; actualField: string }[] = [
  { key: "pr",       label: "PR",       planField: "pr_plan_date",       actualField: "pr_actual_date" },
  { key: "po",       label: "PO",       planField: "po_plan_date",       actualField: "po_actual_date" },
  { key: "delivery", label: "Delivery", planField: "delivery_plan_date", actualField: "delivery_actual_date" },
  { key: "onsite",   label: "Onsite",   planField: "onsite_plan_date",   actualField: "onsite_actual_date" },
];

export function ProcurementPanel({ projectId, onLogged }: { projectId: string; onLogged?: (msg: string) => void }) {
  const { data: items = [], isLoading } = useProcurementItems(projectId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({
    item_name: "", description: "", amount: "", unit: "unit", qty: "1",
    status: "ded", vendor: "",
    pr_plan_date: "", pr_actual_date: "",
    po_plan_date: "", po_actual_date: "",
    delivery_plan_date: "", delivery_actual_date: "",
    onsite_plan_date: "", onsite_actual_date: "",
  });

  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEdit({
      item_name: item.item_name || "", vendor: item.vendor || "", amount: String(item.amount || 0),
      pr_plan_date: item.pr_plan_date || "",       pr_actual_date: item.pr_actual_date || "",
      po_plan_date: item.po_plan_date || "",       po_actual_date: item.po_actual_date || "",
      delivery_plan_date: item.delivery_plan_date || "", delivery_actual_date: item.delivery_actual_date || "",
      onsite_plan_date: item.onsite_plan_date || "",     onsite_actual_date: item.onsite_actual_date || "",
    });
  };
  const saveEdit = async (item: any) => {
    const patch: any = {
      item_name: edit.item_name, vendor: edit.vendor, amount: parseInt(edit.amount) || 0,
      pr_plan_date: edit.pr_plan_date || null, pr_actual_date: edit.pr_actual_date || null,
      po_plan_date: edit.po_plan_date || null, po_actual_date: edit.po_actual_date || null,
      delivery_plan_date: edit.delivery_plan_date || null, delivery_actual_date: edit.delivery_actual_date || null,
      onsite_plan_date: edit.onsite_plan_date || null,     onsite_actual_date: edit.onsite_actual_date || null,
    };
    await (supabase as any).from("procurement_items").update(patch).eq("id", item.id);
    await logActivity(supabase, "procurement", "update", `Procurement "${edit.item_name}" edited`, projectId, item.id);
    queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    setEditingId(null);
    toast({ title: "✅ Saved" });
  };


  const handleAdd = async () => {
    setSaving(true);
    try {
      const payload: any = {
        project_id: projectId, item_name: form.item_name, description: form.description,
        amount: parseInt(form.amount) || 0, unit: form.unit, qty: parseFloat(form.qty) || 1,
        status: form.status, vendor: form.vendor,
        pr_plan_date: form.pr_plan_date || null, pr_actual_date: form.pr_actual_date || null,
        po_plan_date: form.po_plan_date || null, po_actual_date: form.po_actual_date || null,
        delivery_plan_date: form.delivery_plan_date || null, delivery_actual_date: form.delivery_actual_date || null,
        onsite_plan_date: form.onsite_plan_date || null,     onsite_actual_date: form.onsite_actual_date || null,
      };
      const { error } = await (supabase as any).from("procurement_items").insert(payload);
      if (error) throw error;
      await logActivity(supabase, "procurement", "create", `Added procurement: ${form.item_name}`, projectId);
      queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Procurement item ditambahkan" });
      setShowAdd(false);
      setForm({
        item_name: "", description: "", amount: "", unit: "unit", qty: "1", status: "ded", vendor: "",
        pr_plan_date: "", pr_actual_date: "", po_plan_date: "", po_actual_date: "",
        delivery_plan_date: "", delivery_actual_date: "", onsite_plan_date: "", onsite_actual_date: "",
      });
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
    // When advancing to a status that has an actual-date column, stamp it.
    const actualField: Record<string, string> = {
      pr: "pr_actual_date", po: "po_actual_date",
      delivery: "delivery_actual_date", onsite: "onsite_actual_date",
    };
    const updates: any = { status: newStatus };
    if (actualField[newStatus]) updates[actualField[newStatus]] = new Date().toISOString().slice(0, 10);
    await (supabase as any).from("procurement_items").update(updates).eq("id", id);
    await logActivity(supabase, "procurement", "update", `Procurement "${name}" status → ${newStatus}`, projectId, id);
    queryClient.invalidateQueries({ queryKey: ["procurement_items"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  const renderDateCell = (item: any, field: string, editing: boolean) => {
    if (editing) {
      return (
        <input
          type="date"
          value={edit[field] || ""}
          onChange={e => setEdit({ ...edit, [field]: e.target.value })}
          className="bg-card border border-primary/60 rounded px-1 py-0.5 text-[10px] font-mono-data text-foreground w-[120px] focus:outline-none"
        />
      );
    }
    const v = (item as any)[field];
    return <span className="text-[10px] font-mono-data text-muted-foreground">{v ? new Date(v).toLocaleDateString("id-ID") : "—"}</span>;
  };

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
            Amount diisi dalam <strong className="text-foreground">Rupiah utuh</strong>. Setiap tahap (PR / PO / Delivery / Onsite) punya <strong>tanggal Planning</strong> dan <strong>tanggal Actual</strong>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div><label className={labelCls}>Item Name*</label><input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={inputCls} placeholder="Steel Pipe 12&quot;" /></div>
            <div><label className={labelCls}>Vendor</label><input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className={inputCls} placeholder="PT Vendor" /></div>
            <div>
              <label className={labelCls}>Amount (Rp)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} placeholder="mis. 250000000" />
              {form.amount && <p className="text-[9px] text-primary mt-0.5">= {formatIDR(parseFloat(form.amount)||0)}</p>}
            </div>
            <div><label className={labelCls}>Qty</label><input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Unit</label><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputCls} placeholder="unit / m / kg" /></div>
            <div><label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inputCls} placeholder="Spesifikasi / catatan" /></div>
            {DATE_PAIRS.map(dp => (
              <div key={dp.key} className="sm:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>{dp.label} — Plan</label>
                  <input type="date" value={form[dp.planField]} onChange={e => setForm({...form, [dp.planField]: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{dp.label} — Actual</label>
                  <input type="date" value={form[dp.actualField]} onChange={e => setForm({...form, [dp.actualField]: e.target.value})} className={inputCls} />
                </div>
              </div>
            ))}
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
        <div className="overflow-auto max-h-[560px] border border-border rounded-md">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted border-b border-border">
                <th rowSpan={2} className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Item</th>
                <th rowSpan={2} className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Vendor</th>
                <th rowSpan={2} className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Amount</th>
                <th rowSpan={2} className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Status</th>
                {DATE_PAIRS.map(dp => (
                  <th key={dp.key} colSpan={2} className="text-center py-1 px-2 text-[9px] uppercase text-primary border-l border-border">{dp.label}</th>
                ))}
                <th rowSpan={2} className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-20 align-bottom border-l border-border">Actions</th>
              </tr>
              <tr className="bg-muted/70 border-b border-border">
                {DATE_PAIRS.map(dp => (
                  <Fragment key={dp.key}>
                    <th className="text-left py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">Plan</th>
                    <th className="text-left py-1 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isEditing = editingId === item.id;
                const status = normalizeStatus(item.status);
                return (
                <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-1.5 px-2 font-medium text-foreground">
                    {isEditing ? (
                      <input value={edit.item_name} onChange={e => setEdit({...edit, item_name: e.target.value})}
                        className="w-full px-1.5 py-1 text-xs border border-primary rounded bg-card focus:outline-none" />
                    ) : (
                      <p className="text-xs font-medium text-foreground">{item.item_name}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-mono-data">{Number(item.qty).toLocaleString()} {item.unit}</p>
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    {isEditing ? (
                      <input value={edit.vendor} onChange={e => setEdit({...edit, vendor: e.target.value})}
                        className="w-full px-1.5 py-1 text-xs border border-primary rounded bg-card focus:outline-none" placeholder="Vendor" />
                    ) : (
                      <span className="text-xs">{item.vendor || "—"}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono-data text-accent">
                    {isEditing ? (
                      <input type="number" value={edit.amount} onChange={e => setEdit({...edit, amount: e.target.value})}
                        className="w-[120px] px-1.5 py-1 text-xs text-right border border-primary rounded bg-card focus:outline-none font-mono-data" />
                    ) : (
                      <span className="text-xs font-mono-data text-foreground">{formatIDR(item.amount)}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <select value={status} onChange={e => handleStatusUpdate(item.id, e.target.value, item.item_name)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${statusColors[status] || "bg-muted text-muted-foreground"} border-border bg-transparent cursor-pointer`}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  {DATE_PAIRS.map(dp => (
                    <Fragment key={dp.key}>
                      <td className="py-1.5 px-2 border-l border-border/40">{renderDateCell(item, dp.planField, isEditing)}</td>
                      <td className="py-1.5 px-2">{renderDateCell(item, dp.actualField, isEditing)}</td>
                    </Fragment>
                  ))}
                  <td className="py-1.5 px-2 border-l border-border/40">
                    <div className="flex items-center justify-center gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(item)} className="p-1 hover:bg-success/10 rounded" title="Save"><Save className="h-3 w-3 text-success" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded" title="Cancel"><X className="h-3 w-3 text-muted-foreground" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="p-1 hover:bg-primary/10 rounded" title="Edit item, vendor, amount, dates"><Pencil className="h-3 w-3 text-primary" /></button>
                          <button onClick={() => handleDelete(item.id, item.item_name)} className="p-1 hover:bg-destructive/10 rounded" title="Delete"><Trash2 className="h-3 w-3 text-destructive" /></button>
                        </>
                      )}
                    </div>
                  </td>
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

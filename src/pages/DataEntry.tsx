import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems, useAlerts, useAddendums, useSCurveData, useProcurementItems } from "@/hooks/useProjects";
import { supabase, DbProject, formatRupiah, logActivity } from "@/lib/supabase";
import {
  HelpCircle, CheckCircle2, Database, Layers, Target, FileText,
  Lightbulb, BookOpen, ArrowRight, X, Save, Download, Upload, Share2,
  Plus, Trash2, Edit3, AlertTriangle, DollarSign, Calendar, FileBarChart,
  Printer, ClipboardList, Lock, Camera, Image as ImageIcon, Package, Clock
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type ActiveTab = "regular" | "project-crud" | "addendum" | "scurve";

// Photo gallery sub-component
function PhotoGallery({ projectId }: { projectId: string }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase.from("project_photos").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }).then(({ data }) => {
      setPhotos(data || []);
      setLoading(false);
    });
  }, [projectId]);

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Hapus foto ini?")) return;
    const pathMatch = url.match(/project-photos\/(.+)$/);
    if (pathMatch) await supabase.storage.from("project-photos").remove([pathMatch[1]]);
    await supabase.from("project_photos").delete().eq("id", id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading photos...</p>;
  if (photos.length === 0) return <p className="text-xs text-muted-foreground">Belum ada foto untuk proyek ini.</p>;

  const grouped = photos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.week_label || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(grouped).map(([week, wPhotos]) => (
        <div key={week}>
          <h4 className="text-[10px] font-semibold text-foreground mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" /> {week}
            <span className="text-muted-foreground font-normal">({(wPhotos as any[]).length} foto)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(wPhotos as any[]).map(p => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
                <img src={p.photo_url} alt={p.caption || "Project photo"} className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => handleDelete(p.id, p.photo_url)} className="p-1.5 bg-destructive text-destructive-foreground rounded-full"><Trash2 className="h-3 w-3" /></button>
                </div>
                {p.caption && <div className="p-1 text-[9px] text-muted-foreground truncate">{p.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Risk Resolve Panel
function RiskResolvePanel({ projectId }: { projectId: string }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase.from("project_alerts").select("*").eq("project_id", projectId).eq("is_resolved", false).order("severity").then(({ data }) => {
      setAlerts(data || []);
      setLoading(false);
    });
  }, [projectId]);

  const handleResolve = async (id: string, title: string) => {
    setResolving(id);
    try {
      const { error } = await supabase.from("project_alerts").update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      setAlerts(prev => prev.filter(a => a.id !== id));
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["all_alerts"] });
      await logActivity(supabase, "risk", "resolve", `Risk resolved: ${title}`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Resolved", description: "Risk berhasil ditutup" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setResolving(null); }
  };

  if (loading) return <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2"><p className="text-xs text-muted-foreground">Loading risks...</p></div>;
  if (alerts.length === 0) return <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2"><p className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Tidak ada risiko aktif untuk proyek ini.</p></div>;

  const sevColor: Record<string, string> = { critical: "text-destructive", high: "text-warning", medium: "text-info", low: "text-muted-foreground" };

  return (
    <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Close / Resolve Risk ({alerts.length} active)</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${sevColor[a.severity] || ""}`}>{a.severity}</span>
                <span className="text-xs font-medium text-foreground truncate">{a.title}</span>
                {a.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.category}</span>}
              </div>
              {a.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.description}</p>}
              <div className="flex items-center gap-3 mt-0.5 text-[9px] text-muted-foreground">
                {a.risk_owner && <span>Owner: {a.risk_owner}</span>}
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Created: {new Date(a.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
            <button onClick={() => handleResolve(a.id, a.title)} disabled={resolving === a.id}
              className="flex-shrink-0 flex items-center gap-1 text-[10px] px-3 py-1.5 bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50 font-medium">
              <CheckCircle2 className="h-3 w-3" /> {resolving === a.id ? "..." : "Resolve"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Procurement Panel
function ProcurementPanel({ projectId }: { projectId: string }) {
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
          <span className="text-[10px] text-muted-foreground">Total: <span className="font-bold text-foreground">{formatRupiah(totalAmount)}</span></span>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-medium"><Plus className="h-3 w-3" /> Add Item</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div><label className={labelCls}>Item Name*</label><input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className={inputCls} placeholder="Steel Pipe 12&quot;" /></div>
            <div><label className={labelCls}>Vendor</label><input value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} className={inputCls} placeholder="PT Vendor" /></div>
            <div><label className={labelCls}>Amount (Rp)</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Qty</label><input type="number" value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Unit</label><input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
                {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>RFQ Date</label><input type="date" value={form.rfq_date} onChange={e => setForm({...form, rfq_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>PO Date</label><input type="date" value={form.po_date} onChange={e => setForm({...form, po_date: e.target.value})} className={inputCls} /></div>
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
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/30">
                  <td className="py-1.5 px-2 font-medium text-foreground">{item.item_name}<div className="text-[9px] text-muted-foreground">{item.qty} {item.unit}</div></td>
                  <td className="py-1.5 px-2 text-muted-foreground">{item.vendor}</td>
                  <td className="py-1.5 px-2 text-right font-mono-data text-accent">{formatRupiah(item.amount)}</td>
                  <td className="py-1.5 px-2 text-center">
                    <select value={item.status} onChange={e => handleStatusUpdate(item.id, e.target.value, item.item_name)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${statusColors[item.status] || ""} border-border bg-transparent cursor-pointer`}>
                      {Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-[9px] font-mono-data text-muted-foreground">{item.rfq_date ? new Date(item.rfq_date).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—"}</td>
                  <td className="py-1.5 px-2 text-[9px] font-mono-data text-muted-foreground">{item.po_date ? new Date(item.po_date).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—"}</td>
                  <td className="py-1.5 px-2 text-[9px] font-mono-data text-muted-foreground">{item.delivery_date ? new Date(item.delivery_date).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—"}</td>
                  <td className="py-1.5 px-2 text-[9px] font-mono-data text-muted-foreground">{item.install_date ? new Date(item.install_date).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—"}</td>
                  <td className="py-1.5 px-2"><button onClick={() => handleDelete(item.id, item.item_name)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// S-Curve Editor
function SCurveEditor({ projectId }: { projectId: string }) {
  const { data: scurveData = [], isLoading } = useSCurveData(projectId);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<{ period_label: string; period_order: number; planned_progress: string; actual_progress: string; curve_type: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [curveType, setCurveType] = useState("baseline");

  useEffect(() => {
    const filtered = scurveData.filter(d => d.curve_type === curveType);
    if (filtered.length > 0) {
      setRows(filtered.map(d => ({
        period_label: d.period_label,
        period_order: d.period_order,
        planned_progress: String(d.planned_progress),
        actual_progress: d.actual_progress != null ? String(d.actual_progress) : "",
        curve_type: d.curve_type,
      })));
    }
  }, [scurveData, curveType]);

  const curveTypes = [...new Set(scurveData.map(d => d.curve_type))];
  if (!curveTypes.includes("baseline")) curveTypes.unshift("baseline");

  const addRow = () => setRows(prev => [...prev, { period_label: `Month ${prev.length + 1}`, period_order: prev.length, planned_progress: "0", actual_progress: "", curve_type: curveType }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, key: string, val: string) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("s_curve_data").delete().eq("project_id", projectId).eq("curve_type", curveType);
      const inserts = rows.map((r, i) => ({
        project_id: projectId, period_label: r.period_label, period_order: i,
        planned_progress: parseFloat(r.planned_progress) || 0,
        actual_progress: r.actual_progress ? parseFloat(r.actual_progress) : null,
        curve_type: curveType,
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from("s_curve_data").insert(inserts);
        if (error) throw error;
      }
      await logActivity(supabase, "s_curve", "update", `S-Curve ${curveType} updated (${rows.length} periods)`, projectId);
      queryClient.invalidateQueries({ queryKey: ["s_curve_data"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: `S-Curve ${curveType} saved` });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const [newCurveType, setNewCurveType] = useState("");
  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-lg shadow-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">📈 S-Curve Data Editor</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Edit data S-Curve baseline atau tambahkan kurva tambahan (misal untuk JO / KSO / Joint Operation).</p>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {curveTypes.map(ct => (
            <button key={ct} onClick={() => setCurveType(ct)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${curveType === ct ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border hover:bg-muted/80"}`}>
              {ct === "baseline" ? "Baseline" : ct}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input value={newCurveType} onChange={e => setNewCurveType(e.target.value)} className={inputCls + " w-24"} placeholder="KSO name" />
            <button onClick={() => { if (newCurveType.trim()) { setCurveType(newCurveType.trim()); setRows([]); setNewCurveType(""); } }} className="px-2 py-1.5 bg-success text-success-foreground rounded text-[10px] font-medium">+ Add Curve</button>
          </div>
        </div>
        {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-8">#</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground">Period Label</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground">Planned %</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground">Actual %</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-10"></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-1 px-2"><input value={r.period_label} onChange={e => updateRow(i, "period_label", e.target.value)} className={inputCls} /></td>
                      <td className="py-1 px-2"><input type="number" value={r.planned_progress} onChange={e => updateRow(i, "planned_progress", e.target.value)} className={inputCls} /></td>
                      <td className="py-1 px-2"><input type="number" value={r.actual_progress} onChange={e => updateRow(i, "actual_progress", e.target.value)} className={inputCls} placeholder="—" /></td>
                      <td className="py-1 px-2"><button onClick={() => removeRow(i)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Plus className="h-3 w-3" /> Add Period</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3 w-3" /> {saving ? "Saving..." : "Save S-Curve"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const DataEntry = () => {
  const queryClient = useQueryClient();
  const { data: allProjects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState<ActiveTab>("regular");
  const [updateProjectId, setUpdateProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const projects = allProjects;

  const allTabs = [
    { key: "regular" as const, label: "Regular Update", icon: FileText },
    { key: "project-crud" as const, label: "Manage Projects", icon: ClipboardList },
    { key: "scurve" as const, label: "S-Curve Editor", icon: FileBarChart },
    { key: "addendum" as const, label: "Addendum", icon: FileBarChart },
  ];
  const tabs = allTabs;

  // Regular update fields
  const [formProgress, setFormProgress] = useState("");
  const [formStatus, setFormStatus] = useState("on-track");
  const [formPhase, setFormPhase] = useState("Construction");

  // Work item update
  const { data: workAreas = [] } = useWorkAreas(updateProjectId || undefined);
  const waIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(waIds);
  const [updateItemId, setUpdateItemId] = useState("");
  const [updateQtyCompleted, setUpdateQtyCompleted] = useState("");
  const [updateQtyTotal, setUpdateQtyTotal] = useState("");

  // Risk entry
  const [riskTitle, setRiskTitle] = useState("");
  const [riskSeverity, setRiskSeverity] = useState("medium");
  const [riskProbability, setRiskProbability] = useState("medium");
  const [riskImpact, setRiskImpact] = useState("medium");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [riskDescription, setRiskDescription] = useState("");
  const [riskCategory, setRiskCategory] = useState("operational");

  // TKDN
  const [tkdnValue, setTkdnValue] = useState("");

  // Project CRUD
  const [showNewProject, setShowNewProject] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    project_code: "", name: "", client: "", manager: "", location: "",
    budget: "", start_date: "", end_date: "", description: "", category: "Energy",
    map_x: "50", map_y: "50",
  });

  const [editForm, setEditForm] = useState({
    project_code: "", name: "", client: "", manager: "", location: "",
    budget: "", spent: "", rap: "", profit_margin_target: "10", tkdn_percentage: "0",
    start_date: "", end_date: "", description: "", category: "Energy",
    map_x: "", map_y: "", status: "on-track", phase: "Engineering", progress: "",
    image_url: "", video_url: "", cctv_url: "",
  });

  // Weekly photo
  const [photoWeekLabel, setPhotoWeekLabel] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");

  const getWeekOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const weekNum = Math.ceil(d.getDate() / 7);
      const label = `Week ${weekNum} - ${d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
      if (!options.includes(label)) options.push(label);
    }
    return options;
  };

  useEffect(() => {
    const opts = getWeekOptions();
    if (opts.length > 0 && !photoWeekLabel) setPhotoWeekLabel(opts[0]);
  }, []);

  // Load TKDN when project changes
  useEffect(() => {
    if (updateProjectId) {
      const p = allProjects.find(proj => proj.id === updateProjectId);
      if (p) setTkdnValue(String(p.tkdn_percentage || 0));
    }
  }, [updateProjectId, allProjects]);

  useEffect(() => {
    if (editProjectId) {
      const p = allProjects.find(proj => proj.id === editProjectId);
      if (p) {
        setEditForm({
          project_code: p.project_code || "", name: p.name || "", client: p.client || "",
          manager: p.manager || "", location: p.location || "",
          budget: String(p.budget || 0), spent: String(p.spent || 0),
          rap: String(p.rap || 0), profit_margin_target: String(p.profit_margin_target || 10),
          tkdn_percentage: String(p.tkdn_percentage || 0),
          start_date: p.start_date || "", end_date: p.end_date || "",
          description: p.description || "", category: p.category || "Energy",
          map_x: String(p.map_x || 0), map_y: String(p.map_y || 0),
          status: p.status || "on-track", phase: p.phase || "Engineering",
          progress: String(p.progress || 0), image_url: p.image_url || "",
          video_url: p.video_url || "", cctv_url: p.cctv_url || "",
        });
      }
    }
  }, [editProjectId, allProjects]);

  const { data: addendums = [] } = useAddendums(updateProjectId || undefined);
  const [addendumCode, setAddendumCode] = useState("");
  const [addendumDesc, setAddendumDesc] = useState("");
  const [addendumScope, setAddendumScope] = useState("");
  const [addendumCost, setAddendumCost] = useState("");
  const [addendumDays, setAddendumDays] = useState("");

  const handleProjectUpdate = async () => {
    if (!updateProjectId) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (formProgress) updates.progress = parseInt(formProgress);
      if (formStatus) updates.status = formStatus;
      if (formPhase) updates.phase = formPhase;
      const { error } = await supabase.from("projects").update(updates).eq("id", updateProjectId);
      if (error) throw error;
      const p = projects.find(pr => pr.id === updateProjectId);
      await logActivity(supabase, "project", "update_progress", `Progress updated: ${formProgress || p?.progress}% | Status: ${formStatus} | Phase: ${formPhase}`, updateProjectId, updateProjectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Data proyek berhasil diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleWorkItemUpdate = async () => {
    if (!updateItemId) return;
    setSaving(true);
    try {
      const item = workItems.find(wi => wi.id === updateItemId);
      if (!item) throw new Error("Item not found");
      const updates: Record<string, any> = {};
      if (updateQtyTotal) updates.qty_total = parseFloat(updateQtyTotal);
      const total = updateQtyTotal ? parseFloat(updateQtyTotal) : Number(item.qty_total);
      const qty = updateQtyCompleted ? parseFloat(updateQtyCompleted) : Number(item.qty_completed);
      if (updateQtyCompleted) updates.qty_completed = qty;
      const progress = total > 0 ? Math.round((qty / total) * 100) : 0;
      updates.progress = Math.min(100, progress);
      updates.status = progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "not-started";
      const { error } = await supabase.from("work_items").update(updates).eq("id", updateItemId);
      if (error) throw error;
      await logActivity(supabase, "work_item", "update", `Work item "${item.name}" updated: ${qty}/${total}`, updateProjectId, updateItemId);
      queryClient.invalidateQueries({ queryKey: ["work_items"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Progress pekerjaan diupdate" });
      setUpdateQtyCompleted(""); setUpdateQtyTotal("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleTkdnUpdate = async () => {
    if (!updateProjectId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").update({ tkdn_percentage: parseFloat(tkdnValue) || 0 }).eq("id", updateProjectId);
      if (error) throw error;
      await logActivity(supabase, "project", "update", `TKDN updated to ${tkdnValue}%`, updateProjectId, updateProjectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "TKDN berhasil diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddRisk = async () => {
    if (!updateProjectId || !riskTitle) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("project_alerts").insert([{
        project_id: updateProjectId, title: riskTitle, severity: riskSeverity as any,
        probability: riskProbability, impact: riskImpact, risk_owner: riskOwner,
        mitigation_plan: riskMitigation, description: riskDescription, category: riskCategory,
      }]);
      if (error) throw error;
      await logActivity(supabase, "risk", "create", `New risk: ${riskTitle} (${riskSeverity}, ${riskCategory})`, updateProjectId);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Risk item ditambahkan" });
      setRiskTitle(""); setRiskDescription(""); setRiskOwner(""); setRiskMitigation("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleCreateProject = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        project_code: newProject.project_code, name: newProject.name, client: newProject.client,
        manager: newProject.manager, location: newProject.location,
        budget: parseInt(newProject.budget) || 0, start_date: newProject.start_date,
        end_date: newProject.end_date, description: newProject.description,
        category: newProject.category, map_x: parseFloat(newProject.map_x) || 50,
        map_y: parseFloat(newProject.map_y) || 50,
      });
      if (error) throw error;
      await logActivity(supabase, "project", "create", `Project created: ${newProject.project_code} - ${newProject.name}`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Proyek baru ditambahkan" });
      setShowNewProject(false);
      setNewProject({ project_code: "", name: "", client: "", manager: "", location: "", budget: "", start_date: "", end_date: "", description: "", category: "Energy", map_x: "50", map_y: "50" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleUpdateProject = async () => {
    if (!editProjectId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").update({
        project_code: editForm.project_code, name: editForm.name, client: editForm.client,
        manager: editForm.manager, location: editForm.location,
          budget: parseInt(editForm.budget) || 0, spent: parseInt(editForm.spent) || 0,
        rap: parseInt(editForm.rap) || 0, contract_value: parseInt((editForm as any).contract_value) || 0,
        profit_margin_target: parseFloat(editForm.profit_margin_target) || 10,
        tkdn_percentage: parseFloat(editForm.tkdn_percentage) || 0,
        start_date: editForm.start_date, end_date: editForm.end_date,
        description: editForm.description || null, category: editForm.category || null,
        map_x: parseFloat(editForm.map_x) || 0, map_y: parseFloat(editForm.map_y) || 0,
        status: editForm.status as any, phase: editForm.phase as any,
        progress: parseInt(editForm.progress) || 0,
        image_url: editForm.image_url || null, video_url: editForm.video_url || null,
        cctv_url: editForm.cctv_url || null,
      }).eq("id", editProjectId);
      if (error) throw error;
      await logActivity(supabase, "project", "update", `Project ${editForm.project_code} updated`, editProjectId, editProjectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Proyek berhasil diupdate" });
      setEditProjectId(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Yakin hapus proyek ini?")) return;
    setSaving(true);
    try {
      const p = projects.find(pr => pr.id === id);
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "project", "delete", `Project deleted: ${p?.project_code || id}`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Proyek dihapus" });
      if (updateProjectId === id) setUpdateProjectId("");
      if (editProjectId === id) setEditProjectId(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddAddendum = async () => {
    if (!updateProjectId || !addendumCode) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("addendums").insert({
        project_id: updateProjectId, addendum_code: addendumCode,
        description: addendumDesc, scope_change: addendumScope,
        cost_impact: parseInt(addendumCost) || 0, schedule_impact_days: parseInt(addendumDays) || 0,
      });
      if (error) throw error;
      await logActivity(supabase, "addendum", "create", `Addendum ${addendumCode} created`, updateProjectId);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Addendum ditambahkan" });
      setAddendumCode(""); setAddendumDesc(""); setAddendumScope(""); setAddendumCost(""); setAddendumDays("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleApproveAddendum = async (id: string, costImpact: number, scheduleDays: number) => {
    setSaving(true);
    try {
      const { error: ae } = await supabase.from("addendums").update({
        approval_status: "approved", approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (ae) throw ae;
      if (updateProjectId && (costImpact !== 0 || scheduleDays !== 0)) {
        const proj = projects.find(p => p.id === updateProjectId);
        if (proj) {
          const updates: Record<string, any> = {};
          if (costImpact !== 0) updates.budget = proj.budget + costImpact;
          if (scheduleDays !== 0) {
            const newEnd = new Date(proj.end_date);
            newEnd.setDate(newEnd.getDate() + scheduleDays);
            updates.end_date = newEnd.toISOString().slice(0, 10);
          }
          await supabase.from("projects").update(updates).eq("id", updateProjectId);
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
      await logActivity(supabase, "addendum", "approve", `Addendum approved (cost: ${formatRupiah(costImpact)}, schedule: +${scheduleDays}d)`, updateProjectId, id);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Approved", description: "Addendum disetujui & proyek diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const downloadTemplate = () => {
    const csv = "project_code,work_area_code,work_area_name,work_item_code,work_item_name,unit,qty_total,qty_completed,weight,status\nPMT-001,WA-001,Area Tangki,WI-001,Tangki T-101,unit,10,5,30,in-progress";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "project_data_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Data Entry Center", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  const renderEditForm = () => {
    if (!editProjectId) return null;
    const ef = editForm;
    const set = (key: string, val: string) => setEditForm(prev => ({ ...prev, [key]: val }));

    return (
      <div className="glass-card rounded-lg shadow-card p-4 border-2 border-primary/20 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary" /> Edit Project — {ef.project_code}</h4>
          <button onClick={() => setEditProjectId(null)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2 mt-2">📋 Master Data</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div><label className={labelCls}>Project Code</label><input value={ef.project_code} onChange={e => set("project_code", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Project Name</label><input value={ef.name} onChange={e => set("name", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Client</label><input value={ef.client} onChange={e => set("client", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Project Manager</label><input value={ef.manager} onChange={e => set("manager", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Category</label>
            <select value={ef.category} onChange={e => set("category", e.target.value)} className={inputCls}>
              <option>Energy</option><option>Oil & Gas</option><option>Mining</option><option>Infrastructure</option><option>Industrial</option><option>Other</option>
            </select>
          </div>
          <div><label className={labelCls}>Location</label><input value={ef.location} onChange={e => set("location", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Start Date</label><input type="date" value={ef.start_date} onChange={e => set("start_date", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>End Date</label><input type="date" value={ef.end_date} onChange={e => set("end_date", e.target.value)} className={inputCls} /></div>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">📊 Status & Progress</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div><label className={labelCls}>Status</label>
            <select value={ef.status} onChange={e => set("status", e.target.value)} className={inputCls}>
              <option value="on-track">On Track</option><option value="at-risk">At Risk</option><option value="delayed">Delayed</option><option value="completed">Completed</option>
            </select>
          </div>
          <div><label className={labelCls}>Phase</label>
            <select value={ef.phase} onChange={e => set("phase", e.target.value)} className={inputCls}>
              <option>Engineering</option><option>Procurement</option><option>Construction</option><option>Commissioning</option>
            </select>
          </div>
          <div><label className={labelCls}>Progress %</label><input type="number" min="0" max="100" value={ef.progress} onChange={e => set("progress", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>TKDN %</label><input type="number" step="0.1" min="0" max="100" value={ef.tkdn_percentage} onChange={e => set("tkdn_percentage", e.target.value)} className={inputCls} /></div>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">💰 Financial & Budget</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div><label className={labelCls}>Contract Value (Juta Rp)</label><input type="number" value={(ef as any).contract_value || ""} onChange={e => set("contract_value", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Budget (Juta Rp)</label><input type="number" value={ef.budget} onChange={e => set("budget", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>RAP (Juta Rp)</label><input type="number" value={ef.rap} onChange={e => set("rap", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Actual Spent (Juta Rp)</label><input type="number" value={ef.spent} onChange={e => set("spent", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Target Margin (%)</label><input type="number" step="0.1" value={ef.profit_margin_target} onChange={e => set("profit_margin_target", e.target.value)} className={inputCls} /></div>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">🖼️ Media & Links</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div><label className={labelCls}>Cover Photo URL (Header)</label><input value={ef.image_url} onChange={e => set("image_url", e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div><label className={labelCls}>YouTube Video URL</label><input value={ef.video_url} onChange={e => set("video_url", e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." /></div>
          <div><label className={labelCls}>CCTV / Stream URL</label><input value={ef.cctv_url} onChange={e => set("cctv_url", e.target.value)} className={inputCls} placeholder="https://youtube.com/live/..." /></div>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">🗺️ Map & Description</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div><label className={labelCls}>Map X (Latitude)</label><input type="number" step="0.01" value={ef.map_x} onChange={e => set("map_x", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Map Y (Longitude)</label><input type="number" step="0.01" value={ef.map_y} onChange={e => set("map_y", e.target.value)} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Description / Scope</label><textarea value={ef.description} onChange={e => set("description", e.target.value)} className={inputCls + " min-h-[60px]"} placeholder="Deskripsi proyek..." /></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleUpdateProject} disabled={saving || !ef.project_code || !ef.name} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => setEditProjectId(null)} className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Data Entry Center</h2>
              <p className="text-xs text-muted-foreground">Update data proyek, risk, procurement, budget, TKDN, addendum & manajemen proyek</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90"><Download className="h-3.5 w-3.5" /> Template CSV</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-5 border-b border-border pb-2 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "project-crud" && (
            <div className="mb-5">
              <label className={labelCls}>Pilih Proyek</label>
              <select value={updateProjectId} onChange={e => setUpdateProjectId(e.target.value)} className={inputCls}>
                <option value="">— Pilih Proyek —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === "regular" && updateProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Weekly Progress */}
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Save className="h-4 w-4 text-primary" /> Weekly Progress Update</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={labelCls}>Progress %</label><input type="number" min="0" max="100" value={formProgress} onChange={e => setFormProgress(e.target.value)} className={inputCls} placeholder="72" /></div>
                    <div><label className={labelCls}>Status</label><select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={inputCls}><option value="on-track">On Track</option><option value="at-risk">At Risk</option><option value="delayed">Delayed</option><option value="completed">Completed</option></select></div>
                    <div><label className={labelCls}>Phase</label><select value={formPhase} onChange={e => setFormPhase(e.target.value)} className={inputCls}><option>Engineering</option><option>Procurement</option><option>Construction</option><option>Commissioning</option></select></div>
                  </div>
                  <button onClick={handleProjectUpdate} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update Progress"}</button>
                </div>
              </div>

              {/* Work Item Progress with editable qty_total */}
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Work Item Progress</h3>
                {workItems.length === 0 ? <p className="text-xs text-muted-foreground">Proyek ini belum memiliki work items.</p> : (
                  <div className="space-y-3">
                    <div><label className={labelCls}>Work Item</label><select value={updateItemId} onChange={e => setUpdateItemId(e.target.value)} className={inputCls}><option value="">— Pilih Item —</option>{workItems.map(wi => <option key={wi.id} value={wi.id}>{wi.code} — {wi.name} ({Number(wi.qty_completed)}/{Number(wi.qty_total)} {wi.unit})</option>)}</select></div>
                    {updateItemId && (() => {
                      const item = workItems.find(wi => wi.id === updateItemId);
                      if (!item) return null;
                      return (
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                          <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Current: <span className="text-foreground font-bold">{Number(item.qty_completed).toLocaleString()}/{Number(item.qty_total).toLocaleString()} {item.unit}</span></span></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className={labelCls}>Total Qty</label><input type="number" min="0" value={updateQtyTotal} onChange={e => setUpdateQtyTotal(e.target.value)} className={inputCls} placeholder={String(Number(item.qty_total))} /></div>
                            <div><label className={labelCls}>Completed Qty</label><input type="number" min="0" value={updateQtyCompleted} onChange={e => setUpdateQtyCompleted(e.target.value)} className={inputCls} placeholder={String(Number(item.qty_completed))} /></div>
                          </div>
                          <button onClick={handleWorkItemUpdate} disabled={saving} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update"}</button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* TKDN Update */}
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">🇮🇩 Update TKDN</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>TKDN Percentage (%)</label>
                    <input type="number" step="0.1" min="0" max="100" value={tkdnValue} onChange={e => setTkdnValue(e.target.value)} className={inputCls} />
                  </div>
                  <button onClick={handleTkdnUpdate} disabled={saving} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5 inline mr-1" /> Save</button>
                </div>
              </div>

              {/* Cost Tracking Summary */}
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-success" /> Cost Summary</h3>
                {(() => {
                  const p = projects.find(pr => pr.id === updateProjectId);
                  if (!p) return null;
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Contract Value</p>
                        <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(p.budget)}</p>
                      </div>
                      <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">RAP</p>
                        <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(p.rap)}</p>
                      </div>
                      <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Actual Spent</p>
                        <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(p.spent)}</p>
                      </div>
                      <div className={`rounded-lg p-3 border text-center ${p.spent <= p.rap ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                        <p className="text-[9px] text-muted-foreground uppercase">Variance (RAP-Actual)</p>
                        <p className={`text-sm font-bold font-mono-data ${p.spent <= p.rap ? "text-success" : "text-destructive"}`}>{formatRupiah(p.rap - p.spent)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Risk Entry with Category */}
              <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Add Risk / Issue</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div><label className={labelCls}>Risk Title</label><input value={riskTitle} onChange={e => setRiskTitle(e.target.value)} className={inputCls} placeholder="Keterlambatan material" /></div>
                  <div><label className={labelCls}>Category</label>
                    <select value={riskCategory} onChange={e => setRiskCategory(e.target.value)} className={inputCls}>
                      <option value="operational">Operational</option>
                      <option value="contractual">Contractual</option>
                      <option value="financial">Financial</option>
                      <option value="technical">Technical</option>
                      <option value="hse">HSE</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Severity</label><select value={riskSeverity} onChange={e => setRiskSeverity(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                  <div><label className={labelCls}>Probability</label><select value={riskProbability} onChange={e => setRiskProbability(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very-high">Very High</option></select></div>
                  <div><label className={labelCls}>Impact</label><select value={riskImpact} onChange={e => setRiskImpact(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very-high">Very High</option></select></div>
                  <div><label className={labelCls}>Risk Owner</label><input value={riskOwner} onChange={e => setRiskOwner(e.target.value)} className={inputCls} placeholder="Nama PM" /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Mitigation / Description</label><input value={riskMitigation} onChange={e => setRiskMitigation(e.target.value)} className={inputCls} placeholder="Rencana mitigasi" /></div>
                </div>
                <button onClick={handleAddRisk} disabled={saving || !riskTitle} className="mt-3 flex items-center gap-2 px-4 py-2 bg-warning text-warning-foreground rounded-lg text-xs font-medium hover:bg-warning/90 disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Add Risk"}</button>
              </div>

              <RiskResolvePanel projectId={updateProjectId} />

              {/* Procurement Panel */}
              <ProcurementPanel projectId={updateProjectId} />

              {/* Weekly Photo Upload */}
              <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Upload Foto Progress Mingguan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Periode Minggu</label>
                    <select value={photoWeekLabel} onChange={e => setPhotoWeekLabel(e.target.value)} className={inputCls}>
                      {getWeekOptions().map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Caption (opsional)</label>
                    <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} className={inputCls} placeholder="Deskripsi foto..." />
                  </div>
                  <div>
                    <label className={labelCls}>Pilih Foto (multi)</label>
                    <input type="file" accept="image/*" multiple onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setSaving(true);
                      try {
                        for (const file of Array.from(files)) {
                          const ext = file.name.split('.').pop();
                          const path = `${updateProjectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                          const { error: uploadErr } = await supabase.storage.from('project-photos').upload(path, file);
                          if (uploadErr) throw uploadErr;
                          const { data: urlData } = supabase.storage.from('project-photos').getPublicUrl(path);
                          await supabase.from('project_photos').insert({ project_id: updateProjectId, photo_url: urlData.publicUrl, caption: photoCaption, week_label: photoWeekLabel });
                        }
                        await logActivity(supabase, "photo", "create", `${files.length} photos uploaded (${photoWeekLabel})`, updateProjectId);
                        queryClient.invalidateQueries({ queryKey: ["project_photos"] });
                        queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
                        toast({ title: "✅ Berhasil", description: `${files.length} foto berhasil diupload` });
                      } catch (err: any) {
                        toast({ title: "❌ Error", description: err.message, variant: "destructive" });
                      } finally { setSaving(false); }
                    }} className={inputCls + " file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground"} />
                  </div>
                </div>
                <PhotoGallery projectId={updateProjectId} />
              </div>
            </div>
          )}

          {activeTab === "project-crud" && (
            <div className="space-y-5 mb-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Manage Projects</h3>
                <button onClick={() => { setShowNewProject(true); setEditProjectId(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add Project</button>
              </div>

              {showNewProject && (
                <div className="glass-card rounded-lg shadow-card p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">New Project</h4>
                    <button onClick={() => setShowNewProject(false)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div><label className={labelCls}>Project Code</label><input value={newProject.project_code} onChange={e => setNewProject({ ...newProject, project_code: e.target.value })} className={inputCls} placeholder="PMT-016" /></div>
                    <div><label className={labelCls}>Name</label><input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className={inputCls} placeholder="Nama proyek" /></div>
                    <div><label className={labelCls}>Client</label><input value={newProject.client} onChange={e => setNewProject({ ...newProject, client: e.target.value })} className={inputCls} placeholder="PT Client" /></div>
                    <div><label className={labelCls}>Manager</label><input value={newProject.manager} onChange={e => setNewProject({ ...newProject, manager: e.target.value })} className={inputCls} placeholder="Nama PM" /></div>
                    <div><label className={labelCls}>Location</label><input value={newProject.location} onChange={e => setNewProject({ ...newProject, location: e.target.value })} className={inputCls} placeholder="Kota, Provinsi" /></div>
                    <div><label className={labelCls}>Budget (Juta Rp)</label><input type="number" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} className={inputCls} placeholder="500000" /></div>
                    <div><label className={labelCls}>Start Date</label><input type="date" value={newProject.start_date} onChange={e => setNewProject({ ...newProject, start_date: e.target.value })} className={inputCls} /></div>
                    <div><label className={labelCls}>End Date</label><input type="date" value={newProject.end_date} onChange={e => setNewProject({ ...newProject, end_date: e.target.value })} className={inputCls} /></div>
                  </div>
                  <button onClick={handleCreateProject} disabled={saving || !newProject.project_code || !newProject.name} className="mt-3 flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90 disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {saving ? "Creating..." : "Create Project"}</button>
                </div>
              )}

              {renderEditForm()}

              <div className="glass-card rounded-lg shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50 border-b border-border">
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Code</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Manager</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Progress</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">TKDN</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Budget</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Actions</th>
                    </tr></thead>
                    <tbody>{projects.map(p => (
                      <tr key={p.id} className={`border-b border-border/30 ${editProjectId === p.id ? "bg-primary/5" : ""}`}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.manager}</td>
                        <td className="py-2 px-3 capitalize text-muted-foreground">{p.status}</td>
                        <td className="py-2 px-3 font-mono-data">{p.progress}%</td>
                        <td className="py-2 px-3 font-mono-data">{p.tkdn_percentage}%</td>
                        <td className="py-2 px-3 font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditProjectId(p.id); setShowNewProject(false); }} className="p-1 hover:bg-primary/10 rounded" title="Edit"><Edit3 className="h-3.5 w-3.5 text-primary" /></button>
                            <button onClick={() => handleDeleteProject(p.id)} className="p-1 hover:bg-destructive/10 rounded" title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "addendum" && updateProjectId && (
            <div className="space-y-5 mb-5">
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /> New Contract Addendum</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div><label className={labelCls}>Addendum ID</label><input value={addendumCode} onChange={e => setAddendumCode(e.target.value)} className={inputCls} placeholder="ADD-001" /></div>
                  <div><label className={labelCls}>Description</label><input value={addendumDesc} onChange={e => setAddendumDesc(e.target.value)} className={inputCls} placeholder="Perubahan scope" /></div>
                  <div><label className={labelCls}>Scope Change</label><input value={addendumScope} onChange={e => setAddendumScope(e.target.value)} className={inputCls} placeholder="Penambahan tangki" /></div>
                  <div><label className={labelCls}>Cost Impact (Juta)</label><input type="number" value={addendumCost} onChange={e => setAddendumCost(e.target.value)} className={inputCls} placeholder="50000" /></div>
                  <div><label className={labelCls}>Schedule Impact (Days)</label><input type="number" value={addendumDays} onChange={e => setAddendumDays(e.target.value)} className={inputCls} placeholder="30" /></div>
                </div>
                <button onClick={handleAddAddendum} disabled={saving || !addendumCode} className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Add Addendum"}</button>
              </div>
              {addendums.length > 0 && (
                <div className="glass-card rounded-lg shadow-card overflow-hidden">
                  <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Addendum List</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">ID</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Description</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Cost Impact</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Schedule</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Action</th>
                      </tr></thead>
                      <tbody>{addendums.map(a => (
                        <tr key={a.id} className="border-b border-border/30">
                          <td className="py-2 px-3 font-mono-data text-primary">{a.addendum_code}</td>
                          <td className="py-2 px-3 text-foreground">{a.description}</td>
                          <td className="py-2 px-3 text-right font-mono-data text-accent">{a.cost_impact > 0 ? "+" : ""}{formatRupiah(a.cost_impact)}</td>
                          <td className="py-2 px-3 text-right font-mono-data">{a.schedule_impact_days > 0 ? "+" : ""}{a.schedule_impact_days}d</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${a.approval_status === "approved" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}`}>{a.approval_status}</span>
                          </td>
                          <td className="py-2 px-3">
                            {a.approval_status === "pending" && (
                              <button onClick={() => handleApproveAddendum(a.id, a.cost_impact, a.schedule_impact_days)} disabled={saving} className="text-[10px] px-2 py-1 bg-success text-success-foreground rounded hover:bg-success/90 disabled:opacity-50">Approve</button>
                            )}
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "scurve" && updateProjectId && (
            <SCurveEditor projectId={updateProjectId} />
          )}

          {!updateProjectId && activeTab !== "project-crud" && (
            <div className="glass-card rounded-lg shadow-card p-8 text-center">
              <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Pilih proyek di atas untuk mulai menginput data</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataEntry;

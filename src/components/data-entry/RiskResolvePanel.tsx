import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Edit3, Save, X, Plus, Trash2, Calendar, User } from "lucide-react";
import { supabase, logActivity, RISK_PRIORITIES, RISK_STATUSES } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";

const RISK_CATEGORIES = ["technical","schedule","cost","procurement","contractual","operational","hsse"];

export function RiskResolvePanel({ projectId, onLogged }: { projectId: string; onLogged?: (msg: string) => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>({});
  const [newOpen, setNewOpen] = useState(false);
  const [newRisk, setNewRisk] = useState<any>({
    title: "", description: "", severity: "medium", priority: "medium",
    category: "operational", pic: "", risk_owner: "", mitigation_plan: "",
    due_date: "", current_status: "open", completion_percentage: 0,
  });
  const qc = useQueryClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("project_alerts").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setAlerts(data || []); setLoading(false);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const create = async () => {
    if (!newRisk.title) { toast({ title: "Isi title", variant: "destructive" }); return; }
    const { error } = await supabase.from("project_alerts").insert([{
      project_id: projectId, ...newRisk,
      due_date: newRisk.due_date || null,
      completion_percentage: Number(newRisk.completion_percentage) || 0,
    }] as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "risk", "create", `New risk: ${newRisk.title} [${newRisk.priority}]`, projectId);
    onLogged?.(`Risk baru: “${newRisk.title}” · priority ${newRisk.priority} · ${newRisk.current_status}`);
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["all_alerts"] });
    setNewOpen(false);
    setNewRisk({ title: "", description: "", severity: "medium", priority: "medium", category: "operational", pic: "", risk_owner: "", mitigation_plan: "", due_date: "", current_status: "open", completion_percentage: 0 });
    load(); toast({ title: "✅ Risk ditambahkan" });
  };

  const saveEdit = async (id: string) => {
    const patch = {
      title: edit.title, description: edit.description, severity: edit.severity,
      priority: edit.priority, category: edit.category, pic: edit.pic || "",
      risk_owner: edit.risk_owner || "", mitigation_plan: edit.mitigation_plan || "",
      due_date: edit.due_date || null, current_status: edit.current_status,
      completion_percentage: Math.min(100, Math.max(0, Number(edit.completion_percentage) || 0)),
    };
    const { error } = await supabase.from("project_alerts").update(patch as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "risk", "update", `Risk updated: ${edit.title} (${patch.completion_percentage}%)`, projectId, id);
    onLogged?.(`Risk “${edit.title}” diupdate — status ${patch.current_status}, ${patch.completion_percentage}%`);
    setEditingId(null); load(); qc.invalidateQueries({ queryKey: ["alerts"] });
    toast({ title: "✅ Saved" });
  };

  const resolve = async (id: string, title: string) => {
    const nowIso = new Date().toISOString();
    await supabase.from("project_alerts").update({ is_resolved: true, resolved_at: nowIso, closed_at: nowIso, current_status: "closed", completion_percentage: 100 } as any).eq("id", id);
    await logActivity(supabase, "risk", "resolve", `Risk closed: ${title}`, projectId, id);
    onLogged?.(`Risk “${title}” di-close`);
    qc.invalidateQueries({ queryKey: ["alerts"] });
    load(); toast({ title: "✅ Resolved" });
  };

  const del = async (id: string, title: string) => {
    if (!confirm(`Hapus risk "${title}"?`)) return;
    await supabase.from("project_alerts").delete().eq("id", id);
    await logActivity(supabase, "risk", "delete", `Risk deleted: ${title}`, projectId, id);
    load();
  };

  const visible = alerts.filter(a => showResolved ? a.is_resolved : !a.is_resolved);
  const today = new Date().toISOString().slice(0,10);

  const sevColor: Record<string, string> = { critical: "text-destructive border-destructive/40 bg-destructive/5", high: "text-warning border-warning/40 bg-warning/5", medium: "text-info border-info/40 bg-info/5", low: "text-muted-foreground border-border" };
  const priBadge: Record<string, string> = { critical: "bg-destructive text-destructive-foreground", high: "bg-warning text-warning-foreground", medium: "bg-info text-info-foreground", low: "bg-muted text-foreground" };
  const statColor: Record<string, string> = { open: "bg-destructive/15 text-destructive", "in-progress": "bg-primary/15 text-primary", mitigating: "bg-warning/15 text-warning", monitoring: "bg-info/15 text-info", closed: "bg-success/15 text-success" };

  return (
    <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Risk & Issue Register ({visible.length})</h3>
        <div className="flex gap-1">
          <button onClick={() => setShowResolved(!showResolved)} className="px-2 py-1 bg-muted text-foreground border border-border rounded text-[10px]">{showResolved ? "Show Active" : "Show Closed"}</button>
          <button onClick={() => setNewOpen(!newOpen)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px]"><Plus className="h-3 w-3" /> New Risk</button>
        </div>
      </div>

      {newOpen && (
        <div className="mb-3 p-3 bg-muted/30 rounded border border-border/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2"><label className={labelCls}>Title*</label><input value={newRisk.title} onChange={e => setNewRisk({...newRisk, title: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Priority</label><select value={newRisk.priority} onChange={e => setNewRisk({...newRisk, priority: e.target.value})} className={inputCls}>{RISK_PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}</select></div>
            <div><label className={labelCls}>Severity</label><select value={newRisk.severity} onChange={e => setNewRisk({...newRisk, severity: e.target.value})} className={inputCls}><option>critical</option><option>high</option><option>medium</option><option>low</option></select></div>
            <div><label className={labelCls}>Category</label><select value={newRisk.category} onChange={e => setNewRisk({...newRisk, category: e.target.value})} className={inputCls}>{RISK_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}</select></div>
            <div><label className={labelCls}>PIC</label><input value={newRisk.pic} onChange={e => setNewRisk({...newRisk, pic: e.target.value})} className={inputCls} placeholder="Person in charge" /></div>
            <div><label className={labelCls}>Due Date</label><input type="date" value={newRisk.due_date} onChange={e => setNewRisk({...newRisk, due_date: e.target.value})} className={inputCls} /></div>
            <div><label className={labelCls}>Current Status</label><select value={newRisk.current_status} onChange={e => setNewRisk({...newRisk, current_status: e.target.value})} className={inputCls}>{RISK_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}</select></div>
            <div className="sm:col-span-4"><label className={labelCls}>Description</label><input value={newRisk.description} onChange={e => setNewRisk({...newRisk, description: e.target.value})} className={inputCls} /></div>
            <div className="sm:col-span-4"><label className={labelCls}>Mitigation Plan</label><input value={newRisk.mitigation_plan} onChange={e => setNewRisk({...newRisk, mitigation_plan: e.target.value})} className={inputCls} /></div>
          </div>
          <div className="flex gap-2 mt-2"><button onClick={create} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs"><Save className="h-3 w-3 inline mr-1" />Create</button><button onClick={() => setNewOpen(false)} className="px-3 py-1.5 bg-muted rounded text-xs border border-border">Cancel</button></div>
        </div>
      )}

      {loading ? <p className="text-xs text-muted-foreground">Loading...</p> : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {showResolved ? "Belum ada risk yang closed." : "Tidak ada risk aktif untuk proyek ini."}</p>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {visible.map(a => {
            const overdue = a.due_date && !a.is_resolved && a.due_date < today;
            const isEditing = editingId === a.id;
            const daysToDue = a.due_date ? Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={a.id} className={`p-2.5 rounded-lg border ${overdue ? "border-destructive bg-destructive/10" : sevColor[a.severity] || "border-border"}`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2"><label className={labelCls}>Title</label><input value={edit.title} onChange={e => setEdit({...edit, title: e.target.value})} className={inputCls} /></div>
                      <div><label className={labelCls}>Priority</label><select value={edit.priority} onChange={e => setEdit({...edit, priority: e.target.value})} className={inputCls}>{RISK_PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}</select></div>
                      <div><label className={labelCls}>Severity</label><select value={edit.severity} onChange={e => setEdit({...edit, severity: e.target.value})} className={inputCls}><option>critical</option><option>high</option><option>medium</option><option>low</option></select></div>
                      <div><label className={labelCls}>Category</label><select value={edit.category} onChange={e => setEdit({...edit, category: e.target.value})} className={inputCls}>{RISK_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}</select></div>
                      <div><label className={labelCls}>PIC</label><input value={edit.pic || ""} onChange={e => setEdit({...edit, pic: e.target.value})} className={inputCls} /></div>
                      <div><label className={labelCls}>Due Date</label><input type="date" value={edit.due_date || ""} onChange={e => setEdit({...edit, due_date: e.target.value})} className={inputCls} /></div>
                      <div><label className={labelCls}>Status</label><select value={edit.current_status || "open"} onChange={e => setEdit({...edit, current_status: e.target.value})} className={inputCls}>{RISK_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}</select></div>
                      <div><label className={labelCls}>Completion %</label><input type="number" min={0} max={100} value={edit.completion_percentage || 0} onChange={e => setEdit({...edit, completion_percentage: e.target.value})} className={inputCls} /></div>
                      <div className="sm:col-span-4"><label className={labelCls}>Description</label><input value={edit.description || ""} onChange={e => setEdit({...edit, description: e.target.value})} className={inputCls} /></div>
                      <div className="sm:col-span-4"><label className={labelCls}>Mitigation Plan</label><input value={edit.mitigation_plan || ""} onChange={e => setEdit({...edit, mitigation_plan: e.target.value})} className={inputCls} /></div>
                    </div>
                    <div className="flex gap-1"><button onClick={() => saveEdit(a.id)} className="px-2 py-1 bg-success text-success-foreground rounded text-[10px]"><Save className="h-3 w-3 inline mr-1" />Save</button><button onClick={() => setEditingId(null)} className="px-2 py-1 bg-muted rounded text-[10px] border border-border"><X className="h-3 w-3" /></button></div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${priBadge[a.priority || a.severity]}`}>{a.priority || a.severity}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${statColor[a.current_status || 'open']}`}>{a.current_status || 'open'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{a.category}</span>
                      {overdue && <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold animate-pulse">⚠ OVERDUE</span>}
                      <span className="text-xs font-semibold text-foreground flex-1 min-w-[120px]">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground">{a.completion_percentage || 0}%</span>
                    </div>
                    {a.description && <p className="text-[10px] text-muted-foreground mt-1">{a.description}</p>}
                    {a.mitigation_plan && <p className="text-[10px] text-primary mt-0.5">Mitigation: {a.mitigation_plan}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground flex-wrap">
                      {a.pic && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />PIC: {a.pic}</span>}
                      {a.risk_owner && <span>Owner: {a.risk_owner}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />Created: {new Date(a.created_at).toLocaleDateString("id-ID")}</span>
                      {a.due_date && <span className={`flex items-center gap-0.5 font-medium ${overdue ? "text-destructive" : daysToDue !== null && daysToDue <= 7 ? "text-warning" : ""}`}><Calendar className="h-2.5 w-2.5" />Due: {new Date(a.due_date).toLocaleDateString("id-ID")}{daysToDue !== null && !a.is_resolved && ` (${daysToDue >= 0 ? `${daysToDue}d left` : `${-daysToDue}d overdue`})`}</span>}
                      {a.closed_at && <span className="text-success">Closed: {new Date(a.closed_at).toLocaleDateString("id-ID")}</span>}
                    </div>
                    <div className="flex justify-end gap-1 mt-2">
                      <button onClick={() => { setEditingId(a.id); setEdit(a); }} className="p-1 hover:bg-primary/10 rounded"><Edit3 className="h-3 w-3 text-primary" /></button>
                      {!a.is_resolved && <button onClick={() => resolve(a.id, a.title)} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-success text-success-foreground rounded"><CheckCircle2 className="h-3 w-3" />Close</button>}
                      <button onClick={() => del(a.id, a.title)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

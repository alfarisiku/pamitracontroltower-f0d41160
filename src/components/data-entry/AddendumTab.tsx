import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileBarChart, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase, formatIDR, logActivity, DbProject } from "@/lib/supabase";
import { useAddendums } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

export const ADDENDUM_STATUSES = [
  { value: "potential", label: "Potensial" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const statusLabel = (v: string) => ADDENDUM_STATUSES.find(s => s.value === v)?.label || v;
const statusCls = (v: string) =>
  v === "approved" ? "bg-success/15 text-success border-success/30"
  : v === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30"
  : v === "potential" ? "bg-primary/10 text-primary border-primary/30"
  : "bg-warning/15 text-warning border-warning/30";

export function AddendumTab({ projectId, projects }: { projectId: string; projects: DbProject[] }) {
  const queryClient = useQueryClient();
  const { data: addendums = [] } = useAddendums(projectId || undefined);
  const [saving, setSaving] = useState(false);
  const [addendumCode, setAddendumCode] = useState("");
  const [addendumDesc, setAddendumDesc] = useState("");
  const [addendumDate, setAddendumDate] = useState("");
  const [addendumCost, setAddendumCost] = useState("");
  const [addendumDays, setAddendumDays] = useState("");
  const [addendumStatus, setAddendumStatus] = useState("potential");

  // Cost impact is stored in JUTA in DB (aligned with projects.budget unit).
  // UI accepts raw Rupiah for easier data entry; we convert on save/load.
  const rupiahToJuta = (rp: string) => Math.round((parseInt(rp || "0", 10) || 0) / 1_000_000);
  const jutaToRupiah = (jt: number) => String(Math.round((Number(jt) || 0) * 1_000_000));
  const previewRp = (rp: string) => {
    const n = parseInt(rp || "0", 10) || 0;
    return n === 0 ? "" : formatIDR(n);
  };

  const handleAddAddendum = async () => {
    if (!projectId || !addendumCode) return;
    setSaving(true);
    try {
      const costJuta = rupiahToJuta(addendumCost);
      const { error } = await supabase.from("addendums").insert({
        project_id: projectId, addendum_code: addendumCode,
        description: addendumDesc,
        addendum_date: addendumDate || null,
        cost_impact: costJuta, schedule_impact_days: parseInt(addendumDays) || 0,
        approval_status: addendumStatus,
      });
      if (error) throw error;
      await logActivity(supabase, "addendum", "create", `Addendum ${addendumCode} created`, projectId);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Addendum ditambahkan" });
      setAddendumCode(""); setAddendumDesc(""); setAddendumDate(""); setAddendumCost(""); setAddendumDays(""); setAddendumStatus("potential");
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
      if (projectId && (costImpact !== 0 || scheduleDays !== 0)) {
        const proj = projects.find(p => p.id === projectId);
        if (proj) {
          const updates: Record<string, any> = {};
          if (costImpact !== 0) updates.budget = proj.budget + costImpact;
          if (scheduleDays !== 0) {
            const newEnd = new Date(proj.end_date);
            newEnd.setDate(newEnd.getDate() + scheduleDays);
            updates.end_date = newEnd.toISOString().slice(0, 10);
          }
          await supabase.from("projects").update(updates).eq("id", projectId);
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      }
      await logActivity(supabase, "addendum", "approve", `Addendum approved (cost: ${formatIDR((costImpact || 0) * 1_000_000)}, schedule: +${scheduleDays}d)`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Approved", description: "Addendum disetujui & proyek diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ addendum_code: string; description: string; addendum_date: string; cost_impact: string; schedule_impact_days: string; approval_status: string }>({
    addendum_code: "", description: "", addendum_date: "", cost_impact: "", schedule_impact_days: "", approval_status: "potential",
  });

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setEdit({
      addendum_code: a.addendum_code || "",
      description: a.description || "",
      addendum_date: a.addendum_date || "",
      cost_impact: jutaToRupiah(a.cost_impact ?? 0),
      schedule_impact_days: String(a.schedule_impact_days ?? 0),
      approval_status: a.approval_status || "potential",
    });
  };
  const cancelEdit = () => { setEditingId(null); };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("addendums").update({
        addendum_code: edit.addendum_code,
        description: edit.description,
        addendum_date: edit.addendum_date || null,
        cost_impact: rupiahToJuta(edit.cost_impact),
        schedule_impact_days: parseInt(edit.schedule_impact_days) || 0,
        approval_status: edit.approval_status,
        approved_at: edit.approval_status === "approved" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "addendum", "update", `Addendum ${edit.addendum_code} updated`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Addendum diupdate" });
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus addendum ${code}?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("addendums").delete().eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "addendum", "delete", `Addendum ${code} deleted`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "🗑️ Dihapus", description: `Addendum ${code} dihapus` });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 mb-5">
      <div className="glass-card rounded-lg shadow-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /> New Contract Addendum</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div><label className={labelCls}>Addendum ID</label><input value={addendumCode} onChange={e => setAddendumCode(e.target.value)} className={inputCls} placeholder="ADD-001" /></div>
          <div><label className={labelCls}>Description</label><input value={addendumDesc} onChange={e => setAddendumDesc(e.target.value)} className={inputCls} placeholder="Perubahan scope" /></div>
          <div><label className={labelCls}>Addendum Date</label><input type="date" value={addendumDate} onChange={e => setAddendumDate(e.target.value)} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Cost Impact (Rp)</label>
            <input type="number" value={addendumCost} onChange={e => setAddendumCost(e.target.value)} className={inputCls} placeholder="50000000" />
            {addendumCost && <p className="text-[10px] text-muted-foreground mt-0.5">≈ {previewRp(addendumCost)}</p>}
          </div>
          <div><label className={labelCls}>Schedule Impact (Days)</label><input type="number" value={addendumDays} onChange={e => setAddendumDays(e.target.value)} className={inputCls} placeholder="30" /></div>
          <div><label className={labelCls}>Status</label>
            <select value={addendumStatus} onChange={e => setAddendumStatus(e.target.value)} className={inputCls}>
              {ADDENDUM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
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
                <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Date</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Description</th>
                <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Cost Impact</th>
                <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Schedule</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>{addendums.map(a => {
                const isEditing = editingId === a.id;
                return (
                  <tr key={a.id} className="border-b border-border/30">
                    {isEditing ? (
                      <>
                        <td className="py-1.5 px-2"><input value={edit.addendum_code} onChange={e => setEdit(s => ({ ...s, addendum_code: e.target.value }))} className={inputCls} /></td>
                        <td className="py-1.5 px-2"><input type="date" value={edit.addendum_date} onChange={e => setEdit(s => ({ ...s, addendum_date: e.target.value }))} className={inputCls} /></td>
                        <td className="py-1.5 px-2"><input value={edit.description} onChange={e => setEdit(s => ({ ...s, description: e.target.value }))} className={inputCls} /></td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={edit.cost_impact} onChange={e => setEdit(s => ({ ...s, cost_impact: e.target.value }))} className={`${inputCls} text-right`} placeholder="Rupiah utuh" />
                          {edit.cost_impact && <p className="text-[9px] text-muted-foreground mt-0.5 text-right">≈ {previewRp(edit.cost_impact)}</p>}
                        </td>
                        <td className="py-1.5 px-2"><input type="number" value={edit.schedule_impact_days} onChange={e => setEdit(s => ({ ...s, schedule_impact_days: e.target.value }))} className={`${inputCls} text-right`} /></td>
                        <td className="py-1.5 px-2">
                          <select value={edit.approval_status} onChange={e => setEdit(s => ({ ...s, approval_status: e.target.value }))} className={inputCls}>
                            {ADDENDUM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleSaveEdit(a.id)} disabled={saving} className="text-[10px] p-1 bg-success text-success-foreground rounded hover:bg-success/90 disabled:opacity-50" title="Simpan"><Check className="h-3 w-3" /></button>
                            <button onClick={cancelEdit} disabled={saving} className="text-[10px] p-1 bg-muted text-foreground rounded hover:bg-muted/80 border border-border" title="Batal"><X className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 font-mono-data text-primary whitespace-nowrap">{a.addendum_code}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-foreground">{a.addendum_date ? new Date(a.addendum_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td className="py-2 px-3 text-foreground">{a.description}</td>
                        <td className="py-2 px-3 text-right font-mono-data text-accent whitespace-nowrap">{a.cost_impact > 0 ? "+" : ""}{formatIDR((a.cost_impact || 0) * 1_000_000)}</td>
                        <td className="py-2 px-3 text-right font-mono-data whitespace-nowrap">{a.schedule_impact_days > 0 ? "+" : ""}{a.schedule_impact_days}d</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusCls(a.approval_status)}`}>{statusLabel(a.approval_status)}</span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {a.approval_status !== "approved" && (
                              <button onClick={() => handleApproveAddendum(a.id, a.cost_impact, a.schedule_impact_days)} disabled={saving} className="text-[10px] px-2 py-1 bg-success text-success-foreground rounded hover:bg-success/90 disabled:opacity-50">Approve</button>
                            )}
                            <button onClick={() => startEdit(a)} disabled={saving} className="text-[10px] p-1 bg-primary/10 text-primary rounded hover:bg-primary/20 border border-primary/30" title="Edit"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => handleDelete(a.id, a.addendum_code)} disabled={saving} className="text-[10px] p-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 border border-destructive/30" title="Hapus"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

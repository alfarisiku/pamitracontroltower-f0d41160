import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileBarChart, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase, formatRupiah, logActivity, DbProject } from "@/lib/supabase";
import { useAddendums } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

export function AddendumTab({ projectId, projects }: { projectId: string; projects: DbProject[] }) {
  const queryClient = useQueryClient();
  const { data: addendums = [] } = useAddendums(projectId || undefined);
  const [saving, setSaving] = useState(false);
  const [addendumCode, setAddendumCode] = useState("");
  const [addendumDesc, setAddendumDesc] = useState("");
  const [addendumDate, setAddendumDate] = useState("");
  const [addendumCost, setAddendumCost] = useState("");
  const [addendumDays, setAddendumDays] = useState("");

  const handleAddAddendum = async () => {
    if (!projectId || !addendumCode) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("addendums").insert({
        project_id: projectId, addendum_code: addendumCode,
        description: addendumDesc,
        addendum_date: addendumDate || null,
        cost_impact: parseInt(addendumCost) || 0, schedule_impact_days: parseInt(addendumDays) || 0,
      });
      if (error) throw error;
      await logActivity(supabase, "addendum", "create", `Addendum ${addendumCode} created`, projectId);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Addendum ditambahkan" });
      setAddendumCode(""); setAddendumDesc(""); setAddendumDate(""); setAddendumCost(""); setAddendumDays("");
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
      await logActivity(supabase, "addendum", "approve", `Addendum approved (cost: ${formatRupiah(costImpact)}, schedule: +${scheduleDays}d)`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Approved", description: "Addendum disetujui & proyek diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ addendum_code: string; description: string; addendum_date: string; cost_impact: string; schedule_impact_days: string }>({
    addendum_code: "", description: "", addendum_date: "", cost_impact: "", schedule_impact_days: "",
  });

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setEdit({
      addendum_code: a.addendum_code || "",
      description: a.description || "",
      addendum_date: a.addendum_date || "",
      cost_impact: String(a.cost_impact ?? 0),
      schedule_impact_days: String(a.schedule_impact_days ?? 0),
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
        cost_impact: parseInt(edit.cost_impact) || 0,
        schedule_impact_days: parseInt(edit.schedule_impact_days) || 0,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><label className={labelCls}>Addendum ID</label><input value={addendumCode} onChange={e => setAddendumCode(e.target.value)} className={inputCls} placeholder="ADD-001" /></div>
          <div><label className={labelCls}>Description</label><input value={addendumDesc} onChange={e => setAddendumDesc(e.target.value)} className={inputCls} placeholder="Perubahan scope" /></div>
          <div><label className={labelCls}>Addendum Date</label><input type="date" value={addendumDate} onChange={e => setAddendumDate(e.target.value)} className={inputCls} /></div>
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
  );
}

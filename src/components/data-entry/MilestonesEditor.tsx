import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Save, Trash2, CheckCircle2, Pencil, X } from "lucide-react";
import { supabase, logActivity } from "@/lib/supabase";
import { useMilestones } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";


export function MilestonesEditor({ projectId }: { projectId: string }) {
  const { data: milestones = [], isLoading } = useMilestones(projectId);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phase: "Engineering", target_date: "", weight: "10", status: "pending",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ name: string; phase: string; weight: string }>({ name: "", phase: "Engineering", weight: "0" });

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEdit({ name: m.name, phase: m.phase, weight: String(m.weight ?? 0) });
  };
  const saveEdit = async (m: any) => {
    await supabase.from("milestones").update({ name: edit.name, phase: edit.phase, weight: parseFloat(edit.weight) || 0 }).eq("id", m.id);
    await logActivity(supabase, "milestone", "update", `Milestone "${edit.name}" edited`, projectId, m.id);
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    setEditingId(null);
    toast({ title: "✅ Saved" });
  };


  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
  };

  const handleAdd = async () => {
    if (!form.name || !form.target_date) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("milestones").insert({
        project_id: projectId,
        name: form.name, phase: form.phase, target_date: form.target_date,
        weight: parseFloat(form.weight) || 0, status: form.status,
        sort_order: milestones.length + 1,
      });
      if (error) throw error;
      await logActivity(supabase, "milestone", "create", `Milestone: ${form.name} (${form.phase})`, projectId);
      invalidate();
      toast({ title: "✅ Berhasil", description: "Milestone ditambahkan" });
      setForm({ name: "", phase: "Engineering", target_date: "", weight: "10", status: "pending" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id: string, patch: Record<string, any>, name: string) => {
    await supabase.from("milestones").update(patch).eq("id", id);
    await logActivity(supabase, "milestone", "update", `Milestone "${name}" updated`, projectId, id);
    invalidate();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus milestone "${name}"?`)) return;
    await supabase.from("milestones").delete().eq("id", id);
    await logActivity(supabase, "milestone", "delete", `Deleted milestone: ${name}`, projectId, id);
    invalidate();
  };

  const markComplete = async (id: string, name: string) => {
    await handleUpdate(id, { status: "completed", actual_date: new Date().toISOString().slice(0, 10) }, name);
    toast({ title: "✅ Milestone completed", description: name });
  };

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" /> Milestones — Target & Actual Date
      </h3>

      {/* Add form */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Milestone Name*</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Mechanical Completion" />
          </div>
          <div>
            <label className={labelCls}>Phase</label>
            <select value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })} className={inputCls}>
              <option>Engineering</option><option>Procurement</option><option>Construction</option><option>Commissioning</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Target Date*</label>
            <input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weight (%)</label>
            <input type="number" min="0" max="100" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} className={inputCls} />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !form.name || !form.target_date}
          className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50">
          <Plus className="h-3 w-3" /> {saving ? "..." : "Add Milestone"}
        </button>
      </div>

      {/* List */}
      {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : milestones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada milestone.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Name</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Phase</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Target</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
              <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Weight</th>
              <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Status</th>
              <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-28">Actions</th>
            </tr></thead>
            <tbody>
              {milestones.map(m => {
                const isEditing = editingId === m.id;
                return (
                <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-1.5 px-2">
                    {isEditing ? (
                      <input value={edit.name} onChange={e => setEdit({...edit, name: e.target.value})}
                        className="w-full px-1.5 py-1 text-xs font-medium border border-primary rounded bg-card focus:outline-none" />
                    ) : (
                      <span className="text-xs font-medium text-foreground">{m.name}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2">
                    {isEditing ? (
                      <select value={edit.phase} onChange={e => setEdit({...edit, phase: e.target.value})}
                        className="px-1.5 py-1 text-xs border border-primary rounded bg-card focus:outline-none">
                        <option>Engineering</option><option>Procurement</option><option>Construction</option><option>Commissioning</option>
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{m.phase}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2">
                    <input type="date" defaultValue={m.target_date} onBlur={e => e.target.value !== m.target_date && handleUpdate(m.id, { target_date: e.target.value }, m.name)}
                      className="bg-transparent text-xs font-mono-data text-foreground focus:outline-none" />
                  </td>
                  <td className="py-1.5 px-2">
                    <input type="date" defaultValue={m.actual_date || ""} onBlur={e => handleUpdate(m.id, { actual_date: e.target.value || null }, m.name)}
                      className="bg-transparent text-xs font-mono-data text-muted-foreground focus:outline-none" />
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {isEditing ? (
                      <input type="number" min="0" max="100" value={edit.weight} onChange={e => setEdit({...edit, weight: e.target.value})}
                        className="w-16 text-right px-1.5 py-1 text-xs font-mono-data border border-primary rounded bg-card focus:outline-none" />
                    ) : (
                      <span className="text-xs font-mono-data text-foreground">{m.weight}%</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <select value={m.status} onChange={e => handleUpdate(m.id, { status: e.target.value, actual_date: e.target.value === "completed" ? (m.actual_date || new Date().toISOString().slice(0, 10)) : m.actual_date }, m.name)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium bg-transparent cursor-pointer ${m.status === "completed" ? "text-success border-success/40" : m.status === "in-progress" ? "text-info border-info/40" : "text-muted-foreground border-border"}`}>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1 justify-end">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(m)} className="p-1 hover:bg-success/10 rounded" title="Save"><Save className="h-3 w-3 text-success" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded" title="Cancel"><X className="h-3 w-3 text-muted-foreground" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(m)} className="p-1 hover:bg-primary/10 rounded" title="Edit name, phase, weight"><Pencil className="h-3 w-3 text-primary" /></button>
                          {m.status !== "completed" && (
                            <button onClick={() => markComplete(m.id, m.name)} className="p-1 hover:bg-success/10 rounded" title="Mark completed">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(m.id, m.name)} className="p-1 hover:bg-destructive/10 rounded" title="Delete">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
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

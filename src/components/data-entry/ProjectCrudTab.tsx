import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X, Save, Edit3, Trash2 } from "lucide-react";
import { supabase, formatRupiah, logActivity, DbProject } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

export function ProjectCrudTab({ projects }: { projects: DbProject[] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (editProjectId) {
      const p = projects.find(proj => proj.id === editProjectId);
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
  }, [editProjectId, projects]);

  const handleCreateProject = async () => {
    setSaving(true);
    try {
      const { data: created, error } = await supabase.from("projects").insert({
        project_code: newProject.project_code, name: newProject.name, client: newProject.client,
        manager: newProject.manager, location: newProject.location,
        budget: parseInt(newProject.budget) || 0, start_date: newProject.start_date,
        end_date: newProject.end_date, description: newProject.description,
        category: newProject.category, map_x: parseFloat(newProject.map_x) || 50,
        map_y: parseFloat(newProject.map_y) || 50,
      }).select().single();
      if (error) throw error;

      // Auto-init default WBS structure so user can immediately add work items
      if (created?.id) {
        await supabase.from("work_areas").insert([
          { project_id: created.id, code: "WA-001", name: "General Works", weight: 100, sort_order: 0 },
        ]);
      }

      await logActivity(supabase, "project", "create", `Project created: ${newProject.project_code} - ${newProject.name} (with default WBS)`, created?.id, created?.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["work_areas"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Proyek baru + default Work Area dibuat. Silakan tambah work items." });
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
    const p = projects.find(pr => pr.id === id);
    if (!confirm(`Yakin hapus proyek "${p?.project_code} - ${p?.name}"?\n\nSemua data terkait akan dihapus:\n• Work Areas, Work Items, Sub Tasks\n• Risks, POs, Cashflow, Photos\n• Addendums, Milestones, S-Curve, Manpower`)) return;
    setSaving(true);
    try {
      // Cascade delete all related data (no FK cascade in DB, so do manually)
      // 1. Find work_areas to cascade work_items + sub_tasks
      const { data: wa } = await supabase.from("work_areas").select("id").eq("project_id", id);
      const waIds = (wa || []).map(w => w.id);
      if (waIds.length > 0) {
        const { data: wi } = await supabase.from("work_items").select("id").in("work_area_id", waIds);
        const wiIds = (wi || []).map(w => w.id);
        if (wiIds.length > 0) await supabase.from("sub_tasks").delete().in("work_item_id", wiIds);
        await supabase.from("work_items").delete().in("work_area_id", waIds);
      }
      // 2. Delete all project-scoped tables
      await Promise.all([
        supabase.from("work_areas").delete().eq("project_id", id),
        supabase.from("project_alerts").delete().eq("project_id", id),
        supabase.from("purchase_orders").delete().eq("project_id", id),
        supabase.from("project_cashflow").delete().eq("project_id", id),
        supabase.from("project_photos").delete().eq("project_id", id),
        supabase.from("addendums").delete().eq("project_id", id),
        supabase.from("milestones").delete().eq("project_id", id),
        supabase.from("s_curve_data").delete().eq("project_id", id),
        supabase.from("procurement_items").delete().eq("project_id", id),
        supabase.from("manpower_logs" as any).delete().eq("project_id", id),
        supabase.from("notifications").delete().eq("project_id", id),
      ]);
      // 3. Finally delete project
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      await logActivity(supabase, "project", "delete", `Project deleted (cascade): ${p?.project_code || id} — semua data terkait terhapus`);
      queryClient.invalidateQueries();
      toast({ title: "✅ Berhasil", description: "Proyek dan semua data terkait berhasil dihapus" });
      if (editProjectId === id) setEditProjectId(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

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
  );
}

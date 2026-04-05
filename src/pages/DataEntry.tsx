import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems, useAlerts, useAddendums } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { DbProject, formatRupiah } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  HelpCircle, CheckCircle2, Database, Layers, Target, FileText,
  Lightbulb, BookOpen, ArrowRight, X, Save, Download, Upload, Share2,
  Plus, Trash2, Edit3, AlertTriangle, DollarSign, Calendar, FileBarChart,
  Printer, ClipboardList, Lock
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type ActiveTab = "regular" | "project-crud" | "addendum";

const DataEntry = () => {
  const queryClient = useQueryClient();
  const { data: allProjects = [] } = useProjects();
  const { isAdmin, isTeam, profile, assignedProjectIds } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("regular");
  const [updateProjectId, setUpdateProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const projects = isTeam && assignedProjectIds.length > 0
    ? allProjects.filter(p => assignedProjectIds.includes(p.id))
    : allProjects;

  const allTabs = [
    { key: "regular" as const, label: "Regular Update", icon: FileText, roles: ["admin", "team"] },
    { key: "project-crud" as const, label: "Manage Projects", icon: ClipboardList, roles: ["admin"] },
    { key: "addendum" as const, label: "Addendum", icon: FileBarChart, roles: ["admin"] },
  ];
  const tabs = allTabs.filter(t => isAdmin || t.roles.includes("team"));

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

  // Risk entry
  const [riskTitle, setRiskTitle] = useState("");
  const [riskSeverity, setRiskSeverity] = useState("medium");
  const [riskProbability, setRiskProbability] = useState("medium");
  const [riskImpact, setRiskImpact] = useState("medium");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [riskDescription, setRiskDescription] = useState("");

  // Project CRUD
  const [showNewProject, setShowNewProject] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({
    project_code: "", name: "", client: "", manager: "", location: "",
    budget: "", start_date: "", end_date: "", description: "", category: "Energy",
    map_x: "50", map_y: "50",
  });

  // Edit project form state
  const [editForm, setEditForm] = useState({
    project_code: "", name: "", client: "", manager: "", location: "",
    budget: "", spent: "", start_date: "", end_date: "", description: "", category: "Energy",
    map_x: "", map_y: "", status: "on-track", phase: "Engineering", progress: "",
    image_url: "", video_url: "", cctv_url: "",
  });

  // Populate edit form when editProjectId changes
  useEffect(() => {
    if (editProjectId) {
      const p = allProjects.find(proj => proj.id === editProjectId);
      if (p) {
        setEditForm({
          project_code: p.project_code || "",
          name: p.name || "",
          client: p.client || "",
          manager: p.manager || "",
          location: p.location || "",
          budget: String(p.budget || 0),
          spent: String(p.spent || 0),
          start_date: p.start_date || "",
          end_date: p.end_date || "",
          description: p.description || "",
          category: p.category || "Energy",
          map_x: String(p.map_x || 0),
          map_y: String(p.map_y || 0),
          status: p.status || "on-track",
          phase: p.phase || "Engineering",
          progress: String(p.progress || 0),
          image_url: p.image_url || "",
          video_url: p.video_url || "",
          cctv_url: p.cctv_url || "",
        });
      }
    }
  }, [editProjectId, allProjects]);

  // Addendum
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "✅ Berhasil", description: "Data proyek berhasil diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleWorkItemUpdate = async () => {
    if (!updateItemId || !updateQtyCompleted) return;
    setSaving(true);
    try {
      const item = workItems.find(wi => wi.id === updateItemId);
      if (!item) throw new Error("Item not found");
      const qty = parseFloat(updateQtyCompleted);
      const progress = Math.round((qty / Number(item.qty_total)) * 100);
      const { error } = await supabase.from("work_items").update({
        qty_completed: qty, progress: Math.min(100, progress),
        status: progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "not-started",
      }).eq("id", updateItemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["work_items"] });
      toast({ title: "✅ Berhasil", description: "Progress pekerjaan diupdate" });
      setUpdateQtyCompleted("");
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
        mitigation_plan: riskMitigation, description: riskDescription,
      }]);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
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
        project_code: editForm.project_code,
        name: editForm.name,
        client: editForm.client,
        manager: editForm.manager,
        location: editForm.location,
        budget: parseInt(editForm.budget) || 0,
        spent: parseInt(editForm.spent) || 0,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        description: editForm.description || null,
        category: editForm.category || null,
        map_x: parseFloat(editForm.map_x) || 0,
        map_y: parseFloat(editForm.map_y) || 0,
        status: editForm.status as any,
        phase: editForm.phase as any,
        progress: parseInt(editForm.progress) || 0,
        image_url: editForm.image_url || null,
        video_url: editForm.video_url || null,
        cctv_url: editForm.cctv_url || null,
      }).eq("id", editProjectId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "✅ Berhasil", description: "Proyek berhasil diupdate" });
      setEditProjectId(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Yakin hapus proyek ini? Semua data terkait akan ikut terhapus.")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
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
        cost_impact: parseInt(addendumCost) || 0,
        schedule_impact_days: parseInt(addendumDays) || 0,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
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
      queryClient.invalidateQueries({ queryKey: ["addendums"] });
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
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" /> Edit Project — {ef.project_code}
          </h4>
          <button onClick={() => setEditProjectId(null)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>

        {/* Master Data */}
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

        {/* Status & Progress */}
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
        </div>

        {/* Financial */}
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">💰 Financial</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div><label className={labelCls}>Budget (Juta Rp)</label><input type="number" value={ef.budget} onChange={e => set("budget", e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Spent (Juta Rp)</label><input type="number" value={ef.spent} onChange={e => set("spent", e.target.value)} className={inputCls} /></div>
        </div>

        {/* Media */}
        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">🖼️ Media & Links</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div><label className={labelCls}>Image URL (Photo)</label><input value={ef.image_url} onChange={e => set("image_url", e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div><label className={labelCls}>Video URL</label><input value={ef.video_url} onChange={e => set("video_url", e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div><label className={labelCls}>CCTV Embed Link</label><input value={ef.cctv_url} onChange={e => set("cctv_url", e.target.value)} className={inputCls} placeholder="https://..." /></div>
        </div>

        {/* Map & Description */}
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
              <p className="text-xs text-muted-foreground">Update data proyek, risk, budget, addendum & manajemen proyek</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90"><Download className="h-3.5 w-3.5" /> Template CSV</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-5 border-b border-border pb-2 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
            {isTeam && (
              <div className="flex items-center gap-1 ml-auto text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Limited access — weekly updates only
              </div>
            )}
          </div>

          {/* Project selector */}
          {activeTab !== "project-crud" && (
            <div className="mb-5">
              <label className={labelCls}>Pilih Proyek</label>
              <select value={updateProjectId} onChange={e => setUpdateProjectId(e.target.value)} className={inputCls}>
                <option value="">— Pilih Proyek —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
          )}

          {/* Regular Update Tab */}
          {activeTab === "regular" && updateProjectId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
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
                          <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Current: <span className="text-foreground font-bold">{Number(item.qty_completed)}/{Number(item.qty_total)} {item.unit}</span></span></div>
                          <div><label className={labelCls}>New Qty Completed</label><input type="number" min="0" max={Number(item.qty_total)} value={updateQtyCompleted} onChange={e => setUpdateQtyCompleted(e.target.value)} className={inputCls} placeholder={`max ${Number(item.qty_total)}`} /></div>
                          <button onClick={handleWorkItemUpdate} disabled={saving} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update"}</button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Risk Entry */}
              <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Add Risk / Issue</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div><label className={labelCls}>Risk Title</label><input value={riskTitle} onChange={e => setRiskTitle(e.target.value)} className={inputCls} placeholder="Keterlambatan material" /></div>
                  <div><label className={labelCls}>Severity</label><select value={riskSeverity} onChange={e => setRiskSeverity(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                  <div><label className={labelCls}>Probability</label><select value={riskProbability} onChange={e => setRiskProbability(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very-high">Very High</option></select></div>
                  <div><label className={labelCls}>Impact</label><select value={riskImpact} onChange={e => setRiskImpact(e.target.value)} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very-high">Very High</option></select></div>
                  <div><label className={labelCls}>Risk Owner</label><input value={riskOwner} onChange={e => setRiskOwner(e.target.value)} className={inputCls} placeholder="Nama PM" /></div>
                  <div><label className={labelCls}>Mitigation Plan</label><input value={riskMitigation} onChange={e => setRiskMitigation(e.target.value)} className={inputCls} placeholder="Rencana mitigasi" /></div>
                  <div className="sm:col-span-2"><label className={labelCls}>Description</label><input value={riskDescription} onChange={e => setRiskDescription(e.target.value)} className={inputCls} placeholder="Deskripsi risiko" /></div>
                </div>
                <button onClick={handleAddRisk} disabled={saving || !riskTitle} className="mt-3 flex items-center gap-2 px-4 py-2 bg-warning text-warning-foreground rounded-lg text-xs font-medium hover:bg-warning/90 disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Add Risk"}</button>
              </div>
            </div>
          )}

          {/* Project CRUD Tab */}
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

              {/* Edit Form */}
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
                        <td className="py-2 px-3 font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditProjectId(p.id); setShowNewProject(false); }} className="p-1 hover:bg-primary/10 rounded" title="Edit All Fields"><Edit3 className="h-3.5 w-3.5 text-primary" /></button>
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

          {/* Addendum Tab */}
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
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Scope</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Cost Impact</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Schedule</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Action</th>
                      </tr></thead>
                      <tbody>{addendums.map(a => (
                        <tr key={a.id} className="border-b border-border/30">
                          <td className="py-2 px-3 font-mono-data text-primary">{a.addendum_code}</td>
                          <td className="py-2 px-3 text-foreground">{a.description}</td>
                          <td className="py-2 px-3 text-muted-foreground">{a.scope_change}</td>
                          <td className="py-2 px-3 text-right font-mono-data text-accent">{a.cost_impact > 0 ? "+" : ""}{formatRupiah(a.cost_impact)}</td>
                          <td className="py-2 px-3 text-right font-mono-data">{a.schedule_impact_days > 0 ? "+" : ""}{a.schedule_impact_days}d</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${a.approval_status === "approved" ? "bg-success/15 text-success border-success/30" : a.approval_status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"}`}>{a.approval_status}</span>
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

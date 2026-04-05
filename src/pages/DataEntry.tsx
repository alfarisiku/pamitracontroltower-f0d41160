import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems, useAlerts, useAddendums } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { DbProject, formatRupiah } from "@/lib/supabase";
import {
  HelpCircle, CheckCircle2, Database, Layers, Target, FileText,
  Lightbulb, BookOpen, ArrowRight, X, Save, Download, Upload, Share2,
  Plus, Trash2, Edit3, AlertTriangle, DollarSign, Calendar, FileBarChart,
  Printer, ClipboardList
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type ActiveTab = "regular" | "structural" | "project-crud" | "addendum";

const DataEntry = () => {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [activeTab, setActiveTab] = useState<ActiveTab>("regular");
  const [updateProjectId, setUpdateProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);




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

  // Structural update fields
  const [structManager, setStructManager] = useState("");
  const [structEndDate, setStructEndDate] = useState("");
  const [structDescription, setStructDescription] = useState("");

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

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Yakin hapus proyek ini? Semua data terkait akan ikut terhapus.")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "✅ Berhasil", description: "Proyek dihapus" });
      if (updateProjectId === id) setUpdateProjectId("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleStructuralUpdate = async () => {
    if (!updateProjectId) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (structManager) updates.manager = structManager;
      if (structEndDate) updates.end_date = structEndDate;
      if (structDescription) updates.description = structDescription;
      const { error } = await supabase.from("projects").update(updates).eq("id", updateProjectId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "✅ Berhasil", description: "Structural update berhasil" });
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
            {([
              { key: "regular" as const, label: "Regular Update", icon: FileText },
              { key: "structural" as const, label: "Structural Update", icon: Calendar },
              { key: "project-crud" as const, label: "Manage Projects", icon: ClipboardList },
              { key: "addendum" as const, label: "Addendum", icon: FileBarChart },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
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

          {/* Structural Update Tab */}
          {activeTab === "structural" && updateProjectId && (
            <div className="glass-card rounded-lg shadow-card p-4 mb-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Structural Update — Schedule, Scope, PM Change</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>New Project Manager</label><input value={structManager} onChange={e => setStructManager(e.target.value)} className={inputCls} placeholder="Nama PM baru" /></div>
                <div><label className={labelCls}>New Deadline</label><input type="date" value={structEndDate} onChange={e => setStructEndDate(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls}>Updated Description/Scope</label><input value={structDescription} onChange={e => setStructDescription(e.target.value)} className={inputCls} placeholder="Deskripsi baru" /></div>
              </div>
              <button onClick={handleStructuralUpdate} disabled={saving} className="mt-3 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Apply Structural Update"}</button>
            </div>
          )}

          {/* Project CRUD Tab */}
          {activeTab === "project-crud" && (
            <div className="space-y-5 mb-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Manage Projects</h3>
                <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add Project</button>
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

              <div className="glass-card rounded-lg shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50 border-b border-border">
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Code</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Progress</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Budget</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Actions</th>
                    </tr></thead>
                    <tbody>{projects.map(p => (
                      <tr key={p.id} className="border-b border-border/30">
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 capitalize text-muted-foreground">{p.status}</td>
                        <td className="py-2 px-3 font-mono-data">{p.progress}%</td>
                        <td className="py-2 px-3 font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setUpdateProjectId(p.id); setActiveTab("regular"); }} className="p-1 hover:bg-primary/10 rounded" title="Edit"><Edit3 className="h-3.5 w-3.5 text-primary" /></button>
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

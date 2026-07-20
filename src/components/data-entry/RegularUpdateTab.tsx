import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Layers, AlertTriangle, DollarSign, Plus, Trash2, Camera } from "lucide-react";
import { supabase, formatRupiah, logActivity, DbProject } from "@/lib/supabase";
import { useWorkAreas, useWorkItems } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";
import { RiskResolvePanel } from "./RiskResolvePanel";
import { ProcurementPanel } from "./ProcurementPanel";
import { PhotoGallery } from "./PhotoGallery";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

export function RegularUpdateTab({ projectId, projects }: { projectId: string; projects: DbProject[] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [formProgress, setFormProgress] = useState("");
  const [formStatus, setFormStatus] = useState("on-track");
  const [formPhase, setFormPhase] = useState("Construction");

  const { data: workAreas = [] } = useWorkAreas(projectId || undefined);
  const waIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(waIds);
  const [updateItemId, setUpdateItemId] = useState("");
  const [updateQtyCompleted, setUpdateQtyCompleted] = useState("");
  const [updateQtyTotal, setUpdateQtyTotal] = useState("");

  const [riskTitle, setRiskTitle] = useState("");
  const [riskSeverity, setRiskSeverity] = useState("medium");
  const [riskProbability, setRiskProbability] = useState("medium");
  const [riskImpact, setRiskImpact] = useState("medium");
  const [riskOwner, setRiskOwner] = useState("");
  const [riskMitigation, setRiskMitigation] = useState("");
  const [riskDescription] = useState("");
  const [riskCategory, setRiskCategory] = useState("operational");

  const [tkdnValue, setTkdnValue] = useState("");
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

  useEffect(() => {
    if (projectId) {
      const p = projects.find(proj => proj.id === projectId);
      if (p) setTkdnValue(String(p.tkdn_percentage || 0));
    }
  }, [projectId, projects]);

  const handleProjectUpdate = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (formProgress) updates.progress = parseInt(formProgress);
      if (formStatus) updates.status = formStatus;
      if (formPhase) updates.phase = formPhase;
      const { error } = await supabase.from("projects").update(updates).eq("id", projectId);
      if (error) throw error;
      const p = projects.find(pr => pr.id === projectId);
      await logActivity(supabase, "project", "update_progress", `Progress updated: ${formProgress || p?.progress}% | Status: ${formStatus} | Phase: ${formPhase}`, projectId, projectId);
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
      await logActivity(supabase, "work_item", "update", `Work item "${item.name}" updated: ${qty}/${total}`, projectId, updateItemId);
      queryClient.invalidateQueries({ queryKey: ["work_items"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Progress pekerjaan diupdate" });
      setUpdateQtyCompleted(""); setUpdateQtyTotal("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleTkdnUpdate = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").update({ tkdn_percentage: parseFloat(tkdnValue) || 0 }).eq("id", projectId);
      if (error) throw error;
      await logActivity(supabase, "project", "update", `TKDN updated to ${tkdnValue}%`, projectId, projectId);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "TKDN berhasil diupdate" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleAddRisk = async () => {
    if (!projectId || !riskTitle) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("project_alerts").insert([{
        project_id: projectId, title: riskTitle, severity: riskSeverity as any,
        probability: riskProbability, impact: riskImpact, risk_owner: riskOwner,
        mitigation_plan: riskMitigation, description: riskDescription, category: riskCategory,
      }]);
      if (error) throw error;
      await logActivity(supabase, "risk", "create", `New risk: ${riskTitle} (${riskSeverity}, ${riskCategory})`, projectId);
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: "Risk item ditambahkan" });
      setRiskTitle(""); setRiskOwner(""); setRiskMitigation("");
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
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

      {/* Work Item Progress */}
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
                  <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Current: <span className="text-foreground font-bold">{Number(item.qty_completed).toLocaleString()}/{Number(item.qty_total).toLocaleString()} {item.unit}</span></span>
                  <button onClick={async () => {
                    if (!confirm(`Hapus work item "${item.name}"?`)) return;
                    await supabase.from("work_items").delete().eq("id", item.id);
                    await logActivity(supabase, "work_item", "delete", `Deleted work item: ${item.name}`, projectId, item.id);
                    queryClient.invalidateQueries({ queryKey: ["work_items"] });
                    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
                    setUpdateItemId("");
                    toast({ title: "✅ Dihapus", description: "Work item berhasil dihapus" });
                  }} className="text-[10px] px-2 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 inline mr-1" />Delete</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={labelCls}>Total Qty</label><input type="number" min="0" value={updateQtyTotal} onChange={e => setUpdateQtyTotal(e.target.value)} className={inputCls} placeholder={String(Number(item.qty_total))} /></div>
                    <div><label className={labelCls}>Completed Qty</label><input type="number" min="0" value={updateQtyCompleted} onChange={e => setUpdateQtyCompleted(e.target.value)} className={inputCls} placeholder={String(Number(item.qty_completed))} /></div>
                  </div>
                  <button onClick={handleWorkItemUpdate} disabled={saving} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update"}</button>
                </div>
              );
            })()}
            <p className="text-[10px] text-muted-foreground italic">Untuk menambah / mengubah struktur WBS lengkap, gunakan tab <span className="font-semibold">WBS (Full CRUD)</span>.</p>

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

      {/* Cost Summary dipindah ke tab Manage Projects & Finance */}

      {/* Risk Entry */}
      <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Add Risk / Issue</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className={labelCls}>Risk Title</label><input value={riskTitle} onChange={e => setRiskTitle(e.target.value)} className={inputCls} placeholder="Keterlambatan material" /></div>
          <div><label className={labelCls}>Category</label>
            <select value={riskCategory} onChange={e => setRiskCategory(e.target.value)} className={inputCls}>
              <option value="technical">Technical</option>
              <option value="schedule">Schedule</option>
              <option value="cost">Cost</option>
              <option value="procurement">Procurement</option>
              <option value="contractual">Contractual</option>
              <option value="operational">Operational</option>
              <option value="financial">Financial</option>
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

      <RiskResolvePanel projectId={projectId} />

      <ProcurementPanel projectId={projectId} />

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
                  const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                  const { error: uploadErr } = await supabase.storage.from('project-photos').upload(path, file);
                  if (uploadErr) throw uploadErr;
                  const { data: urlData } = supabase.storage.from('project-photos').getPublicUrl(path);
                  await supabase.from('project_photos').insert({ project_id: projectId, photo_url: urlData.publicUrl, caption: photoCaption, week_label: photoWeekLabel });
                }
                await logActivity(supabase, "photo", "create", `${files.length} photos uploaded (${photoWeekLabel})`, projectId);
                queryClient.invalidateQueries({ queryKey: ["project_photos"] });
                queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
                toast({ title: "✅ Berhasil", description: `${files.length} foto berhasil diupload` });
              } catch (err: any) {
                toast({ title: "❌ Error", description: err.message, variant: "destructive" });
              } finally { setSaving(false); }
            }} className={inputCls + " file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground"} />
          </div>
        </div>
        <PhotoGallery projectId={projectId} />
      </div>
    </div>
  );
}

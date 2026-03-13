import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { DbProject, formatRupiah } from "@/lib/supabase";
import {
  HelpCircle, CheckCircle2, Database, Layers, Target, FileText,
  Lightbulb, BookOpen, ArrowRight, X, Save, Download, Upload, Share2
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

type WizardStep = "welcome" | "select-project" | "select-type" | "tips";

const dataTypes = [
  {
    key: "wbs", label: "Work Breakdown Structure", icon: Layers,
    description: "Input pekerjaan per area, item, dan sub-task dengan quantity detail",
    tips: ["Bagi pekerjaan: Area → Item → Sub Task (3 level)", "Contoh: Area Tangki → Tangki T-101 → Erection, Welding, NDT", "Isi qty_total dan qty_completed mingguan", "Unit konsisten: meter, unit, ton, sqm", "Bobot = kontribusi ke progress area"],
    fields: [
      { name: "Work Area", example: "Area Tangki & Vessel", hint: "Nama area utama" },
      { name: "Work Item", example: "Tangki T-101", hint: "Pekerjaan spesifik" },
      { name: "Unit", example: "unit, meter, ton", hint: "Satuan" },
      { name: "Qty Total", example: "250", hint: "Total rencana" },
      { name: "Qty Completed", example: "122", hint: "Selesai saat ini" },
    ],
  },
  {
    key: "milestone", label: "Milestones", icon: Target,
    description: "Target pencapaian per fase proyek",
    tips: ["Setiap fase minimal 1-2 milestone", "Set target_date realistis", "Update actual_date saat tercapai", "Status: pending → in-progress → completed"],
    fields: [
      { name: "Name", example: "Mechanical Completion", hint: "Nama milestone terukur" },
      { name: "Phase", example: "Construction", hint: "Engineering/Procurement/Construction/Commissioning" },
      { name: "Target Date", example: "2026-06-30", hint: "Tanggal target" },
      { name: "Weight", example: "20", hint: "Bobot kontribusi (%)" },
    ],
  },
  {
    key: "progress", label: "Update Progress", icon: FileText,
    description: "Update progress mingguan per work item",
    tips: ["Update setiap Jumat sore", "Progress auto dari qty_completed/qty_total", "Update status: not-started → in-progress → completed", "Cross-check fisik vs system tiap bulan"],
    fields: [
      { name: "Work Item", example: "Pilih dari daftar", hint: "Pekerjaan yang di-update" },
      { name: "Qty Completed", example: "150", hint: "Qty selesai kumulatif" },
      { name: "Status", example: "in-progress", hint: "Status terkini" },
    ],
  },
];

const DataEntry = () => {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjects();
  const [wizardStep, setWizardStep] = useState<WizardStep>("welcome");
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(true);

  // Update form states
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateProjectId, setUpdateProjectId] = useState<string>("");
  const [formProgress, setFormProgress] = useState("");
  const [formStatus, setFormStatus] = useState("on-track");
  const [formPhase, setFormPhase] = useState("Construction");
  const [saving, setSaving] = useState(false);

  const { data: workAreas = [] } = useWorkAreas(updateProjectId || undefined);
  const waIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(waIds);

  // Work item update
  const [updateItemId, setUpdateItemId] = useState("");
  const [updateQtyCompleted, setUpdateQtyCompleted] = useState("");

  const activeType = dataTypes.find(t => t.key === selectedType);

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
        qty_completed: qty,
        progress: Math.min(100, progress),
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

  const downloadTemplate = () => {
    const csv = "project_code,work_area_code,work_area_name,work_item_code,work_item_name,unit,qty_total,qty_completed,weight,status\nEPC-001,WA-001,Area Tangki,WI-001,Tangki T-101,unit,10,5,30,in-progress\nEPC-001,WA-001,Area Tangki,WI-002,Piping CS 6\",meter,500,250,20,in-progress";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "project_data_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Data Entry Center", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
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
              <p className="text-xs text-muted-foreground">Panduan, update data, dan template Excel</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90"><Download className="h-3.5 w-3.5" /> Template CSV</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* Wizard */}
          {showWizard && (
            <div className="glass-card rounded-lg shadow-card mb-5 border-2 border-primary/20 overflow-hidden">
              <div className="bg-primary/5 p-3 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Panduan Pengisian</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Step {wizardStep === "welcome" ? "1/4" : wizardStep === "select-project" ? "2/4" : wizardStep === "select-type" ? "3/4" : "4/4"}</span>
                </div>
                <button onClick={() => setShowWizard(false)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="p-4">
                {wizardStep === "welcome" && (
                  <div className="text-center max-w-lg mx-auto">
                    <BookOpen className="h-10 w-10 text-primary mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-foreground mb-2">Selamat datang di Data Entry Center</h3>
                    <p className="text-xs text-muted-foreground mb-3">Panduan pengisian data sesuai standar PMO & PMBOK.</p>
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      {[{ icon: Layers, label: "WBS 3 Level" }, { icon: Target, label: "Milestones" }, { icon: FileText, label: "Progress" }].map(i => (
                        <div key={i.label} className="bg-muted/30 rounded-lg p-2 border border-border/50"><i.icon className="h-4 w-4 text-primary mx-auto mb-1" /><p className="font-medium text-foreground text-[10px]">{i.label}</p></div>
                      ))}
                    </div>
                    <button onClick={() => setWizardStep("select-project")} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">Mulai <ArrowRight className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                {wizardStep === "select-project" && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Pilih Proyek</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
                      {projects.map(p => (
                        <button key={p.id} onClick={() => { setSelectedProject(p); setWizardStep("select-type"); }}
                          className={`text-left p-2.5 rounded-lg border transition-colors ${selectedProject?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <p className="text-[10px] font-mono-data text-primary">{p.project_code}</p>
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {wizardStep === "select-type" && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Jenis Data — <span className="text-primary">{selectedProject?.project_code}</span></h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      {dataTypes.map(dt => (
                        <button key={dt.key} onClick={() => { setSelectedType(dt.key); setWizardStep("tips"); }} className="text-left p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <dt.icon className="h-5 w-5 text-primary mb-1" />
                          <p className="text-xs font-medium text-foreground">{dt.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{dt.description}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setWizardStep("select-project")} className="text-xs text-primary hover:underline mt-2">← Kembali</button>
                  </div>
                )}
                {wizardStep === "tips" && activeType && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Tips: {activeType.label}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="bg-success/5 rounded-lg p-3 border border-success/20">
                        <h4 className="text-xs font-semibold text-success flex items-center gap-1 mb-1"><Lightbulb className="h-3 w-3" /> Tips</h4>
                        <ul className="space-y-1">{activeType.tips.map((t, i) => <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground"><CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />{t}</li>)}</ul>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <h4 className="text-xs font-semibold text-primary flex items-center gap-1 mb-1"><FileText className="h-3 w-3" /> Fields</h4>
                        <div className="space-y-1.5">{activeType.fields.map((f, i) => (
                          <div key={i} className="bg-card rounded p-1.5 border border-border/50">
                            <div className="flex justify-between"><span className="text-xs font-medium text-foreground">{f.name}</span><span className="text-[9px] text-muted-foreground italic">{f.example}</span></div>
                            <p className="text-[10px] text-muted-foreground flex items-start gap-1"><HelpCircle className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />{f.hint}</p>
                          </div>
                        ))}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => setWizardStep("select-type")} className="text-xs text-primary hover:underline">← Kembali</button>
                      <button onClick={() => setShowWizard(false)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">Mengerti <CheckCircle2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Update Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Project Update Form */}
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Save className="h-4 w-4 text-primary" /> Update Project Data</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Pilih Proyek</label>
                  <select value={updateProjectId} onChange={e => setUpdateProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">— Pilih Proyek —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                  </select>
                </div>
                {updateProjectId && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Progress %</label>
                        <input type="number" min="0" max="100" value={formProgress} onChange={e => setFormProgress(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="72" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Status</label>
                        <select value={formStatus} onChange={e => setFormStatus(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="on-track">On Track</option><option value="at-risk">At Risk</option><option value="delayed">Delayed</option><option value="completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Phase</label>
                        <select value={formPhase} onChange={e => setFormPhase(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                          <option>Engineering</option><option>Procurement</option><option>Construction</option><option>Commissioning</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={handleProjectUpdate} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update Project"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Work Item Update */}
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Update Work Item Progress</h3>
              {!updateProjectId ? (
                <p className="text-xs text-muted-foreground">Pilih proyek terlebih dahulu di form kiri.</p>
              ) : workItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Proyek ini belum memiliki work items.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Work Item</label>
                    <select value={updateItemId} onChange={e => setUpdateItemId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">— Pilih Item —</option>
                      {workItems.map(wi => <option key={wi.id} value={wi.id}>{wi.code} — {wi.name} ({Number(wi.qty_completed)}/{Number(wi.qty_total)} {wi.unit})</option>)}
                    </select>
                  </div>
                  {updateItemId && (() => {
                    const item = workItems.find(wi => wi.id === updateItemId);
                    if (!item) return null;
                    return (
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-muted-foreground">Current: <span className="text-foreground font-bold">{Number(item.qty_completed)}/{Number(item.qty_total)} {item.unit}</span></span>
                          <span className="text-muted-foreground">Remaining: <span className="text-warning font-bold">{Number(item.qty_total) - Number(item.qty_completed)}</span></span>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase mb-1 block">New Qty Completed</label>
                          <input type="number" min="0" max={Number(item.qty_total)} value={updateQtyCompleted} onChange={e => setUpdateQtyCompleted(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder={`max ${Number(item.qty_total)}`} />
                        </div>
                        <button onClick={handleWorkItemUpdate} disabled={saving}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Update Progress"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Quick Reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {dataTypes.map(dt => (
              <div key={dt.key} className="glass-card rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-2"><dt.icon className="h-4 w-4 text-primary" /><h3 className="text-xs font-semibold text-foreground">{dt.label}</h3></div>
                <p className="text-[10px] text-muted-foreground mb-2">{dt.description}</p>
                <div className="space-y-1">{dt.tips.slice(0, 3).map((t, i) => <div key={i} className="flex items-start gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="h-2.5 w-2.5 text-success mt-0.5 flex-shrink-0" />{t}</div>)}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="glass-card rounded-lg p-4 shadow-card">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2"><BookOpen className="h-4 w-4 text-primary" /> Catatan Tim Proyek</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">📋 Frekuensi Update</h4>
                <ul className="space-y-0.5 list-disc list-inside"><li>WBS: <strong className="text-foreground">Jumat sore</strong></li><li>Milestones: saat tercapai</li><li>Alert: segera saat terjadi</li></ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">⚠️ Kesalahan Umum</h4>
                <ul className="space-y-0.5 list-disc list-inside"><li>Qty completed &gt; qty total</li><li>Lupa update status</li><li>Bobot area tidak seimbang</li></ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataEntry;

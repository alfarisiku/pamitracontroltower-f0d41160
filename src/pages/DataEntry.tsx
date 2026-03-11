import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { DbProject } from "@/lib/supabase";
import {
  HelpCircle, ChevronRight, CheckCircle2, Database, Layers, Target,
  FileText, Lightbulb, BookOpen, ArrowRight, X
} from "lucide-react";

type WizardStep = "welcome" | "select-project" | "select-type" | "tips";

const dataTypes = [
  {
    key: "wbs",
    label: "Work Breakdown Structure",
    icon: Layers,
    description: "Input pekerjaan per area, item, dan sub-task dengan quantity detail",
    tips: [
      "Bagi pekerjaan menjadi Area → Item → Sub Task (3 level)",
      "Contoh: Area Tangki → Tangki T-101 → Erection, Welding, NDT",
      "Isi qty_total dan qty_completed secara berkala (mingguan)",
      "Gunakan unit yang konsisten: meter, unit, ton, sqm, joint, spool",
      "Bobot (weight) menentukan kontribusi ke progress area",
    ],
    fields: [
      { name: "Work Area", example: "Area Tangki & Vessel", hint: "Nama area/zona pekerjaan utama" },
      { name: "Work Item", example: "Tangki Crude Oil T-101", hint: "Nama pekerjaan spesifik di area tersebut" },
      { name: "Unit", example: "unit, meter, ton, sqm", hint: "Satuan pengukuran pekerjaan" },
      { name: "Qty Total", example: "250", hint: "Total quantity rencana yang harus diselesaikan" },
      { name: "Qty Completed", example: "122", hint: "Quantity yang sudah selesai saat ini" },
      { name: "Sub Task", example: "Welding, NDT, Hydrostatic Test", hint: "Breakdown detail per item" },
    ],
  },
  {
    key: "milestone",
    label: "Milestones",
    icon: Target,
    description: "Target pencapaian utama per fase proyek",
    tips: [
      "Setiap fase (Eng, Proc, Const, Comm) minimal punya 1-2 milestone",
      "Set target_date realistis sesuai jadwal proyek",
      "Update actual_date saat milestone tercapai",
      "Status: pending → in-progress → completed",
      "Bobot milestone menunjukkan kontribusi ke progress total",
    ],
    fields: [
      { name: "Name", example: "Mechanical Completion", hint: "Nama milestone yang jelas dan terukur" },
      { name: "Phase", example: "Construction", hint: "Fase proyek: Engineering, Procurement, Construction, Commissioning" },
      { name: "Target Date", example: "2026-06-30", hint: "Tanggal target pencapaian" },
      { name: "Weight", example: "20", hint: "Bobot kontribusi ke progress (total semua milestone = 100)" },
    ],
  },
  {
    key: "progress",
    label: "Update Progress",
    icon: FileText,
    description: "Update progress harian/mingguan per work item",
    tips: [
      "Update qty_completed setiap minggu (Jumat sore)",
      "Progress otomatis terhitung dari qty_completed/qty_total",
      "Jangan lupa update status: not-started, in-progress, completed",
      "Pastikan data konsisten: sub-task progress ≤ work item progress",
      "Foto progress bisa ditambahkan via menu media proyek",
    ],
    fields: [
      { name: "Work Item", example: "Pilih dari daftar", hint: "Pilih pekerjaan yang akan di-update" },
      { name: "Qty Completed (baru)", example: "150", hint: "Quantity selesai terbaru (kumulatif, bukan increment)" },
      { name: "Status", example: "in-progress", hint: "Status terkini pekerjaan" },
    ],
  },
];

const DataEntry = () => {
  const { data: projects = [] } = useProjects();
  const [wizardStep, setWizardStep] = useState<WizardStep>("welcome");
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(true);

  const activeType = dataTypes.find(t => t.key === selectedType);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Data Entry Center
            </h2>
            <p className="text-xs text-muted-foreground">Panduan dan tips pengisian data proyek untuk tim lapangan & PMO</p>
          </div>

          {/* Wizard Overlay */}
          {showWizard && (
            <div className="glass-card rounded-lg shadow-card mb-5 border-2 border-primary/20 overflow-hidden">
              <div className="bg-primary/5 p-4 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Panduan Pengisian Data</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Step {
                    wizardStep === "welcome" ? "1/4" :
                    wizardStep === "select-project" ? "2/4" :
                    wizardStep === "select-type" ? "3/4" : "4/4"
                  }</span>
                </div>
                <button onClick={() => setShowWizard(false)} className="p-1 hover:bg-muted rounded">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5">
                {wizardStep === "welcome" && (
                  <div className="text-center max-w-lg mx-auto">
                    <BookOpen className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h3 className="text-base font-bold text-foreground mb-2">Selamat datang di Data Entry Center</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Panduan ini akan membantu Anda mengisi data proyek dengan benar sesuai standar PMO & PMBOK.
                      Data yang akurat memastikan dashboard monitoring berfungsi optimal.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <Layers className="h-5 w-5 text-primary mx-auto mb-1" />
                        <p className="font-medium text-foreground">WBS 3 Level</p>
                        <p className="text-muted-foreground">Area → Item → Task</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <Target className="h-5 w-5 text-accent mx-auto mb-1" />
                        <p className="font-medium text-foreground">Milestones</p>
                        <p className="text-muted-foreground">Per fase proyek</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <FileText className="h-5 w-5 text-success mx-auto mb-1" />
                        <p className="font-medium text-foreground">Progress</p>
                        <p className="text-muted-foreground">Update mingguan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setWizardStep("select-project")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Mulai <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {wizardStep === "select-project" && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Langkah 1: Pilih Proyek</h3>
                    <p className="text-xs text-muted-foreground mb-3">Pilih proyek yang datanya akan diisi/diupdate:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedProject(p); setWizardStep("select-type"); }}
                          className={`text-left p-3 rounded-lg border transition-colors ${
                            selectedProject?.id === p.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          }`}
                        >
                          <p className="text-[10px] font-mono-data text-primary">{p.project_code}</p>
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.location}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardStep === "select-type" && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Langkah 2: Pilih Jenis Data</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Proyek: <span className="text-primary font-medium">{selectedProject?.project_code} — {selectedProject?.name}</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {dataTypes.map(dt => (
                        <button
                          key={dt.key}
                          onClick={() => { setSelectedType(dt.key); setWizardStep("tips"); }}
                          className="text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        >
                          <dt.icon className="h-6 w-6 text-primary mb-2" />
                          <p className="text-sm font-medium text-foreground">{dt.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{dt.description}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setWizardStep("select-project")} className="text-xs text-primary hover:underline mt-3">
                      ← Kembali pilih proyek
                    </button>
                  </div>
                )}

                {wizardStep === "tips" && activeType && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Langkah 3: Tips Pengisian {activeType.label}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Proyek: <span className="text-primary font-medium">{selectedProject?.project_code}</span> · Jenis: <span className="text-primary font-medium">{activeType.label}</span>
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Tips */}
                      <div className="bg-success/5 rounded-lg p-4 border border-success/20">
                        <h4 className="text-xs font-semibold text-success flex items-center gap-1 mb-2">
                          <Lightbulb className="h-3.5 w-3.5" /> Tips Penting
                        </h4>
                        <ul className="space-y-1.5">
                          {activeType.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                              <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Fields reference */}
                      <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                        <h4 className="text-xs font-semibold text-primary flex items-center gap-1 mb-2">
                          <FileText className="h-3.5 w-3.5" /> Field yang Perlu Diisi
                        </h4>
                        <div className="space-y-2">
                          {activeType.fields.map((field, i) => (
                            <div key={i} className="bg-card rounded-md p-2 border border-border/50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">{field.name}</span>
                                <span className="text-[9px] text-muted-foreground italic">contoh: {field.example}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-start gap-1">
                                <HelpCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                {field.hint}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button onClick={() => setWizardStep("select-type")} className="text-xs text-primary hover:underline">
                        ← Kembali
                      </button>
                      <button
                        onClick={() => setShowWizard(false)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Saya Mengerti <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {dataTypes.map(dt => (
              <div key={dt.key} className="glass-card rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <dt.icon className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{dt.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{dt.description}</p>
                <div className="space-y-1.5">
                  {dt.tips.slice(0, 3).map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                      {tip}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">Contoh Pengisian:</h4>
                  {dt.fields.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-foreground">{f.name}</span>
                      <span className="text-muted-foreground font-mono-data">{f.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Helpful Notes */}
          <div className="glass-card rounded-lg p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-primary" /> Catatan Penting untuk Tim Proyek
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">📋 Frekuensi Update</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Progress WBS: Update setiap <strong className="text-foreground">Jumat sore</strong></li>
                  <li>Milestones: Update saat tercapai atau ada perubahan</li>
                  <li>Foto progress: Minimal 1x per minggu</li>
                  <li>Alert/Issue: Segera saat terjadi</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">⚠️ Kesalahan Umum</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Qty completed lebih besar dari qty total</li>
                  <li>Sub-task progress melebihi parent item</li>
                  <li>Lupa update status (masih "in-progress" padahal sudah selesai)</li>
                  <li>Bobot area tidak seimbang (total harus ± 100%)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">💡 Best Practice</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Gunakan kode yang konsisten (WA-001, WI-001)</li>
                  <li>Isi remaining secara otomatis dari qty_total - qty_completed</li>
                  <li>Cross-check progress fisik vs progress system setiap bulan</li>
                  <li>Sertakan foto sebagai bukti progress</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">🔗 Struktur Data (PMBOK WBS)</h4>
                <div className="bg-muted/30 rounded p-2 font-mono-data text-[10px]">
                  <p>Level 1: <strong className="text-foreground">Work Area</strong> (Area Tangki, Area Piping)</p>
                  <p className="ml-3">Level 2: <strong className="text-foreground">Work Item</strong> (Tangki T-101, Piping CS 6")</p>
                  <p className="ml-6">Level 3: <strong className="text-foreground">Sub Task</strong> (Erection, Welding, NDT)</p>
                </div>
              </div>
            </div>
          </div>

          {!showWizard && (
            <button
              onClick={() => { setShowWizard(true); setWizardStep("welcome"); }}
              className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors text-sm font-medium z-40"
            >
              <Lightbulb className="h-4 w-4" /> Buka Panduan
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataEntry;

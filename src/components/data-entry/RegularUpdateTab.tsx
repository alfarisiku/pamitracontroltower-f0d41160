import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Layers, TrendingUp, Target, Package, DollarSign, FileText, Camera, CheckCircle2 } from "lucide-react";
import { supabase, logActivity, DbProject } from "@/lib/supabase";
import { useWorkAreas, useWorkItems, useMilestones } from "@/hooks/useProjects";
import { useProjectPeriods, type ProjectPeriod } from "@/hooks/useProjectPeriods";
import { PeriodSelect } from "@/components/ui/period-select";
import { toast } from "@/hooks/use-toast";
import { RiskResolvePanel } from "./RiskResolvePanel";
import { ProcurementPanel } from "./ProcurementPanel";
import { FinanceEntriesEditor } from "./FinanceEntriesEditor";
import { WeeklyReportEditor } from "./WeeklyReportEditor";
import { PhotoUploader } from "./PhotoUploader";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

type NavKey = "finance" | "weekly-report" | "photos" | "scurve" | "procurement" | "milestones" | "wbs";

export function RegularUpdateTab({ projectId, projects, onNavigate }: {
  projectId: string;
  projects: DbProject[];
  onNavigate?: (tab: NavKey) => void;
}) {
  const qc = useQueryClient();
  const project = projects.find(p => p.id === projectId);
  const { periods, nextUnfilled } = useProjectPeriods(projectId);

  const [periodOrder, setPeriodOrder] = useState<string>("");
  const selectedPeriod: ProjectPeriod | undefined = useMemo(
    () => periods.find(p => String(p.period_order) === periodOrder),
    [periods, periodOrder]
  );

  // Auto-suggest first unfilled period when project or periods change
  useEffect(() => {
    if (!periodOrder && nextUnfilled) setPeriodOrder(String(nextUnfilled.period_order));
  }, [nextUnfilled?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPeriodOrder(""); }, [projectId]);

  // === STEP 2: Weekly Progress % (DRAFT → CONFIRM) ===
  const [actualPct, setActualPct] = useState("");
  const [draftPct, setDraftPct] = useState<number | null>(null);
  useEffect(() => {
    setActualPct(selectedPeriod?.actual_progress != null ? String(selectedPeriod.actual_progress) : "");
    setDraftPct(null);
  }, [selectedPeriod?.id]);

  const stageDraft = () => {
    const val = parseFloat(actualPct);
    if (isNaN(val) || val < 0 || val > 100) { toast({ title: "Progress harus 0–100", variant: "destructive" }); return; }
    setDraftPct(val);
    toast({ title: "📝 Draft disimpan", description: "Konfirmasi di bawah untuk publish." });
  };
  const discardDraft = () => {
    setDraftPct(null);
    setActualPct(selectedPeriod?.actual_progress != null ? String(selectedPeriod.actual_progress) : "");
  };

  const [savingProgress, setSavingProgress] = useState(false);
  const handleConfirmDraft = async () => {
    if (!selectedPeriod || !projectId || draftPct == null) return;
    const val = draftPct;
    setSavingProgress(true);
    try {
      const { error: sErr } = await supabase.from("s_curve_data")
        .update({ actual_progress: val })
        .eq("id", selectedPeriod.id);
      if (sErr) throw sErr;
      const { error: pErr } = await supabase.from("projects")
        .update({ progress: Math.round(val) })
        .eq("id", projectId);
      if (pErr) throw pErr;
      await logActivity(supabase, "s_curve", "update",
        `Weekly progress ${selectedPeriod.period_label}: ${val}% (plan ${selectedPeriod.planned_progress}%)`,
        projectId, selectedPeriod.id);
      qc.invalidateQueries({ queryKey: ["s_curve_data"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Terkonfirmasi", description: `${selectedPeriod.period_label} → ${val}%` });
      setDraftPct(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSavingProgress(false); }
  };

  // === STEP 2: Milestones quick-update (status + actual date only) ===
  const { data: milestones = [] } = useMilestones(projectId);
  const updateMilestone = async (id: string, patch: Record<string, any>, name: string) => {
    const { error } = await supabase.from("milestones").update(patch).eq("id", id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "milestone", "update", `${name}: ${JSON.stringify(patch)}`, projectId, id);
    qc.invalidateQueries({ queryKey: ["milestones"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
    toast({ title: "✅ Milestone updated" });
  };

  // === STEP 3: Work items (existing lightweight) ===
  const { data: workAreas = [] } = useWorkAreas(projectId);
  const { data: workItems = [] } = useWorkItems(workAreas.map(w => w.id));
  const [wiId, setWiId] = useState("");
  const [wiQty, setWiQty] = useState("");
  const currentWi = workItems.find(w => w.id === wiId);
  useEffect(() => { setWiQty(""); }, [wiId]);

  const saveWorkItem = async () => {
    if (!currentWi) return;
    const total = Number(currentWi.qty_total);
    const qty = wiQty === "" ? Number(currentWi.qty_completed) : parseFloat(wiQty);
    const progress = total > 0 ? Math.min(100, Math.round((qty / total) * 100)) : 0;
    const { error } = await supabase.from("work_items").update({
      qty_completed: qty, progress,
      status: progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "not-started",
    }).eq("id", currentWi.id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "work_item", "update", `${currentWi.name}: ${qty}/${total}`, projectId, currentWi.id);
    qc.invalidateQueries({ queryKey: ["work_items"] });
    toast({ title: "✅ Work item updated" });
    setWiQty("");
  };

  // ---------- render ----------
  if (!project) return null;

  return (
    <div className="space-y-4 mb-5">
      {/* === PERIOD PICKER === */}
      <div className="glass-card rounded-lg shadow-card p-4 border-primary/30 border">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Step 1 · Pilih Periode Weekly
        </h3>
        <p className="text-[10px] text-muted-foreground mb-3">
          Periode diambil dari <b>S-Curve baseline</b> proyek ini. Semua update di bawah akan disimpan untuk periode yang dipilih.
          {nextUnfilled && !selectedPeriod && <> Saran otomatis: <b>{nextUnfilled.period_label}</b> (periode terakhir belum terisi).</>}
        </p>
        <PeriodSelect
          projectId={projectId}
          value={periodOrder}
          onChange={(p) => setPeriodOrder(p ? String(p.period_order) : "")}
        />
        {selectedPeriod && (
          <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-4">
            <span>Planned: <b className="text-foreground">{selectedPeriod.planned_progress}%</b></span>
            <span>Actual saat ini: <b className="text-foreground">{selectedPeriod.actual_progress ?? "—"}%</b></span>
            <span>Cut-off: <b className="text-foreground">{new Date(selectedPeriod.period_end).toLocaleDateString("id-ID")}</b></span>
          </div>
        )}
      </div>

      {!selectedPeriod ? (
        <div className="glass-card rounded-lg shadow-card p-6 text-center">
          <p className="text-xs text-muted-foreground">Pilih periode di atas untuk mulai update mingguan.</p>
        </div>
      ) : (
        <>
          {/* === STEP 2: Weekly Progress % (Draft → Confirm) === */}
          <div className={`glass-card rounded-lg shadow-card p-4 ${draftPct != null ? "border-warning/60 border-2" : ""}`}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" /> Step 2 · Weekly Progress %
              {draftPct != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/40 font-semibold uppercase tracking-wide">Draft</span>}
            </h3>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className={labelCls}>Actual Progress {selectedPeriod.period_label} (%)</label>
                <input
                  type="number" min="0" max="100" step="0.01"
                  value={actualPct} onChange={e => setActualPct(e.target.value)}
                  className={inputCls}
                  placeholder={`Plan: ${selectedPeriod.planned_progress}%`}
                />
              </div>
              <button
                onClick={stageDraft}
                disabled={actualPct === ""}
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-lg text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" /> Simpan Draft
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Nilai disimpan sebagai <b>draft</b> dulu. Konfirmasi di bawah untuk publish ke S-Curve baseline + header proyek.
            </p>

            {draftPct != null && (
              <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/40">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="text-[11px]">
                    <p className="text-foreground font-semibold mb-1">📋 Review Draft — {selectedPeriod.period_label}</p>
                    <p className="text-muted-foreground">
                      Plan: <b className="text-foreground">{selectedPeriod.planned_progress}%</b>
                      {" · "}Actual saat ini: <b className="text-foreground">{selectedPeriod.actual_progress ?? "—"}%</b>
                      {" → "}Draft baru: <b className="text-warning">{draftPct}%</b>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={discardDraft}
                      className="px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] font-medium hover:bg-muted"
                    >Discard</button>
                    <button
                      onClick={handleConfirmDraft}
                      disabled={savingProgress}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {savingProgress ? "Publishing..." : "Konfirmasi & Publish"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === STEP 3: Milestones (status + actual date) === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Step 3 · Update Milestones
              </h3>
              <button onClick={() => onNavigate?.("milestones")} className="text-[10px] text-primary hover:underline">Kelola lengkap →</button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada milestone.</p>
            ) : (
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="text-left py-1.5 px-2 text-[10px] uppercase text-muted-foreground">Milestone</th>
                      <th className="text-left py-1.5 px-2 text-[10px] uppercase text-muted-foreground">Target</th>
                      <th className="text-left py-1.5 px-2 text-[10px] uppercase text-muted-foreground">Actual</th>
                      <th className="text-left py-1.5 px-2 text-[10px] uppercase text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map(m => (
                      <tr key={m.id} className="border-b border-border/40">
                        <td className="py-1 px-2 text-foreground">{m.name}</td>
                        <td className="py-1 px-2 text-muted-foreground">{m.target_date ? new Date(m.target_date).toLocaleDateString("id-ID") : "—"}</td>
                        <td className="py-1 px-2">
                          <input type="date" defaultValue={m.actual_date || ""}
                            onBlur={e => e.target.value !== (m.actual_date || "") && updateMilestone(m.id, { actual_date: e.target.value || null }, m.name)}
                            className="px-1.5 py-0.5 text-[11px] bg-card border border-border rounded" />
                        </td>
                        <td className="py-1 px-2">
                          <select value={m.status}
                            onChange={e => updateMilestone(m.id, {
                              status: e.target.value,
                              actual_date: e.target.value === "completed" ? (m.actual_date || selectedPeriod.period_end) : m.actual_date,
                            }, m.name)}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-transparent ${m.status === "completed" ? "text-success border-success/40" : m.status === "in-progress" ? "text-info border-info/40" : m.status === "delayed" ? "text-destructive border-destructive/40" : "text-muted-foreground border-border"}`}>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === STEP 4: Work Item (WBS) quick actual === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Step 4 · Work Item Progress (WBS)
              </h3>
              <button onClick={() => onNavigate?.("wbs")} className="text-[10px] text-primary hover:underline">Full WBS CRUD →</button>
            </div>
            {workItems.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada work item.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Work Item</label>
                  <select value={wiId} onChange={e => setWiId(e.target.value)} className={inputCls}>
                    <option value="">— Pilih Item —</option>
                    {workItems.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name} ({Number(w.qty_completed)}/{Number(w.qty_total)} {w.unit})
                      </option>
                    ))}
                  </select>
                </div>
                {currentWi && (
                  <>
                    <div>
                      <label className={labelCls}>Actual Qty (of {Number(currentWi.qty_total)} {currentWi.unit})</label>
                      <input type="number" min="0" value={wiQty} onChange={e => setWiQty(e.target.value)} className={inputCls} placeholder={String(Number(currentWi.qty_completed))} />
                    </div>
                    <button onClick={saveWorkItem} className="sm:col-span-3 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">
                      <Save className="h-3.5 w-3.5" /> Update Work Item
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* === STEP 5: Risk === */}
          <RiskResolvePanel projectId={projectId} />

          {/* === STEP 6: Procurement / PO === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Step 6 · Procurement / PO
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              Update <b>Actual PR / PO / Delivery / On Site</b> dan <b>status</b> item procurement. Tambah item baru di sini juga.
            </p>
            <ProcurementPanel projectId={projectId} />
          </div>

          {/* === STEP 7: Finance Cashflow === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Step 7 · Finance — Cash Flow
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              Tambah transaksi baru (cash in / cash out) untuk periode <b>{selectedPeriod.period_label}</b>.
            </p>
            <FinanceEntriesEditor projectId={projectId} compact />
          </div>

          {/* === STEP 8: Weekly Report === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Step 8 · Weekly Report
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              Buat report baru untuk periode <b>{selectedPeriod.period_label}</b>.
            </p>
            <WeeklyReportEditor projectId={projectId} compact />
          </div>

          {/* === STEP 9: Weekly Photos === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Step 9 · Weekly Photos
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">
              Upload foto lapangan untuk periode <b>{selectedPeriod.period_label}</b>.
            </p>
            <PhotoUploader projectId={projectId} />
          </div>

          <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 pt-2">
            <CheckCircle2 className="h-3 w-3 text-success" /> Semua modul mingguan tersedia langsung di halaman ini.
          </div>
        </>
      )}
    </div>
  );
}

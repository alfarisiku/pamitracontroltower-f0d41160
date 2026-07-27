import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Layers, TrendingUp, Target, Package, DollarSign, FileText, Camera, CheckCircle2, AlertTriangle, ClipboardCheck, ArrowRight, Trash2, Lock } from "lucide-react";
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

type NavKey = "finance" | "weekly-report" | "photos" | "scurve" | "procurement" | "milestones" | "wbs" | "risk";

type SessionChange = { step: number; module: string; description: string; ts: number };

/** Small header used by each step: number + title + "Kelola lengkap →" link */
function StepHeader({ step, icon: Icon, title, navKey, onNavigate, badge }: {
  step: number; icon: any; title: string; navKey?: NavKey; onNavigate?: (t: NavKey) => void; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">{step}</span>
        <Icon className="h-4 w-4 text-primary" /> Step {step} · {title}
        {badge}
      </h3>
      {navKey && (
        <button onClick={() => onNavigate?.(navKey)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          Kelola lengkap <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

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

  // === SESSION CHANGE LOG (across all steps) ===
  const [sessionChanges, setSessionChanges] = useState<SessionChange[]>([]);
  const [finalized, setFinalized] = useState(false);
  const logChange = (step: number, module: string, description: string) =>
    setSessionChanges(prev => [...prev, { step, module, description, ts: Date.now() }]);
  const removeChange = (ts: number) => setSessionChanges(prev => prev.filter(c => c.ts !== ts));

  // Auto-suggest first unfilled period when project or periods change
  useEffect(() => {
    if (!periodOrder && nextUnfilled) setPeriodOrder(String(nextUnfilled.period_order));
  }, [nextUnfilled?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPeriodOrder(""); setSessionChanges([]); setFinalized(false); }, [projectId]);
  useEffect(() => { setSessionChanges([]); setFinalized(false); }, [selectedPeriod?.id]);

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
      logChange(2, "Progress", `Actual progress ${selectedPeriod.period_label}: ${selectedPeriod.actual_progress ?? "—"}% → ${val}% (plan ${selectedPeriod.planned_progress}%)`);
      toast({ title: "✅ Terkonfirmasi", description: `${selectedPeriod.period_label} → ${val}%` });
      setDraftPct(null);
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSavingProgress(false); }
  };

  // === STEP 3: Milestones quick-update ===
  const { data: milestones = [] } = useMilestones(projectId);
  const updateMilestone = async (id: string, patch: Record<string, any>, name: string) => {
    const { error } = await supabase.from("milestones").update(patch).eq("id", id);
    if (error) { toast({ title: "❌ Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "milestone", "update", `${name}: ${JSON.stringify(patch)}`, projectId, id);
    qc.invalidateQueries({ queryKey: ["milestones"] });
    qc.invalidateQueries({ queryKey: ["activity_logs"] });
    logChange(3, "Milestone", `${name}: ${Object.entries(patch).map(([k,v]) => `${k}=${v ?? "—"}`).join(", ")}`);
    toast({ title: "✅ Milestone updated" });
  };

  // === STEP 4: Work items ===
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
    logChange(4, "WBS", `${currentWi.code} ${currentWi.name}: qty ${Number(currentWi.qty_completed)} → ${qty} / ${total} ${currentWi.unit} (${progress}%)`);
    toast({ title: "✅ Work item updated" });
    setWiQty("");
  };

  // ---------- FINALIZE (Step 10) ----------
  const [finalizing, setFinalizing] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState("");
  const handleFinalize = async () => {
    if (!selectedPeriod || sessionChanges.length === 0) return;
    setFinalizing(true);
    try {
      const summary = [
        `📋 WEEKLY UPDATE FINALIZED — ${selectedPeriod.period_label}`,
        `Periode: ${new Date(selectedPeriod.period_start).toLocaleDateString("id-ID")} → ${new Date(selectedPeriod.period_end).toLocaleDateString("id-ID")}`,
        `Total perubahan: ${sessionChanges.length}`,
        "",
        ...sessionChanges.map((c, i) => `${i + 1}. [Step ${c.step} · ${c.module}] ${c.description}`),
        meetingNotes ? `\nCatatan: ${meetingNotes}` : "",
      ].filter(Boolean).join("\n");
      await logActivity(supabase, "weekly_update", "finalize", summary, projectId, selectedPeriod.id);
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      setFinalized(true);
      toast({ title: "✅ Weekly update di-finalize", description: `${sessionChanges.length} perubahan tercatat resmi.` });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setFinalizing(false); }
  };

  const startNewSession = () => { setSessionChanges([]); setFinalized(false); setMeetingNotes(""); };

  // ---------- render ----------
  if (!project) return null;

  const stepDraftCount = (step: number) => sessionChanges.filter(c => c.step === step).length;
  const DraftBadge = ({ step }: { step: number }) => {
    const n = stepDraftCount(step);
    if (n === 0) return null;
    return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/40 font-semibold uppercase tracking-wide">{n} draft</span>;
  };

  return (
    <div className="space-y-4 mb-5">
      {/* === STEP 1: PERIOD PICKER === */}
      <div className="glass-card rounded-lg shadow-card p-4 border-primary/30 border">
        <StepHeader step={1} icon={TrendingUp} title="Pilih Periode Weekly" navKey="scurve" onNavigate={onNavigate} />
        <p className="text-[10px] text-muted-foreground mb-3">
          Periode diambil dari <b>S-Curve baseline</b>. <b>Semua step di bawah terkunci ke periode ini</b> — tidak bisa memilih periode lain.
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
            <span className="flex items-center gap-1 text-primary"><Lock className="h-3 w-3" /> Periode ini dikunci untuk semua step di bawah</span>
          </div>
        )}
      </div>

      {!selectedPeriod ? (
        <div className="glass-card rounded-lg shadow-card p-6 text-center">
          <p className="text-xs text-muted-foreground">Pilih periode di atas untuk mulai update mingguan.</p>
        </div>
      ) : (
        <>
          {/* === STEP 2: Weekly Progress % === */}
          <div className={`glass-card rounded-lg shadow-card p-4 ${draftPct != null ? "border-warning/60 border-2" : ""}`}>
            <StepHeader step={2} icon={Save} title="Weekly Progress %" navKey="scurve" onNavigate={onNavigate}
              badge={<>{draftPct != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/40 font-semibold uppercase tracking-wide">Draft</span>}<DraftBadge step={2} /></>} />
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

          {/* === STEP 3: Milestones === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={3} icon={Target} title="Update Milestones" navKey="milestones" onNavigate={onNavigate} badge={<DraftBadge step={3} />} />
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
                            max={selectedPeriod.period_end}
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
            <p className="text-[10px] text-muted-foreground mt-2 italic">Actual date maksimal = cut-off periode <b>{selectedPeriod.period_label}</b> ({new Date(selectedPeriod.period_end).toLocaleDateString("id-ID")}).</p>
          </div>

          {/* === STEP 4: Work Item (WBS) === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={4} icon={Layers} title="Work Item Progress (WBS)" navKey="wbs" onNavigate={onNavigate} badge={<DraftBadge step={4} />} />
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
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={5} icon={AlertTriangle} title="Risk & Issue" navKey="risk" onNavigate={onNavigate} badge={<DraftBadge step={5} />} />
            <RiskResolvePanel projectId={projectId} onLogged={(m) => logChange(5, "Risk", m)} />
          </div>

          {/* === STEP 6: Procurement === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={6} icon={Package} title="Procurement / PO" navKey="procurement" onNavigate={onNavigate} badge={<DraftBadge step={6} />} />
            <p className="text-[10px] text-muted-foreground mb-3">
              Update <b>Actual PR / PO / Delivery / On Site</b> dan <b>status</b>. Tambah item baru di sini juga.
            </p>
            <ProcurementPanel projectId={projectId} onLogged={(m) => logChange(6, "Procurement", m)} />
          </div>

          {/* === STEP 7: Finance === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={7} icon={DollarSign} title="Finance — Cash Flow" navKey="finance" onNavigate={onNavigate} badge={<DraftBadge step={7} />} />
            <p className="text-[10px] text-muted-foreground mb-3">
              Tambah transaksi baru (cash in / cash out) untuk periode <b>{selectedPeriod.period_label}</b> — periode terkunci.
            </p>
            <FinanceEntriesEditor projectId={projectId} compact lockedPeriodId={selectedPeriod.id} onLogged={(m) => logChange(7, "Finance", m)} />
          </div>

          {/* === STEP 8: Weekly Report === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={8} icon={FileText} title="Weekly Report" navKey="weekly-report" onNavigate={onNavigate} badge={<DraftBadge step={8} />} />
            <p className="text-[10px] text-muted-foreground mb-3">
              Buat report baru untuk periode <b>{selectedPeriod.period_label}</b> — periode terkunci.
            </p>
            <WeeklyReportEditor projectId={projectId} compact lockedPeriodId={selectedPeriod.id} onLogged={(m) => logChange(8, "Weekly Report", m)} />
          </div>

          {/* === STEP 9: Weekly Photos === */}
          <div className="glass-card rounded-lg shadow-card p-4">
            <StepHeader step={9} icon={Camera} title="Weekly Photos" navKey="photos" onNavigate={onNavigate} badge={<DraftBadge step={9} />} />
            <p className="text-[10px] text-muted-foreground mb-3">
              Upload foto lapangan untuk periode <b>{selectedPeriod.period_label}</b> — periode terkunci.
            </p>
            <PhotoUploader projectId={projectId} compact lockedPeriodId={selectedPeriod.id} onLogged={(m) => logChange(9, "Photos", m)} />
          </div>

          {/* === STEP 10: FINALIZE & REVIEW === */}
          <div className={`glass-card rounded-lg shadow-card p-4 border-2 ${finalized ? "border-success/60" : sessionChanges.length > 0 ? "border-warning/60" : "border-border"}`}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">10</span>
                <ClipboardCheck className="h-4 w-4 text-primary" /> Step 10 · Finalize & Review Weekly Update
                {finalized && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success border border-success/40 font-semibold uppercase">Finalized</span>}
                {!finalized && sessionChanges.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/40 font-semibold uppercase">{sessionChanges.length} pending</span>}
              </h3>
            </div>

            <p className="text-[10px] text-muted-foreground mb-3">
              Semua perubahan dari Step 2–9 dicatat di bawah sebagai <b>draft session</b>. Review dulu, lalu <b>Finalize</b> untuk menutup update mingguan ini secara resmi (satu entry Activity Log konsolidasi tercipta).
            </p>

            {sessionChanges.length === 0 ? (
              <div className="p-6 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                <p className="text-xs text-muted-foreground">Belum ada perubahan tercatat. Mulai update dari Step 2.</p>
              </div>
            ) : (
              <div className="overflow-auto max-h-[360px] border border-border rounded-md mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-10">#</th>
                      <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-16">Step</th>
                      <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-32">Modul</th>
                      <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Perubahan</th>
                      <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground w-24">Waktu</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionChanges.map((c, i) => (
                      <tr key={c.ts} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-1.5 px-2 font-mono-data text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 px-2"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Step {c.step}</span></td>
                        <td className="py-1.5 px-2 text-foreground font-medium">{c.module}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{c.description}</td>
                        <td className="py-1.5 px-2 font-mono-data text-[10px] text-muted-foreground">{new Date(c.ts).toLocaleTimeString("id-ID")}</td>
                        <td className="py-1.5 px-1">
                          {!finalized && <button onClick={() => removeChange(c.ts)} className="p-1 hover:bg-destructive/10 rounded" title="Hapus dari draft summary (data DB tidak berubah)"><Trash2 className="h-3 w-3 text-destructive" /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sessionChanges.length > 0 && !finalized && (
              <>
                <div className="mb-3">
                  <label className={labelCls}>Catatan Meeting / Approval (opsional)</label>
                  <textarea value={meetingNotes} onChange={e => setMeetingNotes(e.target.value)}
                    className={inputCls + " min-h-[60px]"}
                    placeholder="Catatan tambahan yang ingin dicantumkan pada log finalisasi..." />
                </div>

                <div className="p-3 rounded-lg bg-warning/10 border border-warning/40 flex items-start justify-between gap-3 flex-wrap">
                  <div className="text-[11px] flex-1 min-w-[220px]">
                    <p className="text-foreground font-semibold mb-1">📋 Ringkasan Finalisasi — {selectedPeriod.period_label}</p>
                    <p className="text-muted-foreground">
                      {sessionChanges.length} perubahan dari{" "}
                      {Array.from(new Set(sessionChanges.map(c => c.module))).join(", ")}
                      {" "}akan dikonsolidasikan menjadi 1 entry Activity Log resmi.
                    </p>
                  </div>
                  <button
                    onClick={handleFinalize}
                    disabled={finalizing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {finalizing ? "Finalizing..." : "Finalize Weekly Update"}
                  </button>
                </div>
              </>
            )}

            {finalized && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/40 flex items-start justify-between gap-3 flex-wrap">
                <div className="text-[11px] flex-1">
                  <p className="text-success font-semibold mb-1 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Weekly Update Terkonfirmasi</p>
                  <p className="text-muted-foreground">
                    {sessionChanges.length} perubahan sudah tercatat resmi di Activity Log untuk periode <b>{selectedPeriod.period_label}</b>.
                  </p>
                </div>
                <button onClick={startNewSession} className="px-3 py-1.5 bg-card border border-border rounded-lg text-[11px] font-medium hover:bg-muted">
                  Mulai Session Baru
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

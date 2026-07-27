import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, logActivity, ACHIEVEMENT_CATEGORIES, DbWeeklyReport } from "@/lib/supabase";
import { FileText, Plus, Trash2, Save, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PeriodSelect } from "@/components/ui/period-select";
import { useProjectPeriods } from "@/hooks/useProjectPeriods";

const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-0.5 block";

export function WeeklyReportEditor({ projectId, compact = false, lockedPeriodId, onLogged }: { projectId: string; compact?: boolean; lockedPeriodId?: string; onLogged?: (msg: string) => void }) {
  const qc = useQueryClient();
  const { periods, nextUnfilled } = useProjectPeriods(projectId);
  const [reports, setReports] = useState<DbWeeklyReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [periodOrder, setPeriodOrder] = useState<string>("");
  const lockedPeriod = useMemo(() => periods.find(p => p.id === lockedPeriodId), [periods, lockedPeriodId]);
  const selectedPeriod = useMemo(
    () => lockedPeriod ?? periods.find(p => String(p.period_order) === periodOrder),
    [periods, periodOrder, lockedPeriod]
  );

  const emptyForm = () => ({
    week_start_date: "", week_end_date: "",
    achievements: [] as DbWeeklyReport["achievements"],
    outstanding_items: [] as DbWeeklyReport["outstanding_items"],
    next_week_targets: [] as DbWeeklyReport["next_week_targets"],
    escalations: [] as DbWeeklyReport["escalations"],
    summary: "",
  });
  const [form, setForm] = useState<Omit<DbWeeklyReport, "id"|"project_id"|"created_at"|"updated_at">>(emptyForm());

  const load = async () => {
    const { data } = await (supabase as any).from("weekly_progress_reports").select("*").eq("project_id", projectId).order("week_start_date", { ascending: false });
    setReports((data || []) as DbWeeklyReport[]);
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  // When opening new-form, auto-suggest next unfilled S-Curve period
  useEffect(() => {
    if (lockedPeriod) return;
    if (newOpen && !periodOrder && nextUnfilled) setPeriodOrder(String(nextUnfilled.period_order));
  }, [newOpen, nextUnfilled?.id, lockedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selected period drives form dates (single source of truth = S-Curve)
  useEffect(() => {
    if (selectedPeriod) setForm(f => ({ ...f, week_start_date: selectedPeriod.period_start, week_end_date: selectedPeriod.period_end }));
  }, [selectedPeriod?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form.week_start_date || !form.week_end_date) { toast({ title: "Pilih periode dari S-Curve", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("weekly_progress_reports").insert({ project_id: projectId, ...form });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logActivity(supabase, "weekly_report", "create", `Weekly report ${form.week_start_date} → ${form.week_end_date}`, projectId);
    onLogged?.(`Weekly Report dibuat — ${selectedPeriod?.period_label ?? `${form.week_start_date} → ${form.week_end_date}`} (${form.achievements.length} achievements, ${form.outstanding_items.length} outstanding, ${form.escalations.length} escalations)`);
    qc.invalidateQueries({ queryKey: ["weekly_reports"] });
    setNewOpen(false);
    if (!lockedPeriod) setPeriodOrder("");
    setForm(emptyForm());
    load(); toast({ title: "✅ Weekly report tersimpan" });
  };

  const del = async (id: string) => {
    if (!confirm("Hapus weekly report ini?")) return;
    await (supabase as any).from("weekly_progress_reports").delete().eq("id", id);
    await logActivity(supabase, "weekly_report", "delete", `Weekly report deleted`, projectId, id);
    load();
  };

  const updateRow = async (id: string, patch: Partial<DbWeeklyReport>) => {
    await (supabase as any).from("weekly_progress_reports").update(patch).eq("id", id);
    await logActivity(supabase, "weekly_report", "update", `Weekly report updated`, projectId, id);
    load();
  };

  const addAchievement = () => setForm({ ...form, achievements: [...form.achievements, { category: "construction", description: "" }] });
  const addOutstanding = () => setForm({ ...form, outstanding_items: [...form.outstanding_items, { item: "" }] });
  const addTarget = () => setForm({ ...form, next_week_targets: [...form.next_week_targets, { target: "" }] });
  const addEscalation = () => setForm({ ...form, escalations: [...form.escalations, { issue: "" }] });

  return (
    <div className="glass-card rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Weekly Progress Report</h3>
        <button onClick={() => setNewOpen(!newOpen)} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px]"><Plus className="h-3 w-3" /> New Report</button>
      </div>

      {newOpen && (
        <div className="mb-3 p-3 bg-muted/30 rounded border border-border/50 space-y-3">
          <div>
            <label className={labelCls}>Periode Weekly (dari S-Curve) *</label>
            <PeriodSelect projectId={projectId} value={periodOrder} onChange={(p) => setPeriodOrder(p ? String(p.period_order) : "")} />
            {selectedPeriod && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(selectedPeriod.period_start).toLocaleDateString("id-ID")} → {new Date(selectedPeriod.period_end).toLocaleDateString("id-ID")}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1"><p className="text-[10px] uppercase font-semibold text-foreground">Achievements This Week</p>
              <button onClick={addAchievement} className="text-[10px] text-primary flex items-center gap-0.5"><Plus className="h-3 w-3" />Add</button></div>
            {form.achievements.map((a, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <select value={a.category} onChange={e => { const arr = [...form.achievements]; arr[i] = { ...a, category: e.target.value }; setForm({...form, achievements: arr}); }} className={inputCls + " w-auto"}>
                  {ACHIEVEMENT_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
                <input value={a.description} onChange={e => { const arr = [...form.achievements]; arr[i] = { ...a, description: e.target.value }; setForm({...form, achievements: arr}); }} className={inputCls} placeholder="Achievement description" />
                <button onClick={() => setForm({...form, achievements: form.achievements.filter((_, x) => x!==i)})} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1"><p className="text-[10px] uppercase font-semibold text-foreground">Outstanding Items</p>
              <button onClick={addOutstanding} className="text-[10px] text-primary flex items-center gap-0.5"><Plus className="h-3 w-3" />Add</button></div>
            {form.outstanding_items.map((o, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <input value={o.item} onChange={e => { const arr = [...form.outstanding_items]; arr[i] = { ...o, item: e.target.value }; setForm({...form, outstanding_items: arr}); }} className={inputCls} placeholder="Outstanding item" />
                <input value={o.note || ""} onChange={e => { const arr = [...form.outstanding_items]; arr[i] = { ...o, note: e.target.value }; setForm({...form, outstanding_items: arr}); }} className={inputCls} placeholder="Note (opt)" />
                <button onClick={() => setForm({...form, outstanding_items: form.outstanding_items.filter((_, x) => x!==i)})} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1"><p className="text-[10px] uppercase font-semibold text-foreground">Next Week Targets</p>
              <button onClick={addTarget} className="text-[10px] text-primary flex items-center gap-0.5"><Plus className="h-3 w-3" />Add</button></div>
            {form.next_week_targets.map((t, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <input value={t.target} onChange={e => { const arr = [...form.next_week_targets]; arr[i] = { ...t, target: e.target.value }; setForm({...form, next_week_targets: arr}); }} className={inputCls} placeholder="Target activity" />
                <input value={t.owner || ""} onChange={e => { const arr = [...form.next_week_targets]; arr[i] = { ...t, owner: e.target.value }; setForm({...form, next_week_targets: arr}); }} className={inputCls} placeholder="Owner" />
                <button onClick={() => setForm({...form, next_week_targets: form.next_week_targets.filter((_, x) => x!==i)})} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1"><p className="text-[10px] uppercase font-semibold text-foreground">Management Escalations</p>
              <button onClick={addEscalation} className="text-[10px] text-primary flex items-center gap-0.5"><Plus className="h-3 w-3" />Add</button></div>
            {form.escalations.map((es, i) => (
              <div key={i} className="flex gap-1 mb-1">
                <input value={es.issue} onChange={e => { const arr = [...form.escalations]; arr[i] = { ...es, issue: e.target.value }; setForm({...form, escalations: arr}); }} className={inputCls} placeholder="Issue" />
                <input value={es.decision_needed || ""} onChange={e => { const arr = [...form.escalations]; arr[i] = { ...es, decision_needed: e.target.value }; setForm({...form, escalations: arr}); }} className={inputCls} placeholder="Decision needed" />
                <button onClick={() => setForm({...form, escalations: form.escalations.filter((_, x) => x!==i)})} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </div>
            ))}
          </div>

          <div>
            <label className={labelCls}>Summary / Meeting Notes</label>
            <textarea value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className={inputCls + " min-h-[60px]"} placeholder="Executive summary for weekly meeting..." />
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs"><Save className="h-3 w-3 inline mr-1" />Save Report</button>
            <button onClick={() => setNewOpen(false)} className="px-3 py-1.5 bg-muted rounded text-xs border border-border">Cancel</button>
          </div>
        </div>
      )}

      {!compact && reports.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Belum ada weekly report untuk proyek ini.</p>}

      {!compact && (
      <div className="space-y-2">
        {reports.map(r => {
          const isOpen = openId === r.id;
          return (
            <div key={r.id} className="border border-border rounded-lg">
              <button onClick={() => setOpenId(isOpen ? null : r.id)} className="w-full flex items-center justify-between p-2 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-xs font-semibold text-foreground">{new Date(r.week_start_date).toLocaleDateString('id-ID')} → {new Date(r.week_end_date).toLocaleDateString('id-ID')}</span>
                  <span className="text-[10px] text-muted-foreground">{r.achievements.length} achievements · {r.outstanding_items.length} outstanding · {r.escalations.length} escalations</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); del(r.id); }} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
              </button>
              {isOpen && (
                <div className="p-3 border-t border-border space-y-3 text-xs bg-muted/10">
                  <div>
                    <label className={labelCls}>Periode Weekly (dari S-Curve)</label>
                    <PeriodSelect
                      projectId={projectId}
                      value={String(periods.find(p => p.period_start === r.week_start_date && p.period_end === r.week_end_date)?.period_order ?? "")}
                      onChange={(p) => p && updateRow(r.id, { week_start_date: p.period_start, week_end_date: p.period_end })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(r.week_start_date).toLocaleDateString("id-ID")} → {new Date(r.week_end_date).toLocaleDateString("id-ID")}
                    </p>
                  </div>

                  <EditableList
                    title="Achievements" color="success"
                    items={r.achievements}
                    render={(a, onChange) => (
                      <>
                        <select value={a.category} onChange={e => onChange({ ...a, category: e.target.value })} className={inputCls + " w-auto"}>
                          {ACHIEVEMENT_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                        </select>
                        <input value={a.description} onChange={e => onChange({ ...a, description: e.target.value })} className={inputCls} placeholder="Description" />
                      </>
                    )}
                    empty={{ category: "construction", description: "" }}
                    save={next => updateRow(r.id, { achievements: next })}
                  />

                  <EditableList
                    title="Outstanding" color="warning"
                    items={r.outstanding_items}
                    render={(o, onChange) => (
                      <>
                        <input value={o.item} onChange={e => onChange({ ...o, item: e.target.value })} className={inputCls} placeholder="Item" />
                        <input value={o.note || ""} onChange={e => onChange({ ...o, note: e.target.value })} className={inputCls} placeholder="Note" />
                      </>
                    )}
                    empty={{ item: "" }}
                    save={next => updateRow(r.id, { outstanding_items: next })}
                  />

                  <EditableList
                    title="Next Week Targets" color="primary"
                    items={r.next_week_targets}
                    render={(t, onChange) => (
                      <>
                        <input value={t.target} onChange={e => onChange({ ...t, target: e.target.value })} className={inputCls} placeholder="Target" />
                        <input value={t.owner || ""} onChange={e => onChange({ ...t, owner: e.target.value })} className={inputCls} placeholder="Owner" />
                      </>
                    )}
                    empty={{ target: "" }}
                    save={next => updateRow(r.id, { next_week_targets: next })}
                  />

                  <EditableList
                    title="Escalations" color="destructive"
                    items={r.escalations}
                    render={(es, onChange) => (
                      <>
                        <input value={es.issue} onChange={e => onChange({ ...es, issue: e.target.value })} className={inputCls} placeholder="Issue" />
                        <input value={es.decision_needed || ""} onChange={e => onChange({ ...es, decision_needed: e.target.value })} className={inputCls} placeholder="Decision needed" />
                      </>
                    )}
                    empty={{ issue: "" }}
                    save={next => updateRow(r.id, { escalations: next })}
                  />

                  <div>
                    <label className={labelCls}>Summary / Meeting Notes</label>
                    <textarea defaultValue={r.summary} onBlur={e => e.target.value !== r.summary && updateRow(r.id, { summary: e.target.value })} className={inputCls + " min-h-[60px]"} placeholder="Executive summary..." />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function EditableList<T>({ title, color, items, render, empty, save }: {
  title: string; color: string;
  items: T[];
  render: (item: T, onChange: (next: T) => void) => React.ReactNode;
  empty: T;
  save: (next: T[]) => void;
}) {
  const [local, setLocal] = useState<T[]>(items);
  useEffect(() => { setLocal(items); }, [items]);
  const commit = (next: T[]) => { setLocal(next); save(next); };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-[10px] uppercase font-semibold text-${color}`}>{title} ({local.length})</p>
        <button onClick={() => commit([...local, { ...empty }])} className="text-[10px] text-primary flex items-center gap-0.5"><Plus className="h-3 w-3" />Add</button>
      </div>
      {local.length === 0 && <p className="text-[10px] text-muted-foreground italic">Belum ada item.</p>}
      {local.map((it, i) => (
        <div key={i} className="flex gap-1 mb-1">
          {render(it, next => { const arr = [...local]; arr[i] = next; setLocal(arr); })}
          <button onClick={() => { const arr = [...local]; arr[i] = local[i]; commit(arr); }} className="p-1 hover:bg-primary/10 rounded" title="Save"><Save className="h-3 w-3 text-primary" /></button>
          <button onClick={() => commit(local.filter((_, x) => x !== i))} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase, logActivity } from "@/lib/supabase";
import { useSCurveData, useProject } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";
import { DateRangeInput } from "@/components/ui/date-range-input";

type Row = {
  period_label: string;
  period_order: number;
  planned_progress: string;
  actual_progress: string;
  curve_type: string;
  period_start: string; // yyyy-mm-dd
  period_end: string;   // yyyy-mm-dd
};

const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const toISO = (d: Date) => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};
const fromISO = (iso: string) => (iso ? new Date(iso + "T00:00:00") : undefined);

export function SCurveEditor({ projectId }: { projectId: string }) {
  const { data: scurveData = [], isLoading } = useSCurveData(projectId);
  const { data: project } = useProject(projectId);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [curveType, setCurveType] = useState("baseline");
  const [newCurveType, setNewCurveType] = useState("");

  useEffect(() => {
    const filtered = scurveData.filter(d => d.curve_type === curveType);
    if (filtered.length > 0) {
      setRows(filtered.map(d => ({
        period_label: d.period_label,
        period_order: d.period_order,
        planned_progress: String(d.planned_progress),
        actual_progress: d.actual_progress != null ? String(d.actual_progress) : "",
        curve_type: d.curve_type,
        period_start: d.period_start ?? "",
        period_end: d.period_end ?? "",
      })));
    } else if (curveType !== "baseline") {
      const baseline = scurveData.filter(d => d.curve_type === "baseline").sort((a, b) => a.period_order - b.period_order);
      setRows(baseline.map((d, i) => ({
        period_label: d.period_label,
        period_order: i,
        planned_progress: String(d.planned_progress),
        actual_progress: "",
        curve_type: curveType,
        period_start: d.period_start ?? "",
        period_end: d.period_end ?? "",
      })));
    } else {
      setRows([]);
    }
  }, [scurveData, curveType]);

  const curveTypes = [...new Set(scurveData.map(d => d.curve_type))];
  if (!curveTypes.includes("baseline")) curveTypes.unshift("baseline");

  const addRow = () => {
    const last = rows[rows.length - 1];
    let ps = "", pe = "";
    if (last?.period_end) {
      ps = addDays(last.period_end, 1);
      pe = addDays(ps, 6);
    }
    setRows(prev => [...prev, {
      period_label: `W${prev.length + 1}`,
      period_order: prev.length,
      planned_progress: "0",
      actual_progress: "",
      curve_type: curveType,
      period_start: ps,
      period_end: pe,
    }]);
  };
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<Row>) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const handleAddCurve = () => {
    if (!newCurveType.trim()) return;
    const name = newCurveType.trim();
    const baseline = scurveData.filter(d => d.curve_type === "baseline").sort((a, b) => a.period_order - b.period_order);
    setRows(baseline.map((d, i) => ({
      period_label: d.period_label,
      period_order: i,
      planned_progress: String(d.planned_progress),
      actual_progress: "",
      curve_type: name,
      period_start: d.period_start ?? "",
      period_end: d.period_end ?? "",
    })));
    setCurveType(name);
    setNewCurveType("");
  };


  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("s_curve_data").delete().eq("project_id", projectId).eq("curve_type", curveType);
      const inserts = rows.map((r, i) => ({
        project_id: projectId,
        period_label: r.period_label,
        period_order: i,
        planned_progress: parseFloat(r.planned_progress) || 0,
        actual_progress: r.actual_progress ? parseFloat(r.actual_progress) : null,
        curve_type: curveType,
        period_start: r.period_start || null,
        period_end: r.period_end || null,
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from("s_curve_data").insert(inserts);
        if (error) throw error;
      }
      await logActivity(supabase, "s_curve", "update", `S-Curve ${curveType} updated (${rows.length} periods)`, projectId);
      queryClient.invalidateQueries({ queryKey: ["s_curve_data"] });
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Berhasil", description: `S-Curve ${curveType} tersimpan` });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const inputCls = "w-full px-2 py-1.5 text-xs bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const missingDates = rows.some(r => !r.period_end || !r.period_start);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-lg shadow-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">📈 S-Curve Data Editor (Weekly)</h3>
        <p className="text-[10px] text-muted-foreground mb-3">
          Data S-Curve wajib <b>weekly</b>. Klik kolom <b>Periode</b> untuk pilih tanggal mulai lalu tanggal cut-off dalam satu kalender.
        </p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {curveTypes.map(ct => (
            <button key={ct} onClick={() => setCurveType(ct)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${curveType === ct ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border hover:bg-muted/80"}`}>
              {ct === "baseline" ? "Baseline" : ct}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input value={newCurveType} onChange={e => setNewCurveType(e.target.value)} className={inputCls + " w-24"} placeholder="KSO name" />
            <button onClick={handleAddCurve} className="px-2 py-1.5 bg-success text-success-foreground rounded text-[10px] font-medium">+ Add Curve</button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap p-2 bg-muted/40 rounded border border-border">
          <CalendarClock className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-medium text-muted-foreground">Auto-generate:</span>
          <button onClick={autoGenerateWeekly} className="px-2 py-1 bg-card border border-border rounded text-[10px] font-medium hover:bg-muted">Weekly (7 hari)</button>
          {missingDates && (
            <span className="text-[10px] text-warning ml-auto">⚠️ Ada periode tanpa tanggal.</span>
          )}
        </div>

        {isLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : (
          <>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-10">#</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground">Periode (Start → Cut-off)</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-28">Label</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-24">Planned %</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-24">Actual %</th>
                    <th className="text-left py-2 px-2 text-[10px] uppercase text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const range: DateRange | undefined = r.period_start || r.period_end
                      ? { from: fromISO(r.period_start), to: fromISO(r.period_end) }
                      : undefined;
                    const label = range?.from
                      ? `${format(range.from, "dd MMM yy")} → ${range.to ? format(range.to, "dd MMM yy") : "…"}`
                      : "Pilih tanggal";
                    return (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1 px-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-1 px-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-card border border-border rounded hover:bg-muted text-left",
                                  !range?.from && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="h-3 w-3 shrink-0" />
                                <span className="truncate">{label}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="range"
                                selected={range}
                                onSelect={(sel) => {
                                  updateRow(i, {
                                    period_start: sel?.from ? toISO(sel.from) : "",
                                    period_end: sel?.to ? toISO(sel.to) : (sel?.from ? toISO(sel.from) : ""),
                                  });
                                }}
                                numberOfMonths={2}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="py-1 px-2"><input value={r.period_label} onChange={e => updateRow(i, { period_label: e.target.value })} className={inputCls} placeholder="W1" /></td>
                        <td className="py-1 px-2"><input type="number" step="0.01" value={r.planned_progress} onChange={e => updateRow(i, { planned_progress: e.target.value })} className={inputCls} /></td>
                        <td className="py-1 px-2"><input type="number" step="0.01" value={r.actual_progress} onChange={e => updateRow(i, { actual_progress: e.target.value })} className={inputCls} placeholder="—" /></td>
                        <td className="py-1 px-2"><button onClick={() => removeRow(i)} className="p-1 hover:bg-destructive/10 rounded"><Trash2 className="h-3 w-3 text-destructive" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Plus className="h-3 w-3" /> Add Week</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Save className="h-3 w-3" /> {saving ? "Saving..." : "Save S-Curve"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

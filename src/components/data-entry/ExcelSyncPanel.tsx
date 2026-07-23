import { useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase, logActivity, DbProject } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

/**
 * Per-project Excel Import/Export.
 * One workbook per project with sheets: WBS_Areas, WBS_Items, S_Curve,
 * Finance, Procurement, Risks, Milestones, WeeklyReports, README.
 *
 * Sync rule per sheet: rows keyed by `id`.
 *   - id present + in DB -> UPDATE
 *   - id blank -> INSERT (new uuid)
 *   - id in DB but not in sheet -> DELETE
 */

type SheetName =
  | "WBS_Areas" | "WBS_Items" | "S_Curve" | "Finance"
  | "Procurement" | "Risks" | "Milestones" | "WeeklyReports";

const SHEETS: SheetName[] = [
  "WBS_Areas", "WBS_Items", "S_Curve", "Finance",
  "Procurement", "Risks", "Milestones", "WeeklyReports",
];

const README_ROWS = [
  ["Dashboard Control Tower — Project Data Workbook"],
  [""],
  ["Cara pakai:"],
  ["1. Export dulu untuk mendapatkan struktur dan data terbaru."],
  ["2. Edit di Excel. JANGAN ubah nama kolom, JANGAN hapus kolom 'id'."],
  ["3. Baris baru: kosongkan kolom 'id' — akan di-insert."],
  ["4. Baris dihapus dari sheet: akan ikut TERHAPUS dari database saat upload."],
  ["5. Simpan sebagai .xlsx dan upload lewat tombol 'Import Excel'."],
  [""],
  ["Sheet:"],
  ["- WBS_Areas: area kerja. Kolom 'code' dipakai sebagai referensi di WBS_Items."],
  ["- WBS_Items: work item; kolom area_code harus cocok dengan WBS_Areas."],
  ["- S_Curve: kurva progres per periode (baseline / kso dll di kolom curve_type)."],
  ["- Finance: cash in/out plan & actual (kind: plan|actual, direction: in|out)."],
  ["- Procurement: item pengadaan dengan tanggal RFQ..Install."],
  ["- Risks: risk register (project_alerts)."],
  ["- Milestones: milestones proyek."],
  ["- WeeklyReports: weekly progress report; kolom JSON berisi array (achievements dll)."],
  [""],
  ["Format tanggal: YYYY-MM-DD. Format angka: gunakan angka (bukan teks)."],
];

// ---------- helpers ----------
const asDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const asNum = (v: any, def = 0): number => {
  if (v === "" || v == null) return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
};
const asStr = (v: any, def = ""): string => (v == null ? def : String(v));
const asJson = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(String(v)); return Array.isArray(p) ? p : []; } catch { return []; }
};
const cleanId = (v: any): string | null => {
  const s = asStr(v).trim();
  return s && s.length >= 32 ? s : null;
};

export function ExcelSyncPanel({ project }: { project: DbProject }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const projectId = project.id;

  const addLog = (m: string) => setLog(l => [...l, m]);

  // ------------- EXPORT -------------
  const handleExport = async () => {
    setBusy("export"); setLog([]);
    try {
      const [areas, items, scurve, finance, proc, risks, miles, weekly] = await Promise.all([
        supabase.from("work_areas").select("*").eq("project_id", projectId).order("sort_order"),
        supabase.from("work_items").select("*, work_areas!inner(code, project_id)").eq("work_areas.project_id", projectId),
        supabase.from("s_curve_data").select("*").eq("project_id", projectId).order("period_order"),
        supabase.from("finance_entries").select("*").eq("project_id", projectId).order("period_date"),
        supabase.from("procurement_items").select("*").eq("project_id", projectId),
        supabase.from("project_alerts").select("*").eq("project_id", projectId),
        supabase.from("milestones").select("*").eq("project_id", projectId).order("sort_order"),
        supabase.from("weekly_progress_reports").select("*").eq("project_id", projectId).order("week_start_date", { ascending: false }),
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(README_ROWS), "README");

      // WBS_Areas
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((areas.data || []).map((a: any) => ({
        id: a.id, code: a.code, name: a.name, epcc_category: a.epcc_category,
        weight: a.weight, progress: a.progress, sort_order: a.sort_order,
      }))), "WBS_Areas");

      // WBS_Items (with area_code cross-ref)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((items.data || []).map((it: any) => ({
        id: it.id, area_code: it.work_areas?.code || "", code: it.code, name: it.name,
        epcc_category: it.epcc_category, unit: it.unit, qty_total: it.qty_total,
        qty_completed: it.qty_completed, weight: it.weight, progress: it.progress,
        status: it.status, start_date: it.start_date, end_date: it.end_date, sort_order: it.sort_order,
      }))), "WBS_Items");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((scurve.data || []).map((s: any) => ({
        id: s.id, curve_type: s.curve_type, period_order: s.period_order, period_label: s.period_label,
        planned_progress: s.planned_progress, actual_progress: s.actual_progress,
      }))), "S_Curve");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((finance.data || []).map((f: any) => ({
        id: f.id, direction: f.direction, entry_kind: f.entry_kind, category: f.category,
        frequency: f.frequency, period_date: f.period_date, period_label: f.period_label,
        amount: f.amount, description: f.description, related_activity: f.related_activity,
      }))), "Finance");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((proc.data || []).map((p: any) => ({
        id: p.id, item_name: p.item_name, description: p.description, vendor: p.vendor,
        qty: p.qty, unit: p.unit, amount: p.amount, status: p.status,
        rfq_date: p.rfq_date, approval_date: p.approval_date, po_date: p.po_date,
        fabrication_date: p.fabrication_date, delivery_date: p.delivery_date, install_date: p.install_date,
      }))), "Procurement");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((risks.data || []).map((r: any) => ({
        id: r.id, title: r.title, description: r.description, category: r.category,
        severity: r.severity, probability: r.probability, impact: r.impact, priority: r.priority,
        current_status: r.current_status, completion_percentage: r.completion_percentage,
        pic: r.pic, risk_owner: r.risk_owner, mitigation_plan: r.mitigation_plan,
        due_date: r.due_date, is_resolved: r.is_resolved,
      }))), "Risks");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((miles.data || []).map((m: any) => ({
        id: m.id, name: m.name, phase: m.phase, target_date: m.target_date, actual_date: m.actual_date,
        status: m.status, weight: m.weight, sort_order: m.sort_order,
      }))), "Milestones");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((weekly.data || []).map((w: any) => ({
        id: w.id, week_start_date: w.week_start_date, week_end_date: w.week_end_date,
        summary: w.summary,
        achievements_json: JSON.stringify(w.achievements || []),
        outstanding_json: JSON.stringify(w.outstanding_items || []),
        targets_json: JSON.stringify(w.next_week_targets || []),
        escalations_json: JSON.stringify(w.escalations || []),
      }))), "WeeklyReports");

      const fname = `${project.project_code}_${project.name.replace(/[^\w]+/g, "_")}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast({ title: "✅ Export berhasil", description: fname });
      await logActivity(supabase, "excel_sync", "export", `Exported project data to ${fname}`, projectId);
    } catch (e: any) {
      toast({ title: "❌ Export gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  // ------------- IMPORT -------------
  const handleImport = async (file: File) => {
    setBusy("import"); setLog([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const readSheet = (name: SheetName): any[] => {
        const ws = wb.Sheets[name];
        if (!ws) return [];
        return XLSX.utils.sheet_to_json(ws, { defval: "" });
      };

      // Preload existing IDs for delete-detection
      const [aRes, iRes, sRes, fRes, pRes, rRes, mRes, wRes, areasForLink] = await Promise.all([
        supabase.from("work_areas").select("id").eq("project_id", projectId),
        supabase.from("work_items").select("id, work_areas!inner(project_id)").eq("work_areas.project_id", projectId),
        supabase.from("s_curve_data").select("id").eq("project_id", projectId),
        supabase.from("finance_entries").select("id").eq("project_id", projectId),
        supabase.from("procurement_items").select("id").eq("project_id", projectId),
        supabase.from("project_alerts").select("id").eq("project_id", projectId),
        supabase.from("milestones").select("id").eq("project_id", projectId),
        supabase.from("weekly_progress_reports").select("id").eq("project_id", projectId),
        supabase.from("work_areas").select("id, code").eq("project_id", projectId),
      ]);

      // ---- WBS_Areas ----
      const areasRows = readSheet("WBS_Areas");
      const areaIdsSheet = new Set<string>();
      const areaInserts: any[] = [];
      const areaUpdates: any[] = [];
      for (const r of areasRows) {
        const id = cleanId(r.id);
        const payload = {
          project_id: projectId,
          code: asStr(r.code), name: asStr(r.name),
          epcc_category: asStr(r.epcc_category, "construction"),
          weight: asNum(r.weight), progress: asNum(r.progress),
          sort_order: asNum(r.sort_order),
        };
        if (id) { areaIdsSheet.add(id); areaUpdates.push({ id, ...payload }); }
        else areaInserts.push(payload);
      }
      const areaIdsToDelete = (aRes.data || []).map((x: any) => x.id).filter(id => !areaIdsSheet.has(id));
      // Apply in order: updates, inserts (get new ids), then map by code
      for (const u of areaUpdates) { const { error } = await supabase.from("work_areas").update(u).eq("id", u.id); if (error) throw new Error(`WBS_Areas update: ${error.message}`); }
      if (areaInserts.length) { const { error } = await supabase.from("work_areas").insert(areaInserts); if (error) throw new Error(`WBS_Areas insert: ${error.message}`); }
      addLog(`WBS_Areas: +${areaInserts.length} ~${areaUpdates.length} -${areaIdsToDelete.length}`);

      // Rebuild code->id map after upsert
      const { data: freshAreas } = await supabase.from("work_areas").select("id, code").eq("project_id", projectId);
      const codeToAreaId = new Map<string, string>((freshAreas || []).map((a: any) => [a.code, a.id]));

      // ---- WBS_Items (depends on areas) ----
      const itemsRows = readSheet("WBS_Items");
      const itemIdsSheet = new Set<string>();
      const itemInserts: any[] = [];
      const itemUpdates: any[] = [];
      for (const r of itemsRows) {
        const id = cleanId(r.id);
        const areaCode = asStr(r.area_code);
        const areaId = codeToAreaId.get(areaCode);
        if (!areaId) { addLog(`⚠ WBS_Items row skipped: area_code '${areaCode}' tidak ditemukan`); continue; }
        const payload = {
          work_area_id: areaId, code: asStr(r.code), name: asStr(r.name),
          epcc_category: asStr(r.epcc_category, "construction"),
          unit: asStr(r.unit, "unit"),
          qty_total: asNum(r.qty_total), qty_completed: asNum(r.qty_completed),
          weight: asNum(r.weight), progress: asNum(r.progress),
          status: asStr(r.status, "in-progress"),
          start_date: asDate(r.start_date), end_date: asDate(r.end_date),
          sort_order: asNum(r.sort_order),
        };
        if (id) { itemIdsSheet.add(id); itemUpdates.push({ id, ...payload }); }
        else itemInserts.push(payload);
      }
      const itemIdsToDelete = (iRes.data || []).map((x: any) => x.id).filter(id => !itemIdsSheet.has(id));
      for (const u of itemUpdates) { const { error } = await supabase.from("work_items").update(u).eq("id", u.id); if (error) throw new Error(`WBS_Items update: ${error.message}`); }
      if (itemInserts.length) { const { error } = await supabase.from("work_items").insert(itemInserts); if (error) throw new Error(`WBS_Items insert: ${error.message}`); }
      if (itemIdsToDelete.length) { await supabase.from("work_items").delete().in("id", itemIdsToDelete); }
      // areas delete AFTER items to avoid cascade surprise (cascade would drop items anyway)
      if (areaIdsToDelete.length) { await supabase.from("work_areas").delete().in("id", areaIdsToDelete); }
      addLog(`WBS_Items: +${itemInserts.length} ~${itemUpdates.length} -${itemIdsToDelete.length}`);

      // ---- Generic sync helper for simple tables ----
      const syncSimple = async (
        table: string, sheet: SheetName, existing: any[],
        mapRow: (r: any) => any,
      ) => {
        const rows = readSheet(sheet);
        const idsSheet = new Set<string>();
        const inserts: any[] = []; const updates: any[] = [];
        for (const r of rows) {
          const id = cleanId(r.id);
          const payload = mapRow(r);
          if (id) { idsSheet.add(id); updates.push({ id, ...payload }); }
          else inserts.push({ project_id: projectId, ...payload });
        }
        const toDelete = existing.map((x: any) => x.id).filter(id => !idsSheet.has(id));
        for (const u of updates) { const { error } = await supabase.from(table as any).update(u).eq("id", u.id); if (error) throw new Error(`${sheet} update: ${error.message}`); }
        if (inserts.length) { const { error } = await supabase.from(table as any).insert(inserts); if (error) throw new Error(`${sheet} insert: ${error.message}`); }
        if (toDelete.length) { await supabase.from(table as any).delete().in("id", toDelete); }
        addLog(`${sheet}: +${inserts.length} ~${updates.length} -${toDelete.length}`);
      };

      await syncSimple("s_curve_data", "S_Curve", sRes.data || [], (r) => ({
        curve_type: asStr(r.curve_type, "baseline"),
        period_order: asNum(r.period_order),
        period_label: asStr(r.period_label),
        planned_progress: asNum(r.planned_progress),
        actual_progress: r.actual_progress === "" || r.actual_progress == null ? null : asNum(r.actual_progress),
      }));

      await syncSimple("finance_entries", "Finance", fRes.data || [], (r) => ({
        direction: asStr(r.direction, "out"),
        entry_kind: asStr(r.entry_kind, "plan"),
        category: r.category ? asStr(r.category) : null,
        frequency: asStr(r.frequency, "monthly"),
        period_date: asDate(r.period_date),
        period_label: asStr(r.period_label),
        amount: asNum(r.amount),
        description: asStr(r.description),
        related_activity: asStr(r.related_activity),
      }));

      await syncSimple("procurement_items", "Procurement", pRes.data || [], (r) => ({
        item_name: asStr(r.item_name), description: asStr(r.description), vendor: asStr(r.vendor),
        qty: asNum(r.qty, 1), unit: asStr(r.unit, "unit"), amount: asNum(r.amount),
        status: asStr(r.status, "planned"),
        rfq_date: asDate(r.rfq_date), approval_date: asDate(r.approval_date), po_date: asDate(r.po_date),
        fabrication_date: asDate(r.fabrication_date), delivery_date: asDate(r.delivery_date), install_date: asDate(r.install_date),
      }));

      await syncSimple("project_alerts", "Risks", rRes.data || [], (r) => ({
        title: asStr(r.title), description: asStr(r.description),
        category: asStr(r.category, "operational"), severity: asStr(r.severity, "medium"),
        probability: asStr(r.probability, "medium"), impact: asStr(r.impact, "medium"),
        priority: asStr(r.priority, "medium"),
        current_status: asStr(r.current_status, "open"),
        completion_percentage: asNum(r.completion_percentage),
        pic: asStr(r.pic), risk_owner: asStr(r.risk_owner), mitigation_plan: asStr(r.mitigation_plan),
        due_date: asDate(r.due_date),
        is_resolved: String(r.is_resolved).toLowerCase() === "true" || r.is_resolved === true,
      }));

      await syncSimple("milestones", "Milestones", mRes.data || [], (r) => ({
        name: asStr(r.name), phase: asStr(r.phase, "Construction"),
        target_date: asDate(r.target_date) || new Date().toISOString().slice(0, 10),
        actual_date: asDate(r.actual_date),
        status: asStr(r.status, "pending"), weight: asNum(r.weight), sort_order: asNum(r.sort_order),
      }));

      await syncSimple("weekly_progress_reports", "WeeklyReports", wRes.data || [], (r) => ({
        week_start_date: asDate(r.week_start_date) || new Date().toISOString().slice(0, 10),
        week_end_date: asDate(r.week_end_date) || new Date().toISOString().slice(0, 10),
        summary: asStr(r.summary),
        achievements: asJson(r.achievements_json),
        outstanding_items: asJson(r.outstanding_json),
        next_week_targets: asJson(r.targets_json),
        escalations: asJson(r.escalations_json),
      }));

      await logActivity(supabase, "excel_sync", "import", `Imported project data from ${file.name}`, projectId);
      queryClient.invalidateQueries();
      toast({ title: "✅ Import berhasil", description: "Data proyek telah tersinkronisasi." });
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
      toast({ title: "❌ Import gagal", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-lg shadow-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Excel Import / Export
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Satu file Excel per proyek berisi seluruh data (WBS, S-Curve, Finance, Procurement, Risk, Milestones, Weekly Report).
          Edit offline lalu upload — perubahan (tambah/edit/hapus) akan tersinkron via kolom <code className="px-1 bg-muted rounded">id</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export ke Excel
          </button>

          <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border cursor-pointer transition-colors
            ${busy !== null ? "opacity-50 pointer-events-none bg-muted" : "bg-success text-success-foreground border-success hover:bg-success/90"}`}>
            {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import dari Excel
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
          </label>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex gap-2 text-[11px] text-foreground">
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <strong>Penting:</strong> Jangan mengubah nama kolom atau menghapus kolom <code>id</code>.
            Baris baru → kosongkan <code>id</code>. Baris yang dihapus dari sheet akan <strong>ikut terhapus</strong> dari database saat upload.
            Selalu <em>Export</em> dulu untuk mendapatkan template terkini.
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
          {SHEETS.map(s => (
            <div key={s} className="px-2 py-1.5 bg-muted rounded border border-border text-center text-muted-foreground">{s}</div>
          ))}
        </div>
      </div>

      {log.length > 0 && (
        <div className="glass-card rounded-lg shadow-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" /> Sync log
          </p>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
{log.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

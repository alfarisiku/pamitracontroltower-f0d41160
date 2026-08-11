import { useEffect, useState } from "react";
import { supabase, DbWeeklyReport } from "@/lib/supabase";
import { FileText, Calendar, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Target, Zap } from "lucide-react";

export function WeeklyReportView({ projectId, achievementsOnly = false }: { projectId: string; achievementsOnly?: boolean }) {
  const [reports, setReports] = useState<DbWeeklyReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (supabase as any).from("weekly_progress_reports").select("*").eq("project_id", projectId).order("week_start_date", { ascending: false })
      .then(({ data }: any) => {
        setReports((data || []) as DbWeeklyReport[]);
        if (data && data[0]) setOpenId(data[0].id);
      });
  }, [projectId]);

  if (reports.length === 0) {
    return (
      <div className="glass-card rounded-lg shadow-card p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Belum ada Weekly Progress Report untuk proyek ini.</p>
        <p className="text-[10px] text-muted-foreground mt-1">Buat di Data Entry → Weekly Report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map(r => {
        const isOpen = openId === r.id;
        return (
          <div key={r.id} className="glass-card rounded-lg shadow-card overflow-hidden">
            <button onClick={() => setOpenId(isOpen ? null : r.id)} className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {new Date(r.week_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} → {new Date(r.week_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-success">{r.achievements.length} ✓</span>
                {!achievementsOnly && <>
                  <span className="text-warning">{r.outstanding_items.length} ⚠</span>
                  <span className="text-primary">{r.next_week_targets.length} →</span>
                  <span className="text-destructive">{r.escalations.length} !</span>
                </>}
              </div>

            </button>
            {isOpen && (
              <div className="p-4 border-t border-border space-y-4 text-xs bg-muted/10">
                {r.summary && !achievementsOnly && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-[10px] uppercase font-semibold text-primary mb-1">Executive Summary</p>
                    <p className="text-foreground whitespace-pre-wrap">{r.summary}</p>
                  </div>
                )}
                <div className={achievementsOnly ? "" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
                  <Section title="Achievements This Week" color="success" icon={CheckCircle2} items={r.achievements.map(a => `[${a.category.toUpperCase()}] ${a.description}`)} />
                  {!achievementsOnly && <>
                    <Section title="Outstanding Items" color="warning" icon={AlertCircle} items={r.outstanding_items.map(o => `${o.item}${o.note ? ` — ${o.note}` : ''}`)} />
                    <Section title="Next Week Targets" color="primary" icon={Target} items={r.next_week_targets.map(t => `${t.target}${t.owner ? ` (${t.owner})` : ''}`)} />
                    <Section title="Management Escalations" color="destructive" icon={Zap} items={r.escalations.map(es => `${es.issue}${es.decision_needed ? ` → ${es.decision_needed}` : ''}`)} />
                  </>}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, color, icon: Icon, items }: { title: string; color: string; icon: any; items: string[] }) {
  return (
    <div className={`rounded-lg border p-3 border-${color}/30 bg-${color}/5`}>
      <p className={`text-[10px] uppercase font-semibold text-${color} mb-1.5 flex items-center gap-1`}><Icon className="h-3 w-3" /> {title} ({items.length})</p>
      {items.length === 0 ? <p className="text-[10px] text-muted-foreground italic">Tidak ada.</p> : (
        <ul className="list-disc list-inside space-y-1 text-foreground">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

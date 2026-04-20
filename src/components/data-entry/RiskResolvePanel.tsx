import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase, logActivity } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export function RiskResolvePanel({ projectId }: { projectId: string }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase.from("project_alerts").select("*").eq("project_id", projectId).eq("is_resolved", false).order("severity").then(({ data }) => {
      setAlerts(data || []);
      setLoading(false);
    });
  }, [projectId]);

  const handleResolve = async (id: string, title: string) => {
    setResolving(id);
    try {
      const { error } = await supabase.from("project_alerts").update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      setAlerts(prev => prev.filter(a => a.id !== id));
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["all_alerts"] });
      await logActivity(supabase, "risk", "resolve", `Risk resolved: ${title}`, projectId, id);
      queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
      toast({ title: "✅ Resolved", description: "Risk berhasil ditutup" });
    } catch (e: any) {
      toast({ title: "❌ Error", description: e.message, variant: "destructive" });
    } finally { setResolving(null); }
  };

  if (loading) return <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2"><p className="text-xs text-muted-foreground">Loading risks...</p></div>;
  if (alerts.length === 0) return <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2"><p className="text-xs text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Tidak ada risiko aktif untuk proyek ini.</p></div>;

  const sevColor: Record<string, string> = { critical: "text-destructive", high: "text-warning", medium: "text-info", low: "text-muted-foreground" };

  return (
    <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Close / Resolve Risk ({alerts.length} active)</h3>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {alerts.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase ${sevColor[a.severity] || ""}`}>{a.severity}</span>
                <span className="text-xs font-medium text-foreground truncate">{a.title}</span>
                {a.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.category}</span>}
              </div>
              {a.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.description}</p>}
              <div className="flex items-center gap-3 mt-0.5 text-[9px] text-muted-foreground">
                {a.risk_owner && <span>Owner: {a.risk_owner}</span>}
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Created: {new Date(a.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
            <button onClick={() => handleResolve(a.id, a.title)} disabled={resolving === a.id}
              className="flex-shrink-0 flex items-center gap-1 text-[10px] px-3 py-1.5 bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50 font-medium">
              <CheckCircle2 className="h-3 w-3" /> {resolving === a.id ? "..." : "Resolve"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

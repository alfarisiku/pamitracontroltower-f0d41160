import { useState } from "react";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { X, MapPin, Calendar, User, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ProjectStatus = DbProject["status"];

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/15 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/15 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/15 text-primary border-primary/30" },
};

export function ProjectOverviewModal({ project, onClose }: { project: DbProject; onClose: () => void }) {
  const [showVideo, setShowVideo] = useState(false);
  const st = statusConfig[project.status];
  const budgetPct = Math.round((project.spent / project.budget) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="relative h-48 overflow-hidden rounded-t-xl" style={{ background: "linear-gradient(135deg, hsl(220, 35%, 18%) 0%, hsl(210, 40%, 12%) 100%)" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors z-10"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs font-mono-data text-primary">{project.project_code}</p>
            <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${st.className}`}>
              {st.label}
            </span>
            <span className="text-xs text-muted-foreground">Fase: <strong className="text-foreground">{project.phase}</strong></span>
            {project.category && (
              <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">{project.category}</span>
            )}
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> Lokasi</div>
              <p className="text-xs font-medium text-foreground">{project.location}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><User className="h-3 w-3" /> PM</div>
              <p className="text-xs font-medium text-foreground">{project.manager}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Calendar className="h-3 w-3" /> Mulai</div>
              <p className="text-xs font-medium text-foreground">{new Date(project.start_date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Calendar className="h-3 w-3" /> Target</div>
              <p className="text-xs font-medium text-foreground">{new Date(project.end_date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Progress Keseluruhan</span>
              <span className="text-xs font-mono-data text-primary">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>

          {/* Budget */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Anggaran Proyek</span>
              <span className={`text-xs font-mono-data ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>
                {budgetPct}% terpakai
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Terpakai: <strong className="text-foreground font-mono-data">{formatRupiah(project.spent)}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-accent font-mono-data">{formatRupiah(project.budget)}</strong></span>
            </div>
            <Progress value={budgetPct} className="h-1.5 mt-2" />
          </div>

          {/* Video */}
          {project.video_url && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">Video Overview</h3>
              {!showVideo ? (
                <button
                  onClick={() => setShowVideo(true)}
                  className="relative w-full h-36 rounded-lg overflow-hidden group border border-border"
                  style={{ background: "linear-gradient(135deg, hsl(220, 35%, 18%) 0%, hsl(210, 40%, 12%) 100%)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20 group-hover:bg-background/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary">
                      <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe src={project.video_url} title={`Video ${project.name}`} className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

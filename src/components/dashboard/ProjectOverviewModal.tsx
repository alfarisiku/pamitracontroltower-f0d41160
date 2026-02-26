import { useState } from "react";
import { Project, ProjectStatus, formatRupiah } from "@/data/projectData";
import { X, MapPin, Calendar, User, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/10 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/10 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/10 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/10 text-primary border-primary/30" },
};

export function ProjectOverviewModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [showVideo, setShowVideo] = useState(false);
  const st = statusConfig[project.status];
  const budgetPct = Math.round((project.spent / project.budget) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header image */}
        <div className="relative h-56 overflow-hidden rounded-t-xl">
          <img src={project.image} alt={project.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-sm font-mono-data text-primary-foreground/80">{project.id}</p>
            <h2 className="text-2xl font-bold text-primary-foreground">{project.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Status & Phase */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${st.className}`}>
              {st.label}
            </span>
            <span className="text-sm text-muted-foreground">Fase: <strong className="text-foreground">{project.phase}</strong></span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Lokasi</div>
              <p className="text-sm font-medium text-foreground">{project.location}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" /> Project Manager</div>
              <p className="text-sm font-medium text-foreground">{project.manager}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Mulai</div>
              <p className="text-sm font-medium text-foreground">{new Date(project.startDate).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> Target Selesai</div>
              <p className="text-sm font-medium text-foreground">{new Date(project.endDate).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Progress Keseluruhan</span>
              <span className="text-sm font-mono-data text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2.5" />
          </div>

          {/* Budget */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Anggaran Proyek</span>
              <span className={`text-sm font-mono-data ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>
                {budgetPct}% terpakai
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Terpakai: <strong className="text-foreground font-mono-data">{formatRupiah(project.spent)}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-foreground font-mono-data">{formatRupiah(project.budget)}</strong></span>
            </div>
            <Progress value={budgetPct} className="h-1.5 mt-2" />
          </div>

          {/* Photo Gallery */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Dokumentasi Proyek</h3>
            <div className="grid grid-cols-3 gap-2">
              <img src={project.image} alt="Foto proyek 1" className="w-full h-24 object-cover rounded-lg border border-border" />
              <img src={project.image} alt="Foto proyek 2" className="w-full h-24 object-cover rounded-lg border border-border brightness-95 saturate-110" />
              <img src={project.image} alt="Foto proyek 3" className="w-full h-24 object-cover rounded-lg border border-border brightness-105 contrast-110" />
            </div>
          </div>

          {/* Video */}
          {project.videoUrl && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Video Overview</h3>
              {!showVideo ? (
                <button
                  onClick={() => setShowVideo(true)}
                  className="relative w-full h-44 bg-muted rounded-lg overflow-hidden group border border-border"
                >
                  <img src={project.image} alt="Video thumbnail" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 group-hover:bg-foreground/20 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="h-6 w-6 text-primary-foreground ml-1" />
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe
                    src={project.videoUrl}
                    title={`Video ${project.name}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

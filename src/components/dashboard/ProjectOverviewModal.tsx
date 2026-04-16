import { useState, useEffect } from "react";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { X, MapPin, Calendar, User, Play, Camera, Video, Cctv, DollarSign, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ProjectStatus = DbProject["status"];

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/15 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/15 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/15 text-primary border-primary/30" },
};

type MediaTab = "weekly" | "video" | "cctv";

export function ProjectOverviewModal({ project, onClose }: { project: DbProject; onClose: () => void }) {
  const [activeMedia, setActiveMedia] = useState<MediaTab>("weekly");
  const [weeklyPhotos, setWeeklyPhotos] = useState<any[]>([]);
  const st = statusConfig[project.status];
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const contractValue = project.contract_value || project.budget;
  const margin = contractValue > 0 && project.rap > 0 ? Math.round(((contractValue - project.rap) / contractValue) * 100) : 0;

  useEffect(() => {
    supabase.from("project_photos").select("*").eq("project_id", project.id)
      .order("uploaded_at", { ascending: false }).limit(6)
      .then(({ data }) => setWeeklyPhotos(data || []));
  }, [project.id]);

  const mediaTabs: { key: MediaTab; label: string; icon: typeof Camera; available: boolean }[] = [
    { key: "weekly", label: "Weekly Photos", icon: Camera, available: true },
    { key: "video", label: "Video", icon: Video, available: !!project.video_url },
    { key: "cctv", label: "CCTV Live", icon: Cctv, available: !!project.cctv_url },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header with cover */}
        <div className="relative h-40 overflow-hidden rounded-t-xl">
          {project.image_url ? (
            <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-card/80 backdrop-blur rounded-full hover:bg-card transition-colors z-10">
            <X className="h-4 w-4 text-foreground" />
          </button>
          <div className="absolute top-3 left-3 z-10">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium bg-card/90 backdrop-blur shadow-sm ${st.className}`}>{st.label}</span>
          </div>
          <div className="absolute bottom-4 left-5 right-5">
            <p className="text-xs font-mono-data text-primary">{project.project_code}</p>
            <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Fase: <strong className="text-foreground">{project.phase}</strong></span>
            {project.category && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent-foreground border border-accent/20">{project.category}</span>}
          </div>

          {project.description && <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>}

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

          {/* Enterprise Data: TKDN, Margin, Budget */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Contract Value</p>
              <p className="text-xs font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
            </div>
            <div className="bg-warning/5 rounded-lg p-2.5 border border-warning/20 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">RAP</p>
              <p className="text-xs font-bold font-mono-data text-warning">{formatRupiah(project.rap)}</p>
            </div>
            <div className="rounded-lg p-2.5 border border-border text-center">
              <p className="text-[9px] text-muted-foreground uppercase">🇮🇩 TKDN</p>
              <p className="text-xs font-bold font-mono-data text-foreground">{project.tkdn_percentage}%</p>
            </div>
            <div className={`rounded-lg p-2.5 border text-center ${margin >= 10 ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
              <p className="text-[9px] text-muted-foreground uppercase">Margin</p>
              <p className={`text-xs font-bold font-mono-data ${margin >= 10 ? "text-success" : "text-warning"}`}>{margin}%</p>
            </div>
          </div>

          {/* Budget Bar */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Anggaran Proyek</span>
              <span className={`text-xs font-mono-data ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>{budgetPct}% terpakai</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Terpakai: <strong className="text-foreground font-mono-data">{formatRupiah(project.spent)}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-accent font-mono-data">{formatRupiah(project.budget)}</strong></span>
            </div>
            <Progress value={budgetPct} className="h-1.5 mt-2" />
          </div>

          {/* Media Tabs - Weekly Photos first */}
          <div>
            <div className="flex items-center gap-1 mb-3 border-b border-border pb-2">
              {mediaTabs.filter(t => t.available).map((tab) => (
                <button key={tab.key} onClick={() => setActiveMedia(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeMedia === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  <tab.icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              ))}
            </div>

            {activeMedia === "weekly" && (
              <div>
                {weeklyPhotos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Belum ada foto weekly untuk proyek ini.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {weeklyPhotos.map(p => (
                      <div key={p.id} className="rounded-lg overflow-hidden border border-border">
                        <img src={p.photo_url} alt={p.caption || "Weekly photo"} className="w-full h-28 object-cover" />
                        <div className="p-1.5">
                          {p.week_label && <p className="text-[9px] text-primary font-medium">{p.week_label}</p>}
                          {p.caption && <p className="text-[9px] text-muted-foreground truncate">{p.caption}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMedia === "video" && project.video_url && (
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                <iframe src={project.video_url} title={`Video ${project.name}`} className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            )}

            {activeMedia === "cctv" && project.cctv_url && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                  </span>
                  <span className="text-xs font-medium text-destructive">LIVE</span>
                </div>
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe src={project.cctv_url} title={`CCTV ${project.name}`} className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

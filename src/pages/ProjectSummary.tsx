import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { DbProject, formatRupiah } REPLACE_MEfrom "@/lib/supabase";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Filter, MapPin, User, Calendar, ChevronDown, Camera, Video, Cctv, ExternalLink } from "lucide-react";

type ProjectStatus = string;
type ProjectPhase = string;

const statusConfig: Record<string, { label: string; className: string }> = {
  "planning":  { label: "Planning",  className: "bg-info/15 text-info border-info/30" },
  "execution": { label: "Execution", className: "bg-success/15 text-success border-success/30" },
  "on-hold":   { label: "On Hold",   className: "bg-warning/15 text-warning border-warning/30" },
  "completed": { label: "Completed", className: "bg-primary/15 text-primary border-primary/30" },
  "closed":    { label: "Closed",    className: "bg-muted text-muted-foreground border-border" },
  "on-track":  { label: "On Track",  className: "bg-success/15 text-success border-success/30" },
  "at-risk":   { label: "At Risk",   className: "bg-warning/15 text-warning border-warning/30" },
  "delayed":   { label: "Delayed",   className: "bg-destructive/15 text-destructive border-destructive/30" },
};
const FALLBACK_STATUS = { label: "—", className: "bg-muted text-muted-foreground border-border" };

const ProjectSummary = () => {
  const navigate = useNavigate();
  const { data: allProjects = [], isLoading } = useProjects();
  const { role, assignedProjectIds, isTeam, isClient, isAdmin } = useAuth();
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [phaseFilter, setPhaseFilter] = useState<ProjectPhase | "all">("all");

  // Access-level restriction removed — every visitor is treated as admin, so show all projects.
  const projects = isAdmin
    ? allProjects
    : (isTeam ? allProjects.filter(p => assignedProjectIds.includes(p.id)) : allProjects);

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (phaseFilter !== "all" && p.phase !== phaseFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.project_code.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statuses: string[] = ["planning","execution","on-hold","completed","closed"];
  const phases: string[] = ["Production I","Production II","Production III","Production IV"];

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Project Summary</h2>
            <p className="text-xs text-muted-foreground">{projects.length} proyek EPC terdaftar · Klik proyek untuk detail lengkap</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari proyek, kode, atau lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Semua Status</option>
                {statuses.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Semua Production</option>
                {phases.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} proyek ditampilkan</span>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const st = statusConfig[project.status] || FALLBACK_STATUS;
              const budgetPct = Math.round((project.spent / project.budget) * 100);
              return (
                <div
                  key={project.id}
                  className="glass-card rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Card Header with Image */}
                  <div className="h-32 relative overflow-hidden">
                    {project.image_url ? (
                      <img src={project.image_url} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {project.video_url && <div className="p-1 rounded bg-card/80 backdrop-blur-sm"><Video className="h-3 w-3 text-primary" /></div>}
                      {project.cctv_url && <div className="p-1 rounded bg-card/80 backdrop-blur-sm"><Cctv className="h-3 w-3 text-destructive" /></div>}
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}`); }}
                      className="absolute top-3 left-3 p-1 rounded bg-card/80 backdrop-blur-sm hover:bg-primary/20 transition-colors"
                      title="Detail WBS"
                    >
                      <ExternalLink className="h-3 w-3 text-primary" />
                    </button>
                    <div className="absolute bottom-3 left-4 right-4">
                      <p className="text-[10px] font-mono-data text-primary">{project.project_code}</p>
                      <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{project.name}</h3>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{project.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{project.manager}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(project.end_date).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Filter className="h-3 w-3" />
                        <span>{project.phase}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono-data text-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>

                    {/* Budget — hidden for Public role */}
                    {!isClient && (
                      <div className="flex justify-between text-xs pt-2 border-t border-border">
                        <div>
                          <p className="text-muted-foreground">Nilai Kontrak</p>
                          <p className="font-mono-data font-medium text-accent">{formatRupiah(project.budget)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Terpakai</p>
                          <p className={`font-mono-data font-medium ${budgetPct > 85 ? "text-destructive" : "text-foreground"}`}>{budgetPct}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">Tidak ada proyek yang cocok dengan filter.</p>
            </div>
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default ProjectSummary;

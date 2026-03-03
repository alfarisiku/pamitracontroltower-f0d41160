import { useState } from "react";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";

type ProjectStatus = DbProject["status"];

const statusColors: Record<ProjectStatus, string> = {
  "on-track": "bg-success",
  "at-risk": "bg-warning",
  "delayed": "bg-destructive",
  "completed": "bg-primary",
};

const statusLabels: Record<ProjectStatus, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "delayed": "Delayed",
  "completed": "Selesai",
};

export function IndonesiaMap({ projects, onSelectProject }: { projects: DbProject[]; onSelectProject: (p: DbProject) => void }) {
  const [hoveredProject, setHoveredProject] = useState<DbProject | null>(null);

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Project Portfolio</h2>
          <p className="text-xs text-muted-foreground">{projects.length} proyek EPC tersebar di Indonesia</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {(["on-track", "at-risk", "delayed", "completed"] as ProjectStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${statusColors[s]}`} />
              <span className="text-muted-foreground">{statusLabels[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-[2.2/1] rounded-lg overflow-hidden border border-border" style={{ background: "linear-gradient(180deg, hsl(220, 35%, 12%) 0%, hsl(220, 40%, 8%) 100%)" }}>
        <svg viewBox="0 0 1000 450" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="1000" height="450" fill="none" />
          {/* Sumatra */}
          <path d="M80,120 L120,100 L160,110 L200,130 L230,160 L260,200 L280,240 L290,280 L270,300 L240,290 L210,260 L180,230 L150,200 L120,170 L90,150 Z"
            fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="1" />
          {/* Java */}
          <path d="M280,300 L320,290 L360,285 L400,288 L440,290 L480,295 L500,300 L490,310 L450,308 L410,305 L370,300 L330,300 L290,308 Z"
            fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="1" />
          {/* Kalimantan */}
          <path d="M350,120 L400,100 L450,95 L500,100 L530,120 L540,160 L530,200 L510,230 L480,250 L450,260 L420,250 L390,230 L370,200 L360,160 Z"
            fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="1" />
          {/* Sulawesi */}
          <path d="M560,120 L580,100 L600,110 L610,140 L600,170 L610,200 L630,210 L640,240 L630,260 L610,250 L600,220 L590,200 L580,180 L570,160 L560,140 Z"
            fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="1" />
          {/* NTT chain */}
          <path d="M510,310 L525,305 L530,312 L520,315 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          <path d="M540,315 L560,310 L570,316 L555,320 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          <path d="M580,320 L600,315 L615,320 L600,328 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          <path d="M625,325 L650,318 L665,325 L650,335 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          {/* Maluku */}
          <path d="M700,160 L720,150 L730,170 L720,190 L700,185 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          <path d="M690,220 L710,210 L720,230 L710,250 L690,240 Z" fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="0.8" />
          {/* Papua */}
          <path d="M760,140 L800,120 L850,115 L900,120 L930,140 L940,170 L930,200 L910,220 L880,230 L850,225 L830,210 L810,200 L790,190 L770,170 Z"
            fill="hsl(210, 40%, 25%)" stroke="hsl(210, 60%, 40%)" strokeWidth="1" />
          {/* Grid */}
          {[100, 200, 300, 400].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="hsl(210, 30%, 18%)" strokeWidth="0.3" strokeDasharray="4,8" />
          ))}
          {[200, 400, 600, 800].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="450" stroke="hsl(210, 30%, 18%)" strokeWidth="0.3" strokeDasharray="4,8" />
          ))}
        </svg>

        {projects.map((project) => (
          <button
            key={project.id}
            className="absolute group"
            style={{ left: `${project.map_x}%`, top: `${project.map_y}%`, transform: "translate(-50%, -50%)" }}
            onMouseEnter={() => setHoveredProject(project)}
            onMouseLeave={() => setHoveredProject(null)}
            onClick={() => onSelectProject(project)}
          >
            {project.status !== "completed" && (
              <span className={`absolute inset-0 rounded-full ${statusColors[project.status]} opacity-30 animate-pulse-dot`}
                style={{ width: 18, height: 18, margin: "-4px" }} />
            )}
            <span className={`relative block w-2.5 h-2.5 rounded-full ${statusColors[project.status]} border border-background shadow-md transition-transform group-hover:scale-[2]`} />

            {hoveredProject?.id === project.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fade-in">
                <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[180px] text-left">
                  <p className="text-[10px] font-mono-data text-muted-foreground">{project.project_code}</p>
                  <p className="text-xs font-semibold text-foreground">{project.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{project.location}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      project.status === "on-track" ? "bg-success/10 text-success border-success/30" :
                      project.status === "at-risk" ? "bg-warning/10 text-warning border-warning/30" :
                      project.status === "delayed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                      "bg-primary/10 text-primary border-primary/30"
                    }`}>{statusLabels[project.status]}</span>
                    <span className="text-[10px] font-mono-data text-foreground">{project.progress}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatRupiah(project.budget)}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

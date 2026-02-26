import { useState } from "react";
import { projects, Project, ProjectStatus, formatRupiah } from "@/data/projectData";
import { MapPin, X } from "lucide-react";

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

export function IndonesiaMap({ onSelectProject }: { onSelectProject: (p: Project) => void }) {
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);

  return (
    <div className="glass-card rounded-lg p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Peta Sebaran Proyek</h2>
          <p className="text-sm text-muted-foreground">15 proyek EPC tersebar di seluruh Indonesia</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {(["on-track", "at-risk", "delayed", "completed"] as ProjectStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s]}`} />
              <span className="text-muted-foreground">{statusLabels[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="relative w-full aspect-[2.2/1] bg-gradient-to-b from-info/5 to-primary/5 rounded-lg overflow-hidden border border-border">
        {/* Simplified Indonesia SVG */}
        <svg viewBox="0 0 1000 450" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Ocean background */}
          <rect width="1000" height="450" fill="none" />
          
          {/* Simplified Indonesia landmass */}
          {/* Sumatra */}
          <path d="M80,120 L120,100 L160,110 L200,130 L230,160 L260,200 L280,240 L290,280 L270,300 L240,290 L210,260 L180,230 L150,200 L120,170 L90,150 Z" 
            fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1.5" />
          
          {/* Java */}
          <path d="M280,300 L320,290 L360,285 L400,288 L440,290 L480,295 L500,300 L490,310 L450,308 L410,305 L370,300 L330,300 L290,308 Z" 
            fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1.5" />
          
          {/* Kalimantan */}
          <path d="M350,120 L400,100 L450,95 L500,100 L530,120 L540,160 L530,200 L510,230 L480,250 L450,260 L420,250 L390,230 L370,200 L360,160 Z" 
            fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1.5" />
          
          {/* Sulawesi */}
          <path d="M560,120 L580,100 L600,110 L610,140 L600,170 L610,200 L630,210 L640,240 L630,260 L610,250 L600,220 L590,200 L580,180 L570,160 L560,140 Z" 
            fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1.5" />
          
          {/* Bali & NTT chain */}
          <path d="M510,310 L525,305 L530,312 L520,315 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          <path d="M540,315 L560,310 L570,316 L555,320 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          <path d="M580,320 L600,315 L615,320 L600,328 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          <path d="M625,325 L650,318 L665,325 L650,335 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          
          {/* Maluku */}
          <path d="M700,160 L720,150 L730,170 L720,190 L700,185 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          <path d="M690,220 L710,210 L720,230 L710,250 L690,240 Z" fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1" />
          
          {/* Papua */}
          <path d="M760,140 L800,120 L850,115 L900,120 L930,140 L940,170 L930,200 L910,220 L880,230 L850,225 L830,210 L810,200 L790,190 L770,170 Z" 
            fill="hsl(152, 30%, 85%)" stroke="hsl(152, 30%, 70%)" strokeWidth="1.5" />
          
          {/* Grid lines for reference feel */}
          {[100, 200, 300, 400].map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="hsl(210, 15%, 90%)" strokeWidth="0.5" strokeDasharray="4,4" />
          ))}
          {[200, 400, 600, 800].map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="450" stroke="hsl(210, 15%, 90%)" strokeWidth="0.5" strokeDasharray="4,4" />
          ))}
        </svg>

        {/* Project markers */}
        {projects.map((project) => (
          <button
            key={project.id}
            className="absolute group"
            style={{
              left: `${project.mapX}%`,
              top: `${project.mapY}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setHoveredProject(project)}
            onMouseLeave={() => setHoveredProject(null)}
            onClick={() => onSelectProject(project)}
          >
            {/* Pulse ring */}
            {project.status !== "completed" && (
              <span className={`absolute inset-0 rounded-full ${statusColors[project.status]} opacity-30 animate-pulse-dot`} 
                style={{ width: 20, height: 20, margin: "-5px" }} />
            )}
            {/* Dot */}
            <span className={`relative block w-3 h-3 rounded-full ${statusColors[project.status]} border-2 border-card shadow-md transition-transform group-hover:scale-150`} />
            
            {/* Tooltip */}
            {hoveredProject?.id === project.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-fade-in">
                <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px] text-left">
                  <p className="text-xs font-mono-data text-muted-foreground">{project.id}</p>
                  <p className="text-sm font-semibold text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{project.location}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      project.status === "on-track" ? "bg-success/10 text-success border-success/30" :
                      project.status === "at-risk" ? "bg-warning/10 text-warning border-warning/30" :
                      project.status === "delayed" ? "bg-destructive/10 text-destructive border-destructive/30" :
                      "bg-primary/10 text-primary border-primary/30"
                    }`}>{statusLabels[project.status]}</span>
                    <span className="text-xs font-mono-data text-foreground">{project.progress}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatRupiah(project.budget)}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

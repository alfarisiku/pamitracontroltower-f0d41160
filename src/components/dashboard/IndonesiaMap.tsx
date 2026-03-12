import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type ProjectStatus = DbProject["status"];

const statusColors: Record<ProjectStatus, string> = {
  "on-track": "#22c55e",
  "at-risk": "#eab308",
  "delayed": "#ef4444",
  "completed": "#3b82f6",
};

const statusLabels: Record<ProjectStatus, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "delayed": "Delayed",
  "completed": "Selesai",
};

// Map percentage coordinates to rough Indonesia lat/lng
function mapToLatLng(mapX: number, mapY: number): [number, number] {
  const lng = 95 + (mapX / 100) * 46; // 95E to 141E
  const lat = 6 - (mapY / 100) * 17;  // 6N to -11S
  return [lat, lng];
}

function createIcon(status: ProjectStatus) {
  const color = statusColors[status];
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 16px; height: 16px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ${status !== 'completed' ? `animation: pulse 2s infinite;` : ''}
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ projects }: { projects: DbProject[] }) {
  const map = useMap();
  useEffect(() => {
    if (projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => mapToLatLng(p.map_x, p.map_y)));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
    }
  }, [projects, map]);
  return null;
}

export function IndonesiaMap({ projects, onSelectProject }: { projects: DbProject[]; onSelectProject: (p: DbProject) => void }) {
  const navigate = useNavigate();

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
              <div className="w-2 h-2 rounded-full" style={{ background: statusColors[s] }} />
              <span className="text-muted-foreground">{statusLabels[s]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-[2.2/1] rounded-lg overflow-hidden border border-border">
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.3); }
          }
          .leaflet-container { background: hsl(210, 20%, 95%); font-family: inherit; }
          .leaflet-popup-content-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .leaflet-popup-content { margin: 8px 12px; font-size: 12px; }
        `}</style>
        <MapContainer
          center={[-2.5, 118]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds projects={projects} />
          {projects.map((project) => {
            const [lat, lng] = mapToLatLng(project.map_x, project.map_y);
            return (
              <Marker key={project.id} position={[lat, lng]} icon={createIcon(project.status)}>
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="text-[10px] font-mono text-primary">{project.project_code}</p>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{project.location}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                        background: `${statusColors[project.status]}20`,
                        color: statusColors[project.status]
                      }}>{statusLabels[project.status]}</span>
                      <span className="text-xs font-mono font-bold">{project.progress}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{formatRupiah(project.budget)}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onSelectProject(project)}
                        className="flex-1 text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >Overview</button>
                      <button
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="flex-1 text-[10px] px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                      >Detail WBS</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

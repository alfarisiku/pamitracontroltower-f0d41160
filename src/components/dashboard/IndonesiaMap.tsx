import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toLatLng, STATUS_COLORS, STATUS_LABELS } from "@/lib/mapUtils";

type ProjectStatus = DbProject["status"];

const statusColors = STATUS_COLORS as Record<ProjectStatus, string>;
const statusLabels = STATUS_LABELS as Record<ProjectStatus, string>;

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

function MarkerClusterGroup({ projects, onSelectProject, navigate }: { projects: DbProject[]; onSelectProject: (p: DbProject) => void; navigate: (path: string) => void }) {
  const map = useMap();

  useEffect(() => {
    if (projects.length === 0) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: hsl(215, 80%, 48%); color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 700; border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: "custom-cluster",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
      },
    });

    projects.forEach(project => {
      const [lat, lng] = toLatLng(project.map_x, project.map_y);
      const marker = L.marker([lat, lng], { icon: createIcon(project.status) });
      const popup = L.popup().setContent(`
        <div style="min-width:200px;font-family:inherit">
          <p style="font-size:10px;font-family:monospace;color:hsl(215,80%,48%)">${project.project_code}</p>
          <p style="font-size:13px;font-weight:600;margin:2px 0">${project.name}</p>
          <p style="font-size:11px;color:#888;margin-bottom:6px">${project.location}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:${statusColors[project.status]}20;color:${statusColors[project.status]}">${statusLabels[project.status]}</span>
            <span style="font-size:12px;font-family:monospace;font-weight:700">${project.progress}%</span>
          </div>
          <p style="font-size:10px;color:#888">${formatRupiah(project.budget)}</p>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button onclick="window.__mapSelectProject('${project.id}')" style="flex:1;font-size:10px;padding:4px 8px;background:#eff6ff;color:#2563eb;border:none;border-radius:4px;cursor:pointer">Overview</button>
            <button onclick="window.__mapNavProject('${project.id}')" style="flex:1;font-size:10px;padding:4px 8px;background:#f0fdf4;color:#16a34a;border:none;border-radius:4px;cursor:pointer">Detail WBS</button>
          </div>
        </div>
      `);
      marker.bindPopup(popup);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);

    const bounds = L.latLngBounds(projects.map(p => toLatLng(p.map_x, p.map_y)));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });

    return () => {
      map.removeLayer(cluster);
    };
  }, [projects, map]);

  useEffect(() => {
    (window as any).__mapSelectProject = (id: string) => {
      const p = projects.find(pr => pr.id === id);
      if (p) onSelectProject(p);
    };
    (window as any).__mapNavProject = (id: string) => {
      navigate(`/project/${id}`);
    };
    return () => {
      delete (window as any).__mapSelectProject;
      delete (window as any).__mapNavProject;
    };
  }, [projects, onSelectProject, navigate]);

  return null;
}

export function IndonesiaMap({ projects, onSelectProject }: { projects: DbProject[]; onSelectProject: (p: DbProject) => void }) {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Project Portfolio</h2>
          <p className="text-xs text-muted-foreground">{projects.length} proyek tersebar di Indonesia</p>
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
          .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large { background: transparent !important; }
        `}</style>
        <MapContainer
          center={[-2.5, 118]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={true}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup projects={projects} onSelectProject={onSelectProject} navigate={navigate} />
        </MapContainer>
      </div>
    </div>
  );
}

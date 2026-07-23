import { useState, useEffect } from "react";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { formatRupiah, resolveImageUrl } from "@/lib/supabase";
import { toLatLng, STATUS_COLORS as SC } from "@/lib/mapUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, CheckCircle2, TrendingUp, Briefcase, DollarSign, MapPin, ChevronLeft, ChevronRight, AlertTriangle, Globe } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_COLORS: Record<string, string> = SC;

function createCustomIcon(status: string) {
  const color = STATUS_COLORS[status] || STATUS_COLORS["planning"] || "#3b82f6";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const WarRoom = () => {
  const { data: projects = [], isLoading } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const [time, setTime] = useState(new Date());
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = projects.filter(p => p.status !== "completed");
  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % active.length), 6000);
    return () => clearInterval(t);
  }, [active.length]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completed = projects.filter(p => p.status === "completed" || p.status === "closed");
  const onTrack = projects.filter(p => p.status === "execution" || p.status === "on-track");
  const atRisk = projects.filter(p => p.status === "on-hold" || p.status === "at-risk");
  const delayed = projects.filter(p => p.status === "delayed");
  const planning = projects.filter(p => p.status === "planning");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const onTrackPct = projects.length > 0 ? Math.round((onTrack.length / projects.length) * 100) : 0;

  const barData = [...projects].sort((a, b) => b.budget - a.budget).slice(0, 8).map(p => ({
    name: p.project_code,
    budget: Math.round(p.budget / 1000),
    spent: Math.round(p.spent / 1000),
  }));

  const pieData = [
    { name: "Planning", value: planning.length, color: STATUS_COLORS["planning"] },
    { name: "Execution", value: onTrack.length, color: STATUS_COLORS["execution"] },
    { name: "On Hold", value: atRisk.length, color: STATUS_COLORS["on-hold"] },
    { name: "Completed", value: completed.length, color: STATUS_COLORS["completed"] },
  ].filter(d => d.value > 0);

  const validProjects = projects.filter(p => p.map_x !== 0 && p.map_y !== 0);
  const mapCenter: [number, number] = [-2.5, 118];

  const featured = active[featuredIdx % Math.max(1, active.length)];

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "11px",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight text-foreground">Dashboard Control Tower</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] leading-tight text-primary">
              EPC Oil & Gas — Investor Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/15">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] font-medium text-destructive">{alerts.length} Alerts</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-mono font-bold leading-tight text-primary">
              {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[9px] leading-tight text-muted-foreground">
              {time.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-2 px-4 py-2 flex-shrink-0">
        {[
          { label: "Total Projects", value: String(projects.length), sub: `${active.length} active`, accent: "text-primary" },
          { label: "Portfolio Value", value: formatRupiah(totalBudget), sub: `Spent: ${formatRupiah(totalSpent)}`, accent: "text-success" },
          { label: "Avg Progress", value: `${avgProgress}%`, sub: "All projects", accent: "text-warning" },
          { label: "On Track Rate", value: `${onTrackPct}%`, sub: `${onTrack.length}/${projects.length}`, accent: "text-success" },
          { label: "Risk Items", value: String(alerts.length), sub: `${alerts.filter(a => a.severity === "critical").length} critical`, accent: alerts.length > 0 ? "text-destructive" : "text-success" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl px-3 py-2 border border-border bg-card">
            <p className="text-[9px] uppercase tracking-wider font-medium truncate text-muted-foreground">{kpi.label}</p>
            <p className={`text-xl font-bold font-mono-data leading-tight ${kpi.accent}`}>{kpi.value}</p>
            <p className="text-[9px] truncate text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 px-4 pb-2 min-h-0">
        <div className="col-span-7 rounded-xl border border-border overflow-hidden relative bg-card">
          <div className="absolute top-2 left-3 z-[1000] flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary">Project Locations</span>
          </div>
          <style>{`
            .warroom-map .leaflet-container { background: hsl(var(--muted)); }
            .warroom-map .leaflet-popup-content-wrapper { border-radius: 8px; }
            .warroom-map .leaflet-popup-content { margin: 8px 12px; }
          `}</style>
          <div className="warroom-map h-full w-full">
            <MapContainer center={mapCenter} zoom={5} style={{ height: "100%", width: "100%" }} zoomControl={false} attributionControl={false}
              scrollWheelZoom={false} dragging={false} doubleClickZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {validProjects.map(p => {
                const [lat, lng] = toLatLng(p.map_x, p.map_y);
                return (
                  <Marker key={p.id} position={[lat, lng]} icon={createCustomIcon(p.status)}>
                    <Popup>
                      <div className="text-xs min-w-[180px]">
                        <p className="font-bold text-foreground">{p.project_code} — {p.name}</p>
                        <p className="text-muted-foreground mt-0.5">{p.location}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span>Progress: <strong>{p.progress}%</strong></span>
                          <span className={p.status === "on-track" ? "text-green-600" : p.status === "delayed" ? "text-red-600" : "text-yellow-600"}>{p.status}</span>
                        </div>
                        <p className="mt-0.5">Budget: {formatRupiah(p.budget)}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-2 min-h-0">
          <div className="flex-1 rounded-xl border border-border p-3 min-h-0 bg-card">
            <p className="text-[9px] uppercase tracking-wider font-semibold mb-1 text-muted-foreground">Budget vs Spent (Milyar Rp)</p>
            <div className="h-[calc(100%-20px)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}B`} />
                  <Bar dataKey="budget" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="hsl(var(--warning))" radius={[2, 2, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex gap-2 min-h-0" style={{ height: "45%" }}>
            <div className="flex-1 rounded-xl border border-border p-3 bg-card">
              <p className="text-[9px] uppercase tracking-wider font-semibold mb-0 text-muted-foreground">Status Distribution</p>
              <div className="h-[calc(100%-24px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9} fill="hsl(var(--primary))">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {featured && (
              <div className="flex-1 rounded-xl border border-border overflow-hidden relative bg-card">
                {featured.image_url ? (
                  <img src={resolveImageUrl(featured.image_url)} alt={featured.name} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="w-full h-full absolute inset-0 bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{featured.project_code}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-success/20 text-success">{featured.progress}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-2">{featured.name}</h4>
                  <p className="text-[9px] mt-0.5 flex items-center gap-1 text-muted-foreground"><MapPin className="h-2.5 w-2.5" />{featured.location}</p>
                  <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${featured.progress}%` }} />
                  </div>
                </div>
                {active.length > 1 && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button onClick={() => setFeaturedIdx(i => (i - 1 + active.length) % active.length)} className="p-1 rounded-full hover:bg-muted/80 transition-colors bg-card/50"><ChevronLeft className="h-3 w-3 text-foreground" /></button>
                    <button onClick={() => setFeaturedIdx(i => (i + 1) % active.length)} className="p-1 rounded-full hover:bg-muted/80 transition-colors bg-card/50"><ChevronRight className="h-3 w-3 text-foreground" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
          {projects.map(p => (
            <div key={p.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[p.status] || STATUS_COLORS["on-track"] }} />
              <span className="text-[9px] font-mono-data text-primary">{p.project_code}</span>
              <span className="text-[9px] font-bold font-mono-data" style={{ color: STATUS_COLORS[p.status] || undefined }}>{p.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="px-4 py-1.5 border-t border-border text-center flex-shrink-0">
        <p className="text-[9px] text-muted-foreground">
          PT Pamitra Jaya Konstruksi — EPC Oil and Gas — Dashboard Control Tower v2.0
        </p>
      </footer>
    </div>
  );
};

export default WarRoom;

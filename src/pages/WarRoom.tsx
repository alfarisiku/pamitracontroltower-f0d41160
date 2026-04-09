import { useState, useEffect } from "react";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, CheckCircle2, TrendingUp, Briefcase, DollarSign, MapPin, ChevronLeft, ChevronRight, AlertTriangle, Globe } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_COLORS = {
  "on-track": "hsl(152, 55%, 50%)",
  "at-risk": "hsl(38, 92%, 50%)",
  "delayed": "hsl(0, 72%, 50%)",
  "completed": "hsl(215, 80%, 55%)",
};

const PIE_COLORS = ["hsl(152, 55%, 50%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)", "hsl(215, 80%, 55%)"];

function createCustomIcon(status: string) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS["on-track"];
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
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
      <div className="h-screen flex items-center justify-center" style={{ background: "hsl(220, 25%, 6%)" }}>
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completed = projects.filter(p => p.status === "completed");
  const onTrack = projects.filter(p => p.status === "on-track");
  const atRisk = projects.filter(p => p.status === "at-risk");
  const delayed = projects.filter(p => p.status === "delayed");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const onTrackPct = projects.length > 0 ? Math.round((onTrack.length / projects.length) * 100) : 0;

  // Bar chart data — top 8 by budget
  const barData = [...projects].sort((a, b) => b.budget - a.budget).slice(0, 8).map(p => ({
    name: p.project_code,
    budget: Math.round(p.budget / 1000),
    spent: Math.round(p.spent / 1000),
  }));

  // Pie chart — status distribution
  const pieData = [
    { name: "On Track", value: onTrack.length, color: STATUS_COLORS["on-track"] },
    { name: "At Risk", value: atRisk.length, color: STATUS_COLORS["at-risk"] },
    { name: "Delayed", value: delayed.length, color: STATUS_COLORS["delayed"] },
    { name: "Completed", value: completed.length, color: STATUS_COLORS["completed"] },
  ].filter(d => d.value > 0);

  // Map center — average of project coords
  const validProjects = projects.filter(p => p.map_x !== 0 && p.map_y !== 0);
  const mapCenter: [number, number] = validProjects.length > 0
    ? [validProjects.reduce((s, p) => s + p.map_x, 0) / validProjects.length, validProjects.reduce((s, p) => s + p.map_y, 0) / validProjects.length]
    : [-2.5, 118];

  const featured = active[featuredIdx % Math.max(1, active.length)];

  const tooltipStyle = {
    backgroundColor: "hsl(220, 20%, 12%)",
    border: "1px solid hsl(220, 20%, 20%)",
    borderRadius: "8px",
    fontSize: "11px",
    color: "hsl(215, 15%, 70%)",
  };

  return (
    <div className="h-screen flex flex-col text-white overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(220,25%,6%) 0%, hsl(220,20%,10%) 100%)" }}>
      {/* Header — compact */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0" style={{ borderColor: "hsl(220, 20%, 14%)" }}>
        <div className="flex items-center gap-3">
          <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight">Pamitra Control Tower</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] leading-tight" style={{ color: "hsl(215, 80%, 65%)" }}>
              EPC Oil & Gas — Investor Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {alerts.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "hsl(0,72%,50%,0.15)" }}>
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] font-medium text-destructive">{alerts.length} Alerts</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-mono font-bold leading-tight" style={{ color: "hsl(215, 80%, 65%)" }}>
              {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[9px] leading-tight" style={{ color: "hsl(215, 15%, 40%)" }}>
              {time.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      {/* Hero KPI Bar */}
      <div className="grid grid-cols-5 gap-2 px-4 py-2 flex-shrink-0">
        {[
          { label: "Total Projects", value: String(projects.length), sub: `${active.length} active`, accent: "hsl(215, 80%, 60%)" },
          { label: "Portfolio Value", value: formatRupiah(totalBudget), sub: `Spent: ${formatRupiah(totalSpent)}`, accent: "hsl(152, 55%, 50%)" },
          { label: "Avg Progress", value: `${avgProgress}%`, sub: "All projects", accent: "hsl(30, 85%, 55%)" },
          { label: "On Track Rate", value: `${onTrackPct}%`, sub: `${onTrack.length}/${projects.length}`, accent: "hsl(152, 55%, 50%)" },
          { label: "Risk Items", value: String(alerts.length), sub: `${alerts.filter(a => a.severity === "critical").length} critical`, accent: alerts.length > 0 ? "hsl(0, 72%, 55%)" : "hsl(152, 55%, 50%)" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl px-3 py-2 border" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
            <p className="text-[9px] uppercase tracking-wider font-medium truncate" style={{ color: "hsl(215, 15%, 45%)" }}>{kpi.label}</p>
            <p className="text-xl font-bold font-mono-data leading-tight" style={{ color: kpi.accent }}>{kpi.value}</p>
            <p className="text-[9px] truncate" style={{ color: "hsl(215, 15%, 38%)" }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Content — Map + Charts */}
      <div className="flex-1 grid grid-cols-12 gap-2 px-4 pb-2 min-h-0">
        {/* Left: Map */}
        <div className="col-span-7 rounded-xl border overflow-hidden relative" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
          <div className="absolute top-2 left-3 z-[1000] flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" style={{ color: "hsl(215, 80%, 65%)" }} />
            <span className="text-[10px] font-semibold" style={{ color: "hsl(215, 80%, 65%)" }}>Project Locations</span>
          </div>
          <MapContainer
            center={mapCenter}
            zoom={5}
            style={{ height: "100%", width: "100%", background: "hsl(220, 25%, 6%)" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {validProjects.map(p => (
              <Marker key={p.id} position={[p.map_x, p.map_y]} icon={createCustomIcon(p.status)}>
                <Popup>
                  <div className="text-xs min-w-[180px]">
                    <p className="font-bold text-foreground">{p.project_code} — {p.name}</p>
                    <p className="text-muted-foreground mt-0.5">{p.location}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span>Progress: <strong>{p.progress}%</strong></span>
                      <span className={p.status === "on-track" ? "text-green-600" : p.status === "delayed" ? "text-red-600" : "text-yellow-600"}>
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-0.5">Budget: {formatRupiah(p.budget)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Right: Charts stack */}
        <div className="col-span-5 flex flex-col gap-2 min-h-0">
          {/* Bar Chart — Budget vs Spent */}
          <div className="flex-1 rounded-xl border p-3 min-h-0" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
            <p className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: "hsl(215, 15%, 45%)" }}>Budget vs Spent (Milyar Rp)</p>
            <div className="h-[calc(100%-20px)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 16%)" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 45%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 45%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}B`} />
                  <Bar dataKey="budget" fill="hsl(215, 80%, 55%)" radius={[2, 2, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="hsl(30, 85%, 55%)" radius={[2, 2, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: Pie + Featured */}
          <div className="flex gap-2 min-h-0" style={{ height: "45%" }}>
            {/* Pie Chart */}
            <div className="flex-1 rounded-xl border p-3" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
              <p className="text-[9px] uppercase tracking-wider font-semibold mb-0" style={{ color: "hsl(215, 15%, 45%)" }}>Status Distribution</p>
              <div className="h-[calc(100%-24px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                      fontSize={9} fill="hsl(215, 80%, 55%)">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Featured Project Mini */}
            {featured && (
              <div className="flex-1 rounded-xl border overflow-hidden relative" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
                {featured.image_url ? (
                  <img src={featured.image_url} alt={featured.name} className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <div className="w-full h-full absolute inset-0" style={{ background: "hsl(220, 20%, 12%)" }} />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, hsl(220,25%,6%,0.95) 0%, hsl(220,25%,6%,0.3) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono-data px-1.5 py-0.5 rounded-full" style={{ background: "hsl(215,80%,55%,0.2)", color: "hsl(215,80%,65%)" }}>
                      {featured.project_code}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsl(152,55%,50%,0.2)", color: "hsl(152,55%,60%)" }}>
                      {featured.progress}%
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">{featured.name}</h4>
                  <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: "hsl(215,15%,50%)" }}>
                    <MapPin className="h-2.5 w-2.5" />{featured.location}
                  </p>
                  <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220,20%,20%)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${featured.progress}%`,
                      background: `linear-gradient(90deg, hsl(215,80%,55%), hsl(152,55%,50%))`,
                    }} />
                  </div>
                </div>
                {/* Nav */}
                {active.length > 1 && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button onClick={() => setFeaturedIdx(i => (i - 1 + active.length) % active.length)}
                      className="p-1 rounded-full hover:bg-white/20 transition-colors" style={{ background: "hsl(0,0%,0%,0.3)" }}>
                      <ChevronLeft className="h-3 w-3 text-white" />
                    </button>
                    <button onClick={() => setFeaturedIdx(i => (i + 1) % active.length)}
                      className="p-1 rounded-full hover:bg-white/20 transition-colors" style={{ background: "hsl(0,0%,0%,0.3)" }}>
                      <ChevronRight className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
          {projects.map(p => (
            <div key={p.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "hsl(220, 20%, 9%)", borderColor: "hsl(220, 20%, 16%)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[p.status] || STATUS_COLORS["on-track"] }} />
              <span className="text-[9px] font-mono-data" style={{ color: "hsl(215, 80%, 65%)" }}>{p.project_code}</span>
              <span className="text-[9px] font-bold font-mono-data" style={{ color: STATUS_COLORS[p.status] || "hsl(215, 15%, 50%)" }}>{p.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-1.5 border-t text-center flex-shrink-0" style={{ borderColor: "hsl(220, 20%, 14%)" }}>
        <p className="text-[9px]" style={{ color: "hsl(215, 15%, 30%)" }}>
          PT Pamitra Jaya Konstruksi — EPC Oil and Gas — Control Tower v2.0
        </p>
      </footer>
    </div>
  );
};

export default WarRoom;

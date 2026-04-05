import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { Activity, CheckCircle2, TrendingUp, Briefcase, DollarSign, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

const WarRoom = () => {
  const { data: projects = [], isLoading } = useProjects();
  const [time, setTime] = useState(new Date());
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-rotate featured projects
  const active = projects.filter(p => p.status !== "completed");
  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % active.length), 8000);
    return () => clearInterval(t);
  }, [active.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(220, 25%, 8%)" }}>
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completed = projects.filter(p => p.status === "completed");
  const onTrack = projects.filter(p => p.status === "on-track");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const onTrackPct = projects.length > 0 ? Math.round((onTrack.length / projects.length) * 100) : 0;

  // Phase distribution
  const phases = ["Engineering", "Procurement", "Construction", "Commissioning"];
  const phaseCounts = phases.map(ph => ({ name: ph, count: projects.filter(p => p.phase === ph).length }));

  // Live update banner
  const topProject = active.length > 0 ? active.reduce((a, b) => a.progress > b.progress ? a : b) : null;

  const featured = active[featuredIdx % active.length];

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, hsl(220,25%,8%) 0%, hsl(220,20%,12%) 100%)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "hsl(220, 20%, 15%)" }}>
        <div className="flex items-center gap-4">
          <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pamitra Control Tower</h1>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "hsl(215, 80%, 65%)" }}>
              EPC Oil & Gas — Project Showcase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-3xl font-mono font-bold" style={{ color: "hsl(215, 80%, 65%)" }}>
              {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[10px]" style={{ color: "hsl(215, 15%, 50%)" }}>
              {time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      {/* Live Banner */}
      {topProject && (
        <div className="mx-6 mt-4 px-5 py-3 rounded-xl flex items-center gap-3" style={{ background: "linear-gradient(90deg, hsl(215, 80%, 55%, 0.15), hsl(152, 55%, 45%, 0.10))" }}>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <p className="text-sm">
            <span className="font-semibold" style={{ color: "hsl(215, 80%, 65%)" }}>{topProject.project_code}</span>
            <span style={{ color: "hsl(215, 15%, 60%)" }}> — {topProject.name} telah mencapai </span>
            <span className="font-bold" style={{ color: "hsl(152, 55%, 55%)" }}>{topProject.progress}%</span>
            <span style={{ color: "hsl(215, 15%, 60%)" }}> progress</span>
          </p>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Hero KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Projects", value: projects.length, sub: `${active.length} active`, icon: Briefcase, accent: "hsl(215, 80%, 60%)" },
            { label: "Contract Value", value: formatRupiah(totalBudget), sub: "Total portfolio", icon: DollarSign, accent: "hsl(152, 55%, 50%)" },
            { label: "Overall Progress", value: `${avgProgress}%`, sub: "Average all projects", icon: TrendingUp, accent: "hsl(30, 85%, 55%)" },
            { label: "On Track", value: `${onTrackPct}%`, sub: `${onTrack.length} of ${projects.length} projects`, icon: CheckCircle2, accent: "hsl(152, 55%, 50%)" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-2xl p-5 border" style={{ background: "hsl(220, 20%, 11%)", borderColor: "hsl(220, 20%, 18%)" }}>
              <div className="flex items-center gap-2 mb-3">
                <kpi.icon className="h-5 w-5" style={{ color: kpi.accent }} />
                <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "hsl(215, 15%, 50%)" }}>{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold font-mono-data" style={{ color: kpi.accent }}>{kpi.value}</p>
              <p className="text-[10px] mt-1" style={{ color: "hsl(215, 15%, 45%)" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Featured Project + Phase Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Featured Project Carousel */}
          <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ background: "hsl(220, 20%, 11%)", borderColor: "hsl(220, 20%, 18%)" }}>
            {featured && (
              <div className="relative">
                {featured.image_url ? (
                  <img src={featured.image_url} alt={featured.name} className="w-full h-64 object-cover" />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center" style={{ background: "hsl(220, 20%, 15%)" }}>
                    <Briefcase className="h-16 w-16" style={{ color: "hsl(215, 15%, 25%)" }} />
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, hsl(220,25%,8%) 0%, transparent 60%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono-data px-2 py-0.5 rounded-full" style={{ background: "hsl(215,80%,55%,0.2)", color: "hsl(215,80%,65%)" }}>
                      {featured.project_code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-success/20 text-success">
                      {featured.progress}% Complete
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{featured.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-[11px]" style={{ color: "hsl(215,15%,55%)" }}>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{featured.location}</span>
                    <span>{featured.client}</span>
                    <span>{featured.phase}</span>
                  </div>
                  {featured.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: "hsl(215,15%,55%)" }}>{featured.description}</p>
                  )}
                  {/* Progress bar */}
                  <div className="mt-3 w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(220,20%,20%)" }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{
                      width: `${featured.progress}%`,
                      background: `linear-gradient(90deg, hsl(215,80%,55%), hsl(152,55%,50%))`,
                    }} />
                  </div>
                </div>
                {/* Nav arrows */}
                {active.length > 1 && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 flex justify-between pointer-events-none">
                    <button onClick={() => setFeaturedIdx(i => (i - 1 + active.length) % active.length)}
                      className="pointer-events-auto p-2 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors" style={{ background: "hsl(0,0%,0%,0.3)" }}>
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                    <button onClick={() => setFeaturedIdx(i => (i + 1) % active.length)}
                      className="pointer-events-auto p-2 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors" style={{ background: "hsl(0,0%,0%,0.3)" }}>
                      <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                  </div>
                )}
                {/* Dots */}
                {active.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {active.map((_, i) => (
                      <button key={i} onClick={() => setFeaturedIdx(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === featuredIdx % active.length ? "hsl(215,80%,65%)" : "hsl(215,15%,30%)" }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phase Distribution */}
          <div className="rounded-2xl p-5 border" style={{ background: "hsl(220, 20%, 11%)", borderColor: "hsl(220, 20%, 18%)" }}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "hsl(215, 15%, 50%)" }}>
              Progress Distribution
            </h3>
            <div className="space-y-4">
              {phaseCounts.map((ph, i) => {
                const pct = projects.length > 0 ? Math.round((ph.count / projects.length) * 100) : 0;
                const colors = ["hsl(215,80%,60%)", "hsl(30,85%,55%)", "hsl(152,55%,50%)", "hsl(280,60%,60%)"];
                return (
                  <div key={ph.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-white">{ph.name}</span>
                      <span className="text-xs font-mono-data" style={{ color: colors[i] }}>{ph.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "hsl(220,20%,18%)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completed count */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "hsl(220,20%,18%)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "hsl(215,15%,50%)" }}>Completed Projects</span>
                <span className="text-lg font-bold font-mono-data" style={{ color: "hsl(152,55%,50%)" }}>{completed.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Gallery Grid */}
        <div>
          <h2 className="text-xs uppercase tracking-wider mb-3 font-semibold" style={{ color: "hsl(215, 15%, 50%)" }}>
            All Projects ({projects.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {projects.map(p => (
              <div key={p.id} className="rounded-xl border overflow-hidden group transition-all hover:border-primary/40"
                style={{ background: "hsl(220, 20%, 11%)", borderColor: "hsl(220, 20%, 18%)" }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center" style={{ background: "hsl(220,20%,15%)" }}>
                    <Briefcase className="h-8 w-8" style={{ color: "hsl(215,15%,25%)" }} />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-mono-data" style={{ color: "hsl(215,80%,65%)" }}>{p.project_code}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                      p.status === "on-track" ? "bg-success/20 text-success" :
                      p.status === "completed" ? "bg-primary/20 text-primary" :
                      "bg-accent/20 text-accent"
                    }`}>
                      {p.status === "on-track" ? "On Track" : p.status === "completed" ? "Done" : p.status === "at-risk" ? "At Risk" : "Delayed"}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{p.name}</h4>
                  <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220,20%,20%)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${p.progress}%`,
                      background: p.progress >= 80 ? "hsl(152,55%,50%)" : p.progress >= 50 ? "hsl(30,85%,55%)" : "hsl(215,80%,55%)",
                    }} />
                  </div>
                  <p className="text-[10px] mt-1 font-mono-data" style={{ color: "hsl(215,15%,50%)" }}>{p.progress}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-4 border-t text-center" style={{ borderColor: "hsl(220, 20%, 15%)" }}>
        <p className="text-[10px]" style={{ color: "hsl(215, 15%, 35%)" }}>
          PT Pamitra Jaya Konstruksi — EPC Oil and Gas — Pamitra Control Tower v2.0
        </p>
      </footer>
    </div>
  );
};

export default WarRoom;

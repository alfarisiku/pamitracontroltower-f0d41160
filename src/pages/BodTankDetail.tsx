import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, FileText } from "lucide-react";
import {
  useBodProjects, useTanks, useTankSites, useWbsProgressMap, tankProgress, tankStatusMeta, BOD_SHORT_LABEL,
} from "@/hooks/useTanks";
import { resolveImageUrl } from "@/lib/supabase";

const pct = (n: number) => `${Number(n || 0).toFixed(2).replace(".", ",")}%`;
const dateID = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

const BodTankDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: projects = [] } = useBodProjects();
  const project = projects.find(p => p.id === id);
  const { data: tanks = [] } = useTanks(id);
  const { data: sites = [] } = useTankSites(id);
  const wbsMap = useWbsProgressMap(id);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(
    () => tanks.map(t => ({ ...t, pct: tankProgress(t, wbsMap) })),
    [tanks, wbsMap],
  );
  const active = rows.find(t => t.id === selected) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1500px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="w-9 h-9 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Board of Directors — Tank View</h1>
              <p className="text-xs text-muted-foreground">{project?.client ?? "—"} · {project?.location ?? "—"}</p>
            </div>
          </div>
          <Link to="/bod" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-foreground hover:bg-muted/70">
            <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
          </Link>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-5 py-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px_280px] gap-5 items-start">
        {/* Site layout + tank chips */}
        <section className="glass-card rounded-xl shadow-card border border-border p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Overview: {BOD_SHORT_LABEL[project?.project_code ?? ""] ?? project?.name ?? "—"}
              </h2>
              <p className="text-xs text-muted-foreground">Layout terminal interaktif dengan status tiap tangki.</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["completed", "in_progress", "on_preparation"].map(s => {
                const m = tankStatusMeta(s);
                return (
                  <span key={s} className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${m.className}`}>● {m.label}</span>
                );
              })}
            </div>
          </div>

          <div className={`grid gap-3 ${sites.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {sites.map(site => {
              const siteTanks = rows.filter(t => t.site_id === site.id);
              return (
                <div key={site.id} className="relative rounded-lg overflow-hidden border border-border bg-muted aspect-[16/10]">
                  {site.image_url ? (
                    <img src={resolveImageUrl(site.image_url)} alt={site.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground text-center px-4">
                      Foto udara lokasi belum diunggah.<br />Admin dapat mengunggahnya di Data Entry → Tangki (BoD).
                    </div>
                  )}
                  {siteTanks.map(t => {
                    const m = tankStatusMeta(t.status);
                    const on = t.id === selected;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelected(on ? null : t.id)}
                        style={{ left: `${t.map_x}%`, top: `${t.map_y}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[10px] font-bold border-2 shadow-card bg-card transition-transform hover:scale-110 ${m.ring} ${on ? "ring-2 ring-primary" : ""}`}
                      >
                        {t.tank_code}
                      </button>
                    );
                  })}
                  <span className="absolute left-2 bottom-2 px-2 py-0.5 rounded bg-card/90 border border-border text-[10px] font-semibold text-foreground">
                    {site.name}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] italic text-muted-foreground mt-3">
            *Petunjuk: klik salah satu node tangki pada layout atau kartu di bawah untuk melihat detail dokumentasi.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 flex flex-wrap gap-3">
            {rows.length === 0 && <p className="text-xs text-muted-foreground">Belum ada data tangki untuk proyek ini.</p>}
            {rows.map(t => {
              const m = tankStatusMeta(t.status);
              const on = t.id === selected;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(on ? null : t.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card text-left transition-colors ${on ? "border-primary" : "border-border hover:border-primary/50"}`}
                >
                  <span className={`h-11 w-11 rounded-full border-[3px] ${m.ring} flex items-center justify-center text-[11px] font-bold text-foreground`}>
                    {t.tank_code}
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-foreground">
                      {t.capacity_kl ? `${Number(t.capacity_kl).toLocaleString("id-ID")} KL` : "— KL"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{t.product ?? "—"}</span>
                    <span className="block text-[10px] uppercase text-muted-foreground">{m.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected tank */}
        <section className="glass-card rounded-xl shadow-card border border-border overflow-hidden">
          {active ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Tank {active.tank_code}</h3>
                <span className="text-[10px] font-semibold uppercase text-primary">{active.product ?? "—"}</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-[16/10]">
                  {active.photo_url ? (
                    <img src={resolveImageUrl(active.photo_url)} alt={active.tank_code} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">Foto tangki belum diunggah</div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-xs text-muted-foreground">Current Status</span>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${tankStatusMeta(active.status).className}`}>
                    {tankStatusMeta(active.status).label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Progress Aktual</p>
                    <p className="text-base font-bold text-primary font-mono-data">{pct(active.pct)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Target Finish</p>
                    <p className="text-base font-bold text-foreground font-mono-data">{dateID(active.finish_date)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1.5 mb-1"><FileText className="h-3 w-3" /> Detail Pekerjaan</p>
                  <p className="text-xs text-foreground leading-relaxed">{active.description || "Belum ada narasi pekerjaan."}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-xs text-muted-foreground">Pilih salah satu tangki untuk melihat detail dokumentasinya.</p>
            </div>
          )}
        </section>

        {/* Performance */}
        <section className="glass-card rounded-xl shadow-card border border-border p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Performance
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Tank ID</th>
                <th className="text-right py-2 font-medium">Actual</th>
                <th className="text-right py-2 font-medium">Finish</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`border-b border-border/60 cursor-pointer hover:bg-muted/50 ${t.id === selected ? "bg-muted/60" : ""}`}
                >
                  <td className="py-2 font-semibold text-foreground">{t.tank_code}</td>
                  <td className="py-2 text-right font-mono-data text-primary">{pct(t.pct)}</td>
                  <td className="py-2 text-right font-mono-data text-muted-foreground">{dateID(t.finish_date)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Belum ada data tangki</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted-foreground">Progress Proyek</span>
            <span className="text-sm font-bold text-primary font-mono-data">{pct(Number(project?.progress ?? 0))}</span>
          </div>
        </section>
      </main>

      <footer className="text-center text-[11px] text-muted-foreground py-6">
        © 2026 PT Pamitra Jaya Konstruksi — Project Management Office
      </footer>
    </div>
  );
};

export default BodTankDetail;

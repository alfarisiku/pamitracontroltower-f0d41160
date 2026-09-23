import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react";
import { useBodProjects, useBodRegions, BOD_SHORT_LABEL } from "@/hooks/useTanks";
import { resolveImageUrl, getStatusMeta } from "@/lib/supabase";

const BodPortfolio = () => {
  const { region } = useParams<{ region: string }>();
  const { data: projects = [], isLoading } = useBodProjects(region);
  const { data: regions = [] } = useBodRegions();
  const regionName = regions.find(r => r.slug === region)?.region ?? region?.toUpperCase() ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="w-9 h-9 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Board of Directors — Tank View</h1>
              <p className="text-xs text-muted-foreground">Region {regionName} · PT Pamitra Jaya Konstruksi</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/bod" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-foreground hover:bg-muted/70">
              <ArrowLeft className="h-3.5 w-3.5" /> Region
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-foreground hover:bg-muted/70">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Portfolio Project — {regionName}</h2>
        <p className="text-xs text-muted-foreground mb-5">Dokumentasi lapangan dan progres per tangki — angka mengikuti data Dashboard Control Tower.</p>

        {isLoading && <p className="text-xs text-muted-foreground">Memuat data…</p>}
        {!isLoading && projects.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada proyek untuk region ini.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(p => {
            const meta = getStatusMeta(p.status);
            return (
              <Link
                key={p.id}
                to={`/bod/${region}/${p.id}`}
                className="glass-card rounded-xl shadow-card overflow-hidden border border-border hover:shadow-lg transition-shadow group"
              >
                <div className="relative h-44 bg-muted">
                  {p.image_url ? (
                    <img src={resolveImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Belum ada foto proyek</div>
                  )}
                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase border ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-foreground leading-snug min-h-[2.5rem]">
                    {BOD_SHORT_LABEL[p.project_code] ?? p.name}
                  </h3>
                  <div className="mt-3 pt-3 border-t border-border flex items-end justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary">
                      Lihat detail tangki <ArrowRight className="h-3 w-3" />
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Progress</p>
                      <p className="text-lg font-bold text-primary font-mono-data">
                        {Number(p.progress ?? 0).toFixed(2).replace(".", ",")}%
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="text-center text-[11px] text-muted-foreground py-6">
        © 2026 PT Pamitra Jaya Konstruksi — Project Management Office
      </footer>
    </div>
  );
};

export default BodPortfolio;

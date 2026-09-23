import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Layers } from "lucide-react";
import { useBodRegions } from "@/hooks/useTanks";

const BodRegions = () => {
  const { data: regions = [], isLoading } = useBodRegions();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="w-9 h-9 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Board of Directors — Tank View</h1>
              <p className="text-xs text-muted-foreground">PT Pamitra Jaya Konstruksi · Project Management Information System</p>
            </div>
          </div>
          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-medium text-foreground hover:bg-muted/70">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Pilih Region</h2>
        <p className="text-xs text-muted-foreground mb-5">Pilih region untuk melihat portfolio proyek tangki beserta dokumentasi per tangki.</p>

        {isLoading && <p className="text-xs text-muted-foreground">Memuat data…</p>}
        {!isLoading && regions.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada region. Tandai region proyek di Data Entry → Tangki (BoD).</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {regions.map(r => (
            <Link
              key={r.slug}
              to={`/bod/${r.slug}`}
              className="glass-card rounded-xl shadow-card border border-border p-5 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <span className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">{r.region}</h3>
                  <p className="text-[11px] text-muted-foreground">{r.count} proyek · /bod/{r.slug}</p>
                </div>
              </div>
              <span className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary">
                Buka portfolio <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="text-center text-[11px] text-muted-foreground py-6">
        © 2026 PT Pamitra Jaya Konstruksi — Project Management Office
      </footer>
    </div>
  );
};

export default BodRegions;

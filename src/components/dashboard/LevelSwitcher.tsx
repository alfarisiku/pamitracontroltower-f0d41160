import { useLocation, useNavigate } from "react-router-dom";
import { useAccess, AccessLevel } from "@/contexts/AccessContext";
import { Layers, RotateCcw } from "lucide-react";

const LEVELS: { level: AccessLevel; label: string; hint: string }[] = [
  { level: 1, label: "Level 1", hint: "Detail penuh — semua tab, angka rupiah, dan status apa adanya" },
  { level: 2, label: "Level 2", hint: "Ringkas — Project Summary, Data Entry, Activity Log" },
  { level: 3, label: "Level 3", hint: "Publik — tanpa rupiah, tanpa angka plan, tanpa status bermasalah" },
];

export function LevelSwitcher() {
  const { level, maxLevel, isAdmin, setLevel } = useAccess();
  const location = useLocation();
  const navigate = useNavigate();

  // Level hanya bisa dicoba oleh admin; pengguna lain mengikuti hak akunnya.
  if (!isAdmin) return null;

  const handle = (l: AccessLevel) => {
    const onDetail = location.pathname.startsWith("/project/");
    const search = l === maxLevel ? "" : `?level=${l}`;
    if (onDetail) {
      setLevel(l);
      return;
    }
    if (l === 3) navigate(`/${search}`);
    else navigate(`/projects${search}`);
    setLevel(l);
  };

  const reset = () => {
    setLevel(maxLevel);
    navigate(location.pathname, { replace: true });
  };

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted border border-border" title="Demo: level tampilan (admin)">
      <Layers className="h-3.5 w-3.5 text-muted-foreground ml-2 mr-0.5" />
      {LEVELS.map(l => (
        <button
          key={l.level}
          onClick={() => handle(l.level)}
          title={l.hint}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            level === l.level
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.label}
        </button>
      ))}
      {level !== maxLevel && (
        <button
          onClick={reset}
          title="Kembali ke akses penuh"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Akses penuh
        </button>
      )}
    </div>
  );
}

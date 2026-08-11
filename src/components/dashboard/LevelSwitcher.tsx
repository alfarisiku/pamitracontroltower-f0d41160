import { useLocation, useNavigate } from "react-router-dom";
import { useDemoLevel, DemoLevel } from "@/contexts/DemoLevelContext";
import { Layers } from "lucide-react";

const LEVELS: { level: DemoLevel; label: string; hint: string }[] = [
  { level: 1, label: "Level 1", hint: "Detail penuh — semua tab, angka rupiah, dan status apa adanya" },
  { level: 2, label: "Level 2", hint: "Ringkas — grid semua project dengan angka, tanpa detail operasional" },
  { level: 3, label: "Level 3", hint: "Publik — tanpa rupiah, tanpa angka plan, tanpa status bermasalah" },
];

export function LevelSwitcher() {
  const { level, setLevel } = useDemoLevel();
  const location = useLocation();
  const navigate = useNavigate();

  const handle = (l: DemoLevel) => {
    const onDetail = location.pathname.startsWith("/project/");
    const search = `?level=${l}`;
    if (l === 1) {
      if (onDetail) setLevel(l);
      else navigate(`/projects${search}`);
      return;
    }
    if (l === 2) {
      navigate(`/projects${search}`);
      return;
    }
    // Level 3 → tampilan Overview (kecuali sedang di detail project, tetap di detail dengan pembatasan)
    if (onDetail) setLevel(l);
    else navigate(`/${search}`);
  };

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-full bg-muted border border-border" title="Demo: level tampilan">
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
    </div>
  );
}

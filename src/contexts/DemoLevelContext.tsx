import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

export type DemoLevel = 1 | 2 | 3;

interface DemoLevelCtx {
  level: DemoLevel;
  setLevel: (l: DemoLevel) => void;
  /** Level 3: sembunyikan semua nilai rupiah */
  hideMoney: boolean;
  /** Level 3: sembunyikan angka rencana/plan (hanya actual) */
  hidePlan: boolean;
  /** Level 3: jangan tampilkan status bermasalah (At Risk / Delayed) */
  neutralStatus: boolean;
  /** Level 3: sembunyikan detail operasional (qty, weight, sub-task, total) */
  hideOperationalDetail: boolean;
}

const Ctx = createContext<DemoLevelCtx>({
  level: 1,
  setLevel: () => {},
  hideMoney: false,
  hidePlan: false,
  neutralStatus: false,
  hideOperationalDetail: false,
});

let lastLevel: DemoLevel = 1;

export function DemoLevelProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const urlRaw = Number(params.get("level"));
  const urlLevel: DemoLevel | null = urlRaw === 2 || urlRaw === 3 ? (urlRaw as DemoLevel) : urlRaw === 1 ? 1 : null;
  // Level disimpan di state React (persist saat pindah halaman), URL hanya sinkronisasi awal/manual.
  const [level, setLevelState] = useState<DemoLevel>(urlLevel ?? lastLevel);

  useEffect(() => {
    if (urlLevel && urlLevel !== level) setLevelState(urlLevel);
    lastLevel = urlLevel ?? level;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLevel]);

  const value = useMemo<DemoLevelCtx>(() => ({
    level,
    setLevel: (l: DemoLevel) => {
      lastLevel = l;
      setLevelState(l);
      const next = new URLSearchParams(params);
      next.set("level", String(l));
      setParams(next, { replace: false });
    },
    hideMoney: level === 3,
    hidePlan: level === 3,
    neutralStatus: level === 3,
    hideOperationalDetail: level >= 2,
  }), [level, params, setParams]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDemoLevel = () => useContext(Ctx);

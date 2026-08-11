import { createContext, useContext, useMemo, ReactNode } from "react";
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

export function DemoLevelProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("level"));
  const level: DemoLevel = raw === 2 || raw === 3 ? (raw as DemoLevel) : 1;

  const value = useMemo<DemoLevelCtx>(() => ({
    level,
    setLevel: (l: DemoLevel) => {
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

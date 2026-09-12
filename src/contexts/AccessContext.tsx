import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export type AccessLevel = 1 | 2 | 3;

interface AccessCtx {
  /** Level tampilan efektif (tidak pernah melebihi hak asli user) */
  level: AccessLevel;
  /** Level maksimum yang boleh diakses user ini */
  maxLevel: AccessLevel;
  /** Admin boleh menurunkan level untuk demo */
  setLevel: (l: AccessLevel) => void;
  /** Daftar project_id yang boleh dilihat. null = semua proyek (admin) */
  scope: string[] | null;
  canView: (projectId?: string | null) => boolean;
  canEdit: (projectId?: string | null) => boolean;
  filterProjects: <T extends { id: string }>(rows: T[]) => T[];
  isAdmin: boolean;
  /** Level 3: sembunyikan semua nilai rupiah */
  hideMoney: boolean;
  /** Level 3: sembunyikan angka rencana/plan (hanya actual) */
  hidePlan: boolean;
  /** Level 3: jangan tampilkan status bermasalah (At Risk / Delayed) */
  neutralStatus: boolean;
  /** Level 2+: sembunyikan detail operasional (qty, weight, sub-task, total) */
  hideOperationalDetail: boolean;
}

const Ctx = createContext<AccessCtx | undefined>(undefined);

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, role, assignedProjectIds, profile, loading } = useAuth();
  const [params, setParams] = useSearchParams();

  const isAdmin = role === "admin";
  const isActive = !user || profile?.status === "active";

  // Scope proyek: admin = semua (null). User dengan assignment = hanya proyek miliknya.
  // Tamu / user tanpa assignment = semua proyek tapi tampilan publik (Level 3, tanpa angka rupiah).
  const scope: string[] | null =
    isAdmin ? null : (assignedProjectIds.length > 0 ? assignedProjectIds : null);

  // Level maksimum sesuai hak asli
  const maxLevel: AccessLevel = useMemo(() => {
    if (loading) return 3;
    if (!user) return 3;
    if (isAdmin) return 1;
    if (isActive && assignedProjectIds.length > 0) return 2;
    return 3;
  }, [loading, user, isAdmin, isActive, assignedProjectIds.length]);

  const urlRaw = Number(params.get("level"));
  const urlLevel: AccessLevel | null = urlRaw === 1 || urlRaw === 2 || urlRaw === 3 ? (urlRaw as AccessLevel) : null;

  const [chosen, setChosen] = useState<AccessLevel | null>(urlLevel ?? lastLevel);

  useEffect(() => {
    if (urlLevel && urlLevel !== chosen) setChosen(urlLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLevel]);

  // Level efektif tidak pernah lebih tinggi (angka lebih kecil) dari hak asli
  const level: AccessLevel = (Math.max(chosen ?? maxLevel, maxLevel) as AccessLevel);
  lastLevel = chosen;

  const value = useMemo<AccessCtx>(() => {
    const canView = (projectId?: string | null) => {
      if (!projectId) return false;
      if (scope === null) return true;
      return scope.includes(projectId);
    };
    return {
      level,
      maxLevel,
      isAdmin,
      scope,
      canView,
      canEdit: (projectId?: string | null) => canView(projectId) && isActive && level <= 2,
      filterProjects: (rows) => (scope === null ? rows : rows.filter(r => scope.includes(r.id))),
      setLevel: (l: AccessLevel) => {
        const next = (Math.max(l, maxLevel) as AccessLevel);
        lastLevel = next;
        setChosen(next);
        const p = new URLSearchParams(params);
        p.set("level", String(next));
        setParams(p, { replace: false });
      },
      hideMoney: level === 3,
      hidePlan: level === 3,
      neutralStatus: level === 3,
      hideOperationalDetail: level >= 2,
    };
  }, [level, maxLevel, isAdmin, scope, isActive, params, setParams]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccess() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}

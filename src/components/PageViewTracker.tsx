import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_LABELS: [RegExp, string][] = [
  [/^\/$/, "Overview"],
  [/^\/bod\/[^/]+\/[^/]+$/, "BoD Tank Detail"],
  [/^\/bod\/[^/]+$/, "BoD Portfolio"],
  [/^\/bod$/, "BoD Regions"],
  [/^\/projects$/, "Project Summary"],
  [/^\/data-entry$/, "Data Entry"],
  [/^\/activity-log$/, "Activity Log"],
  [/^\/project\/[^/]+\/ppt-preview$/, "PPT Preview"],
  [/^\/project\/[^/]+$/, "Project Detail"],
  [/^\/overview-eksekutif$/, "Executive Overview"],
  [/^\/schedule$/, "Schedule"],
  [/^\/cost$/, "Cost Performance"],
  [/^\/finance$/, "Finance"],
  [/^\/risk$/, "Risk Monitoring"],
  [/^\/reporting$/, "Reporting"],
  [/^\/war-room$/, "War Room"],
  [/^\/account-manager$/, "Account Manager"],
];

/** Mencatat halaman yang dibuka oleh akun yang login (action = "view"). */
export function PageViewTracker() {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const last = useRef<string>("");

  useEffect(() => {
    if (!user || pathname === "/login" || pathname === "/pending") return;
    const key = `${user.id}:${pathname}`;
    if (last.current === key) return;
    last.current = key;
    const label = PAGE_LABELS.find(([re]) => re.test(pathname))?.[1] ?? pathname;
    const m = pathname.match(/^\/project\/([0-9a-f-]{36})/);
    supabase.from("activity_logs").insert({
      entity_type: "page",
      action: "view",
      details: `Membuka ${label} (${pathname})`,
      project_id: m?.[1] ?? null,
      user_id: user.id,
      user_name: profile?.display_name || user.email || "Tamu",
    }).then(() => {});
  }, [pathname, user, profile]);

  return null;
}

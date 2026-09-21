/** Daftar menu sidebar yang bisa diatur per akun oleh admin */
export const MENU_DEFS: { path: string; label: string }[] = [
  { path: "/", label: "Overview" },
  { path: "/overview-eksekutif", label: "Overview Eksekutif" },
  { path: "/projects", label: "Project Summary" },
  { path: "/schedule", label: "Schedule" },
  { path: "/cost", label: "Cost Performance" },
  { path: "/finance", label: "Finance" },
  { path: "/risk", label: "Risk Monitoring" },
  { path: "/reporting", label: "Reporting" },
  { path: "/data-entry", label: "Data Entry" },
  { path: "/activity-log", label: "Activity Log" },
  { path: "/war-room", label: "War Room" },
  { path: "/bod", label: "BoD Tank View" },
];

/** Menu bawaan untuk akun level 2 bila admin belum mengatur menu khusus */
export const DEFAULT_LEVEL2_MENUS = ["/projects", "/data-entry", "/activity-log"];

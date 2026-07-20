// Shared map coordinate utilities
// Detects whether coords are real lat/lng or old 0-100 system and normalizes

export function toLatLng(mapX: number, mapY: number): [number, number] {
  // If mapX looks like real latitude (Indonesia: -11 to 6) use directly
  if (mapX >= -15 && mapX <= 10 && mapY >= 90 && mapY <= 145) {
    return [mapX, mapY];
  }
  // Old 0-100 system: convert to Indonesia bounds
  const lng = 95 + (mapX / 100) * 46;   // 95-141
  const lat = 6 - (mapY / 100) * 17;    // 6 to -11
  return [lat, lng];
}

export const STATUS_COLORS: Record<string, string> = {
  // NEW
  "planning":  "#6366f1",
  "execution": "#22c55e",
  "on-hold":   "#f59e0b",
  "completed": "#3b82f6",
  "closed":    "#6b7280",
  // LEGACY
  "on-track": "#22c55e",
  "at-risk":  "#eab308",
  "delayed":  "#ef4444",
};

export const STATUS_LABELS: Record<string, string> = {
  "planning":  "Planning",
  "execution": "Execution",
  "on-hold":   "On Hold",
  "completed": "Completed",
  "closed":    "Closed",
  "on-track":  "On Track",
  "at-risk":   "At Risk",
  "delayed":   "Delayed",
};

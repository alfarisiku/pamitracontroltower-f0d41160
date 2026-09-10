// Kompatibilitas: level tampilan sekarang berasal dari hak akses user (AccessContext).
export { AccessProvider as DemoLevelProvider, useAccess as useDemoLevel } from "@/contexts/AccessContext";
export type { AccessLevel as DemoLevel } from "@/contexts/AccessContext";

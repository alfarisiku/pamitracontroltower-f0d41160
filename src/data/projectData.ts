export type ProjectStatus = "on-track" | "at-risk" | "delayed" | "completed";
export type ProjectPhase = "Engineering" | "Procurement" | "Construction" | "Commissioning";

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  phase: ProjectPhase;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  manager: string;
}

export const projects: Project[] = [
  {
    id: "EPC-001",
    name: "Kilang Minyak Balikpapan",
    client: "PT Pertamina",
    status: "on-track",
    phase: "Construction",
    progress: 72,
    budget: 850000,
    spent: 612000,
    startDate: "2025-03-01",
    endDate: "2026-09-30",
    manager: "Andi Wijaya",
  },
  {
    id: "EPC-002",
    name: "PLTU Batang Unit 3",
    client: "PLN Nusantara",
    status: "at-risk",
    phase: "Procurement",
    progress: 45,
    budget: 1200000,
    spent: 680000,
    startDate: "2025-01-15",
    endDate: "2027-06-30",
    manager: "Siti Rahayu",
  },
  {
    id: "EPC-003",
    name: "Gas Processing Plant Cepu",
    client: "ExxonMobil Cepu",
    status: "on-track",
    phase: "Engineering",
    progress: 28,
    budget: 450000,
    spent: 126000,
    startDate: "2025-06-01",
    endDate: "2026-12-31",
    manager: "Budi Santoso",
  },
  {
    id: "EPC-004",
    name: "LNG Terminal Tangguh",
    client: "BP Indonesia",
    status: "delayed",
    phase: "Construction",
    progress: 61,
    budget: 2100000,
    spent: 1470000,
    startDate: "2024-08-01",
    endDate: "2026-08-31",
    manager: "Dewi Lestari",
  },
  {
    id: "EPC-005",
    name: "Solar Farm Kupang 50MW",
    client: "PT Medco Power",
    status: "on-track",
    phase: "Procurement",
    progress: 35,
    budget: 320000,
    spent: 96000,
    startDate: "2025-09-01",
    endDate: "2026-06-30",
    manager: "Reza Pratama",
  },
  {
    id: "EPC-006",
    name: "Petrochemical Complex Cilegon",
    client: "Chandra Asri",
    status: "completed",
    phase: "Commissioning",
    progress: 100,
    budget: 1800000,
    spent: 1750000,
    startDate: "2023-01-15",
    endDate: "2025-12-31",
    manager: "Andi Wijaya",
  },
  {
    id: "EPC-007",
    name: "PLTMG Sorong 25MW",
    client: "PLN Nusantara",
    status: "at-risk",
    phase: "Engineering",
    progress: 18,
    budget: 280000,
    spent: 72000,
    startDate: "2025-11-01",
    endDate: "2027-03-31",
    manager: "Hendra Kusuma",
  },
  {
    id: "EPC-008",
    name: "Water Treatment Plant Semarang",
    client: "PDAM Tirta Moedal",
    status: "on-track",
    phase: "Construction",
    progress: 55,
    budget: 150000,
    spent: 82500,
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    manager: "Siti Rahayu",
  },
];

export const phaseDistribution = [
  { name: "Engineering", value: 2, fill: "hsl(174, 62%, 47%)" },
  { name: "Procurement", value: 2, fill: "hsl(38, 92%, 55%)" },
  { name: "Construction", value: 3, fill: "hsl(220, 70%, 55%)" },
  { name: "Commissioning", value: 1, fill: "hsl(152, 60%, 45%)" },
];

export const monthlyBudget = [
  { month: "Sep", planned: 320, actual: 310 },
  { month: "Okt", planned: 380, actual: 395 },
  { month: "Nov", planned: 420, actual: 450 },
  { month: "Des", planned: 460, actual: 440 },
  { month: "Jan", planned: 500, actual: 520 },
  { month: "Feb", planned: 540, actual: 555 },
];

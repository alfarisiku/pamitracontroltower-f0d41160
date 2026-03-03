import { useState } from "react";
import { Briefcase, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { PhaseChart } from "@/components/dashboard/PhaseChart";
import { BudgetChart } from "@/components/dashboard/BudgetChart";
import { IndonesiaMap } from "@/components/dashboard/IndonesiaMap";
import { OverallSummary } from "@/components/dashboard/OverallSummary";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";
import { useProjects } from "@/hooks/useProjects";
import { formatRupiah, DbProject } from "@/lib/supabase";

const Index = () => {
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const { data: projects = [], isLoading } = useProjects();

  const active = projects.filter((p) => p.status !== "completed").length;
  const atRisk = projects.filter((p) => p.status === "at-risk" || p.status === "delayed").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Memuat data proyek...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          {/* Executive Summary - KPI Cards */}
          <div className="mb-1">
            <h2 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KPICard
              title="Total Projects"
              value={projects.length}
              subtitle={`${active} aktif`}
              icon={Briefcase}
              variant="primary"
              trend={{ value: 12, positive: true }}
            />
            <KPICard
              title="Total Contract Value"
              value={formatRupiah(totalBudget)}
              subtitle={`${formatRupiah(totalSpent)} terpakai`}
              icon={DollarSign}
              variant="accent"
            />
            <KPICard
              title="Overall Progress"
              value={`${Math.round(projects.reduce((s, p) => s + p.progress, 0) / (projects.length || 1))}%`}
              subtitle="Rata-rata semua proyek"
              icon={CheckCircle2}
              variant="success"
            />
            <KPICard
              title="Contractual Risk"
              value={atRisk}
              subtitle={`${atRisk > 0 ? "RED ISSUES" : "No issues"}`}
              icon={AlertTriangle}
              variant={atRisk > 0 ? "destructive" : "success"}
            />
          </div>

          {/* Map + Table + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-5">
            <div className="lg:col-span-3 space-y-3">
              <IndonesiaMap projects={projects} onSelectProject={setSelectedProject} />
              <ProjectTable projects={projects} onSelectProject={setSelectedProject} />
            </div>
            <div className="space-y-3">
              <AlertsPanel />
              <OverallSummary projects={projects} />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <BudgetChart />
            </div>
            <PhaseChart projects={projects} />
          </div>
        </div>
      </main>

      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default Index;

import { useState } from "react";
import { Briefcase, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { PhaseChart } from "@/components/dashboard/PhaseChart";
import { BudgetChart } from "@/components/dashboard/BudgetChart";
import { IndonesiaMap } from "@/components/dashboard/IndonesiaMap";
import { OverallSummary } from "@/components/dashboard/OverallSummary";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";
import { projects, Project, formatRupiah } from "@/data/projectData";

const Index = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const active = projects.filter((p) => p.status !== "completed").length;
  const atRisk = projects.filter((p) => p.status === "at-risk" || p.status === "delayed").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const budgetPct = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1440px] mx-auto">
        <DashboardHeader />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Total Proyek Aktif"
            value={active}
            subtitle={`${projects.length} total proyek`}
            icon={Briefcase}
            variant="primary"
            trend={{ value: 12, positive: true }}
          />
          <KPICard
            title="At Risk / Delayed"
            value={atRisk}
            subtitle="Memerlukan perhatian"
            icon={AlertTriangle}
            variant="warning"
          />
          <KPICard
            title="Selesai"
            value={completed}
            subtitle="Tahun ini"
            icon={CheckCircle2}
            variant="success"
          />
          <KPICard
            title="Utilisasi Anggaran"
            value={`${budgetPct}%`}
            subtitle={`${formatRupiah(totalSpent)} / ${formatRupiah(totalBudget)}`}
            icon={DollarSign}
            variant={budgetPct > 85 ? "destructive" : "default"}
          />
        </div>

        {/* Map + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            <IndonesiaMap onSelectProject={setSelectedProject} />
          </div>
          <OverallSummary />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <BudgetChart />
          </div>
          <PhaseChart />
        </div>

        {/* Project Table */}
        <ProjectTable onSelectProject={setSelectedProject} />
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default Index;

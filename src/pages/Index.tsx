import { Briefcase, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { ProjectTable } from "@/components/dashboard/ProjectTable";
import { PhaseChart } from "@/components/dashboard/PhaseChart";
import { BudgetChart } from "@/components/dashboard/BudgetChart";
import { projects } from "@/data/projectData";

const Index = () => {
  const active = projects.filter((p) => p.status !== "completed").length;
  const atRisk = projects.filter((p) => p.status === "at-risk" || p.status === "delayed").length;
  const completed = projects.filter((p) => p.status === "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const budgetPct = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
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
            title="Budget Utilization"
            value={`${budgetPct}%`}
            subtitle={`$${(totalSpent / 1000000).toFixed(1)}M / $${(totalBudget / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            variant={budgetPct > 85 ? "destructive" : "default"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2">
            <BudgetChart />
          </div>
          <PhaseChart />
        </div>

        {/* Project Table */}
        <ProjectTable />
      </div>
    </div>
  );
};

export default Index;

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Database, FileText, DollarSign, ClipboardList, FileBarChart, Download, Share2,
  Layers, Camera, AlertTriangle, Package, Target,
} from "lucide-react";
import { RegularUpdateTab } from "@/components/data-entry/RegularUpdateTab";
import { ProjectCrudTab } from "@/components/data-entry/ProjectCrudTab";
import { AddendumTab } from "@/components/data-entry/AddendumTab";
import { FinanceEntriesEditor } from "@/components/data-entry/FinanceEntriesEditor";
import { SCurveEditor } from "@/components/data-entry/SCurveEditor";
import { WBSCrudPanel } from "@/components/data-entry/WBSCrudPanel";
import { PhotoUploader } from "@/components/data-entry/PhotoUploader";
import { WeeklyReportEditor } from "@/components/data-entry/WeeklyReportEditor";
import { RiskResolvePanel } from "@/components/data-entry/RiskResolvePanel";
import { ProcurementPanel } from "@/components/data-entry/ProcurementPanel";
import { MilestonesEditor } from "@/components/data-entry/MilestonesEditor";

type ActiveTab = "regular" | "wbs" | "milestones" | "risk" | "photos" | "weekly-report" | "procurement" | "finance" | "scurve" | "project-crud" | "addendum";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

const DataEntry = () => {
  const { data: allProjects = [] } = useProjects();
  const { isTeam, isAdmin, assignedProjectIds } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("regular");
  const [updateProjectId, setUpdateProjectId] = useState<string>("");

  // Access-level restriction removed — every visitor is treated as admin, so show all projects.
  const projects = isAdmin
    ? allProjects
    : (isTeam ? allProjects.filter(p => assignedProjectIds.includes(p.id)) : allProjects);

  // Urutan disamakan dengan tab Project Detail: Health/Overview → Finance → S-Curve → WBS → Procurement → Risk → Milestones → Weekly Report → Media
  const allTabs = [
    { key: "regular" as const,       label: "Quick Weekly Update", icon: FileText,      adminOnly: false },
    { key: "finance" as const,       label: "Finance (Cash Flow)", icon: DollarSign,    adminOnly: false },
    { key: "scurve" as const,        label: "S-Curve",             icon: FileBarChart,  adminOnly: false },
    { key: "wbs" as const,           label: "WBS (Full CRUD)",     icon: Layers,        adminOnly: false },
    { key: "procurement" as const,   label: "Procurement / PO",    icon: Package,       adminOnly: false },
    { key: "risk" as const,          label: "Risk & Issue",        icon: AlertTriangle, adminOnly: false },
    { key: "milestones" as const,    label: "Milestones",          icon: Target,        adminOnly: false },
    { key: "weekly-report" as const, label: "Weekly Report",       icon: FileText,      adminOnly: false },
    { key: "photos" as const,        label: "Weekly Photos",       icon: Camera,        adminOnly: false },
    { key: "addendum" as const,      label: "Addendum",            icon: FileBarChart,  adminOnly: true },
    { key: "project-crud" as const,  label: "Manage Projects",     icon: ClipboardList, adminOnly: true },
  ];
  const tabs = allTabs.filter(t => isAdmin || !t.adminOnly);

  const downloadTemplate = () => {
    const csv = "project_code,work_area_code,work_area_name,epcc,work_item_code,work_item_name,unit,qty_total,qty_completed,weight\nPMT-001,WA-001,Area Tangki,construction,WI-001,Tangki T-101,unit,10,5,30";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "project_data_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Data Entry Center", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Data Entry Center</h2>
              <p className="text-xs text-muted-foreground">Project Control System — Full CRUD, search, filter, export, dan integrasi ke dashboard.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90"><Download className="h-3.5 w-3.5" /> Template CSV</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-5 border-b border-border pb-2 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "project-crud" && (
            <div className="mb-5">
              <label className={labelCls}>Pilih Proyek</label>
              <select value={updateProjectId} onChange={e => setUpdateProjectId(e.target.value)} className={inputCls}>
                <option value="">— Pilih Proyek —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === "regular" && updateProjectId && <RegularUpdateTab projectId={updateProjectId} projects={projects} />}
          {activeTab === "wbs" && updateProjectId && <WBSCrudPanel projectId={updateProjectId} />}
          {activeTab === "milestones" && updateProjectId && <MilestonesEditor projectId={updateProjectId} />}
          {activeTab === "risk" && updateProjectId && <RiskResolvePanel projectId={updateProjectId} />}
          {activeTab === "photos" && updateProjectId && <PhotoUploader projectId={updateProjectId} />}
          {activeTab === "weekly-report" && updateProjectId && <WeeklyReportEditor projectId={updateProjectId} />}
          {activeTab === "procurement" && updateProjectId && <ProcurementPanel projectId={updateProjectId} />}
          {activeTab === "finance" && updateProjectId && <FinanceEntriesEditor projectId={updateProjectId} />}
          {activeTab === "scurve" && updateProjectId && <SCurveEditor projectId={updateProjectId} />}
          {activeTab === "addendum" && updateProjectId && <AddendumTab projectId={updateProjectId} projects={projects} />}
          {activeTab === "project-crud" && <ProjectCrudTab projects={projects} />}

          {!updateProjectId && activeTab !== "project-crud" && (
            <div className="glass-card rounded-lg shadow-card p-8 text-center">
              <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Pilih proyek di atas untuk mulai menginput data</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataEntry;

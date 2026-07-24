import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import {
  Database, FileText, DollarSign, ClipboardList, FileBarChart, Share2,
  Layers, Camera, AlertTriangle, Package, Target, FileSpreadsheet, ChevronDown, ChevronRight, TrendingUp,
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
import { ExcelSyncPanel } from "@/components/data-entry/ExcelSyncPanel";

type ActiveTab = "regular" | "wbs" | "milestones" | "risk" | "photos" | "weekly-report" | "procurement" | "finance" | "scurve" | "project-crud" | "addendum";

const inputCls = "w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "text-[10px] text-muted-foreground uppercase mb-1 block";

const DataEntry = () => {
  const { data: allProjects = [] } = useProjects();
  const { isTeam, isAdmin, assignedProjectIds } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("regular");
  const [updateProjectId, setUpdateProjectId] = useState<string>("");
  const [excelOpen, setExcelOpen] = useState(false);

  const projects = isAdmin
    ? allProjects
    : (isTeam ? allProjects.filter(p => assignedProjectIds.includes(p.id)) : allProjects);

  // Order mirrors Project Detail: Health → S-Curve → Milestones → WBS → Procurement → Finance → Risks → Weekly Report → Media
  // Quick Weekly Update stands alone at the top. Manage Projects moved out to a top-right button.
  const allTabs = [
    { key: "regular" as const,       label: "Quick Weekly Update", icon: FileText,        adminOnly: false, group: "quick" as const },
    { key: "scurve" as const,        label: "S-Curve",             icon: TrendingUp,      adminOnly: false, group: "project" as const },
    { key: "milestones" as const,    label: "Milestones",          icon: Target,          adminOnly: false, group: "project" as const },
    { key: "wbs" as const,           label: "WBS (Full CRUD)",     icon: Layers,          adminOnly: false, group: "project" as const },
    { key: "procurement" as const,   label: "Procurement / PO",    icon: Package,         adminOnly: false, group: "project" as const },
    { key: "finance" as const,       label: "Finance (Cash Flow)", icon: DollarSign,      adminOnly: false, group: "project" as const },
    { key: "risk" as const,          label: "Risk & Issue",        icon: AlertTriangle,   adminOnly: false, group: "project" as const },
    { key: "weekly-report" as const, label: "Weekly Report",       icon: FileText,        adminOnly: false, group: "project" as const },
    { key: "photos" as const,        label: "Weekly Photos",       icon: Camera,          adminOnly: false, group: "project" as const },
    { key: "addendum" as const,      label: "Addendum",            icon: FileBarChart,    adminOnly: true,  group: "project" as const },
  ];
  const tabs = allTabs.filter(t => isAdmin || !t.adminOnly);
  const quickTabs = tabs.filter(t => t.group === "quick");
  const projectTabs = tabs.filter(t => t.group === "project");

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
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("project-crud")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeTab === "project-crud" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"}`}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Manage Projects
                </button>
              )}
            </div>
          </div>


          <div className="flex items-center gap-2 mb-5 border-b border-border pb-2 overflow-x-auto">
            {quickTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
            {quickTabs.length > 0 && projectTabs.length > 0 && (
              <div className="mx-1 flex items-center gap-1.5 pl-3 border-l border-border/60 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Per-Project
              </div>
            )}
            {projectTabs.map(tab => (
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

          {activeTab !== "project-crud" && updateProjectId && (() => {
            const p = projects.find(pr => pr.id === updateProjectId);
            if (!p) return null;
            return (
              <div className="mb-5">
                <button
                  onClick={() => setExcelOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 hover:bg-muted text-foreground rounded-lg text-xs font-medium border border-border transition-colors"
                >
                  {excelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  Excel Import / Export
                  <span className="text-[10px] text-muted-foreground font-normal">(sync offline via workbook)</span>
                </button>
                {excelOpen && <div className="mt-2"><ExcelSyncPanel project={p} /></div>}
              </div>
            );
          })()}

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

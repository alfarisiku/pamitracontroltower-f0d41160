import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoLevelProvider } from "@/contexts/DemoLevelContext";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import Index from "./pages/Index";
import ExecutiveOverview from "./pages/ExecutiveOverview";

import ProjectSummary from "./pages/ProjectSummary";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectPptPreview from "./pages/ProjectPptPreview";
import Schedule from "./pages/Schedule";
import CostPerformance from "./pages/CostPerformance";
import Finance from "./pages/Finance";
import RiskMonitoring from "./pages/RiskMonitoring";
import Reporting from "./pages/Reporting";
import DataEntry from "./pages/DataEntry";
import WarRoom from "./pages/WarRoom";
import ActivityLog from "./pages/ActivityLog";
import AccountManager from "./pages/AccountManager";
import UserGuide from "./pages/UserGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Access levels removed — every route is open to all visitors.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<PendingApproval />} />

      <Route path="/" element={<Index />} />
      <Route path="/overview-eksekutif" element={<ExecutiveOverview />} />
      <Route path="/projects" element={<ProjectSummary />} />

      <Route path="/project/:id" element={<ProjectDetail />} />
      <Route path="/project/:id/ppt-preview" element={<ProjectPptPreview />} />
      <Route path="/schedule" element={<Schedule />} />
      <Route path="/cost" element={<CostPerformance />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/risk" element={<RiskMonitoring />} />
      <Route path="/reporting" element={<Reporting />} />
      <Route path="/data-entry" element={<DataEntry />} />
      <Route path="/war-room" element={<WarRoom />} />
      <Route path="/activity-log" element={<ActivityLog />} />
      <Route path="/guide" element={<UserGuide />} />
      <Route path="/account-manager" element={<AccountManager />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DemoLevelProvider>
            <AppRoutes />
          </DemoLevelProvider>
        </AuthProvider>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

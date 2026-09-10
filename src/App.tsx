import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessProvider } from "@/contexts/AccessContext";

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

// Level 1 = admin (semua halaman), Level 2 = user proyek, Level 3 = publik.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<PendingApproval />} />

      {/* Level 3 — publik */}
      <Route path="/" element={<Index />} />
      <Route path="/guide" element={<UserGuide />} />

      {/* Level 2 — user dengan proyek yang di-assign */}
      <Route path="/projects" element={<ProtectedRoute minLevel={2}><ProjectSummary /></ProtectedRoute>} />
      <Route path="/data-entry" element={<ProtectedRoute minLevel={2}><DataEntry /></ProtectedRoute>} />
      <Route path="/activity-log" element={<ProtectedRoute minLevel={2}><ActivityLog /></ProtectedRoute>} />
      <Route path="/project/:id" element={<ProtectedRoute minLevel={2} requireProject><ProjectDetail /></ProtectedRoute>} />
      <Route path="/project/:id/ppt-preview" element={<ProtectedRoute minLevel={2} requireProject><ProjectPptPreview /></ProtectedRoute>} />

      {/* Level 1 — admin */}
      <Route path="/overview-eksekutif" element={<ProtectedRoute minLevel={1}><ExecutiveOverview /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute minLevel={1}><Schedule /></ProtectedRoute>} />
      <Route path="/cost" element={<ProtectedRoute minLevel={1}><CostPerformance /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute minLevel={1}><Finance /></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute minLevel={1}><RiskMonitoring /></ProtectedRoute>} />
      <Route path="/reporting" element={<ProtectedRoute minLevel={1}><Reporting /></ProtectedRoute>} />
      <Route path="/war-room" element={<ProtectedRoute minLevel={1}><WarRoom /></ProtectedRoute>} />
      <Route path="/account-manager" element={<ProtectedRoute minLevel={1}><AccountManager /></ProtectedRoute>} />

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
          <AccessProvider>
            <AppRoutes />
          </AccessProvider>
        </AuthProvider>
      </BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

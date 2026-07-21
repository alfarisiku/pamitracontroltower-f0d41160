import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import PendingApproval from "./pages/PendingApproval";
import Index from "./pages/Index";
import ProjectSummary from "./pages/ProjectSummary";
import ProjectDetail from "./pages/ProjectDetail";
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

// Role-based access control:
// - admin: full system access (CRUD + user management)
// - management: read-only dashboards/reports (director view)
// - team (Project Admin): CRUD only on assigned projects; no user/system mgmt
// - client (Public): Overview + Project Summary only; no financial/risk data
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<PendingApproval />} />

      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectSummary /></ProtectedRoute>} />
      <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["admin","management","team"]}><Schedule /></ProtectedRoute>} />
      <Route path="/cost" element={<ProtectedRoute allowedRoles={["admin","management","team"]}><CostPerformance /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute allowedRoles={["admin","management","team"]}><Finance /></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute allowedRoles={["admin","management","team"]}><RiskMonitoring /></ProtectedRoute>} />
      <Route path="/reporting" element={<ProtectedRoute allowedRoles={["admin","management"]}><Reporting /></ProtectedRoute>} />
      <Route path="/data-entry" element={<ProtectedRoute allowedRoles={["admin","team"]}><DataEntry /></ProtectedRoute>} />
      <Route path="/war-room" element={<ProtectedRoute allowedRoles={["admin"]}><WarRoom /></ProtectedRoute>} />
      <Route path="/activity-log" element={<ProtectedRoute allowedRoles={["admin","management","team"]}><ActivityLog /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />
      <Route path="/account-manager" element={<ProtectedRoute allowedRoles={["admin"]}><AccountManager /></ProtectedRoute>} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

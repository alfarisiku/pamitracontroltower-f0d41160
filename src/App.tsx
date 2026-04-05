import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ProjectSummary from "./pages/ProjectSummary";
import ProjectDetail from "./pages/ProjectDetail";
import Schedule from "./pages/Schedule";
import CostPerformance from "./pages/CostPerformance";
import RiskMonitoring from "./pages/RiskMonitoring";
import Reporting from "./pages/Reporting";
import DataEntry from "./pages/DataEntry";
import WarRoom from "./pages/WarRoom";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={role === "client" ? "/war-room" : "/"} replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute allowedRoles={["admin", "management", "team"]}><Index /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute allowedRoles={["admin", "management"]}><ProjectSummary /></ProtectedRoute>} />
      <Route path="/project/:id" element={<ProtectedRoute allowedRoles={["admin", "management", "team"]}><ProjectDetail /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute allowedRoles={["admin", "management", "team"]}><Schedule /></ProtectedRoute>} />
      <Route path="/cost" element={<ProtectedRoute allowedRoles={["admin", "management", "team"]}><CostPerformance /></ProtectedRoute>} />
      <Route path="/risk" element={<ProtectedRoute allowedRoles={["admin", "management", "team"]}><RiskMonitoring /></ProtectedRoute>} />
      <Route path="/reporting" element={<ProtectedRoute allowedRoles={["admin", "management"]}><Reporting /></ProtectedRoute>} />
      <Route path="/data-entry" element={<ProtectedRoute allowedRoles={["admin"]}><DataEntry /></ProtectedRoute>} />
      <Route path="/war-room" element={<ProtectedRoute allowedRoles={["admin", "client"]}><WarRoom /></ProtectedRoute>} />
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

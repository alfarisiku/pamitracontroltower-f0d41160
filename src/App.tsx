import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProjectSummary from "./pages/ProjectSummary";
import ProjectDetail from "./pages/ProjectDetail";
import Schedule from "./pages/Schedule";
import CostPerformance from "./pages/CostPerformance";
import RiskMonitoring from "./pages/RiskMonitoring";
import Reporting from "./pages/Reporting";
import DataEntry from "./pages/DataEntry";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<ProjectSummary />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/cost" element={<CostPerformance />} />
          <Route path="/risk" element={<RiskMonitoring />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

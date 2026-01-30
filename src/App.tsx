import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PatientProvider } from "@/contexts/PatientContext";
import { MainLayout } from "@/components/layout/MainLayout";

// Pages
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientFormPage from "./pages/PatientFormPage";
import VollstationPage from "./pages/VollstationPage";

import TeilstationOpenPage from "./pages/TeilstationOpenPage";
import StationPreInterviewPage from "./pages/StationPreInterviewPage";
import StationWaitingListPage from "./pages/StationWaitingListPage";
import AdminCenterPage from "./pages/AdminCenterPage";
import ArchivePage from "./pages/ArchivePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PatientProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/patient/new" element={<PatientFormPage />} />
                <Route path="/patient/edit/:id" element={<PatientFormPage />} />
                <Route path="/vollstation" element={<VollstationPage />} />
                
                <Route path="/teilstation/open" element={<TeilstationOpenPage />} />
                <Route path="/station/:station/vorgespraech" element={<StationPreInterviewPage />} />
                <Route path="/station/:station/warteliste" element={<StationWaitingListPage />} />
                <Route path="/admin" element={<AdminCenterPage />} />
                <Route path="/admin/archive" element={<ArchivePage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PatientProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

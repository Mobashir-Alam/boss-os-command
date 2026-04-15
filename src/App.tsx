import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskProvider } from "@/contexts/TaskContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index.tsx";
import Focus from "./pages/Focus.tsx";
import StartupDetail from "./pages/StartupDetail.tsx";
import Login from "./pages/Login.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PMDashboard from "./pages/PMDashboard.tsx";
import FunctionalHeadDashboard from "./pages/FunctionalHeadDashboard.tsx";
import MfoPanel from "./pages/MfoPanel.tsx";
import DecisionLog from "./pages/DecisionLog.tsx";
import TeamMemberDashboard from "./pages/TeamMemberDashboard.tsx";
import MyWorkDashboard from "./pages/MyWorkDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TaskProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/focus" element={<AuthGuard><Focus /></AuthGuard>} />
              <Route path="/startup/:id" element={<AuthGuard><StartupDetail /></AuthGuard>} />
              <Route path="/pm" element={<AuthGuard><PMDashboard /></AuthGuard>} />
              <Route path="/my-domain" element={<AuthGuard><FunctionalHeadDashboard /></AuthGuard>} />
              <Route path="/mfo" element={<AuthGuard><MfoPanel /></AuthGuard>} />
              <Route path="/decisions" element={<AuthGuard><DecisionLog /></AuthGuard>} />
              <Route path="/my-tasks" element={<AuthGuard><TeamMemberDashboard /></AuthGuard>} />
              <Route path="/my-work" element={<AuthGuard><MyWorkDashboard /></AuthGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TaskProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

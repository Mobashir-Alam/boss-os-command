import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TaskProvider } from "@/contexts/TaskContext";
import { EscalationProvider } from "@/contexts/EscalationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ExecThemeProvider } from "@/contexts/ExecThemeContext";
import AuthGuard from "@/components/AuthGuard";
import TechLeadGuard from "@/components/TechLeadGuard";
import HRGuard from "@/components/HRGuard";
import SocialMediaGuard from "@/components/SocialMediaGuard";
import Index from "./pages/Index.tsx";
import FounderCommandCenter from "./pages/FounderCommandCenter.tsx";
import Focus from "./pages/Focus.tsx";
import StartupDetail from "./pages/StartupDetail.tsx";
import OwnershipEngine from "./pages/OwnershipEngine.tsx";
import Login from "./pages/Login.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PMDashboard from "./pages/PMDashboard.tsx";
import FunctionalHeadDashboard from "./pages/FunctionalHeadDashboard.tsx";
import MfoPanel from "./pages/MfoPanel.tsx";
import DecisionLog from "./pages/DecisionLog.tsx";
import TeamMemberDashboard from "./pages/TeamMemberDashboard.tsx";
import MyWorkDashboard from "./pages/MyWorkDashboard.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import CfoDashboard from "./pages/CfoDashboard.tsx";
import PeopleOS from "./pages/PeopleOS.tsx";
import NotFound from "./pages/NotFound.tsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import TechTeamDashboard from "./pages/TechTeamDashboard.tsx";
import TechDashboard from "./pages/TechDashboard.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import InboxPage from "./pages/Inbox.tsx";
import Verify2FA from "./pages/Verify2FA.tsx";
import HRDashboard from "./pages/HRDashboard.tsx";
import SocialMediaDashboard from "./pages/SocialMediaDashboard.tsx";
import SlackDashboard from "./pages/SlackDashboard.tsx";
import GitHubDashboard from "./pages/GitHubDashboard.tsx";
import CommandPalette from "./components/CommandPalette";

const queryClient = new QueryClient({});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ExecThemeProvider>
        <TaskProvider>
          <EscalationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <CommandPalette />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/verify" element={<AuthGuard><Verify2FA /></AuthGuard>} />
              <Route path="/" element={<AuthGuard><FounderCommandCenter /></AuthGuard>} />
              <Route path="/portfolio" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/focus" element={<AuthGuard><Focus /></AuthGuard>} />
              <Route path="/startup/:id" element={<AuthGuard><StartupDetail /></AuthGuard>} />
              <Route path="/startup/:id/ownership" element={<AuthGuard><OwnershipEngine /></AuthGuard>} />
              <Route path="/pm" element={<AuthGuard><PMDashboard /></AuthGuard>} />
              <Route path="/project-board" element={<AuthGuard><PMDashboard /></AuthGuard>} />
              <Route path="/my-domain" element={<AuthGuard><FunctionalHeadDashboard /></AuthGuard>} />
              <Route path="/mfo" element={<AuthGuard><MfoPanel /></AuthGuard>} />
              <Route path="/decisions" element={<AuthGuard><DecisionLog /></AuthGuard>} />
              <Route path="/my-work" element={<AuthGuard><MyWorkDashboard /></AuthGuard>} />
              <Route path="/finances" element={<AuthGuard><CfoDashboard /></AuthGuard>} />
              <Route path="/people" element={<AuthGuard><PeopleOS /></AuthGuard>} />
              <Route path="/employee" element={<AuthGuard><EmployeeDashboard /></AuthGuard>} />
              <Route path="/project/:id" element={<AuthGuard><ProjectDetail /></AuthGuard>} />
              <Route
                path="/team/tech"
                element={<AuthGuard><TechLeadGuard><TechTeamDashboard /></TechLeadGuard></AuthGuard>}
              />
              <Route
                path="/team/github"
                element={<AuthGuard><TechLeadGuard><GitHubDashboard /></TechLeadGuard></AuthGuard>}
              />
              <Route
                path="/team/hr"
                element={<AuthGuard><HRGuard><HRDashboard /></HRGuard></AuthGuard>}
              />
              <Route
                path="/team/social-media"
                element={<AuthGuard><SocialMediaGuard><SocialMediaDashboard /></SocialMediaGuard></AuthGuard>}
              />
              <Route
                path="/team/slack"
                element={<AuthGuard><SocialMediaGuard><SlackDashboard /></SocialMediaGuard></AuthGuard>}
              />
              <Route
                path="/department/tech"
                element={<AuthGuard><TechLeadGuard><TechDashboard /></TechLeadGuard></AuthGuard>}
              />
              <Route path="/profile/:id" element={<AuthGuard><ProfilePage /></AuthGuard>} />
              <Route path="/inbox" element={<AuthGuard><InboxPage /></AuthGuard>} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </EscalationProvider>
        </TaskProvider>
        </ExecThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

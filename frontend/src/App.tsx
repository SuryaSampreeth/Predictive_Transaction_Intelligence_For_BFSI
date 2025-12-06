import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { ClerkProviderWithRoutes } from "@/providers/ClerkProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { TransactionStoreProvider } from "@/context/TransactionStoreContext";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import DashboardNew from "./pages/DashboardNew";
import Prediction from "./pages/Prediction";
import AlertsPage from "./pages/AlertsPage";
import TransactionDetailsPage from "./pages/TransactionDetailsPage";
import AnalyticsReports from "./pages/AnalyticsReports";
import BatchPredictionPage from "./pages/BatchPrediction";
import SimulationLab from "./pages/SimulationLabNew";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import ProfilePage from "./pages/Profile";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/Settings";
import MonitoringWall from "./pages/MonitoringWall";
import CaseManagement from "./pages/CaseManagementNew";
import ModelingWorkspace from "./pages/ModelingWorkspace";
import TransactionSearch from "./pages/TransactionSearch";
import Customer360 from "./pages/Customer360";
import AdminHealth from "./pages/AdminHealth";
import ResultsHistory from "@/pages/ResultsHistory";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import UserTransaction from "@/pages/UserTransaction";
import TransIntelliFlowDashboard from "./pages/TransIntelliFlowDashboard";

const queryClient = new QueryClient();

// Protected Route wrapper component
const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  </>
);

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Landing />} />
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/sign-up/*" element={<SignUpPage />} />

    {/* Protected routes */}
    <Route path="/dashboard" element={<ProtectedPage><DashboardNew /></ProtectedPage>} />
    <Route path="/dashboard-old" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
    <Route path="/predict" element={<ProtectedPage><Prediction /></ProtectedPage>} />
    <Route path="/alerts" element={<ProtectedPage><AlertsPage /></ProtectedPage>} />
    <Route path="/transaction" element={<ProtectedPage><UserTransaction /></ProtectedPage>} />
    <Route path="/transaction/:id" element={<ProtectedPage><TransactionDetailsPage /></ProtectedPage>} />
    <Route path="/analytics" element={<ProtectedPage><AnalyticsReports /></ProtectedPage>} />
    <Route path="/batch-prediction" element={<ProtectedPage><BatchPredictionPage /></ProtectedPage>} />
    <Route path="/simulation-lab" element={<ProtectedPage><SimulationLab /></ProtectedPage>} />
    <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
    <Route path="/monitoring" element={<ProtectedPage><MonitoringWall /></ProtectedPage>} />
    <Route path="/cases" element={<ProtectedPage><CaseManagement /></ProtectedPage>} />
    <Route path="/modeling" element={<ProtectedPage><ModelingWorkspace /></ProtectedPage>} />
    <Route path="/search" element={<ProtectedPage><TransactionSearch /></ProtectedPage>} />
    <Route path="/customer360" element={<ProtectedPage><Customer360 /></ProtectedPage>} />
    <Route path="/admin" element={<ProtectedPage><AdminHealth /></ProtectedPage>} />
    <Route path="/results-history" element={<ProtectedPage><ResultsHistory /></ProtectedPage>} />
    <Route path="/performance" element={<ProtectedPage><PerformanceDashboard /></ProtectedPage>} />
    <Route path="/transintelliflow" element={<ProtectedPage><TransIntelliFlowDashboard /></ProtectedPage>} />
    <Route path="/profile/*" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />

    {/* Catch all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TransactionStoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ClerkProviderWithRoutes>
              <AppRoutes />
            </ClerkProviderWithRoutes>
          </BrowserRouter>
        </TooltipProvider>
      </TransactionStoreProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

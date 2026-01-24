import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Gamification from "./pages/Gamification";
import NotFound from "./pages/NotFound";

// FITILA Platform (formerly TAM-TAM)
import FitilaApp from "./pages/fitila/FitilaApp";
import TamTamHome from "./pages/tamtam/TamTamHome";
import TamTamSocial from "./pages/tamtam/TamTamSocial";
import TamTamServices from "./pages/tamtam/TamTamServices";
import TamTamMarket from "./pages/tamtam/TamTamMarket";
import TamTamSOS from "./pages/tamtam/TamTamSOS";
import TamTamProfile from "./pages/tamtam/TamTamProfile";
import TamTamPhoneAuth from "./pages/tamtam/TamTamPhoneAuth";
import TamTamPublicProfile from "./pages/tamtam/TamTamPublicProfile";
import TamTamDictionary from "./pages/tamtam/TamTamDictionary";
import TamTamAgriculture from "./pages/tamtam/TamTamAgriculture";
import TamTamFinance from "./pages/tamtam/TamTamFinance";
import TamTamEducation from "./pages/tamtam/TamTamEducation";
import TamTamTranslator from "./pages/tamtam/TamTamTranslator";
import TamTamHealth from "./pages/tamtam/TamTamHealth";
import TamTamKuaishouTest from "./pages/tamtam/TamTamKuaishouTest";
import TamTamCreator from "./pages/tamtam/TamTamCreator";
import TamTamTemplates from "./pages/tamtam/TamTamTemplates";
import TemplateTest from "./pages/TemplateTest";
import SystemValidation from "./pages/SystemValidation";
import AssetsDashboard from "./pages/AssetsDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to FITILA */}
            <Route path="/" element={<Navigate to="/fitila" replace />} />
            <Route path="/dictionary" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/gamification" element={<Gamification />} />
            <Route path="/template-test" element={<TemplateTest />} />
            <Route path="/system-validation" element={<SystemValidation />} />
            <Route path="/assets" element={<AssetsDashboard />} />
            
            {/* FITILA Platform Routes (new branding) */}
            <Route path="/fitila" element={<FitilaApp />}>
              <Route index element={<TamTamSocial />} />
              <Route path="auth" element={<TamTamPhoneAuth />} />
              <Route path="home" element={<TamTamHome />} />
              <Route path="social" element={<TamTamSocial />} />
              <Route path="services" element={<TamTamServices />} />
              <Route path="market" element={<TamTamMarket />} />
              <Route path="agriculture" element={<TamTamAgriculture />} />
              <Route path="finance" element={<TamTamFinance />} />
              <Route path="education" element={<TamTamEducation />} />
              <Route path="health" element={<TamTamHealth />} />
              <Route path="translator" element={<TamTamTranslator />} />
              <Route path="kuaishou-test" element={<TamTamKuaishouTest />} />
              <Route path="creator" element={<TamTamCreator />} />
              <Route path="templates" element={<TamTamTemplates />} />
              <Route path="sos" element={<TamTamSOS />} />
              <Route path="profile" element={<TamTamProfile />} />
              <Route path="dictionary" element={<TamTamDictionary />} />
              <Route path="user/:userId" element={<TamTamPublicProfile />} />
            </Route>

            {/* Legacy /tamtam routes redirect to /fitila */}
            <Route path="/tamtam/*" element={<Navigate to="/fitila" replace />} />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

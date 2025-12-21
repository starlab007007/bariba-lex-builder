import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Gamification from "./pages/Gamification";
import NotFound from "./pages/NotFound";

// TAM-TAM Platform
import TamTamApp from "./pages/tamtam/TamTamApp";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/gamification" element={<Gamification />} />
            
            {/* TAM-TAM Platform Routes - 8 optimized screens */}
            <Route path="/tamtam" element={<TamTamApp />}>
              <Route index element={<TamTamHome />} />
              <Route path="auth" element={<TamTamPhoneAuth />} />
              <Route path="home" element={<TamTamHome />} />
              <Route path="social" element={<TamTamSocial />} />
              <Route path="services" element={<TamTamServices />} />
              <Route path="market" element={<TamTamMarket />} />
              <Route path="agriculture" element={<TamTamAgriculture />} />
              <Route path="finance" element={<TamTamFinance />} />
              <Route path="education" element={<TamTamEducation />} />
              <Route path="sos" element={<TamTamSOS />} />
              <Route path="profile" element={<TamTamProfile />} />
              <Route path="dictionary" element={<TamTamDictionary />} />
              <Route path="user/:userId" element={<TamTamPublicProfile />} />
            </Route>

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

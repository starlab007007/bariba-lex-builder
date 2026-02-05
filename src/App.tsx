import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { Suspense, lazy } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION: LAZY LOADING
// Only load critical routes immediately, defer secondary routes
// Reduces initial bundle size by ~40-60%
// ═══════════════════════════════════════════════════════════════════════════════

// Critical routes - loaded immediately
import FitilaApp from "./pages/fitila/FitilaApp";
import TamTamSocial from "./pages/tamtam/TamTamSocial";

// Lazy-loaded routes - deferred until needed
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const Gamification = lazy(() => import("./pages/Gamification"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TamTamHome = lazy(() => import("./pages/tamtam/TamTamHome"));
const TamTamServices = lazy(() => import("./pages/tamtam/TamTamServices"));
const TamTamMarket = lazy(() => import("./pages/tamtam/TamTamMarket"));
const TamTamSOS = lazy(() => import("./pages/tamtam/TamTamSOS"));
const TamTamProfile = lazy(() => import("./pages/tamtam/TamTamProfile"));
const TamTamPhoneAuth = lazy(() => import("./pages/tamtam/TamTamPhoneAuth"));
const TamTamPublicProfile = lazy(() => import("./pages/tamtam/TamTamPublicProfile"));
const TamTamDictionary = lazy(() => import("./pages/tamtam/TamTamDictionary"));
const TamTamAgriculture = lazy(() => import("./pages/tamtam/TamTamAgriculture"));
const TamTamFinance = lazy(() => import("./pages/tamtam/TamTamFinance"));
const TamTamEducation = lazy(() => import("./pages/tamtam/TamTamEducation"));
const TamTamTranslator = lazy(() => import("./pages/tamtam/TamTamTranslator"));
const TamTamHealth = lazy(() => import("./pages/tamtam/TamTamHealth"));
const TamTamKuaishouTest = lazy(() => import("./pages/tamtam/TamTamKuaishouTest"));
const TamTamCreator = lazy(() => import("./pages/tamtam/TamTamCreator"));
const TamTamTemplates = lazy(() => import("./pages/tamtam/TamTamTemplates"));
const TemplateTest = lazy(() => import("./pages/TemplateTest"));
const SystemValidation = lazy(() => import("./pages/SystemValidation"));
const AssetsDashboard = lazy(() => import("./pages/AssetsDashboard"));
const GriotStudioPage = lazy(() => import("./pages/GriotStudioPage"));

// Loading fallback - minimal spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-950 via-black to-black">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-amber-200/60 text-sm">Chargement...</span>
    </div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Redirect root to FITILA */}
              <Route path="/" element={<Navigate to="/fitila" replace />} />
              <Route path="/dictionary" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/gamification" element={<Gamification />} />
              <Route path="/template-test" element={<TemplateTest />} />
              <Route path="/system-validation" element={<SystemValidation />} />
              <Route path="/assets" element={<AssetsDashboard />} />
              <Route path="/griot-studio" element={<GriotStudioPage />} />
              
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
                <Route path="griot-studio" element={<GriotStudioPage />} />
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

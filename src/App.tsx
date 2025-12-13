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
import YovoGallery from "./pages/YovoGallery";
import NotFound from "./pages/NotFound";

// YOVO Platform
import YovoApp from "./pages/yovo/YovoApp";
import YovoSplash from "./pages/yovo/YovoSplash";
import YovoFeed from "./pages/yovo/YovoFeed";
import YovoDiscover from "./pages/yovo/YovoDiscover";
import YovoLive from "./pages/yovo/YovoLive";
import YovoMessages from "./pages/yovo/YovoMessages";
import YovoProfile from "./pages/yovo/YovoProfile";
import YovoTranslator from "./pages/yovo/YovoTranslator";
import YovoHealth from "./pages/yovo/YovoHealth";
import YovoJobs from "./pages/yovo/YovoJobs";
import YovoMarketplace from "./pages/yovo/YovoMarketplace";
import YovoBusiness from "./pages/yovo/YovoBusiness";
import YovoFinance from "./pages/yovo/YovoFinance";
import YovoAgritech from "./pages/yovo/YovoAgritech";
import YovoLibrary from "./pages/yovo/YovoLibrary";
import YovoGroups from "./pages/yovo/YovoGroups";
import YovoSOS from "./pages/yovo/YovoSOS";
import YovoDocuments from "./pages/yovo/YovoDocuments";
import YovoRecord from "./pages/yovo/YovoRecord";
import YovoSettings from "./pages/yovo/YovoSettings";
import YovoAuth from "./pages/yovo/YovoAuth";

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
            <Route path="/yovo-gallery" element={<YovoGallery />} />
            
            {/* YOVO Platform Routes */}
            <Route path="/yovo" element={<YovoApp />}>
              <Route index element={<YovoSplash />} />
              <Route path="feed" element={<YovoFeed />} />
              <Route path="discover" element={<YovoDiscover />} />
              <Route path="live" element={<YovoLive />} />
              <Route path="messages" element={<YovoMessages />} />
              <Route path="profile" element={<YovoProfile />} />
              <Route path="translator" element={<YovoTranslator />} />
              <Route path="health" element={<YovoHealth />} />
              <Route path="jobs" element={<YovoJobs />} />
              <Route path="marketplace" element={<YovoMarketplace />} />
              <Route path="business" element={<YovoBusiness />} />
              <Route path="finance" element={<YovoFinance />} />
              <Route path="agritech" element={<YovoAgritech />} />
              <Route path="library" element={<YovoLibrary />} />
              <Route path="groups" element={<YovoGroups />} />
              <Route path="sos" element={<YovoSOS />} />
              <Route path="documents" element={<YovoDocuments />} />
              <Route path="record" element={<YovoRecord />} />
              <Route path="settings" element={<YovoSettings />} />
              <Route path="auth" element={<YovoAuth />} />
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

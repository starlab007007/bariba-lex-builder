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
const FitilaLearn = lazy(() => import("./pages/fitila/FitilaLearn"));
const FitilaClasse = lazy(() => import("./pages/fitila/FitilaClasse"));
const FitilaIA = lazy(() => import("./pages/fitila/FitilaIA"));
const FitilaTemIA = lazy(() => import("./pages/fitila/FitilaTemIA"));
const FitilaVoiceLab = lazy(() => import("./pages/fitila/FitilaVoiceLab"));
const VoiceCorpusAdmin = lazy(() => import("./pages/admin/VoiceCorpusAdmin"));
const ComingSoonPage = lazy(() => import("./pages/fitila/ComingSoonPage"));
const InstallPage = lazy(() => import("./pages/fitila/InstallPage"));
const TeacherLayout = lazy(() => import("./pages/teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const StudentList = lazy(() => import("./pages/teacher/StudentList"));
const StudentDetail = lazy(() => import("./pages/teacher/StudentDetail"));
const PendingGrading = lazy(() => import("./pages/teacher/PendingGrading"));
const ClassStats = lazy(() => import("./pages/teacher/ClassStats"));
const AnswerKeysManager = lazy(() => import("./pages/teacher/AnswerKeysManager"));
const WeightsManager = lazy(() => import("./pages/teacher/WeightsManager"));
const GradeOverview = lazy(() => import("./pages/teacher/GradeOverview"));
const ClasseCorrections = lazy(() => import("./components/classe/ClasseCorrections"));
const MyGradeReport = lazy(() => import("./components/classe/MyGradeReport"));

// Loading fallback - skeleton minimal responsive
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-950 via-black to-black px-4">
    <div className="flex flex-col items-center gap-4 w-full max-w-md md:max-w-lg">
      <div className="w-12 h-12 md:w-14 md:h-14 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <span className="text-amber-200/70 text-sm md:text-base font-medium">Chargement...</span>
      <div className="w-full space-y-2 mt-4">
        <div className="h-3 bg-amber-500/10 rounded-full animate-pulse" />
        <div className="h-3 bg-amber-500/10 rounded-full animate-pulse w-4/5" />
        <div className="h-3 bg-amber-500/10 rounded-full animate-pulse w-3/5" />
      </div>
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
              <Route path="/auth" element={<Navigate to="/fitila/auth" replace />} />
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
                <Route path="learn" element={<FitilaLearn />} />
                <Route path="classe" element={<FitilaClasse />} />
                <Route path="ia" element={<FitilaIA />} />
                <Route path="tem-ia" element={<FitilaTemIA />} />
                <Route path="voice-lab" element={<FitilaVoiceLab />} />
                <Route path="messages" element={<ComingSoonPage />} />
                <Route path="discover" element={<ComingSoonPage />} />
                <Route path="install" element={<InstallPage />} />
                <Route path="user/:userId" element={<TamTamPublicProfile />} />
                <Route path="profile/:userId" element={<TamTamPublicProfile />} />
              </Route>

              {/* Teacher dashboard */}
              <Route path="/fitila/teacher" element={<ProtectedRoute requireTeacher><TeacherLayout /></ProtectedRoute>}>
                <Route index element={<TeacherDashboard />} />
                <Route path="students" element={<StudentList />} />
                <Route path="student/:id" element={<StudentDetail />} />
                <Route path="grading" element={<PendingGrading />} />
                <Route path="stats" element={<ClassStats />} />
                <Route path="answer-keys" element={<AnswerKeysManager />} />
                <Route path="weights" element={<WeightsManager />} />
                <Route path="grades" element={<GradeOverview />} />
              </Route>
              <Route path="/fitila/classe/corrections" element={<ProtectedRoute><ClasseCorrections /></ProtectedRoute>} />
              <Route path="/fitila/classe/notes" element={<ProtectedRoute><MyGradeReport /></ProtectedRoute>} />

              {/* Legacy /tamtam routes redirect to /fitila */}
              <Route path="/tamtam/*" element={<Navigate to="/fitila" replace />} />

              <Route
                path="/admin/voice-corpus"
                element={
                  <ProtectedRoute requireAdmin>
                    <VoiceCorpusAdmin />
                  </ProtectedRoute>
                }
              />
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

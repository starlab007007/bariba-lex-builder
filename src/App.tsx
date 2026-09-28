import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SafeBoundary from "@/components/common/SafeBoundary";
import OfflineBanner from "@/components/common/OfflineBanner";
import React, { Suspense, lazy } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION: LAZY LOADING
// Only load critical routes immediately, defer secondary routes
// Reduces initial bundle size by ~40-60%
// ═══════════════════════════════════════════════════════════════════════════════

// Critical routes - loaded immediately (shell only)
import FitilaApp from "./pages/fitila/FitilaApp";

// Lazy-loaded routes - deferred until needed
const TamTamSocial = lazy(() => import("./pages/tamtam/TamTamSocial"));

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
const FitilaLearnScenes = lazy(() => import("./pages/fitila/FitilaLearnScenes"));
const FitilaClasse = lazy(() => import("./pages/fitila/FitilaClasse"));
const FitilaIA = lazy(() => import("./pages/fitila/FitilaIA"));
const FitilaTemIA = lazy(() => import("./pages/fitila/FitilaTemIA"));
const FitilaVoiceLab = lazy(() => import("./pages/fitila/FitilaVoiceLab"));
const VoiceCorpusAdmin = lazy(() => import("./pages/admin/VoiceCorpusAdmin"));
const ComingSoonPage = lazy(() => import("./pages/fitila/ComingSoonPage"));
const InstallPage = lazy(() => import("./pages/fitila/InstallPage"));
const FloatingKeyboardPage = lazy(() => import("./pages/fitila/FloatingKeyboardPage"));
const TeacherLayout = lazy(() => import("./pages/teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const StudentList = lazy(() => import("./pages/teacher/StudentList"));
const StudentDetail = lazy(() => import("./pages/teacher/StudentDetail"));
const PendingGrading = lazy(() => import("./pages/teacher/PendingGrading"));
const ClassStats = lazy(() => import("./pages/teacher/ClassStats"));
const AnswerKeysManager = lazy(() => import("./pages/teacher/AnswerKeysManager"));
const WeightsManager = lazy(() => import("./pages/teacher/WeightsManager"));
const GradeOverview = lazy(() => import("./pages/teacher/GradeOverview"));
const VoiceReadingHome = lazy(() => import("./pages/teacher/VoiceReadingHome"));
const VoiceReadingLessons = lazy(() => import("./pages/teacher/VoiceReadingLessons"));
const VoiceReadingStudio = lazy(() => import("./pages/teacher/VoiceReadingStudio"));
const ClasseAudioReview = lazy(() => import("./pages/admin/ClasseAudioReview"));
const ClasseCorrections = lazy(() => import("./components/classe/ClasseCorrections"));
const MyGradeReport = lazy(() => import("./components/classe/MyGradeReport"));

// Loading fallback - skeleton minimal responsive
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
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
        <OfflineBanner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <SafeBoundary label="Application">
            <Routes>
              {/* FITILA canonical routes — fitila.bj/ opens Apprendre directly */}
              <Route path="/" element={<FitilaApp />}>
                <Route index element={<FitilaLearn />} />
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
                <Route path="profile" element={<ProtectedRoute><SafeBoundary label="Profil"><TamTamProfile /></SafeBoundary></ProtectedRoute>} />
                <Route path="dictionary" element={<TamTamDictionary />} />
                <Route path="learn" element={<FitilaLearn />} />
                <Route path="learn/scenes" element={<FitilaLearnScenes />} />
                <Route path="classe" element={<FitilaClasse />} />
                <Route path="ia" element={<FitilaIA />} />
                <Route path="tem-ia" element={<FitilaTemIA />} />
                <Route path="voice-lab" element={<FitilaVoiceLab />} />
                <Route path="messages" element={<ComingSoonPage />} />
                <Route path="discover" element={<ComingSoonPage />} />
                <Route path="install" element={<InstallPage />} />
                <Route path="keyboard" element={<FloatingKeyboardPage />} />
                <Route path="user/:userId" element={<TamTamPublicProfile />} />
                <Route path="profile/:userId" element={<TamTamPublicProfile />} />
              </Route>

              <Route path="/dictionary-old" element={<Index />} />
              <Route path="/gamification" element={<Gamification />} />
              <Route path="/template-test" element={<TemplateTest />} />
              <Route path="/system-validation" element={<SystemValidation />} />
              <Route path="/assets" element={<AssetsDashboard />} />

              {/* Compatibility routes: old /fitila/... URLs remain valid */}
              <Route path="/fitila" element={<FitilaApp />}>
                <Route index element={<Navigate to="/" replace />} />
                <Route path="auth" element={<Navigate to="/auth" replace />} />
                <Route path="home" element={<Navigate to="/home" replace />} />
                <Route path="social" element={<Navigate to="/social" replace />} />
                <Route path="services" element={<Navigate to="/services" replace />} />
                <Route path="market" element={<Navigate to="/market" replace />} />
                <Route path="agriculture" element={<Navigate to="/agriculture" replace />} />
                <Route path="finance" element={<Navigate to="/finance" replace />} />
                <Route path="education" element={<Navigate to="/education" replace />} />
                <Route path="health" element={<Navigate to="/health" replace />} />
                <Route path="translator" element={<Navigate to="/translator" replace />} />
                <Route path="creator" element={<Navigate to="/creator" replace />} />
                <Route path="templates" element={<Navigate to="/templates" replace />} />
                <Route path="griot-studio" element={<Navigate to="/griot-studio" replace />} />
                <Route path="sos" element={<Navigate to="/sos" replace />} />
                <Route path="profile" element={<Navigate to="/profile" replace />} />
                <Route path="dictionary" element={<Navigate to="/dictionary" replace />} />
                <Route path="learn" element={<Navigate to="/" replace />} />
                <Route path="learn/scenes" element={<Navigate to="/learn/scenes" replace />} />
                <Route path="classe" element={<Navigate to="/classe" replace />} />
                <Route path="ia" element={<Navigate to="/ia" replace />} />
                <Route path="tem-ia" element={<Navigate to="/tem-ia" replace />} />
                <Route path="voice-lab" element={<Navigate to="/voice-lab" replace />} />
                <Route path="messages" element={<Navigate to="/messages" replace />} />
                <Route path="discover" element={<Navigate to="/discover" replace />} />
                <Route path="install" element={<Navigate to="/install" replace />} />
                <Route path="keyboard" element={<Navigate to="/keyboard" replace />} />
                <Route path="user/:userId" element={<TamTamPublicProfile />} />
                <Route path="profile/:userId" element={<TamTamPublicProfile />} />
              </Route>

              {/* Teacher dashboard — canonical FITILA routes */}
              <Route path="/teacher" element={<ProtectedRoute requireTeacher><TeacherLayout /></ProtectedRoute>}>
                <Route index element={<TeacherDashboard />} />
                <Route path="students" element={<StudentList />} />
                <Route path="student/:id" element={<StudentDetail />} />
                <Route path="grading" element={<PendingGrading />} />
                <Route path="stats" element={<ClassStats />} />
                <Route path="answer-keys" element={<AnswerKeysManager />} />
                <Route path="weights" element={<WeightsManager />} />
                <Route path="grades" element={<GradeOverview />} />
                <Route path="voice-reading" element={<VoiceReadingHome />} />
                <Route path="voice-reading/:level/:module" element={<VoiceReadingLessons />} />
                <Route path="voice-reading/:level/:module/:lessonId" element={<VoiceReadingStudio />} />
              </Route>
              <Route path="/classe/corrections" element={<ProtectedRoute><ClasseCorrections /></ProtectedRoute>} />
              <Route path="/classe/notes" element={<ProtectedRoute><MyGradeReport /></ProtectedRoute>} />

              {/* Compatibility: legacy teacher/class URLs */}
              <Route path="/fitila/teacher/*" element={<Navigate to="/teacher" replace />} />
              <Route path="/fitila/classe/corrections" element={<Navigate to="/classe/corrections" replace />} />
              <Route path="/fitila/classe/notes" element={<Navigate to="/classe/notes" replace />} />

              {/* Legacy social routes */}
              <Route path="/tamtam/*" element={<Navigate to="/social" replace />} />

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
            </SafeBoundary>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

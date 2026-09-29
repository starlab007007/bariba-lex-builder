import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SafeBoundary from "@/components/common/SafeBoundary";
import OfflineBanner from "@/components/common/OfflineBanner";
import React, { Suspense, lazy } from "react";

import FitilaApp from "./pages/fitila/FitilaApp";

const FitilaSocialCanonical = lazy(() => import("./pages/fitila/FitilaCanonicalCommunity").then(m => ({ default: m.FitilaSocialCanonical })));
const FitilaCreatorCanonical = lazy(() => import("./pages/fitila/FitilaCanonicalCommunity").then(m => ({ default: m.FitilaCreatorCanonical })));
const HanduniaCanonicalPage = lazy(() => import("./pages/fitila/FitilaCanonicalCommunity").then(m => ({ default: m.HanduniaCanonicalPage })));
const SagesseCanonicalPage = lazy(() => import("./pages/fitila/FitilaCanonicalCommunity").then(m => ({ default: m.SagesseCanonicalPage })));
const FitilaUtilityParity = lazy(() => import("./pages/fitila/FitilaUtilityParity"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
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
const TamTamTemplates = lazy(() => import("./pages/tamtam/TamTamTemplates"));
const FitilaLearn = lazy(() => import("./pages/fitila/FitilaLearn"));
const FitilaLearnProgress = lazy(() => import("./pages/fitila/FitilaLearnProgress"));
const FitilaLearnTheme = lazy(() => import("./pages/fitila/FitilaLearnTheme"));
const FitilaClasse = lazy(() => import("./pages/fitila/FitilaClasse"));
const FitilaIA = lazy(() => import("./pages/fitila/FitilaIA"));
const FitilaTemIA = lazy(() => import("./pages/fitila/FitilaTemIA"));
const FitilaVoiceLab = lazy(() => import("./pages/fitila/FitilaVoiceLab"));
const VoiceCorpusAdmin = lazy(() => import("./pages/admin/VoiceCorpusAdmin"));
const InstallPage = lazy(() => import("./pages/fitila/InstallPage"));
const FitilaEspace = lazy(() => import("./pages/fitila/espace/FitilaEspace"));
const EspaceEditorPage = lazy(() => import("./pages/fitila/espace/EspaceEditorPage"));
const EspaceScanPage = lazy(() => import("./pages/fitila/espace/EspaceScanPage"));
const EspaceSharedPage = lazy(() => import("./pages/fitila/espace/EspaceSharedPage"));
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
const ClasseCorrections = lazy(() => import("./components/classe/ClasseCorrections"));
const MyGradeReport = lazy(() => import("./components/classe/MyGradeReport"));

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
                <Route path="/" element={<FitilaApp />}>
                  <Route index element={<FitilaLearn />} />
                  <Route path="auth" element={<TamTamPhoneAuth />} />

                  <Route path="social/*" element={<FitilaSocialCanonical />} />
                  <Route path="creator" element={<FitilaCreatorCanonical />} />
                  <Route path="creator/handunia" element={<HanduniaCanonicalPage />} />
                  <Route path="creator/sagesse-battle" element={<SagesseCanonicalPage />} />

                  <Route path="handunia" element={<HanduniaCanonicalPage />} />
                  <Route path="handunia/memory/:id" element={<HanduniaCanonicalPage />} />
                  <Route path="handunia/map" element={<HanduniaCanonicalPage />} />
                  <Route path="handunia/ask" element={<HanduniaCanonicalPage />} />
                  <Route path="sagesse-battle/*" element={<SagesseCanonicalPage />} />

                  <Route path="learn" element={<FitilaLearn />} />
                  <Route path="learn/daily" element={<FitilaLearn />} />
                  <Route path="learn/review" element={<FitilaLearn />} />
                  <Route path="learn/progress" element={<FitilaLearnProgress />} />
                  <Route path="learn/foundations/:id" element={<FitilaLearn />} />
                  <Route path="learn/themes/:id" element={<FitilaLearnTheme />} />
                  <Route path="learn/scenes" element={<FitilaLearn />} />
                  <Route path="learn/voice-studio" element={<FitilaVoiceLab />} />
                  <Route path="learn/voice-review" element={<FitilaVoiceLab />} />

                <Route path="classe/corrections" element={<ProtectedRoute><ClasseCorrections /></ProtectedRoute>} />
                <Route path="classe/notes" element={<ProtectedRoute><MyGradeReport /></ProtectedRoute>} />
                  <Route path="classe" element={<FitilaClasse />} />
                  <Route path="classe/:level/*" element={<FitilaClasse />} />

                  <Route path="dictionary/*" element={<TamTamDictionary />} />
                  <Route path="translator/*" element={<TamTamTranslator />} />
                  <Route path="ia" element={<FitilaIA />} />
                  <Route path="tem-ia" element={<FitilaTemIA />} />
                  <Route path="voice-lab" element={<FitilaVoiceLab />} />

                  <Route path="templates" element={<TamTamTemplates />} />
                  <Route path="services" element={<TamTamServices />} />
                  <Route path="market/*" element={<TamTamMarket />} />
                  <Route path="agriculture/*" element={<TamTamAgriculture />} />
                  <Route path="finance/*" element={<TamTamFinance />} />
                  <Route path="education/*" element={<TamTamEducation />} />
                  <Route path="health/*" element={<TamTamHealth />} />
                  <Route path="sos" element={<TamTamSOS />} />

                  <Route path="messages" element={<FitilaUtilityParity />} />
                  <Route path="drafts" element={<FitilaUtilityParity />} />
                  <Route path="offline" element={<FitilaUtilityParity />} />
                  <Route path="wallet" element={<FitilaUtilityParity />} />
                  <Route path="history" element={<FitilaUtilityParity />} />
                  <Route path="scan" element={<FitilaUtilityParity />} />
                  <Route path="shop" element={<FitilaUtilityParity />} />
                  <Route path="settings" element={<FitilaUtilityParity />} />

                  <Route path="discover" element={<FitilaUtilityParity />} />
                  <Route path="install" element={<InstallPage />} />
                  <Route path="keyboard" element={<FloatingKeyboardPage />} />
                  <Route path="espace" element={<FitilaEspace />} />
                  <Route path="espace/document/:id" element={<EspaceEditorPage />} />
                  <Route path="espace/scanner" element={<EspaceScanPage />} />
                  <Route path="espace/partage/:token" element={<EspaceSharedPage />} />

                <Route path="teacher" element={<ProtectedRoute requireTeacher><TeacherLayout /></ProtectedRoute>}>
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
                  <Route path="profile" element={<ProtectedRoute><SafeBoundary label="Profil"><TamTamProfile /></SafeBoundary></ProtectedRoute>} />
                  <Route path="user/:userId" element={<TamTamPublicProfile />} />
                  <Route path="profile/:userId" element={<TamTamPublicProfile />} />
                </Route>

                <Route path="/admin/voice-corpus" element={<ProtectedRoute requireAdmin><VoiceCorpusAdmin /></ProtectedRoute>} />
                <Route path="/admin/*" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

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

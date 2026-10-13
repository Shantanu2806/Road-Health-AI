import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AmbientBackground from "./components/AmbientBackground";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import UploadPage from "./pages/UploadPage";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import RoadMapPage from "./pages/RoadMapPage";
import ContractorDashboardPage from "./pages/ContractorDashboardPage";
import ContractorProfilePage from "./pages/ContractorProfilePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function AppLayout() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";
  const isMapPage = location.pathname === "/map";

  return (
    <div className="flex flex-col min-h-screen relative selection:bg-blue-500/25">
      {/* Ambient Moving Mesh Background */}
      <AmbientBackground />

      <Navbar />

      <main className="flex-1 relative z-10">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/map" element={<RoadMapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Inspection & History Protected Routes (Accessible to User, Contractor, and Admin) */}
          <Route
            path="/upload"
            element={
              <ProtectedRoute allowedRoles={["user", "contractor", "admin"]}>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute allowedRoles={["user", "contractor", "admin"]}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Contractor Protected Routes */}
          <Route
            path="/contractor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["contractor", "admin"]}>
                <ContractorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contractor/profile"
            element={
              <ProtectedRoute allowedRoles={["contractor", "admin"]}>
                <ContractorProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Dashboard compact footer (hidden on full map and landing page) */}
      {!isLandingPage && !isMapPage && (
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md py-6 text-center text-xs text-slate-500 transition-colors relative z-10">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              Road Health AI &copy; {new Date().getFullYear()} &bull; Road Damage Detection & Health Assessment
            </p>
            <p className="font-mono text-[11px] text-slate-400 dark:text-slate-600">
              RDD2022 Benchmark &bull; YOLOv8 Architecture
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

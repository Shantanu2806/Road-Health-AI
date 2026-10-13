import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  UploadCloud,
  History,
  Sun,
  Moon,
  ArrowRight,
  Menu,
  X,
  Map as MapIcon,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  Briefcase,
  Home,
  LogIn,
  MapPin,
} from "lucide-react";
import { checkHealth, BACKEND_BASE_URL } from "../api/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, isAdmin, isContractor, isUser, getDashboardRoute } = useAuth();

  const [isBackendHealthy, setIsBackendHealthy] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === "/";

  useEffect(() => {
    let isMounted = true;
    checkHealth()
      .then(() => {
        if (isMounted) setIsBackendHealthy(true);
      })
      .catch(() => {
        if (isMounted) setIsBackendHealthy(false);
      });

    const interval = setInterval(() => {
      checkHealth()
        .then(() => setIsBackendHealthy(true))
        .catch(() => setIsBackendHealthy(false));
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/35 transition-all duration-300">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center transition-colors">
              <Activity className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Road Health
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Road Damage Assessment & Scoring
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              location.pathname === "/"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {/* Road Map (Public - available to all) */}
          <Link
            to="/map"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              location.pathname === "/map"
                ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <MapIcon className="w-4 h-4 text-emerald-500" />
            <span>Road Map</span>
          </Link>

          {/* Inspection & History Links (Accessible to All Roles) */}
          {isAuthenticated && (
            <>
              <Link
                to="/upload"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/upload"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <UploadCloud className="w-4 h-4 text-blue-500" />
                <span>New Inspection</span>
              </Link>
              <Link
                to="/history"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/history"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>History</span>
              </Link>
            </>
          )}

          {/* Contractor Dashboard & Service Area Links */}
          {isAuthenticated && (isContractor || isAdmin) && (
            <>
              <Link
                to="/contractor/dashboard"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/contractor/dashboard"
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>Contractor Portal</span>
              </Link>
              <Link
                to="/contractor/profile"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/contractor/profile"
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>My Service Area</span>
              </Link>
            </>
          )}

          {/* Admin Dashboard Link */}
          {isAuthenticated && isAdmin && (
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                location.pathname === "/admin/dashboard"
                  ? "text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Backend Status Indicator (Desktop) */}
          <div className="hidden lg:flex items-center pl-1 text-xs">
            {isBackendHealthy === null ? (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                <span>Checking...</span>
              </div>
            ) : isBackendHealthy ? (
              <div
                className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full font-medium text-[11px]"
                title={`Connected to ${BACKEND_BASE_URL}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 px-2 py-0.5 rounded-full font-medium text-[11px]"
                title="Backend offline"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Offline</span>
              </div>
            )}
          </div>

          {/* Auth Action Buttons */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              {/* User badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user?.full_name || "User"}
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {user?.role}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors shadow-sm"
                title="Log out from session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-2 text-xs">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Home</span>
          </Link>
          <Link
            to="/map"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <MapIcon className="w-4 h-4 text-emerald-500" />
            <span>Road Map</span>
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/upload"
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <UploadCloud className="w-4 h-4 text-blue-500" />
                <span>New Inspection</span>
              </Link>
              <Link
                to="/history"
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>History</span>
              </Link>
            </>
          )}

          {isAuthenticated && (isContractor || isAdmin) && (
            <>
              <Link
                to="/contractor/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Briefcase className="w-4 h-4 text-amber-500" />
                <span>Contractor Portal</span>
              </Link>
              <Link
                to="/contractor/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>My Service Area</span>
              </Link>
            </>
          )}

          {isAuthenticated && isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              <span>Admin Portal</span>
            </Link>
          )}

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out ({user?.full_name})</span>
            </button>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="text-center py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-center py-2 px-3 rounded-lg bg-blue-600 text-white font-semibold shadow-md"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  Ticket,
} from "lucide-react";
import { checkHealth, BACKEND_BASE_URL } from "../api/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, isAdmin, isContractor } = useAuth();

  const [isBackendHealthy, setIsBackendHealthy] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const portalsRef = useRef(null);

  // Health check polling
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

  // Close dropdowns on route change or outside click
  useEffect(() => {
    setMobileMenuOpen(false);
    setPortalsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (portalsRef.current && !portalsRef.current.contains(e.target)) {
        setPortalsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isPortalActive =
    location.pathname.startsWith("/contractor") ||
    location.pathname.startsWith("/admin");

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/map", label: "Road Map", icon: MapIcon, iconColor: "text-emerald-400" },
    ...(isAuthenticated
      ? [
          { to: "/upload", label: "New Inspection", icon: UploadCloud, iconColor: "text-cyan-400" },
          { to: "/history", label: "History", icon: History, iconColor: "text-indigo-400" },
          { to: "/tickets", label: "Tickets", icon: Ticket, iconColor: "text-amber-400" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between gap-6 whitespace-nowrap">
        {/* ================================================================= */}
        {/* 1. Left: Branding Cluster (Pulsing Cyan Heartbeat-Wave Logo)     */}
        {/* ================================================================= */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group select-none">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/50 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
              {/* Subtle animated background radial glow */}
              <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
              {/* Animated heartbeat pulse wave */}
              <Activity className="w-5 h-5 text-cyan-400 animate-heartbeat-glow group-hover:scale-110 transition-transform duration-300 relative z-10" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Road Health
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                AI
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight whitespace-nowrap">
              Road Damage Assessment &amp; Scoring
            </span>
          </div>
        </Link>

        {/* ================================================================= */}
        {/* 2. Center: Glassmorphic Capsule Nav Pill with Sliding Indicator  */}
        {/* ================================================================= */}
        <nav className="hidden lg:flex items-center">
          <div className="flex items-center gap-1.5 bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-full py-2 px-3 shadow-lg shadow-slate-950/10">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors z-10 ${
                    isActive
                      ? "text-white font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navActiveIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-md shadow-blue-500/30"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${link.iconColor || ""}`} />
                    <span>{link.label}</span>
                  </span>
                </Link>
              );
            })}

            {/* Portals & Workspace Mini-Group Dropdown */}
            {isAuthenticated && (isContractor || isAdmin) && (
              <div className="relative" ref={portalsRef}>
                <button
                  type="button"
                  onClick={() => setPortalsOpen(!portalsOpen)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer z-10 ${
                    isPortalActive
                      ? "text-white bg-gradient-to-r from-amber-500 to-indigo-600 shadow-sm shadow-amber-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>Portals</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      portalsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {portalsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-60 rounded-2xl bg-slate-950/95 border border-white/10 shadow-2xl shadow-black/60 p-2 z-50 text-xs backdrop-blur-2xl"
                    >
                      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80 mb-1">
                        Workspace Dispatch
                      </div>

                      <Link
                        to="/contractor/dashboard"
                        onClick={() => setPortalsOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                          location.pathname === "/contractor/dashboard"
                            ? "bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        }`}
                      >
                        <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div>Contractor Portal</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Assigned municipal repairs
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/contractor/profile"
                        onClick={() => setPortalsOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
                          location.pathname === "/contractor/profile"
                            ? "bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div>My Service Area</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Ward boundary &amp; coverage
                          </div>
                        </div>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setPortalsOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors border-t border-slate-800/80 mt-1 pt-2 ${
                            location.pathname === "/admin/dashboard"
                              ? "bg-purple-500/15 text-purple-400 font-bold border border-purple-500/30"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                          <div>
                            <div>Admin Portal</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              System telemetry &amp; routing
                            </div>
                          </div>
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </nav>

        {/* ================================================================= */}
        {/* 3. Right: User Profile & Controls Cluster (3D Rotating Hover)     */}
        {/* ================================================================= */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          {/* Theme Toggle Button with 3D Rotating Hover */}
          <motion.button
            whileHover={{ rotate: 180, scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors shadow-sm cursor-pointer select-none"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </motion.button>

          {/* Backend Status Online Pulsing Green Badge */}
          <div className="hidden sm:flex items-center select-none">
            {isBackendHealthy === null ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-slate-900/60 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                <span>Checking</span>
              </div>
            ) : isBackendHealthy ? (
              <div
                className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-medium text-[11px] shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                title={`Connected to ${BACKEND_BASE_URL}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-semibold tracking-wide">Online</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full font-medium text-[11px]"
                title="Backend offline"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-semibold">Offline</span>
              </div>
            )}
          </div>

          {/* User Profile Badge (Metallic Border) & Red-Glowing Log Out */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              {/* Premium Metallic User Badge */}
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-cyan-500/25 text-xs shadow-md shadow-cyan-500/5 select-none">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-slate-200 max-w-[130px] truncate">
                  {user?.full_name || "Shantanu Kaute"}
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {user?.role || "ADMIN"}
                </span>
              </div>

              {/* Red-Glowing Log Out Icon Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/40 border border-rose-500/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-200 cursor-pointer"
                title="Log out from session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Out</span>
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-white/10 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-blue-500/25 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-white/10 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. Mobile Navigation Drawer                                       */}
      {/* ================================================================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-6 pt-4 pb-6 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-900">
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-200">
                    {user?.full_name || "Shantanu Kaute"}
                  </span>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    {user?.role || "ADMIN"}
                  </span>
                </div>
              )}
              {isBackendHealthy && (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online
                </span>
              )}
            </div>

            <Link
              to="/"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Home</span>
            </Link>
            <Link
              to="/map"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
            >
              <MapIcon className="w-4 h-4 text-emerald-400" />
              <span>Road Map</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/upload"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
                >
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>New Inspection</span>
                </Link>
                <Link
                  to="/history"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
                >
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Audit History</span>
                </Link>

                {(isContractor || isAdmin) && (
                  <>
                    <div className="pt-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-3">
                      Portals &amp; Dispatch
                    </div>
                    <Link
                      to="/contractor/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
                    >
                      <Briefcase className="w-4 h-4 text-amber-400" />
                      <span>Contractor Portal</span>
                    </Link>
                    <Link
                      to="/contractor/profile"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
                    >
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>My Service Area</span>
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-slate-900"
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Admin Portal</span>
                  </Link>
                )}

                <div className="pt-3 border-t border-slate-900">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-rose-400 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

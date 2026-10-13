import React from "react";
import { useLocation } from "react-router-dom";

export default function AmbientBackground() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-20 overflow-hidden select-none transition-opacity duration-700"
    >
      {/* Subtle Dot/Grid Background Pattern */}
      <div className="absolute inset-0 bg-grid-subtle opacity-50 dark:opacity-30" />

      {/* Floating Ambient Mesh Glow Blob 1 - Top Left Blue */}
      <div
        className={`absolute -top-32 left-[10%] rounded-full blur-[120px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[450px] h-[450px] bg-blue-500/20 dark:bg-blue-500/25 animate-ambient-slow"
            : "w-[320px] h-[320px] bg-blue-500/10 dark:bg-blue-500/15"
        }`}
      />

      {/* Floating Ambient Mesh Glow Blob 2 - Center Right Indigo/Purple */}
      <div
        className={`absolute top-[25%] right-[12%] rounded-full blur-[130px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[420px] h-[420px] bg-indigo-500/20 dark:bg-indigo-500/20 animate-ambient-reverse"
            : "w-[300px] h-[300px] bg-indigo-500/10 dark:bg-indigo-500/10"
        }`}
      />

      {/* Floating Ambient Mesh Glow Blob 3 - Bottom Left Cyan */}
      <div
        className={`absolute bottom-[10%] left-[20%] rounded-full blur-[140px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[480px] h-[400px] bg-cyan-500/15 dark:bg-cyan-500/15 animate-ambient-slow"
            : "w-[280px] h-[250px] bg-cyan-500/5 dark:bg-cyan-500/10"
        }`}
      />
    </div>
  );
}

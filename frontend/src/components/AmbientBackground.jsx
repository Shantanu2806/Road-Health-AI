import React from "react";
import { useLocation } from "react-router-dom";

export default function AmbientBackground() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  // Staggered floating ambient particles
  const particles = [
    { top: "15%", left: "8%", size: "w-2 h-2", delay: "0s", duration: "7s", color: "bg-cyan-400" },
    { top: "35%", left: "85%", size: "w-2.5 h-2.5", delay: "1.5s", duration: "9s", color: "bg-blue-400" },
    { top: "60%", left: "15%", size: "w-1.5 h-1.5", delay: "3s", duration: "8s", color: "bg-indigo-400" },
    { top: "75%", left: "75%", size: "w-2 h-2", delay: "2s", duration: "10s", color: "bg-cyan-300" },
    { top: "22%", left: "50%", size: "w-1.5 h-1.5", delay: "4s", duration: "6.5s", color: "bg-teal-300" },
    { top: "85%", left: "30%", size: "w-2 h-2", delay: "0.5s", duration: "8.5s", color: "bg-blue-300" },
    { top: "45%", left: "92%", size: "w-2 h-2", delay: "2.5s", duration: "7.5s", color: "bg-purple-400" },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Continuous Moving Highway / Road Grid Matrix */}
      <div className="absolute inset-0 bg-grid-subtle animate-road-matrix opacity-60 dark:opacity-40" />

      {/* 2. Sweeping Diagonal Laser Light Beam */}
      <div className="absolute w-[200%] h-[3px] bg-gradient-to-r from-transparent via-cyan-400/40 dark:via-cyan-400/30 to-transparent animate-diagonal-sweep pointer-events-none" />

      {/* 3. Floating Ambient Mesh Glow Blob 1 - Top Center-Left (Cyan / Electric Sky) */}
      <div
        className={`absolute -top-36 left-[15%] rounded-full blur-[130px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[550px] h-[550px] bg-gradient-to-br from-cyan-500/25 to-blue-600/30 dark:from-cyan-500/30 dark:to-blue-600/35 animate-ambient-slow"
            : "w-[350px] h-[350px] bg-cyan-500/15 dark:bg-cyan-500/20"
        }`}
      />

      {/* 4. Floating Ambient Mesh Glow Blob 2 - Center Right (Indigo / Deep Purple) */}
      <div
        className={`absolute top-[28%] right-[8%] rounded-full blur-[140px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[500px] h-[500px] bg-gradient-to-tl from-indigo-500/25 to-purple-600/25 dark:from-indigo-600/30 dark:to-purple-700/30 animate-ambient-reverse"
            : "w-[320px] h-[320px] bg-indigo-500/15 dark:bg-indigo-500/15"
        }`}
      />

      {/* 5. Floating Ambient Mesh Glow Blob 3 - Bottom Left (Royal Blue / Cyan) */}
      <div
        className={`absolute bottom-[8%] left-[10%] rounded-full blur-[150px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[580px] h-[480px] bg-gradient-to-tr from-blue-600/25 to-cyan-400/25 dark:from-blue-600/30 dark:to-cyan-500/25 animate-ambient-slow"
            : "w-[300px] h-[300px] bg-blue-500/10 dark:bg-blue-500/15"
        }`}
      />

      {/* 6. Floating Ambient Mesh Glow Blob 4 - Bottom Right subtle accent (Teal / Emerald) */}
      <div
        className={`absolute bottom-[18%] right-[20%] rounded-full blur-[160px] transition-all duration-1000 ${
          isLandingPage
            ? "w-[420px] h-[420px] bg-emerald-500/15 dark:bg-emerald-500/15 animate-ambient-reverse"
            : "w-[250px] h-[250px] bg-emerald-500/5 dark:bg-emerald-500/10"
        }`}
      />

      {/* 7. Floating Luminous Staggered Dust Particles */}
      {particles.map((p, idx) => (
        <div
          key={idx}
          style={{
            top: p.top,
            left: p.left,
            animation: `floatParticle ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
          className={`absolute ${p.size} ${p.color} rounded-full shadow-[0_0_12px_currentColor] opacity-50 dark:opacity-75`}
        />
      ))}
    </div>
  );
}

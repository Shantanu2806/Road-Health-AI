import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  UploadCloud,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  History,
  Eye,
  Sliders,
  AlertTriangle,
  Zap,
  BarChart3,
  FileSearch,
  Crosshair,
  Camera,
  MapPin,
  Compass,
  Check,
  X,
  RefreshCw,
  Map as MapIcon,
  Play,
  Clock,
  Wrench,
  Building2,
  Bell,
  AlertOctagon,
  ChevronRight,
  ChevronDown,
  Info,
  Smartphone,
  Navigation,
  Globe2,
  Database,
  Lock,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function LandingPage() {
  const { isDark } = useTheme();

  // Hero Image Interactive Mode
  const [heroMode, setHeroMode] = useState("lidar"); // 'lidar' | 'heatmap' | 'telemetry'

  // Interactive Live Scoring Simulator State
  const [simPotholes, setSimPotholes] = useState(2);
  const [simCracks, setSimCracks] = useState(3);
  const [simCoverage, setSimCoverage] = useState(6.4);

  // Calculate simulated scoring live
  const simDI = Number((simPotholes * 2.5 + simCracks * 1.1).toFixed(1));
  const rawScore = 100 - simDI * 3.0 - simCoverage * 1.2;
  const simScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  const getSimCondition = (score) => {
    if (score >= 80)
      return {
        label: "Good Condition",
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
        progressColor: "#10b981",
        description: "Optimal pavement structural integrity. Normal routine surveillance.",
      };
    if (score >= 60)
      return {
        label: "Fair Condition",
        color: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
        progressColor: "#f59e0b",
        description: "Surface wear detected. Preventive crack sealing scheduled.",
      };
    if (score >= 30)
      return {
        label: "Poor Condition",
        color: "text-orange-600 dark:text-orange-400",
        badgeBg: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300",
        progressColor: "#f97316",
        description: "Significant structural distress. Priority asphalt milling dispatched.",
      };
    return {
      label: "Critical Failure",
      color: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
      progressColor: "#ef4444",
      description: "Severe hazard with base failure. Emergency contractor alert dispatched.",
    };
  };

  const simCondition = getSimCondition(simScore);

  // Defect Taxonomy Tab State
  const [activeDefectTab, setActiveDefectTab] = useState("D40");

  const defectTaxonomy = {
    D00: {
      name: "Longitudinal Crack",
      tag: "Linear Fracture",
      weight: "1.0x",
      cause: "Parallel fractures aligned with vehicular travel lanes; early subgrade settlement indicator.",
      remedy: "Bituminous rubberized crack pour & sealing.",
      color: "text-blue-600 dark:text-blue-400",
      border: "border-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    D10: {
      name: "Transverse Crack",
      tag: "Thermal Stress",
      weight: "1.2x",
      cause: "Perpendicular fractures traversing across lane widths; driven by asphalt shrinkage and thermal contraction.",
      remedy: "High-modulus asphalt joint sealing.",
      color: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    D20: {
      name: "Alligator Fatigue Cracking",
      tag: "Structural Failure",
      weight: "2.0x",
      cause: "Interlocking polygonal cracks resembling reptile skin; demonstrates base course failure under repetitive heavy axle loads.",
      remedy: "Full-depth asphalt reclamation & repaving.",
      color: "text-purple-600 dark:text-purple-400",
      border: "border-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    D40: {
      name: "Pothole Cavity",
      tag: "Critical Hazard",
      weight: "2.5x",
      cause: "Bowl-shaped structural voids formed when rainwater breaches cracks, causing aggregate displacement under traffic.",
      remedy: "Urgent cold-mix or hot-mix asphalt patching.",
      color: "text-rose-600 dark:text-rose-400",
      border: "border-rose-500",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
  };

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "How does automated Camera IO Tagging work?",
      a: "When you capture a road surface using the integrated camera (mobile or desktop), the browser queries high-precision GPS sensors down to 5 decimal places. The system performs OpenStreetMap Nominatim reverse geocoding to resolve the human-readable street address, and permanently stamps an immutable semi-transparent watermark banner across the bottom canvas before submitting it to the neural vision pipeline.",
    },
    {
      q: "What deep learning model powers the defect detection?",
      a: "Road Health AI leverages an optimized YOLOv8 deep convolutional architecture trained on the international Road Damage Dataset (RDD2022) with over 38,000 multi-country pavement annotations. It accurately localizes Longitudinal Cracks (D00), Transverse Cracks (D10), Alligator Fatigue (D20), and Potholes (D40) with sub-centimeter bounding box precision.",
    },
    {
      q: "How are contractors routed based on location?",
      a: "The backend features a 4-tier territorial dispatch engine. When road distress is detected (Score <= 60 or Fair with defects), the system parses the location string (supporting English and Devanagari transliteration) to match the contractor assigned to that specific ward (e.g., Swargate, Katraj, Pune). Municipal administrators are simultaneously notified.",
    },
    {
      q: "How is the 0 to 100 Road Health Score calculated?",
      a: "The score is derived from a transparent, explainable formula: Health Score = 100 - (Damage Index × 3.0) - (Affected Surface Coverage % × 1.2). The Damage Index weights each detected defect by structural severity (D00: 1.0x, D10: 1.2x, D20: 2.0x, D40: 2.5x) and confidence percentage, eliminating black-box ambiguity.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[850px] overflow-hidden pointer-events-none -z-10 opacity-70 dark:opacity-40">
        <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] bg-gradient-to-tr from-cyan-400/25 via-blue-500/20 to-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-20 right-1/4 w-[480px] h-[480px] bg-gradient-to-br from-indigo-500/20 to-purple-600/25 rounded-full blur-[140px]" />
        <div className="absolute top-96 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-cyan-400/15 rounded-full blur-[160px]" />
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Top Pill Announcement */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md hover:border-cyan-500/50 transition-all cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  Autonomous Road Vision v2.0
                </span>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  RDD2022 Benchmark + Live IO Tagging
                </span>
              </span>
            </motion.div>

            {/* Giant Impact Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]"
            >
              Autonomous Road Health Intelligence &{" "}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                Municipal Governance
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              Instant pavement distress classification, mathematical 0–100 health scoring, automated GPS bottom-stamping, and real-time territorial contractor dispatch.
            </motion.p>

            {/* Action Buttons Cluster */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <Camera className="w-4 h-4 text-cyan-200" />
                <span>Launch Camera Inspection</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                <MapIcon className="w-4 h-4 text-emerald-500" />
                <span>Explore GIS Damage Map</span>
              </Link>
            </motion.div>

            {/* Credibility & Metrics Ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                <span>38,000+ Training Samples</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>&lt; 25ms Real-Time Inference</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Automated IO Tag Watermarking</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <span>Territorial Contractor Dispatch</span>
              </div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* HERO VISUAL: AUTONOMOUS SCANNING VEHICLE WITH INTERACTIVE HUD */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl p-1.5 bg-gradient-to-b from-cyan-500/30 via-blue-500/20 to-slate-900/60 dark:to-slate-950 shadow-2xl shadow-cyan-500/10">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-2xl">
                {/* Mock Window Top Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-400 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm" />
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-sm" />
                    </div>
                    <span className="ml-2 font-mono text-[11px] text-slate-300">
                      roadhealth://vision/autonomous-lidar-telemetry
                    </span>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-medium gap-1">
                    <button
                      type="button"
                      onClick={() => setHeroMode("lidar")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        heroMode === "lidar"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>LiDAR Matrix Vision</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroMode("heatmap")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        heroMode === "heatmap"
                          ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Defect Heatmap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroMode("telemetry")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        heroMode === "telemetry"
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Full Telemetry</span>
                    </button>
                  </div>
                </div>

                {/* Cinematic Image Frame */}
                <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none">
                  <img
                    src="/hero_ai_road_scan.jpg"
                    alt="Autonomous Road Health AI Inspection"
                    className="w-full h-full object-cover filter brightness-[0.98] contrast-[1.05]"
                  />

                  {/* Gradient Vignette Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none" />

                  {/* HUD Overlays based on Active Mode */}
                  {heroMode === "lidar" && (
                    <>
                      {/* Laser Matrix Reticle */}
                      <div className="absolute inset-0 pointer-events-none scan-grid opacity-25" />
                      <div className="animate-scanline scan-beam pointer-events-none z-10" />

                      {/* Corner Target Marks */}
                      <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-cyan-400" />
                      <div className="absolute bottom-16 left-4 w-7 h-7 border-b-2 border-l-2 border-cyan-400" />
                      <div className="absolute bottom-16 right-4 w-7 h-7 border-b-2 border-r-2 border-cyan-400" />
                    </>
                  )}

                  {heroMode === "heatmap" && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-amber-500/10 to-rose-500/15 pointer-events-none" />
                  )}

                  {/* Bottom Telemetry HUD Bar */}
                  <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>AI STATUS: ACTIVE</span>
                      </span>
                      <span className="hidden sm:inline text-slate-600">|</span>
                      <span className="hidden sm:inline text-slate-300">
                        GPS: 18.5204° N, 73.8567° E (Pune Ward)
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400 font-bold">Health Score: 78/100 (Fair)</span>
                      <span className="text-amber-400 font-bold">Damage Index: 5.2</span>
                      <span className="text-cyan-400 font-bold">Coverage: 4.1%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. REAL-WORLD DEMONSTRATIONS: DUAL PHOTOGRAPHIC FEATURE SPOTLIGHT */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-28">
          {/* Spotlight 1: Mobile Camera IO-Tagging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Field Mobility & Authenticity</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Live Field Camera with Automated GPS IO Tagging
              </h2>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Municipal inspectors and citizens can capture road pavement distress directly on mobile devices without typing manual coordinates. The system queries hardware geolocation, resolves the exact street address via OpenStreetMap Nominatim, and permanently burns an immutable geo-tag banner into the bottom canvas.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tamper-Resistant Proof</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Coordinates and timestamps are burned into the image pixels, creating indisputable repair audit records.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Direct YOLOv8 Pipeline Ingestion</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Captured photos immediately stream into the deep learning model and pin onto the interactive GIS damage map.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Try Camera Capture Live</span>
                </Link>
              </div>
            </div>

            {/* Image Card: Mobile Camera IO Tag */}
            <div className="relative rounded-3xl p-1 bg-gradient-to-tr from-cyan-500/30 to-blue-500/20 shadow-xl overflow-hidden group">
              <div className="rounded-[22px] overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                <img
                  src="/mobile_camera_iotag.jpg"
                  alt="Mobile Camera IO Tagging Pothole Inspection"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Spotlight 2: Municipal GIS Control Center & Contractor Dispatch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Image Card: Municipal GIS Control Room */}
            <div className="relative rounded-3xl p-1 bg-gradient-to-tr from-indigo-500/30 to-purple-500/20 shadow-xl overflow-hidden group order-2 lg:order-1">
              <div className="rounded-[22px] overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                <img
                  src="/municipal_gis_dispatch.jpg"
                  alt="Municipal Transportation Control Center & GIS Dispatch"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>

            <div className="space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                <Building2 className="w-3.5 h-3.5" />
                <span>Municipal Governance & Automation</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Territorial Contractor Dispatch & Municipal Command
              </h2>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                No more paper inspection surveys and weeks of contractor dispatch delays. When road damage is detected, the backend executes hierarchical routing: matching specific municipal wards (e.g. Swargate, Katraj) to the approved contractor assigned to that region, with instant HTML email notifications and attached defect visualizers.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Tier Ward Resolution</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tier 1: Specific Ward Area &rarr; Tier 2: City &rarr; Tier 3: State &rarr; Tier 4: Global Active Contractors.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Continuous Audit Trail</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Every dispatch is persisted in the email logs table with timestamps, recipients, and status verification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/map"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Explore GIS Damage Map</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE LIVE PAVEMENT SCORING SIMULATOR */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-cyan-600 dark:text-cyan-400 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Interactive Mathematics Core
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Test The Pavement Health Formula Live
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Adjust defect counts and distressed surface coverage to see how our standardized formula computes objective municipal ratings in real time.
            </p>
          </div>

          <div className="max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Sliders Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      <span>Detected Potholes (D40 &bull; Weight: 2.5x)</span>
                    </span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-bold text-base">{simPotholes}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={simPotholes}
                    onChange={(e) => setSimPotholes(parseInt(e.target.value))}
                    className="w-full accent-rose-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>0 (Pristine)</span>
                    <span>3 (Moderate)</span>
                    <span>6 (Dangerous)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                      <span>Cracks (D00 Longitudinal / D20 Alligator)</span>
                    </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-base">{simCracks}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={simCracks}
                    onChange={(e) => setSimCracks(parseInt(e.target.value))}
                    className="w-full accent-blue-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>0 (None)</span>
                    <span>4 (Medium)</span>
                    <span>8 (Extensive)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                      <span>Distressed Surface Area Coverage %</span>
                    </span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-base">{simCoverage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={simCoverage}
                    onChange={(e) => setSimCoverage(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>0% (Clean)</span>
                    <span>10% (Significant)</span>
                    <span>20% (Sub-base Failure)</span>
                  </div>
                </div>

                {/* Equation Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Municipal Health Metric:</div>
                  <div className="text-cyan-600 dark:text-cyan-400">Score = 100 - (DI × 3.0) - (Coverage% × 1.2)</div>
                </div>
              </div>

              {/* Gauge Display Column */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <div className="relative w-44 h-44 flex items-center justify-center mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      strokeWidth="8"
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      strokeWidth="8"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * simScore) / 100}
                      strokeLinecap="round"
                      stroke={simCondition.progressColor}
                      className="transition-all duration-500"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {simScore}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">
                      OUT OF 100
                    </span>
                  </div>
                </div>

                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${simCondition.badgeBg}`}>
                  {simCondition.label}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mt-1">
                  {simCondition.description}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 w-full flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Damage Index: <strong className="text-slate-900 dark:text-white">{simDI}</strong></span>
                  <span className="text-slate-500">Coverage: <strong className="text-slate-900 dark:text-white">{simCoverage}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. RDD2022 DEFECT TAXONOMY EXPLORER */}
      {/* ========================================================================= */}
      <section id="taxonomy" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              International Benchmark
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Standardized RDD2022 Pavement Defect Taxonomy
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Click any defect category to inspect structural mechanics, model severity weights, and recommended municipal remedies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(defectTaxonomy).map(([code, item]) => (
              <button
                key={code}
                type="button"
                onClick={() => setActiveDefectTab(code)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeDefectTab === code
                    ? `${item.bg} ${item.border} shadow-lg scale-[1.02]`
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xl font-black text-slate-900 dark:text-white">{code}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${item.badge}`}>
                    {item.weight}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{item.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{item.tag}</p>
              </button>
            ))}
          </div>

          {/* Active Defect Deep-Dive Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-slate-400">Selected Defect Classification</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{activeDefectTab}: {defectTaxonomy[activeDefectTab].name}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${defectTaxonomy[activeDefectTab].badge}`}>
                    Severity Factor: {defectTaxonomy[activeDefectTab].weight}
                  </span>
                </h3>
              </div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Category: <strong>{defectTaxonomy[activeDefectTab].tag}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200">Root Cause & Structural Mechanics:</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs sm:text-sm">
                  {defectTaxonomy[activeDefectTab].cause}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200">Recommended Civil Engineering Remedy:</div>
                <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed text-xs sm:text-sm font-medium">
                  {defectTaxonomy[activeDefectTab].remedy}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. ENTERPRISE COMPARISON TABLE */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Comparative Analysis
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Manual Visual Surveys vs. Road Health AI
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Quantifiable performance gains across municipal speed, accuracy, and operational response.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/90 text-xs uppercase font-mono tracking-wider">
                    <th className="p-4 sm:px-6 text-slate-500">Criteria</th>
                    <th className="p-4 sm:px-6 text-rose-600 dark:text-rose-400">Traditional Visual Survey</th>
                    <th className="p-4 sm:px-6 text-cyan-600 dark:text-cyan-400 font-bold">Road Health AI Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Analysis Speed</td>
                    <td className="p-4 sm:px-6 text-slate-500">Days to weeks per road segment</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>&lt; 25ms Real-Time Tensor Inference</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Location Integrity</td>
                    <td className="p-4 sm:px-6 text-slate-500">Manual paper logging; easily misidentified</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Immutable Canvas IO Tag Watermarking</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Scoring Objectivity</td>
                    <td className="p-4 sm:px-6 text-slate-500">Subjective human inspector bias</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Standardized 0–100 Mathematical Index</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Contractor Alert Latency</td>
                    <td className="p-4 sm:px-6 text-slate-500">Paper reports routed over weeks</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Instant Area-Specific SMTP Routing</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Citizen Transparency</td>
                    <td className="p-4 sm:px-6 text-slate-500">Zero public tracking or visibility</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <MapIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Public Interactive GIS Damage Map</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FAQ ACCORDION SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/40 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-cyan-600 dark:text-cyan-400 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Platform FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Clear answers regarding system architecture, deep learning models, and municipal routing.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-base hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 shrink-0 ${
                      openFaq === idx ? "rotate-180 text-cyan-500" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="px-5 sm:px-6 pb-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-4"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. HIGH-CONVERTING BOTTOM CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="p-8 sm:p-14 md:p-16 rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-2xl shadow-cyan-500/10 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Pavement Assessment</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Start Assessing Road Damage In Seconds
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Capture a field photo with live GPS bottom-stamping, explore the public GIS road map, or run automated defect audits right now.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Inspection</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <Link
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-700 transition-all duration-200"
              >
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span>Explore GIS Road Map</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand Logo & Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white">Road Health AI</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Autonomous Road Damage Detection & Municipal Health Scoring
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400 font-medium">
              <Link to="/upload" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Camera Inspection
              </Link>
              <Link to="/map" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                GIS Road Map
              </Link>
              <Link to="/history" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Audit History
              </Link>
              <a href="#taxonomy" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Defect Taxonomy
              </a>
              <Link to="/login" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Portal Login
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-900 text-center text-xs text-slate-400 dark:text-slate-500">
            Road Health AI &bull; Deep Learning Pavement Inspection Platform &bull; All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

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
  Info,
} from "lucide-react";

export default function LandingPage() {
  // Hero Interactive Viewfinder Mode: 'ai_detection' | 'raw_sensor' | 'io_tag'
  const [heroMode, setHeroMode] = useState("ai_detection");
  const [hoveredBox, setHoveredBox] = useState(null);

  // Interactive Live Scoring Simulator State
  const [simPotholes, setSimPotholes] = useState(2);
  const [simCracks, setSimCracks] = useState(3);
  const [simCoverage, setSimCoverage] = useState(5.2);

  // Calculate simulated scoring live
  const simDI = Number((simPotholes * 2.5 + simCracks * 1.1).toFixed(1));
  const rawScore = 100 - simDI * 3.0 - simCoverage * 1.2;
  const simScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  const getSimCondition = (score) => {
    if (score >= 80) return { label: "Good", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "Routine monitoring scheduled." };
    if (score >= 60) return { label: "Fair", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "Preventive surface sealing recommended." };
    if (score >= 30) return { label: "Poor", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "High priority asphalt patching required." };
    return { label: "Critical", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", text: "Urgent emergency road intervention dispatched." };
  };

  const simCondition = getSimCondition(simScore);

  // Selected Defect Class for Taxonomy Card
  const [activeDefectTab, setActiveDefectTab] = useState("D40");

  const defectTaxonomy = {
    D00: {
      name: "Longitudinal Crack",
      weight: "1.0x",
      description: "Parallel cracks along vehicle travel lanes caused by sub-base settlement or asphalt joint fatigue.",
      color: "border-blue-500 bg-blue-500/20 text-blue-400",
      pillBg: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    },
    D10: {
      name: "Transverse Crack",
      weight: "1.2x",
      description: "Perpendicular cracks cutting across road lanes driven by thermal contraction and temperature cycles.",
      color: "border-indigo-500 bg-indigo-500/20 text-indigo-400",
      pillBg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
    },
    D20: {
      name: "Alligator Fatigue Cracking",
      weight: "2.0x",
      description: "Interconnected multi-polygon cracks resembling reptile scales, indicating structural pavement failure under repetitive axle loads.",
      color: "border-purple-500 bg-purple-500/20 text-purple-400",
      pillBg: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    },
    D40: {
      name: "Deep Pothole Cavity",
      weight: "2.5x",
      description: "Severe localized bowl-shaped depressions exposing pavement subgrade, presenting critical vehicular hazard.",
      color: "border-rose-500 bg-rose-500/20 text-rose-400",
      pillBg: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const steps = [
    {
      step: "01",
      title: "Live Camera IO Tagging & Ingestion",
      description:
        "Capture raw pavement live in the field with automated GPS bottom-stamping, or upload high-resolution dashcam photography.",
      icon: Camera,
      color: "from-cyan-500 to-blue-500",
      accent: "text-cyan-500 dark:text-cyan-400",
      bgAccent: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      step: "02",
      title: "Dual YOLOv8 Neural Vision",
      description:
        "Trained on 38,000+ benchmark road images to localize cracks and potholes with sub-centimeter bounding box regression.",
      icon: Crosshair,
      color: "from-blue-500 to-indigo-500",
      accent: "text-blue-500 dark:text-blue-400",
      bgAccent: "bg-blue-500/10 border-blue-500/20",
    },
    {
      step: "03",
      title: "Calibrated Damage Index & Coverage",
      description:
        "Calculates calibrated structural Damage Index (DI) using defect weights and measures total distressed asphalt area percentage.",
      icon: Layers,
      color: "from-amber-500 to-orange-500",
      accent: "text-amber-500 dark:text-amber-400",
      bgAccent: "bg-amber-500/10 border-amber-500/20",
    },
    {
      step: "04",
      title: "Territorial Dispatch & Gov Health Score",
      description:
        "Derives transparent 0–100 Road Health Index and automatically dispatches damage alerts directly to the designated ward contractor.",
      icon: Activity,
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-500 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] overflow-hidden pointer-events-none -z-10 opacity-70 dark:opacity-40">
        <div className="absolute -top-40 left-1/4 w-[480px] h-[480px] bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-20 right-1/4 w-[420px] h-[420px] bg-gradient-to-br from-indigo-500/25 to-purple-600/25 rounded-full blur-[140px]" />
        <div className="absolute top-72 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-400/15 rounded-full blur-[160px]" />
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto space-y-6"
          >
            {/* Top Interactive Pill Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-sm hover:border-cyan-500/60 transition-all cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="font-mono uppercase tracking-wider text-[11px]">RDD2022 Deep Learning Benchmark</span>
                <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">Live IO Tag Camera</span>
              </span>
            </motion.div>

            {/* Main Hero Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]"
            >
              Autonomous Road Damage Detection &{" "}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                Real-Time Health Scoring
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Identify longitudinal cracks, alligator fatigue, and hazardous potholes with high-speed neural vision. Automatically calculate Damage Index, surface coverage %, and transparent 0–100 Road Health Scores.
            </motion.p>

            {/* Hero Interactive CTAs */}
            <motion.div
              variants={itemVariants}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-xl shadow-blue-500/25 hover:shadow-cyan-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                <Camera className="w-4 h-4 text-cyan-300" />
                <span>Open Camera & Geotag</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                to="/map"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200"
              >
                <MapIcon className="w-4 h-4 text-emerald-500" />
                <span>Interactive GIS Damage Map</span>
              </Link>
            </motion.div>

            {/* Social Proof & Metrics Mini-Strip */}
            <motion.div
              variants={itemVariants}
              className="pt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                <span>4-Class RDD2022 Taxonomy</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Automated GPS Watermarking</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Area-Specific Contractor Routing</span>
              </span>
            </motion.div>
          </motion.div>

          {/* ========================================================================= */}
          {/* HERO GRAPHIC / INTERACTIVE MOCKUP PREVIEW */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl p-1.5 bg-gradient-to-b from-cyan-500/40 via-blue-600/20 to-slate-900/80 shadow-2xl shadow-cyan-500/15">
              {/* Inner Dashboard Glass Frame */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/70 shadow-inner">
                {/* Mock Window Header with Interactive Mode Tabs */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 text-xs text-slate-400 gap-3">
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block shadow-sm" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-sm" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-sm" />
                    </div>
                    <span className="ml-3 font-mono text-[11px] text-slate-300">
                      roadhealth://telemetry/live-pavement-inspection
                    </span>
                  </div>

                  {/* Interactive Viewport Mode Tabs */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-medium gap-1 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setHeroMode("ai_detection")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                        heroMode === "ai_detection"
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>AI Detection</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroMode("raw_sensor")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                        heroMode === "raw_sensor"
                          ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Raw Surface</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroMode("io_tag")}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                        heroMode === "io_tag"
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>IO Tag Watermark</span>
                    </button>
                  </div>
                </div>

                {/* Real Road Canvas Preview with High-Res Photographic Surface */}
                <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none">
                  {/* High-Resolution Road Surface Photo Backdrop */}
                  <img
                    src="/road_inspection_hero.jpg"
                    alt="Pavement Surface Inspection"
                    className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.10]"
                  />

                  {/* Gradient Vignette Overlays for Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/40 pointer-events-none" />
                  <div className="absolute inset-0 scan-grid opacity-15 pointer-events-none" />

                  {/* ================= MODE 1: AI DETECTION MODE ================= */}
                  {heroMode === "ai_detection" && (
                    <>
                      {/* Active Animated Scan Beam */}
                      <div className="animate-scanline scan-beam pointer-events-none z-10" />

                      {/* Corner Target Reticles */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />

                      {/* Interactive Bounding Box 1: D40 Pothole */}
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        onMouseEnter={() => setHoveredBox("D40")}
                        onMouseLeave={() => setHoveredBox(null)}
                        className="absolute bottom-[24%] right-[28%] sm:right-[34%] w-36 sm:w-48 h-20 sm:h-28 border-2 border-rose-500 bg-rose-500/25 rounded-lg shadow-[0_0_30px_rgba(244,63,94,0.6)] cursor-pointer z-20 group hover:scale-105 transition-transform"
                      >
                        <div className="absolute -top-7 left-0 bg-rose-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>D40: Pothole &bull; 94.6%</span>
                        </div>
                        {/* Corner Target Marks */}
                        <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

                        {/* Interactive Tooltip on Hover */}
                        <AnimatePresence>
                          {hoveredBox === "D40" && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-slate-950/95 border border-rose-500 text-[10px] text-white shadow-xl whitespace-nowrap z-30"
                            >
                              <div className="font-bold text-rose-400">Class Weight: 2.5x (High Hazard)</div>
                              <div className="text-slate-300">Action: Priority Patching Dispatched</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Interactive Bounding Box 2: D00 Longitudinal Crack */}
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        onMouseEnter={() => setHoveredBox("D00")}
                        onMouseLeave={() => setHoveredBox(null)}
                        className="absolute bottom-[28%] left-[18%] sm:left-[24%] w-40 sm:w-56 h-22 sm:h-28 border-2 border-blue-500 bg-blue-500/20 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.5)] cursor-pointer z-20 group hover:scale-105 transition-transform"
                      >
                        <div className="absolute -top-7 left-0 bg-blue-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          <span>D00: Longitudinal Crack &bull; 89.2%</span>
                        </div>
                        {/* Corner Target Marks */}
                        <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                        <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

                        {/* Interactive Tooltip on Hover */}
                        <AnimatePresence>
                          {hoveredBox === "D00" && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-2 rounded-lg bg-slate-950/95 border border-blue-500 text-[10px] text-white shadow-xl whitespace-nowrap z-30"
                            >
                              <div className="font-bold text-blue-400">Class Weight: 1.0x (Pavement Fatigue)</div>
                              <div className="text-slate-300">Action: Bituminous Crack Sealing</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </>
                  )}

                  {/* ================= MODE 2: RAW SENSOR MODE ================= */}
                  {heroMode === "raw_sensor" && (
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>RAW ASPHALT SENSOR FEED &bull; 4K HIGH RES</span>
                    </div>
                  )}

                  {/* ================= MODE 3: IO TAG WATERMARK BANNER ================= */}
                  {heroMode === "io_tag" && (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 backdrop-blur-md border-t-2 border-cyan-400 p-3 sm:p-4 text-left z-30 animate-in slide-in-from-bottom duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/40">
                            IO TAG CERTIFIED
                          </span>
                          <span className="text-xs font-bold text-white tracking-wide">
                            ROAD HEALTH AI &bull; FIELD GEO-INSPECTION
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} • 10:45:22 AM
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="font-mono text-cyan-300 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>GPS: 18.5089° N, 73.8567° E (Locked)</span>
                        </div>
                        <div className="text-slate-300 truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Location: Swargate / Shivaji Road, Pune, Maharashtra</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating Telemetry Metric Cards (Persistent HUD) */}
                  <div className="absolute top-4 right-4 hidden md:flex items-center gap-2 bg-slate-950/85 border border-slate-800 px-3.5 py-1.5 rounded-full text-[11px] font-mono text-emerald-400 shadow-xl backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AI INFERENCE ACTIVE &bull; 24ms</span>
                  </div>

                  {heroMode !== "io_tag" && (
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
                      <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase font-mono text-slate-400">Health Score</p>
                          <p className="text-sm font-extrabold text-emerald-400 font-mono">
                            82 / 100 <span className="text-xs font-normal text-slate-300">(Good)</span>
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase font-mono text-slate-400">Damage Index</p>
                          <p className="text-sm font-extrabold text-amber-400 font-mono">
                            4.6 <span className="text-xs font-normal text-slate-300">(Low)</span>
                          </p>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase font-mono text-slate-400">Distress Coverage</p>
                          <p className="text-sm font-extrabold text-cyan-400 font-mono">3.8%</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-xl">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] uppercase font-mono text-slate-400">Model Precision</p>
                          <p className="text-sm font-extrabold text-blue-400 font-mono">94.6% mAP</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE LIVE PAVEMENT SCORING SIMULATOR (NEW FEATURE PLAYGROUND) */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-24 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-cyan-600 dark:text-cyan-400 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Interactive Mathematics Simulator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Test The Pavement Health Formula Live
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Adjust defect counts and asphalt surface coverage to see how our calibrated municipal scoring formula dynamically grades road health in real time.
            </p>
          </div>

          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 shadow-xl shadow-cyan-500/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Controls Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      <span>Detected Potholes (D40 &bull; Weight 2.5x)</span>
                    </span>
                    <span className="font-mono text-rose-500 font-bold text-base">{simPotholes}</span>
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
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>0 (None)</span>
                    <span>3 (Moderate)</span>
                    <span>6 (Hazardous)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                      <span>Longitudinal & Fatigue Cracks (D00/D20)</span>
                    </span>
                    <span className="font-mono text-blue-500 font-bold text-base">{simCracks}</span>
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
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>0 (Clean)</span>
                    <span>4 (Wear & Tear)</span>
                    <span>8 (Extensive)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm font-semibold mb-2">
                    <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                      <span>Distressed Surface Coverage %</span>
                    </span>
                    <span className="font-mono text-cyan-500 font-bold text-base">{simCoverage}%</span>
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
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>0% (Pristine)</span>
                    <span>10% (Substantial)</span>
                    <span>20% (Base Failure)</span>
                  </div>
                </div>

                {/* Mathematical Equation Pill */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Standard Formula:</div>
                  <code>Score = 100 - (DI × 3.0) - (Coverage% × 1.2)</code>
                </div>
              </div>

              {/* Dynamic Live Score Gauge & Condition Card */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center">
                {/* Score Number Display */}
                <div className="relative w-40 h-40 flex items-center justify-center mb-4">
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
                      stroke="currentColor"
                      className={`${simCondition.color} transition-all duration-500`}
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {simScore}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                      OUT OF 100
                    </span>
                  </div>
                </div>

                {/* Condition Tier Badge */}
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${simCondition.bg} ${simCondition.color} ${simCondition.border}`}>
                  Condition: {simCondition.label}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mt-1">
                  {simCondition.text}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 w-full flex justify-between text-xs font-mono text-slate-500">
                  <span>Damage Index: <strong className="text-slate-900 dark:text-white">{simDI}</strong></span>
                  <span>Coverage: <strong className="text-slate-900 dark:text-white">{simCoverage}%</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS / SYSTEM PIPELINE */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              System Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              From Raw Imagery to Explainable Health Scores
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              An end-to-end computer vision pipeline tailored for transparent road pavement distress assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                  className="relative group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-xl border ${item.bgAccent} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${item.accent}`} />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-cyan-500/40 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Flow Arrow (Desktop) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. BENTO GRID FEATURES & DEFECT TAXONOMY */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Complete Pavement Intelligence
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Explore the key architectural building blocks powering automated road governance.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Interactive RDD2022 Defect Taxonomy (Span 2 Cols) */}
            <div className="md:col-span-2 p-7 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        4-Class Pavement Defect Taxonomy
                      </h3>
                      <p className="text-xs text-slate-500">Standardized RDD2022 Benchmark Categories</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold border border-indigo-500/30">
                    Weights: 1.0x – 2.5x
                  </span>
                </div>

                {/* Interactive Class Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {Object.entries(defectTaxonomy).map(([code, item]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveDefectTab(code)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        activeDefectTab === code
                          ? `${item.pillBg} border-current shadow-md scale-[1.02]`
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">{code}</div>
                      <div className="text-[11px] font-semibold truncate">{item.name}</div>
                    </button>
                  ))}
                </div>

                {/* Selected Defect Detail Box */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {activeDefectTab}: {defectTaxonomy[activeDefectTab].name}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      Severity Weight: {defectTaxonomy[activeDefectTab].weight}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {defectTaxonomy[activeDefectTab].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Live Camera & IO Tag Geo-Stamping */}
            <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-cyan-500/5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold mb-4">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Live Camera IO Tagging
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Snaps live road photos with automatic GPS latitude, longitude, reverse geocoded street address, and live timestamp stamped directly into the bottom canvas.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-500 font-bold">GPS Coordinate Lock</span>
                <span className="text-slate-400">18.5089° N, 73.8567° E</span>
              </div>
            </div>

            {/* Bento Card 3: Territorial Contractor Routing */}
            <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-amber-500/5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Territorial Contractor Routing
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Multi-tier routing engine parses state, city, and sub-city neighborhood tokens (with Devanagari transliteration) to dispatch alerts strictly to the responsible contractor.
                </p>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Jurisdiction:</span>
                  <span className="text-amber-500 font-bold">Swargate, Pune</span>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Interactive GIS Damage Map */}
            <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-emerald-500/5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
                  <MapIcon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  GIS Damage Map
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Interactive Leaflet map displaying municipal road audits with color-coded condition markers: Green (Good), Yellow (Fair), Orange (Poor), and Red (Critical).
                </p>
              </div>
              <Link
                to="/map"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all"
              >
                <span>View Full Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Bento Card 5: Before / After Split Slider */}
            <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl hover:shadow-purple-500/5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold mb-4">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Interactive Split Slider
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Dual-handle slider allows inspectors to drag across the original road surface vs. AI bounding box annotations to evaluate detection fidelity.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-center text-purple-500 font-bold">
                Raw Pavement &harr; AI Annotations
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TRADITIONAL VS ROAD HEALTH AI COMPARISON TABLE */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-24 border-t border-slate-200/80 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
              Enterprise Comparison
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Traditional Road Surveys vs. Road Health AI
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Why autonomous computer vision outperforms manual visual engineering surveys.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-xs uppercase font-mono tracking-wider">
                    <th className="p-4 sm:px-6 text-slate-500">Evaluation Parameter</th>
                    <th className="p-4 sm:px-6 text-rose-500">Traditional Visual Inspection</th>
                    <th className="p-4 sm:px-6 text-cyan-500 font-bold">Road Health AI Platform</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Inspection Speed</td>
                    <td className="p-4 sm:px-6 text-slate-500">Days to weeks per road segment</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span>&lt; 500ms Instant Inference</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Coordinate Authenticity</td>
                    <td className="p-4 sm:px-6 text-slate-500">Manual notepad logging; error-prone</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>IO Tag Canvas Bottom-Stamping</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Objectivity of Rating</td>
                    <td className="p-4 sm:px-6 text-slate-500">Subjective human estimation</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Calibrated 0–100 Standard Metric</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Contractor Alert Latency</td>
                    <td className="p-4 sm:px-6 text-slate-500">Manual paperwork over weeks</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-emerald-500" />
                      <span>Instant Area-Specific SMTP Routing</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:px-6 font-semibold text-slate-900 dark:text-white">Public Transparency</td>
                    <td className="p-4 sm:px-6 text-slate-500">Zero citizen insight</td>
                    <td className="p-4 sm:px-6 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                      <MapIcon className="w-4 h-4 text-emerald-500" />
                      <span>Public GIS Road Damage Map</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FINAL CALL TO ACTION (CTA) */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-24 border-t border-slate-200/80 dark:border-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-2xl shadow-cyan-500/10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Ready for Inspection</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Start Assessing Pavement Distress Today
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Upload an inspection photograph or snap with your live camera to detect road defects, quantify damage coverage, and calculate an instant road health index.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
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
                <span>Explore Road Map</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-md">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">Road Health AI</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-semibold">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated Road Damage Assessment & Health Scoring
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <a href="#features" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                How It Works
              </a>
              <Link to="/upload" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Camera Inspection
              </Link>
              <Link to="/map" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                Road Map
              </Link>
              <Link to="/history" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                History
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

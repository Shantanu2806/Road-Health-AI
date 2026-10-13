import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const steps = [
    {
      step: "01",
      title: "Camera Capture or Image Upload",
      description:
        "Snap photos live in the field with automatic bottom-stamped GPS geo-tagging, or upload high-resolution road surface photographs.",
      icon: Camera,
      color: "from-blue-500 to-cyan-500",
      accent: "text-blue-500 dark:text-blue-400",
      bgAccent: "bg-blue-500/10 border-blue-500/20",
    },
    {
      step: "02",
      title: "AI Damage Detection",
      description:
        "YOLOv8 deep learning vision model detects and localizes 4 primary defect classes with high-confidence bounding boxes.",
      icon: Crosshair,
      color: "from-indigo-500 to-purple-500",
      accent: "text-indigo-500 dark:text-indigo-400",
      bgAccent: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      step: "03",
      title: "Severity & Coverage Analysis",
      description:
        "Calculates calibrated Damage Index (DI) using defect category weights and measures bounding box surface coverage percentage.",
      icon: Layers,
      color: "from-amber-500 to-orange-500",
      accent: "text-amber-500 dark:text-amber-400",
      bgAccent: "bg-amber-500/10 border-amber-500/20",
    },
    {
      step: "04",
      title: "Road Health Score (0–100)",
      description:
        "Derives an objective, explainable health index and classifies overall road condition into Good, Fair, Poor, or Critical.",
      icon: Activity,
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-500 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  const features = [
    {
      title: "4-Class Defect Detection",
      badge: "RDD2022 Taxonomy",
      description:
        "Accurately pinpoints Longitudinal Cracks (D00), Transverse Cracks (D10), Alligator Cracks (D20), and Potholes (D40) with localized spatial boundaries.",
      icon: Cpu,
      gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
      iconColor: "text-blue-400",
    },
    {
      title: "AI Road Health Score (0–100)",
      badge: "Objective Metric",
      description:
        "Standardized mathematical index computed from severity-weighted defect counts and total surface area coverage: 100 - (DI × 3) - (Coverage% × 1.2).",
      icon: ShieldCheck,
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      iconColor: "text-emerald-400",
    },
    {
      title: "Interactive Before/After Slider",
      badge: "Visual Inspection",
      description:
        "Seamless dual-image split slider lets inspectors drag across original raw pavement vs. bounding box annotations to evaluate AI detection fidelity.",
      icon: Sliders,
      gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
      iconColor: "text-purple-400",
    },
    {
      title: "Severity Classification",
      badge: "Automated Grading",
      description:
        "Classifies overall road distress into Low, Medium, or High severity tiers using calibrated damage index thresholds (<5, 5-12, >12).",
      icon: AlertTriangle,
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      iconColor: "text-amber-400",
    },
    {
      title: "Surface Coverage Estimation",
      badge: "Spatial Density",
      description:
        "Calculates the exact ratio of detected damage bounding box surface area against total pavement area, ensuring transparent density reporting.",
      icon: Layers,
      gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
      iconColor: "text-cyan-400",
    },
    {
      title: "Inspection History & Audits",
      badge: "Data Tracking",
      description:
        "Persists previous analysis runs with complete detection records, timestamps, score trajectories, and direct one-click report retrieval.",
      icon: History,
      gradient: "from-violet-500/20 via-indigo-500/10 to-transparent",
      iconColor: "text-violet-400",
    },
  ];

  const stats = [
    { value: "4", label: "Defect Classes", desc: "D00, D10, D20, D40" },
    { value: "38,000+", label: "Benchmark Images", desc: "RDD2022 Multicountry Dataset" },
    { value: "0 – 100", label: "Normalized Health Index", desc: "Good • Fair • Poor • Critical" },
    { value: "< 500ms", label: "Pipeline Latency", desc: "FastAPI REST Endpoint" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-blue-500/30">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] overflow-hidden pointer-events-none -z-10 opacity-60 dark:opacity-40">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[128px]" />
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-500/25 rounded-full blur-[128px]" />
        <div className="absolute top-60 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/15 rounded-full blur-[140px]" />
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto space-y-6"
          >
            {/* Top Project Pill Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 backdrop-blur-md shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>YOLOv8 Computer Vision &bull; RDD2022 Benchmark</span>
              </span>
            </motion.div>

            {/* Main Hero Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
            >
              AI-Powered Road Damage Detection &{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-400 bg-clip-text text-transparent">
                Real-Time Health Scoring
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
            >
              Identify cracks, potholes, and surface distress with high-speed neural vision. Automatically calculate Damage Index, surface coverage %, and an objective 0–100 Road Health Score.
            </motion.p>

            {/* Hero CTAs */}
            <motion.div
              variants={itemVariants}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-200"
              >
                <span>Get Started — Analyze Image</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all duration-200"
              >
                <span>Explore Pipeline</span>
              </a>
            </motion.div>
          </motion.div>

          {/* ========================================================================= */}
          {/* HERO GRAPHIC / INTERACTIVE MOCKUP PREVIEW */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl p-1.5 bg-gradient-to-b from-blue-500/30 via-slate-800/40 to-slate-900/80 shadow-2xl shadow-blue-500/10">
              {/* Inner Dashboard Glass Frame */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 dark:bg-slate-950 border border-slate-700/60 dark:border-slate-800">
                {/* Mock Window Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 dark:bg-slate-900/90 border-b border-slate-700/60 dark:border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    </div>
                    <span className="ml-3 font-mono text-[11px] text-slate-300 hidden sm:inline-block">
                      roadhealth://inference/live-inspection-sample
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-[11px] text-emerald-400 font-semibold">AI DETECTOR ACTIVE</span>
                  </div>
                </div>

                {/* Real Road Canvas Preview with Active Scan Beam */}
                <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                  {/* High-Resolution Road Surface Photo Backdrop */}
                  <img
                    src="/road_inspection_hero.jpg"
                    alt="Pavement Surface Inspection"
                    className="absolute inset-0 w-full h-full object-cover object-bottom filter brightness-[0.85] contrast-[1.12]"
                  />

                  {/* High-Tech Tactical Grid & Vignette Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/40 pointer-events-none" />
                  <div className="absolute inset-0 scan-grid opacity-20 pointer-events-none" />

                  {/* High-Tech Animated Scan Beam */}
                  <div className="animate-scanline scan-beam pointer-events-none z-10" />

                  {/* Simulated YOLO Bounding Box 1: D40 Pothole */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute bottom-[28%] left-[20%] sm:left-[24%] w-36 sm:w-48 h-20 sm:h-28 border-2 border-red-500 bg-red-500/20 rounded shadow-[0_0_25px_rgba(239,68,68,0.5)] backdrop-blur-[1px] z-10"
                  >
                    <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>D40: Pothole &bull; 94%</span>
                    </div>
                    {/* Corner Target Reticles */}
                    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
                  </motion.div>

                  {/* Simulated YOLO Bounding Box 2: D00 Longitudinal Crack */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                    className="absolute bottom-[22%] right-[22%] sm:right-[30%] w-40 sm:w-56 h-24 sm:h-32 border-2 border-blue-500 bg-blue-500/20 rounded shadow-[0_0_25px_rgba(59,130,246,0.5)] backdrop-blur-[1px] z-10"
                  >
                    <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>D00: Longitudinal Crack &bull; 89%</span>
                    </div>
                    {/* Corner Reticles */}
                    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
                  </motion.div>

                  {/* Floating Telemetry Overlay Pills */}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
                    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-mono text-slate-400">Road Health Score</p>
                        <p className="text-sm font-bold text-emerald-400 font-mono">
                          82 / 100 <span className="text-xs font-normal text-slate-300">(Good)</span>
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-mono text-slate-400">Damage Index</p>
                        <p className="text-sm font-bold text-amber-400 font-mono">
                          4.6 <span className="text-xs font-normal text-slate-300">(Low)</span>
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-mono text-slate-400">Distress Coverage</p>
                        <p className="text-sm font-bold text-cyan-400 font-mono">3.8%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg">
                      <Zap className="w-4 h-4 text-blue-400" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-mono text-slate-400">Inference Speed</p>
                        <p className="text-sm font-bold text-blue-400 font-mono">24ms</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HOW IT WORKS SECTION */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/50 transition-colors">
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
                  className="relative group p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                >
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3 rounded-xl border ${item.bgAccent}`}>
                      <Icon className={`w-6 h-6 ${item.accent}`} />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-blue-500/40 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
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
      {/* 3. FEATURES GRID SECTION */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-900 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Complete Pavement Intelligence
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Purpose-built tools for rapid pavement triage, spatial defect mapping, and rigorous audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/90 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                >
                  {/* Subtle Card Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 group-hover:scale-110 transition-transform duration-300">
                        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                        {feature.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HONEST STATS & CREDIBILITY SECTION */}
      {/* ========================================================================= */}
      <section id="about" className="py-20 border-t border-slate-200/80 dark:border-slate-900 bg-white dark:bg-slate-900/40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent font-mono mb-1">
                  {stat.value}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-0.5">
                  {stat.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {stat.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Academic Context / Transparency Box */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-950 border border-blue-200/60 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Academic Research & Course Project Context
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Road Health AI is developed as an academic Deep Learning Course Project investigating automated computer vision for public roadway inspection. It utilizes the standardized <strong>Road Damage Dataset (RDD2022)</strong> benchmark taxonomy and couples deep object detection with transparent, verifiable condition formulas to empower municipal maintenance without black-box ambiguity.
                </p>
              </div>

              <Link
                to="/upload"
                className="whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                Test Detection Model
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FINAL CALL TO ACTION (CTA) */}
      {/* ========================================================================= */}
      <section className="py-20 md:py-24 border-t border-slate-200/80 dark:border-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 shadow-2xl shadow-indigo-500/10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Zap className="w-3.5 h-3.5" />
              <span>Ready for Inspection</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Start Assessing Pavement Distress Today
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Upload an inspection photograph to identify defects, quantify damage coverage, and calculate an instant road health index.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/upload"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/45 active:scale-[0.98] transition-all duration-200"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/history"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-slate-300 bg-slate-800/90 hover:bg-slate-800 hover:text-white border border-slate-700 transition-all duration-200"
              >
                <History className="w-4 h-4" />
                <span>View Previous Analyses</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">Road Health AI</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                    v1.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated Road Damage Assessment & Health Scoring
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
              <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                About
              </a>
              <Link to="/upload" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Upload
              </Link>
              <Link to="/history" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                History
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

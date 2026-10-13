import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileImage,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sliders,
  Sparkles,
  X,
  Scan,
  Zap,
  Camera,
  MapPin,
  Compass,
} from "lucide-react";
import { analyzeImage, BACKEND_BASE_URL } from "../api/api";
import { DAMAGE_CLASSES } from "../utils/colors";
import LocationPicker from "../components/LocationPicker";
import CameraCaptureModal from "../components/CameraCaptureModal";

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [locationData, setLocationData] = useState({
    latitude: null,
    longitude: null,
    location_name: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleCameraCapture = ({ file, previewUrl, latitude, longitude, location_name }) => {
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(previewUrl);
    if (latitude !== null && longitude !== null) {
      setLocationData({
        latitude,
        longitude,
        location_name: location_name || "Camera Geo-Tagged Road Location",
      });
    }
  };

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid road surface image (JPG, PNG, WebP).");
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image file is too large (> 25 MB). Please select a smaller photo.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Generate self-contained high-quality demo samples on the fly
  const loadDemoSample = (type) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    // Base asphalt gray
    ctx.fillStyle = type === "blurry" ? "#22272e" : "#3b4252";
    ctx.fillRect(0, 0, 640, 480);

    // Add asphalt noise texture
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 640;
      const y = Math.random() * 480;
      const shade = Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.3)`;
      ctx.fillRect(x, y, 2, 2);
    }

    if (type === "clean") {
      // White lane marking
      ctx.fillStyle = "#e5e9f0";
      ctx.fillRect(315, 0, 10, 480);
    } else if (type === "damaged") {
      // Yellow center lane dividing line
      ctx.fillStyle = "#ebcb8b";
      ctx.fillRect(315, 0, 8, 480);

      // Draw primary simulated pothole
      ctx.fillStyle = "#15181f";
      ctx.beginPath();
      ctx.ellipse(200, 260, 55, 38, Math.PI / 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = "#2e3440";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Secondary pothole
      ctx.fillStyle = "#1c2028";
      ctx.beginPath();
      ctx.ellipse(440, 320, 42, 28, -Math.PI / 10, 0, 2 * Math.PI);
      ctx.fill();

      // Longitudinal crack
      ctx.strokeStyle = "#1a1c23";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(380, 80);
      ctx.lineTo(410, 170);
      ctx.lineTo(390, 260);
      ctx.lineTo(430, 380);
      ctx.stroke();

      // Transverse crack line
      ctx.beginPath();
      ctx.moveTo(120, 180);
      ctx.lineTo(260, 195);
      ctx.stroke();
    } else if (type === "blurry") {
      // Low contrast wet pavement
      ctx.fillStyle = "rgba(100, 120, 140, 0.2)";
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#4c566a";
      ctx.fillRect(318, 0, 4, 480);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample_${type}_road.jpg`, { type: "image/jpeg" });
        handleFile(file);
      }
    }, "image/jpeg", 0.9);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select or drop an image file first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log("UploadPage: Submitting road inspection with location data:", {
      file: selectedFile?.name,
      conf_threshold: confThreshold,
      latitude: locationData?.latitude,
      longitude: locationData?.longitude,
      location_name: locationData?.location_name,
    });

    try {
      const data = await analyzeImage(selectedFile, confThreshold, locationData);
      navigate(`/results/${data.id}`, { state: { analysisData: data } });
    } catch (err) {
      console.error("Analysis failed:", err);
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError(
          `Cannot connect to backend server at ${BACKEND_BASE_URL}. Make sure your FastAPI backend is running.`
        );
      } else {
        const detail = err.response?.data?.detail || err.message || "Failed to analyze image";
        setError(detail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 transition-colors">
      {/* Header / Intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automated Pavement Inspection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Road Damage Assessment
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
          Upload any road surface photograph to detect pavement distress, estimate affected surface coverage,
          and compute transparent 0–100 Road Health Scores based on RDD2022 benchmarks.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-sm animate-fadeIn shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Upload Notice</p>
            <p className="text-rose-700 dark:text-rose-300/90 text-xs mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Card with Subtle Glow */}
      <div className="relative rounded-2xl p-1 bg-gradient-to-b from-slate-200/70 dark:from-slate-800/70 via-slate-200/30 dark:via-slate-800/30 to-transparent shadow-xl shadow-slate-200/50 dark:shadow-black/50">
        <div className="bg-white dark:bg-slate-900/90 rounded-[14px] p-6 sm:p-8 transition-colors">
          {/* Drag & Drop Box */}
          {!selectedFile ? (
            <div className="space-y-6">
              {/* Dual Selection Options: Camera Capture vs File Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Live Camera Capture with Auto Geo-Tagging */}
                <div
                  onClick={() => setIsCameraOpen(true)}
                  className="cursor-pointer border-2 border-dashed border-cyan-500/50 dark:border-cyan-500/30 hover:border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 hover:bg-cyan-50/80 dark:hover:bg-cyan-950/40 rounded-2xl p-6 sm:p-8 text-center transition-all group flex flex-col items-center justify-center relative overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3 h-3 text-cyan-500 animate-spin" />
                    <span>Auto Geo-Tag</span>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Capture with Camera
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs">
                    Live mobile/webcam capture. Automatically stamps GPS coordinates, address, and timestamp on the bottom of the photo.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCameraOpen(true);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera & Geotag</span>
                  </button>
                </div>

                {/* Option 2: Upload File / Drag and Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center group ${
                    isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[0.99]"
                      : "border-slate-300 dark:border-slate-700/80 hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform shadow-sm">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Upload Image File
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Drag and drop or <span className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2">browse files</span>
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-2 font-mono">
                    Supported: JPG, PNG, WebP (Max 25 MB)
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <span>Select From Device</span>
                  </button>
                </div>
              </div>

              {/* Quick Sample Demo Selector for Fast Evaluation */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Try a Benchmark Demo Sample:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => loadDemoSample("damaged")}
                    className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 hover:border-red-500 text-left text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-all shadow-sm"
                  >
                    <span className="block font-semibold">Distressed Pavement</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Multiple defect classes (D00–D40)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDemoSample("clean")}
                    className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500 text-left text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm"
                  >
                    <span className="block font-semibold">Clean Asphalt</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Zero defects control sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDemoSample("blurry")}
                    className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700/80 bg-slate-100/60 dark:bg-slate-800/40 hover:border-blue-500 text-left text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
                  >
                    <span className="block font-semibold">Wet / Night Road</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Low-contrast surface test</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Box with Interactive AI Scanning Overlay */
            <div className="space-y-6">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-800 max-h-96 flex items-center justify-center group shadow-inner">
                <img
                  src={previewUrl}
                  alt="Selected Preview"
                  className={`max-h-96 w-auto object-contain transition-all duration-300 ${
                    isLoading ? "brightness-75 contrast-125" : ""
                  }`}
                />

                {/* High-Tech AI Scanning Animation Overlay when Loading */}
                {isLoading && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden scan-grid">
                    {/* Moving Laser Beam */}
                    <div className="scan-beam animate-scanline" />

                    {/* Corner Target Reticles */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

                    {/* Scanning Banner */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 text-cyan-300 text-xs font-mono font-semibold flex items-center gap-2">
                      <Scan className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>AI ANALYZING ROAD SURFACE...</span>
                    </div>

                    {/* Status telemetry ticker */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md bg-slate-950/80 text-[11px] font-mono text-cyan-400 border border-cyan-500/30">
                      Scanning Road Surface Features
                    </div>
                  </div>
                )}

                {/* Close / Change Button */}
                {!isLoading && (
                  <button
                    onClick={clearSelection}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-md"
                    title="Change image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* File details pill */}
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm">
                  <FileImage className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span className="truncate max-w-[180px] sm:max-w-xs font-medium">{selectedFile.name}</span>
                  <span className="text-slate-500 font-mono">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>

                {/* Geo-Tag Indicator Badge */}
                {locationData.latitude !== null && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                    <MapPin className="w-3 h-3 text-white" />
                    <span>Geo-Tagged Photo</span>
                  </div>
                )}
              </div>

              {/* Threshold Slider Option */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 transition-colors">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    Confidence Threshold
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {confThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.60"
                  step="0.05"
                  disabled={isLoading}
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>0.15 (High Recall)</span>
                  <span>0.60 (High Precision)</span>
                </div>
              </div>

              {/* Geographic Location Picker (GPS / Drop Pin) */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 transition-colors">
                <LocationPicker
                  locationData={locationData}
                  onChange={setLocationData}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all disabled:opacity-50"
                >
                  Choose Another
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Surface...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Run Assessment</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RDD2022 Damage Classes Legend with Rich Borders */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {Object.entries(DAMAGE_CLASSES).map(([code, item]) => (
          <div
            key={code}
            className={`p-3.5 rounded-xl border shadow-sm transition-all ${item.bgClass} ${item.borderClass}`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-mono font-bold text-sm ${item.textClass}`}>{item.code}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 font-medium">
                Wt {item.weight.toFixed(1)}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium text-xs mt-1.5">
              {item.name}
            </p>
          </div>
        ))}
      </div>

      {/* Live Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCaptureComplete={handleCameraCapture}
      />
    </div>
  );
}

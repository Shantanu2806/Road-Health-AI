import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Layers,
  CheckCircle2,
  FileImage,
  Loader2,
  Sliders,
  ExternalLink,
  Filter,
  PlusCircle,
  History,
  MapPin,
  Send,
  Mail,
} from "lucide-react";
import { getAnalysisById, getFullImageUrl, resendDamageAlert } from "../api/api";
import { SeverityBadge, ConditionBadge, DamageClassBadge } from "../components/ScoreBadge";
import ClassDistributionChart from "../components/ClassDistributionChart";
import CircularScoreGauge from "../components/CircularScoreGauge";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import { DAMAGE_CLASSES } from "../utils/colors";

export default function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Defensive state initialization from React Router state
  const [analysis, setAnalysis] = useState(location.state?.analysisData || null);
  const [isLoading, setIsLoading] = useState(!analysis);
  const [error, setError] = useState(null);

  // View Mode: 'slider' | 'annotated' | 'original'
  const [imageViewMode, setImageViewMode] = useState("slider");

  // Damage table filter: 'all' | 'D00' | 'D10' | 'D20' | 'D40'
  const [filterClass, setFilterClass] = useState("all");

  // Damage Alert dispatch state
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(null);

  const handleResendAlert = async () => {
    if (!analysis?.id || sendingAlert) return;
    setSendingAlert(true);
    setAlertSuccess(null);
    try {
      await resendDamageAlert(analysis.id);
      setAlertSuccess("Alert Dispatched!");
      setTimeout(() => setAlertSuccess(null), 5000);
    } catch (err) {
      console.error("Failed to resend alert:", err);
      setAlertSuccess("Dispatch Failed");
      setTimeout(() => setAlertSuccess(null), 4000);
    } finally {
      setSendingAlert(false);
    }
  };

  useEffect(() => {
    // If not passed via state, fetch directly by ID
    if (!analysis && id) {
      setIsLoading(true);
      setError(null);
      getAnalysisById(id)
        .then((data) => {
          setAnalysis(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load analysis:", err);
          setError(`Could not find assessment record #${id}.`);
          setIsLoading(false);
        });
    }
  }, [id, analysis]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">Loading inspection report #{id}...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Record Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{error || "The requested analysis does not exist."}</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link
            to="/history"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-all"
          >
            <History className="w-4 h-4" />
            <span>Inspection History</span>
          </Link>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inspection</span>
          </Link>
        </div>
      </div>
    );
  }

  // Defensive defaults for all metrics
  const detections = Array.isArray(analysis.detections) ? analysis.detections : [];
  const roadHealthScore = Number(analysis.road_health_score ?? 100);
  const conditionLabel = analysis.condition_label || "Good";
  const damageIndex = Number(analysis.damage_index ?? 0);
  const coveragePct = Number(analysis.coverage_pct ?? 0);
  const severity = analysis.severity || "Low";

  const originalUrl = getFullImageUrl(analysis.original_image_url);
  const annotatedUrl = getFullImageUrl(analysis.annotated_image_url || analysis.original_image_url);

  // Class count breakdown
  const classCounts = { D00: 0, D10: 0, D20: 0, D40: 0 };
  detections.forEach((d) => {
    const code = (d.class_code || "").toUpperCase();
    if (classCounts[code] !== undefined) {
      classCounts[code] += 1;
    }
  });

  // Filter individual detections
  const filteredDetections = detections.filter((d) => {
    if (filterClass === "all") return true;
    return (d.class_code || "").toUpperCase() === filterClass.toUpperCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Top Bar with Navigation & Timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Inspection History</span>
          </Link>
          <Link
            to="/upload"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Scan</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>
              {analysis.timestamp
                ? new Date(analysis.timestamp).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Recent"}
            </span>
          </div>
          {detections.length > 0 && (
            <button
              onClick={handleResendAlert}
              disabled={sendingAlert}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Dispatch damage alert email to assigned area contractor and administrator"
            >
              {sendingAlert ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Alert...</span>
                </>
              ) : alertSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{alertSuccess}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Notify Contractor</span>
                </>
              )}
            </button>
          )}

          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            ID #{analysis.id}
          </span>
        </div>
      </div>

      {/* Main Grid: Left = Visualizer / Compare Slider, Right = Metrics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Large Viewer & Before/After Slider (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-black/40 transition-colors">
            {/* Viewport Control Bar */}
            <div className="p-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {analysis.image_width && analysis.image_height
                    ? `${analysis.image_width} × ${analysis.image_height} px`
                    : "Surface Inspection"}
                </span>
              </div>

              {/* Viewer Mode Switcher */}
              <div className="flex rounded-lg bg-slate-200/80 dark:bg-slate-900 p-0.5 border border-slate-300 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setImageViewMode("slider")}
                  className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    imageViewMode === "slider"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Before / After Slider</span>
                </button>
                <button
                  onClick={() => setImageViewMode("annotated")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    imageViewMode === "annotated"
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Annotated BBoxes
                </button>
                <button
                  onClick={() => setImageViewMode("original")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    imageViewMode === "original"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Original Road
                </button>
              </div>
            </div>

            {/* Main Viewport Content */}
            <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              {imageViewMode === "slider" ? (
                <BeforeAfterSlider
                  originalUrl={originalUrl}
                  annotatedUrl={annotatedUrl}
                  alt={`Analysis #${analysis.id}`}
                />
              ) : (
                <div className="relative w-full h-[380px] sm:h-[480px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={imageViewMode === "annotated" ? annotatedUrl : originalUrl}
                    alt={`Road #${analysis.id}`}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'>Image Loading Error</text></svg>";
                    }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-slate-200 shadow-md capitalize">
                    {imageViewMode} View
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Caption */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>
                {imageViewMode === "slider"
                  ? "Drag horizontal slider handle to inspect detection overlays."
                  : imageViewMode === "annotated"
                  ? "Showing AI bounding box overlays and defect classifications."
                  : "Showing source uploaded road surface photo."}
              </span>
              <div className="flex items-center gap-3 print:hidden">
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Original</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={annotatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Annotated</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Inspection Location Display Below Image */}
          {(analysis.location_name || (analysis.latitude && analysis.longitude)) && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3.5 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Inspection Location
                  </span>
                  {analysis.latitude && analysis.longitude && (
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {Number(analysis.latitude).toFixed(5)}, {Number(analysis.longitude).toFixed(5)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                  {analysis.location_name || "Custom Pinned Location"}
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <Link
                    to="/map"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>View on Road Damage Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Summary Panel & Circular Gauge (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Primary Score Hero Card with Animated Circular Score Gauge */}
          <div className="relative p-0.5 rounded-2xl bg-gradient-to-b from-blue-500/30 via-indigo-500/20 to-transparent shadow-xl shadow-slate-200/40 dark:shadow-black/40">
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-[15px] p-5 sm:p-6 transition-colors">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center mb-2">
                Overall Road Health Assessment
              </p>

              {/* Animated Circular Score Gauge */}
              <div className="my-3">
                <CircularScoreGauge
                  score={roadHealthScore}
                  condition={conditionLabel}
                  size={180}
                />
              </div>

              {/* Mini Metrics Row */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Severity</p>
                  <div className="mt-1 flex justify-center">
                    <SeverityBadge severity={severity} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Coverage</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {coveragePct.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Damage Index</p>
                  <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                    {damageIndex.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Damage Count by Class Pill Grid */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
              <span>Damage Distribution ({detections.length} Total)</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DAMAGE_CLASSES).map(([code, item]) => {
                const count = classCounts[code] || 0;
                return (
                  <div
                    key={code}
                    className={`p-2.5 rounded-xl border shadow-sm flex items-center justify-between transition-colors ${item.bgClass} ${item.borderClass}`}
                  >
                    <div>
                      <span className={`font-mono text-xs font-bold ${item.textClass}`}>{code}</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{item.shortName}</p>
                    </div>
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recharts Bar Chart Breakdown */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Class Frequency Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">RDD2022</span>
            </div>
            <ClassDistributionChart detections={detections} />
          </div>
        </div>
      </div>

      {/* FULL-WIDTH BOTTOM SECTION: Detailed Detections Table */}
      <div className="mt-8 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-black/40 transition-colors">
        {/* Table Header with Filter Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Detected Surface Defects ({filteredDetections.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Listing all detected bounding boxes with confidence scores and coordinates.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium mr-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>
            {["all", "D00", "D10", "D20", "D40"].map((cls) => {
              const isActive = filterClass === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm font-bold"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {cls === "all" ? "All" : cls}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Content */}
        {detections.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400 text-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-900 dark:text-slate-100">Zero Damage Detected</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
              The road surface appears clean and in optimal condition (Road Health Score: 100).
            </p>
          </div>
        ) : filteredDetections.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No detections found for class <strong className="font-mono">{filterClass}</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Class Code</th>
                  <th className="py-3 px-4 font-semibold">Damage Description</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Bounding Box [X1, Y1, X2, Y2]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                {filteredDetections.map((det, index) => {
                  const bboxStr = Array.isArray(det.bbox) ? det.bbox.join(", ") : "N/A";

                  return (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-sans">
                      <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-3 px-4">
                        <DamageClassBadge code={det.class_code} showName={false} />
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                        {det.class_name || DAMAGE_CLASSES[det.class_code]?.name || "Damage"}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {(Number(det.confidence || 0) * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        [{bboxStr}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

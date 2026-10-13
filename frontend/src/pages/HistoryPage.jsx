import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  History,
  Calendar,
  Layers,
  ArrowRight,
  AlertCircle,
  Filter,
  PlusCircle,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { getHistory, getFullImageUrl, BACKEND_BASE_URL } from "../api/api";
import { SeverityBadge, ConditionBadge } from "../components/ScoreBadge";
import HistoryTrendChart from "../components/HistoryTrendChart";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCondition, setFilterCondition] = useState("all");

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHistory(100);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inspection history:", err);
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError(
          `Cannot connect to backend server at ${BACKEND_BASE_URL}. Ensure your FastAPI backend is running.`
        );
      } else {
        setError("Failed to fetch historical inspection records.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredRecords = history.filter((item) => {
    if (filterCondition === "all") return true;
    return (item.condition_label || "").toLowerCase() === filterCondition.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audit & Health Trajectory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-blue-500" />
            <span>Inspection History</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Browse previous road surface assessments, health score trends, and defect logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs flex items-center gap-1.5 shadow-sm"
            title="Refresh History"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inspection</span>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 flex items-center gap-3 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="flex-1 text-xs sm:text-sm">{error}</p>
          <button
            onClick={loadHistory}
            className="px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-6">
          {/* Chart Skeleton */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-48" />
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-32" />
            </div>
            <div className="h-44 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          </div>

          {/* Table Skeleton */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64 mb-2" />
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/3" />
                </div>
                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : history.length === 0 ? (
        /* Empty State: No Inspections Yet */
        <div className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900/80 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xl shadow-slate-200/50 dark:shadow-black/40">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/10">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            No Inspections Recorded Yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-md mx-auto leading-relaxed">
            No road damage assessments have been submitted yet. Upload your first road surface image to analyze cracks, potholes, and start tracking health scores.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] transition-all"
            >
              <span>Upload First Road Image</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Trend Line Chart Component at Top */}
          <HistoryTrendChart records={history} />

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </span>
              {["all", "Good", "Fair", "Poor", "Critical"].map((cond) => {
                const isActive = filterCondition === cond;
                return (
                  <button
                    key={cond}
                    onClick={() => setFilterCondition(cond)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      isActive
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm font-semibold"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {cond === "all" ? "All Conditions" : cond}
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">
              Showing {filteredRecords.length} of {history.length} records
            </span>
          </div>

          {/* If condition filter returns 0 records */}
          {filteredRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto shadow-sm my-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Results for "{filterCondition}"
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                No inspection records match the selected condition filter.
              </p>
              <button
                onClick={() => setFilterCondition("all")}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            /* History Table */
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/40 dark:shadow-black/40 transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Thumbnail</th>
                      <th className="py-3.5 px-4 font-semibold">ID</th>
                      <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-3.5 px-4 font-semibold">Health Score</th>
                      <th className="py-3.5 px-4 font-semibold">Condition</th>
                      <th className="py-3.5 px-4 font-semibold">Severity</th>
                      <th className="py-3.5 px-4 font-semibold">Coverage</th>
                      <th className="py-3.5 px-4 font-semibold">Detections</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {filteredRecords.map((item) => {
                      const thumbUrl = getFullImageUrl(item.annotated_image_url || item.original_image_path);
                      const score = Number(item.road_health_score ?? 100);
                      const coverage = Number(item.coverage_pct ?? 0);
                      const detectionsCount = Array.isArray(item.detections) ? item.detections.length : 0;

                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            navigate(`/results/${item.id}`, { state: { analysisData: item } })
                          }
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          {/* Thumbnail */}
                          <td className="py-3 px-4">
                            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                              <img
                                src={thumbUrl}
                                alt={`Analysis #${item.id}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><rect width='100%' height='100%' fill='%231e293b'/></svg>";
                                }}
                              />
                            </div>
                          </td>

                          {/* ID */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-300">
                            #{item.id}
                          </td>

                          {/* Timestamp */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {item.timestamp
                                  ? new Date(item.timestamp).toLocaleString(undefined, {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Score */}
                          <td className="py-3 px-4">
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                                {score.toFixed(1)}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">/100</span>
                            </div>
                          </td>

                          {/* Condition Badge */}
                          <td className="py-3 px-4">
                            <ConditionBadge condition={item.condition_label || "Good"} />
                          </td>

                          {/* Severity Badge */}
                          <td className="py-3 px-4">
                            <SeverityBadge severity={item.severity || "Low"} />
                          </td>

                          {/* Coverage % */}
                          <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                            {coverage.toFixed(1)}%
                          </td>

                          {/* Detections Count */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700">
                              <Layers className="w-3 h-3 text-blue-500" />
                              <span>{detectionsCount}</span>
                            </span>
                          </td>

                          {/* View Action */}
                          <td className="py-3 px-4 text-right">
                            <span className="text-blue-600 dark:text-blue-400 group-hover:underline font-semibold inline-flex items-center gap-1 text-xs">
                              <span>View</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

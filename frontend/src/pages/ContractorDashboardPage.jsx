import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  Briefcase,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Activity,
  Map as MapIcon,
  RefreshCw,
  Search,
  ExternalLink,
  Bell,
  Clock,
  ShieldCheck,
  X,
  MapPin,
  ArrowRight,
  Camera,
} from "lucide-react";

export default function ContractorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    let errorCount = 0;

    try {
      const dashRes = await apiClient.get("/contractor/dashboard-data");
      setData(dashRes.data);
    } catch (err) {
      console.error("Failed to fetch contractor telemetry:", err);
      errorCount++;
      setError(err.response?.data?.detail || "Failed to fetch contractor telemetry from server.");
    }

    try {
      const histRes = await apiClient.get("/history?limit=100");
      setAnalyses(histRes.data);
    } catch (err) {
      console.error("Failed to fetch inspection history:", err);
      errorCount++;
      if (errorCount === 1) {
        setError(err.response?.data?.detail || "Failed to fetch inspection history from server.");
      }
    } finally {
      if (errorCount === 0) {
        setError(null);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const contractorInfo = data?.contractor_info || user;
  const hasArea = Boolean(
    contractorInfo?.service_state || contractorInfo?.service_city || contractorInfo?.service_area
  );
  const priorityQueue = data?.priority_queue || [];

  const renderPriorityBadge = (score, condition) => {
    if (score <= 30 || condition === "Critical") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-950 text-red-200 border border-red-700/80 shadow-sm">
          <span>🔴</span>
          <span>CRITICAL</span>
        </span>
      );
    } else if (score <= 60 || condition === "Poor") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-orange-950 text-orange-200 border border-orange-700/80 shadow-sm">
          <span>🟠</span>
          <span>HIGH PRIORITY</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-yellow-950 text-yellow-200 border border-yellow-700/80 shadow-sm">
          <span>🟡</span>
          <span>SCHEDULED</span>
        </span>
      );
    }
  };

  const filteredAnalyses = analyses.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const loc = (item.location_name || "").toLowerCase();
    const cond = (item.condition_label || "").toLowerCase();
    const id = String(item.id);
    return loc.includes(term) || cond.includes(term) || id.includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar with My Service Area Card on Top Right */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Contractor Infrastructure Dashboard
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Regional defect monitoring, priority repair queue, and service coverage
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Top Right: My Service Area Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  My Service Area
                </div>
                {hasArea ? (
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                    {[contractorInfo.service_state, contractorInfo.service_city, contractorInfo.service_area]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Service area not configured
                  </div>
                )}
              </div>
            </div>

            <div>
              {hasArea ? (
                <Link
                  to="/contractor/profile"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors whitespace-nowrap"
                >
                  <span>Update Service Area</span>
                </Link>
              ) : (
                <Link
                  to="/contractor/profile"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/20 transition-all whitespace-nowrap"
                >
                  <span>Set Your Area</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-amber-600 hover:from-cyan-500 hover:to-amber-500 text-white shadow-sm shadow-cyan-500/25 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Camera Inspection</span>
            </Link>

            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-500 shadow-sm transition-all"
            >
              <MapIcon className="w-4 h-4 text-blue-500" />
              <span>Road Map</span>
            </Link>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-in fade-in">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-1 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIORITY REPAIR QUEUE (TOP SECTION)                                   */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                <span>Priority Repair Queue</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                {priorityQueue.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sorted by urgency — Critical repairs first
            </p>
          </div>

          {hasArea && (
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800/50">
              Filtered for: {[contractorInfo.service_city, contractorInfo.service_state].filter(Boolean).join(", ")}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Score</th>
                <th className="py-3 px-4 font-semibold">Condition</th>
                <th className="py-3 px-4 font-semibold">Defects</th>
                <th className="py-3 px-4 font-semibold">Reported At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {priorityQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500 italic">
                    <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      No active repair requests in your area
                    </span>
                  </td>
                </tr>
              ) : (
                priorityQueue.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {renderPriorityBadge(item.road_health_score, item.condition_label)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {item.location_name || (
                        <span className="text-slate-400 italic">Location not provided</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      {item.road_health_score.toFixed(1)} / 100
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.condition_label === "Critical"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
                            : item.condition_label === "Poor"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300 dark:border-orange-800"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {item.condition_label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {item.detection_count ?? (item.detections ? item.detections.length : 0)} defect(s)
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString()}{" "}
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/results/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-in fade-in">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 p-1 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Inspected Roads
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {data?.total_analyses ?? "..."}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" />
            <span>Across all regional reports</span>
          </div>
        </div>

        {/* Average Score */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Avg Road Health Score
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {data?.average_score ? `${data.average_score}` : "..."}{" "}
            <span className="text-xs font-semibold text-slate-400">/ 100</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">System-wide health mean</div>
        </div>

        {/* Critical Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-rose-200/60 dark:border-rose-900/40 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Critical Distress</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {data?.condition_counts?.Critical ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Requires emergency patching</div>
        </div>

        {/* Poor Condition */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Poor Condition</span>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {data?.condition_counts?.Poor ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Scheduled maintenance queue</div>
        </div>
      </div>

      {/* Notifications Panel: Recent Critical / Poor Analyses */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Urgent Road Distress Notifications
              </h2>
              <p className="text-[11px] text-slate-400">
                Inspections scored &le; 60/100 requiring contractor dispatch
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {data?.recent_critical_or_poor?.length || 0} Alert(s)
          </span>
        </div>

        {data?.recent_critical_or_poor && data.recent_critical_or_poor.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {data.recent_critical_or_poor.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        alert.condition_label === "Critical"
                          ? "bg-rose-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {alert.condition_label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#{alert.id}</span>
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    Score: {alert.road_health_score.toFixed(1)} / 100
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {alert.location_name || "Location unpinned"} &bull; {alert.detections.length} defect(s)
                  </div>
                </div>

                <Link
                  to={`/results/${alert.id}`}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
            No recent critical or poor road hazards reported.
          </div>
        )}
      </div>

      {/* ALL ANALYSES TABLE (Without User Info as requested) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              All Road Surface Inspections ({filteredAnalyses.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive list of all regional pavement damage evaluations
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by ID, condition, location..."
              className="pl-8 pr-4 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Health Score</th>
                <th className="py-3 px-4 font-semibold">Condition</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Defects</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredAnalyses.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">#{item.id}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {new Date(item.timestamp).toLocaleDateString()}{" "}
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {item.location_name || (
                      <span className="text-slate-400 italic">No GPS attached</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-blue-600 dark:text-blue-400">
                    {item.road_health_score.toFixed(1)} / 100
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.condition_label === "Good"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                          : item.condition_label === "Fair"
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                          : item.condition_label === "Poor"
                          ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800"
                          : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
                      }`}
                    >
                      {item.condition_label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{item.severity}</td>
                  <td className="py-3 px-4 font-mono font-medium">
                    {item.detections.length} defect(s)
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/results/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

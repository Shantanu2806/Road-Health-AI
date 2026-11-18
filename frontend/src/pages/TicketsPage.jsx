import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getTickets, exportTicketsCSV } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  Ticket,
  Search,
  Filter,
  Download,
  ExternalLink,
  Calendar,
  AlertTriangle,
  RefreshCw,
  HardHat,
  MapPin,
  Clock,
  Layers,
} from "lucide-react";

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "reported":
      return { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", label: "Reported" };
    case "verified":
      return { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", label: "Verified" };
    case "assigned":
      return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", label: "Assigned" };
    case "in progress":
    case "in_progress":
      return { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", label: "In Progress" };
    case "repair submitted":
    case "repair_submitted":
    case "pending_verification":
      return { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", label: "Repair Submitted" };
    case "resolved":
      return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", label: "Resolved" };
    case "rejected":
      return { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30", label: "Rejected" };
    default:
      return { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", label: status || "Unknown" };
  }
};

const getPriorityBadge = (priority) => {
  const p = (priority || "").toLowerCase();
  switch (p) {
    case "critical":
      return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", icon: "🔴", label: "Critical" };
    case "high":
      return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", icon: "🟠", label: "High" };
    case "medium":
      return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", icon: "🟡", label: "Medium" };
    case "low":
      return { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", icon: "🟢", label: "Low" };
    default:
      return { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30", icon: "⚪", label: priority || "Normal" };
  }
};

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const isAdmin = user?.role === "admin";
  const isContractor = user?.role === "contractor";

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, locationSearch, dateFrom, dateTo, overdueOnly]);

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (locationSearch) filters.location = locationSearch;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (overdueOnly) filters.overdue_only = true;

      const result = await getTickets(filters);
      setTickets(result || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (locationSearch) filters.location = locationSearch;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (overdueOnly) filters.overdue_only = true;

      const blob = await exportTicketsCSV(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("CSV Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Ticket className="w-7 h-7 text-amber-500" />
            <span>Maintenance Tickets</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "All maintenance tickets across the system with full administrative management"
              : isContractor
              ? "Maintenance repair tickets currently assigned to your team"
              : "Maintenance tickets generated from your uploaded road damage inspections"}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search by location */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={locationSearch}
            onChange={(e) => setLocationSearch(e.target.value)}
            placeholder="Search by location keyword..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Reported">Reported</option>
          <option value="Verified">Verified</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Repair Submitted">Repair Submitted</option>
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Priority Dropdown */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="Critical">🔴 Critical</option>
          <option value="High">🟠 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>

        {/* Date From */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Overdue Only toggle */}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 cursor-pointer">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="rounded border-slate-700 text-rose-500 focus:ring-rose-500/30"
          />
          <span>Overdue Only</span>
        </label>

        {/* Reset / Refresh */}
        <button
          onClick={() => {
            setStatusFilter("");
            setPriorityFilter("");
            setLocationSearch("");
            setDateFrom("");
            setDateTo("");
            setOverdueOnly(false);
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-all"
        >
          Reset Filters
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Tickets Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Ticket ID</th>
                <th className="py-3.5 px-4 font-semibold">Title</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold">Score</th>
                <th className="py-3.5 px-4 font-semibold">Deadline</th>
                <th className="py-3.5 px-4 font-semibold">Assigned To</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 italic">
                    <Ticket className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-300">No maintenance tickets found</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      Tickets are auto-created when inspected road health scores fall to 60 or below.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const sBadge = getStatusBadge(t.status);
                  const pBadge = getPriorityBadge(t.priority);
                  const isPastDeadline = t.is_overdue || (t.deadline && new Date(t.deadline) < new Date() && t.status !== "Resolved");

                  return (
                    <tr
                      key={t.id || t.ticket_id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Ticket ID */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/tickets/${t.ticket_id}`}
                          className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {t.ticket_id}
                        </Link>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        <Link to={`/tickets/${t.ticket_id}`} className="hover:text-cyan-400 transition-colors">
                          {t.title}
                        </Link>
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sBadge.bg} ${sBadge.text} ${sBadge.border} whitespace-nowrap`}>
                          {sBadge.label}
                        </span>
                      </td>

                      {/* Priority badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pBadge.bg} ${pBadge.text} ${pBadge.border} whitespace-nowrap`}>
                          <span>{pBadge.icon}</span>
                          <span>{pBadge.label}</span>
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-300 max-w-[180px] truncate">
                        {t.location_name || <span className="text-slate-400 italic">Not specified</span>}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {t.road_health_score != null ? `${t.road_health_score.toFixed(1)}/100` : "N/A"}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4 font-mono">
                        {t.deadline ? (
                          <span className={`text-xs ${isPastDeadline ? "text-rose-500 font-bold flex items-center gap-1" : "text-slate-600 dark:text-slate-400"}`}>
                            {isPastDeadline && <span>⚠️</span>}
                            <span>{new Date(t.deadline).toLocaleDateString()}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No deadline</span>
                        )}
                      </td>

                      {/* Assigned to */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {t.assigned_contractor_name ? (
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {t.assigned_contractor_name}
                            </span>
                            {(t.assigned_contractor_area || t.assigned_contractor_city) && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500 dark:text-amber-400 font-mono mt-0.5">
                                📍 {[t.assigned_contractor_area, t.assigned_contractor_city].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/tickets/${t.ticket_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getTicketDetail,
  getContractors,
  verifyTicket,
  assignTicket,
  startTicketWork,
  submitRepair,
  approveRepair,
  rejectRepair,
  reopenTicket,
  mergeTicket,
  getFullImageUrl,
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HardHat,
  MapPin,
  RotateCcw,
  Upload,
  ShieldCheck,
  FileText,
  Check,
  X,
  ExternalLink,
  Layers,
  AlertOctagon,
  RefreshCw,
  GitMerge,
  Send,
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

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isContractor = user?.role === "contractor";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Admin: Assign Panel
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [assignForm, setAssignForm] = useState({
    contractor_id: "",
    deadline: "",
    road_importance: "Unknown",
    notes: "",
  });

  // Contractor: Submit Repair Form
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [repairNotes, setRepairNotes] = useState("");
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [afterImagePreview, setAfterImagePreview] = useState(null);

  // Admin: Reject Repair Form
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Admin: Reopen Form
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenNotes, setReopenNotes] = useState("");

  // Admin: Merge Modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeReason, setMergeReason] = useState("");

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function loadTicket() {
    setLoading(true);
    setError(null);
    try {
      const result = await getTicketDetail(ticketId);
      setData(result);
      if (result.ticket?.duplicate_of_ticket_id) {
        setMergeTargetId(result.ticket.duplicate_of_ticket_id);
      }
      if (isAdmin) {
        fetchContractors(result.ticket?.location_name, result.ticket);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  const setQuickDeadline = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setAssignForm((prev) => ({ ...prev, deadline: d.toISOString().split("T")[0] }));
  };

  async function fetchContractors(targetLoc, ticketData) {
    try {
      const curTicket = ticketData || data?.ticket;
      const loc = targetLoc || curTicket?.location_name || "";
      const list = await getContractors(loc);
      const contractorList = Array.isArray(list) ? list : [];
      setContractors(contractorList);

      const activeList = contractorList.filter((c) => c.is_active !== false && c.is_approved !== false);

      const assignedMatch = curTicket?.assigned_contractor_id
        ? activeList.find((c) => c.id === curTicket.assigned_contractor_id)
        : null;
      const suggestedMatch = curTicket?.suggested_contractor_id
        ? activeList.find((c) => c.id === curTicket.suggested_contractor_id)
        : null;
      const areaMatch = activeList.find((c) => c.is_area_match);
      const cityMatch = activeList.find((c) => c.is_city_match);

      const chosenContractor = assignedMatch || suggestedMatch || areaMatch || cityMatch || activeList[0];

      let initialDeadline = "";
      if (curTicket?.deadline) {
        initialDeadline = curTicket.deadline.split("T")[0];
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        initialDeadline = nextWeek.toISOString().split("T")[0];
      }

      setAssignForm((prev) => ({
        ...prev,
        contractor_id: prev.contractor_id || (chosenContractor ? String(chosenContractor.id) : ""),
        deadline: prev.deadline || initialDeadline,
        road_importance: prev.road_importance && prev.road_importance !== "Unknown"
          ? prev.road_importance
          : (curTicket?.road_importance && curTicket.road_importance !== "Unknown" ? curTicket.road_importance : "Main Road"),
        notes: prev.notes || (curTicket?.priority === "Critical"
          ? "Immediate asphalt resurfacing and pothole patching required. Road health score is critical."
          : "Site repair assignment: Please inspect location and carry out road resurfacing as per work order standards."),
      }));
    } catch (err) {
      console.error("Failed to load contractors list:", err);
    }
  }

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 5000);
  };

  // 1. Admin: Verify Ticket
  const handleVerifyTicket = async () => {
    setActionLoading(true);
    try {
      await verifyTicket(ticketId);
      showNotification("Ticket successfully verified.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to verify ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Admin: Assign Ticket
  const handleAssignTicket = async (e) => {
    e.preventDefault();
    if (!assignForm.contractor_id) {
      setError("Please select an approved contractor.");
      return;
    }
    setActionLoading(true);
    try {
      await assignTicket(ticketId, {
        contractor_id: parseInt(assignForm.contractor_id),
        deadline: assignForm.deadline || null,
        road_importance: assignForm.road_importance || "Unknown",
        notes: assignForm.notes || null,
      });
      setShowAssignPanel(false);
      showNotification("Ticket successfully assigned to contractor. Notification dispatched.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to assign contractor.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Contractor: Start Work
  const handleStartWork = async () => {
    setActionLoading(true);
    try {
      await startTicketWork(ticketId);
      showNotification("Work status updated to In Progress.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start repair work.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Contractor: Submit Repair
  const handleSubmitRepair = async (e) => {
    e.preventDefault();
    if (!afterImageFile) {
      setError("Please attach an after-repair photographic verification proof.");
      return;
    }
    setActionLoading(true);
    try {
      await submitRepair(ticketId, {
        notes: repairNotes || null,
        afterImage: afterImageFile,
      });
      setShowRepairForm(false);
      setRepairNotes("");
      setAfterImageFile(null);
      setAfterImagePreview(null);
      showNotification("Repair proof submitted for administrator review.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit repair proof.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Admin: Approve Repair
  const handleApproveRepair = async () => {
    setActionLoading(true);
    try {
      await approveRepair(ticketId);
      showNotification("Repair approved! Ticket has been marked as Resolved.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve repair.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Admin: Reject Repair
  const handleRejectRepair = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError("Please state the reason for rejecting this repair.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectRepair(ticketId, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason("");
      showNotification("Repair rejected. The contractor has been instructed to resubmit.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reject repair.");
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Admin: Reopen Ticket
  const handleReopenTicket = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await reopenTicket(ticketId, reopenNotes || null);
      setShowReopenForm(false);
      setReopenNotes("");
      showNotification("Ticket reopened and returned to Reported status.");
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reopen ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Admin: Merge Duplicate Ticket
  const handleMergeTicket = async (e) => {
    e.preventDefault();
    if (!mergeTargetId.trim()) {
      setError("Please enter the Target Ticket ID to merge into.");
      return;
    }
    setActionLoading(true);
    try {
      await mergeTicket(ticketId, {
        merge_into_ticket_id: mergeTargetId.trim(),
        reason: mergeReason || "Duplicate damage inspection report",
      });
      setShowMergeModal(false);
      showNotification(`Ticket merged into ${mergeTargetId.trim()} and closed.`);
      await loadTicket();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to merge ticket.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Maintenance Ticket Details...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen pt-28 px-4 max-w-3xl mx-auto">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            <span>Ticket Not Found or Access Denied</span>
          </div>
          <p className="text-sm">{error}</p>
          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tickets</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { ticket, status_history = [], repair_submissions = [], analysis, before_image_url, after_image_url } = data;
  const statusStyle = getStatusBadge(ticket.status);
  const priorityStyle = getPriorityBadge(ticket.priority);

  const isAssignedContractor = isContractor && ticket.assigned_contractor_id === user?.id;

  const isOverdue = ticket.is_overdue || (ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== "Resolved");

  const latestSubmission = repair_submissions.length > 0 ? repair_submissions[0] : null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Alerts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tickets</span>
        </Link>

        {ticket.analysis_id && (
          <Link
            to={`/results/${ticket.analysis_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
          >
            <span>Linked Analysis #{ticket.analysis_id}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/5"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Ticket Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-base font-extrabold text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                {ticket.ticket_id}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                <span>{statusStyle.label}</span>
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                <span>{priorityStyle.icon}</span>
                <span>{priorityStyle.label} Priority</span>
              </span>
              {ticket.road_importance && ticket.road_importance !== "Unknown" && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {ticket.road_importance}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {ticket.title}
            </h1>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Admin: Verify button if Reported */}
            {isAdmin && ticket.status === "Reported" && (
              <button
                onClick={handleVerifyTicket}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Ticket</span>
              </button>
            )}

            {/* Admin: Assign panel trigger if Reported, Verified, or Assigned */}
            {isAdmin && ["Reported", "Verified", "Assigned"].includes(ticket.status) && (
              <button
                onClick={() => {
                  const willOpen = !showAssignPanel;
                  setShowAssignPanel(willOpen);
                  if (willOpen) fetchContractors(ticket.location_name, ticket);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <HardHat className="w-4 h-4" />
                <span>{ticket.status === "Assigned" ? "Update Assignment / Deadline & Notes" : "Assign to Contractor"}</span>
              </button>
            )}

            {/* Contractor: Start work if Assigned */}
            {(isAssignedContractor || isAdmin) && ticket.status === "Assigned" && (
              <button
                onClick={handleStartWork}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Start Work</span>
              </button>
            )}

            {/* Contractor: Submit Repair if In Progress or Assigned */}
            {(isAssignedContractor || isAdmin) && ["In Progress", "Assigned"].includes(ticket.status) && (
              <button
                onClick={() => setShowRepairForm(!showRepairForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Submit Repair</span>
              </button>
            )}

            {/* Admin: Reopen button if Rejected */}
            {isAdmin && ticket.status === "Rejected" && (
              <button
                onClick={() => setShowReopenForm(!showReopenForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reopen Ticket</span>
              </button>
            )}

            {/* Admin: Merge Duplicate button */}
            {isAdmin && ticket.status !== "Resolved" && (
              <button
                onClick={() => setShowMergeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                title="Merge duplicate into another ticket"
              >
                <GitMerge className="w-4 h-4" />
                <span>Merge Duplicate</span>
              </button>
            )}
          </div>
        </div>

        {/* Priority Reason Explanation Box */}
        {ticket.priority_reason && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Priority Assessment: </span>
            <span className="text-slate-600 dark:text-slate-400">{ticket.priority_reason}</span>
          </div>
        )}

        {/* Core Metadata Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-400 font-medium block mb-1">Geographic Location</span>
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{ticket.location_name || "Coordinates not specified"}</span>
            </div>
            {ticket.latitude && ticket.longitude && (
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                {ticket.latitude.toFixed(4)}, {ticket.longitude.toFixed(4)}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-400 font-medium block mb-1">Road Health Score</span>
            <div className="font-extrabold text-base font-mono text-slate-900 dark:text-white">
              {ticket.road_health_score != null ? `${ticket.road_health_score.toFixed(1)} / 100` : "N/A"}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Severity: {ticket.severity || "Unclassified"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <span className="text-slate-400 font-medium block mb-1">Assigned Contractor</span>
            <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
              {ticket.assigned_contractor_name ? (
                <>
                  <HardHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{ticket.assigned_contractor_name}</span>
                </>
              ) : (
                <span className="text-slate-400 italic">Unassigned</span>
              )}
            </div>
            {ticket.assigned_contractor_email && (
              <span className="text-[10px] text-slate-400 truncate block mt-0.5 font-mono">
                {ticket.assigned_contractor_email}
              </span>
            )}
            {(ticket.assigned_contractor_area || ticket.assigned_contractor_city) && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <MapPin className="w-2.5 h-2.5" />
                {[ticket.assigned_contractor_area, ticket.assigned_contractor_city].filter(Boolean).join(", ")}
              </span>
            )}
          </div>

          <div className={`p-3.5 rounded-2xl border ${isOverdue ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50"}`}>
            <span className={`font-medium block mb-1 ${isOverdue ? "text-rose-400 font-bold" : "text-slate-400"}`}>
              {isOverdue ? "Target Deadline (OVERDUE)" : "Target Deadline"}
            </span>
            <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">
              {ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : "No deadline set"}
            </div>
            {isOverdue && (
              <span className="text-[10px] font-bold text-rose-500 block mt-0.5">
                ⚠️ Past deadline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Admin: Contractor Assign Panel */}
      <AnimatePresence>
        {showAssignPanel && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAssignTicket}
            className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                <HardHat className="w-4 h-4" />
                <span>Assign Ticket to Contractor</span>
              </h3>
              <button type="button" onClick={() => setShowAssignPanel(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Area Contractor Auto-Detection Highlight Banner */}
            {(() => {
              const activeContractors = contractors.filter((c) => c.is_active !== false);
              const areaMatch = activeContractors.find((c) => c.is_area_match);
              if (!areaMatch) return null;
              const isSelected = String(assignForm.contractor_id) === String(areaMatch.id);

              return (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex flex-wrap items-center gap-1.5">
                        <span>⭐ Area Contractor Automatically Pre-Selected:</span>
                        <span className="text-white bg-emerald-500/25 px-2 py-0.5 rounded-md font-semibold">
                          {areaMatch.full_name}
                        </span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          📍 {[areaMatch.service_area, areaMatch.service_city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Matched location <strong>{areaMatch.service_area}</strong>. Contractor is automatically selected — no manual selection needed!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignForm({ ...assignForm, contractor_id: String(areaMatch.id) })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                    }`}
                  >
                    {isSelected ? "Selected ✓" : "Select Area Contractor"}
                  </button>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contractor <span className="text-amber-400">*</span>
                </label>
                <select
                  required
                  value={assignForm.contractor_id}
                  onChange={(e) => setAssignForm({ ...assignForm, contractor_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="">Select approved contractor...</option>
                  {(() => {
                    const activeList = contractors.filter((c) => c.is_active !== false);
                    const areaMatches = activeList.filter((c) => c.is_area_match);
                    const cityMatches = activeList.filter((c) => c.is_city_match && !c.is_area_match);
                    const otherMatches = activeList.filter((c) => !c.is_area_match && !c.is_city_match);

                    return (
                      <>
                        {areaMatches.length > 0 && (
                          <optgroup label="⭐ Area Matches (Recommended for this Location)">
                            {areaMatches.map((c) => (
                              <option key={c.id} value={c.id}>
                                ⭐ {c.full_name} — {c.service_area}, {c.service_city || "Maharashtra"} ({c.email})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {cityMatches.length > 0 && (
                          <optgroup label="📍 City Matches">
                            {cityMatches.map((c) => (
                              <option key={c.id} value={c.id}>
                                📍 {c.full_name} — {c.service_city || "City"} ({c.email})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {otherMatches.length > 0 && (
                          <optgroup label="👥 Other Approved Contractors">
                            {otherMatches.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name} {c.service_area ? `(${c.service_area})` : ""} ({c.email})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={assignForm.deadline}
                  onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Quick set:</span>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(3)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-all"
                  >
                    +3d
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(7)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-all"
                  >
                    +7d
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(14)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium transition-all"
                  >
                    +14d
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Road Importance</label>
                <select
                  value={assignForm.road_importance}
                  onChange={(e) => setAssignForm({ ...assignForm, road_importance: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="Highway">Highway</option>
                  <option value="Main Road">Main Road</option>
                  <option value="Local Road">Local Road</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            {/* Quick Contractor Selection Chips */}
            {contractors.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Available Contractors for this Zone:
                </label>
                <div className="flex flex-wrap gap-2">
                  {contractors
                    .filter((c) => c.is_active !== false)
                    .map((c) => {
                      const isSelected = String(assignForm.contractor_id) === String(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAssignForm({ ...assignForm, contractor_id: String(c.id) })}
                          className={`text-left px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-amber-500/20 border-amber-500 text-white shadow-sm shadow-amber-500/20"
                              : "bg-slate-900/60 border-slate-700/70 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${c.is_area_match ? "bg-emerald-400" : (c.is_city_match ? "bg-cyan-400" : "bg-slate-500")}`} />
                          <div className="leading-tight">
                            <span className="font-semibold block">{c.full_name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {c.service_area ? `📍 ${c.service_area}` : (c.service_city ? `📍 ${c.service_city}` : "General")}
                            </span>
                          </div>
                          {c.is_area_match && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                              Area Match
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 ml-1" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Instructions / Notes</label>
              <textarea
                rows={2}
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="Specific instructions for asphalt resurfacing, traffic diversion, etc."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignPanel(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50 shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <HardHat className="w-4 h-4" />
                <span>{ticket.status === "Assigned" ? "Save & Update Assignment" : "Confirm & Dispatch Assignment"}</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Contractor: Submit Repair Form */}
      <AnimatePresence>
        {showRepairForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmitRepair}
            className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/30 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Submit Completed Repair for Verification</span>
              </h3>
              <button type="button" onClick={() => setShowRepairForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  After-Repair Photographic Proof <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    setAfterImageFile(f || null);
                    if (f) setAfterImagePreview(URL.createObjectURL(f));
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                />
                {afterImagePreview && (
                  <div className="mt-3">
                    <img src={afterImagePreview} alt="After repair preview" className="w-48 h-32 object-cover rounded-xl border border-slate-700" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Repair Execution Notes</label>
                <textarea
                  rows={3}
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  placeholder="Details of patch, asphalt mix, compaction method, and site clearance..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRepairForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Submit for Review
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Admin: Before / After Side-by-Side Verification Panel when Repair Submitted */}
      {ticket.status === "Repair Submitted" && (
        <div className="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-4">
            <div>
              <h3 className="text-base font-bold text-purple-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Repair Verification Review</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare original damage against contractor repair proof submission
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApproveRepair}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Repair</span>
                </button>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Reject Repair</span>
                </button>
              </div>
            )}
          </div>

          {/* Side by side before/after comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>📷</span>
                <span>Before (Reported Defect)</span>
              </span>
              {before_image_url ? (
                <img
                  src={getFullImageUrl(before_image_url)}
                  alt="Before repair"
                  className="w-full h-64 object-cover rounded-2xl border border-slate-700 shadow-md"
                />
              ) : (
                <div className="w-full h-64 rounded-2xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  No before image available
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🔧</span>
                <span>After (Contractor Repair Proof)</span>
              </span>
              {after_image_url || latestSubmission?.after_image_path ? (
                <img
                  src={getFullImageUrl(after_image_url || latestSubmission?.after_image_path)}
                  alt="After repair proof"
                  className="w-full h-64 object-cover rounded-2xl border border-emerald-500/40 shadow-md"
                />
              ) : (
                <div className="w-full h-64 rounded-2xl bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                  No after image available
                </div>
              )}
            </div>
          </div>

          {latestSubmission?.notes && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-300">Contractor Submission Notes:</span>
              <p className="text-slate-400">{latestSubmission.notes}</p>
            </div>
          )}

          {/* Reject Repair reason form */}
          <AnimatePresence>
            {showRejectForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleRejectRepair}
                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3"
              >
                <label className="block text-xs font-bold text-rose-300">
                  Rejection Reason (Required)
                </label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain defect in repair (e.g. uneven asphalt, cracks still visible, water drainage blocked)..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Send Rejection & Require Resubmission
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Admin Reopen Form Modal */}
      <AnimatePresence>
        {showReopenForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleReopenTicket}
            className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-orange-400">Reopen Rejected Ticket</h3>
              <button type="button" onClick={() => setShowReopenForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={2}
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              placeholder="Reason for reopening this ticket for inspection and repair..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowReopenForm(false)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={actionLoading} className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-50">
                Confirm Reopen
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Admin Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleMergeTicket}
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-cyan-400" />
                <span>Merge Duplicate Ticket</span>
              </h3>
              <button type="button" onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Merging marks this ticket as Rejected (Duplicate) and references the primary ticket.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Ticket ID</label>
              <input
                required
                type="text"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                placeholder="e.g. RH-2026-0001"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Merge Reason</label>
              <input
                type="text"
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="Nearby duplicate report for same pothole cluster"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowMergeModal(false)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={actionLoading} className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50">
                Merge & Close
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {/* Status History & Audit Trail */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-500" />
          <span>Status History & Audit Trail</span>
        </h3>

        {status_history.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No lifecycle status entries recorded.</p>
        ) : (
          <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-4">
            {status_history.map((entry, idx) => {
              const badge = getStatusBadge(entry.new_status);
              return (
                <div key={entry.id || idx} className="relative">
                  <div className={`absolute -left-[31px] w-3 h-3 rounded-full ${badge.bg} border ${badge.border}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {entry.new_status}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        by <span className="font-semibold text-slate-400">{entry.changed_by_name || "System"}</span> &bull;{" "}
                        {new Date(entry.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{entry.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

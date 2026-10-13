import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/api";
import {
  ShieldAlert,
  Users,
  Database,
  Cpu,
  Mail,
  Map as MapIcon,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Search,
  Activity,
  Layers,
  UserCheck,
  UserX,
  HardHat,
  UserPlus,
  X,
  Lock,
  Clock,
  ShieldCheck,
  KeyRound,
  Camera,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [pendingContractors, setPendingContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [activeTab, setActiveTab] = useState("users"); // "users" | "analyses" | "emails"

  // Contractor modal & toast states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

  // OTP verification state — keyed by contractor id
  const [otpInputs, setOtpInputs] = useState({}); // { [contractorId]: "123456" }
  const [otpStatus, setOtpStatus] = useState({}); // { [contractorId]: { verified: bool, msg: string, error: bool } }
  const [otpLoading, setOtpLoading] = useState({}); // { [contractorId]: bool }
  const [approvalLoading, setApprovalLoading] = useState({}); // { [contractorId]: bool }
  const [rejectReasons, setRejectReasons] = useState({}); // { [contractorId]: { show: bool, reason: string } }

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, analysesRes, logsRes, contractorsRes, pendingRes] = await Promise.all([
        apiClient.get("/admin/stats"),
        apiClient.get("/admin/users"),
        apiClient.get("/history?limit=100"),
        apiClient.get("/admin/email-logs?limit=50"),
        apiClient.get("/admin/contractors"),
        apiClient.get("/admin/pending-contractors"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setAnalyses(analysesRes.data);
      setEmailLogs(logsRes.data);
      setContractors(contractorsRes.data);
      setPendingContractors(pendingRes.data);
    } catch (err) {
      setError("Failed to load administrative telemetry from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleUserStatus = async (userId) => {
    setActionMessage("");
    try {
      const res = await apiClient.post(`/admin/users/${userId}/toggle-status`);
      setActionMessage(res.data.message);
      // Refresh user list
      const updated = await apiClient.get("/admin/users");
      setUsers(updated.data);
    } catch (err) {
      setActionMessage(err.response?.data?.detail || "Failed to update user status.");
    }
  };

  // ── OTP Verification Handler ──────────────────────────────────────────────
  const handleVerifyOtp = async (contractorId, contractorEmail) => {
    const otp = otpInputs[contractorId]?.trim();
    if (!otp || otp.length !== 6) {
      setOtpStatus((s) => ({ ...s, [contractorId]: { verified: false, msg: "Please enter the 6-digit OTP.", error: true } }));
      return;
    }
    setOtpLoading((s) => ({ ...s, [contractorId]: true }));
    try {
      const res = await apiClient.post("/admin/verify-contractor-otp", { contractor_email: contractorEmail, otp });
      setOtpStatus((s) => ({ ...s, [contractorId]: { verified: true, msg: res.data.message, error: false } }));
      // Refresh pending list
      const updatedPending = await apiClient.get("/admin/pending-contractors");
      setPendingContractors(updatedPending.data);
    } catch (err) {
      const msg = err.response?.data?.detail || "OTP verification failed.";
      setOtpStatus((s) => ({ ...s, [contractorId]: { verified: false, msg, error: true } }));
    } finally {
      setOtpLoading((s) => ({ ...s, [contractorId]: false }));
    }
  };

  // ── Resend OTP Handler ─────────────────────────────────────────────────────
  const handleResendOtp = async (contractorId, contractorEmail) => {
    setOtpLoading((s) => ({ ...s, [contractorId]: true }));
    try {
      const res = await apiClient.post("/admin/resend-contractor-otp", { contractor_email: contractorEmail });
      setToast({ type: "success", message: res.data.message || `Fresh OTP sent to ${contractorEmail}` });
      setOtpStatus((s) => ({ ...s, [contractorId]: { verified: false, msg: "New OTP sent to email!", error: false } }));
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.detail || "Failed to resend OTP." });
    } finally {
      setOtpLoading((s) => ({ ...s, [contractorId]: false }));
    }
  };

  // ── Approve Contractor Handler ─────────────────────────────────────────────
  const handleApproveContractor = async (contractorId, contractorEmail) => {
    setApprovalLoading((s) => ({ ...s, [contractorId]: "approving" }));
    try {
      await apiClient.post("/admin/approve-contractor", { contractor_email: contractorEmail });
      setToast({ type: "success", message: "Contractor approved! They will receive a confirmation email." });
      const [pendingRes, contractorsRes, usersRes, statsRes] = await Promise.all([
        apiClient.get("/admin/pending-contractors"),
        apiClient.get("/admin/contractors"),
        apiClient.get("/admin/users"),
        apiClient.get("/admin/stats"),
      ]);
      setPendingContractors(pendingRes.data);
      setContractors(contractorsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.detail || "Failed to approve contractor." });
    } finally {
      setApprovalLoading((s) => ({ ...s, [contractorId]: null }));
    }
  };

  // ── Reject Contractor Handler ──────────────────────────────────────────────
  const handleRejectContractor = async (contractorId, contractorEmail) => {
    const reason = rejectReasons[contractorId]?.reason?.trim() || "Not specified";
    setApprovalLoading((s) => ({ ...s, [contractorId]: "rejecting" }));
    try {
      await apiClient.post("/admin/reject-contractor", { contractor_email: contractorEmail, reason });
      setToast({ type: "success", message: "Contractor rejected and removed." });
      const [pendingRes, usersRes, statsRes] = await Promise.all([
        apiClient.get("/admin/pending-contractors"),
        apiClient.get("/admin/users"),
        apiClient.get("/admin/stats"),
      ]);
      setPendingContractors(pendingRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      // Clean up reject reason state
      setRejectReasons((s) => { const n = {...s}; delete n[contractorId]; return n; });
    } catch (err) {
      setToast({ type: "error", message: err.response?.data?.detail || "Failed to reject contractor." });
    } finally {
      setApprovalLoading((s) => ({ ...s, [contractorId]: null }));
    }
  };

  const handleAddContractor = async (e) => {
    e.preventDefault();
    setModalError("");

    const { fullName, email, password, confirmPassword } = contractorForm;

    if (!fullName.trim()) {
      setModalError("Full Name is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setModalError("Please provide a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setModalError("Passwords do not match.");
      return;
    }

    setModalSubmitting(true);
    try {
      await apiClient.post("/admin/add-contractor", {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      // Show green success toast
      setToast({
        type: "success",
        message: "Contractor added successfully",
      });

      // Reset form and close modal
      setContractorForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setIsModalOpen(false);

      // Refresh contractors table and user list
      const [contractorsRes, usersRes] = await Promise.all([
        apiClient.get("/admin/contractors"),
        apiClient.get("/admin/users"),
      ]);
      setContractors(contractorsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Failed to add contractor.";
      // Show red error toast with the message
      setToast({
        type: "error",
        message: errMsg,
      });
      setModalError(errMsg);
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                System Administration & Governance
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Root Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              User management, all analyses audit trail, model status, and email dispatch logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/25 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Camera Inspection</span>
          </Link>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-500 shadow-sm transition-all"
          >
            <MapIcon className="w-4 h-4 text-blue-500" />
            <span>Road Map</span>
          </Link>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Admin Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Users</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.total_users ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats?.active_users ?? 0} active &bull; {stats?.analyses_by_role?.contractor || 0} contractors
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Analyses</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {stats?.total_analyses ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Persisted in SQLite database</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Health Score</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats?.average_score ? `${stats.average_score}` : "100.0"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Aggregate pavement rating</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Database Size</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {stats?.database_size_bytes
              ? `${(stats.database_size_bytes / (1024 * 1024)).toFixed(2)} MB`
              : "0 MB"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">road_health.db (SQLite)</div>
        </div>
      </div>

      {/* System Health Card */}
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[11px]">Backend Status</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {stats?.system_status || "Online"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[11px]">AI Model Pipeline</div>
            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {stats?.model_info || "YOLOv8n Ensemble"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-400 font-semibold text-[11px]">Alert Dispatch Log</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {emailLogs.length} notifications logged
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("analyses")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "analyses"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Analyses Audit ({analyses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "emails"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Alert Logs ({emailLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  <th className="py-3 px-4 font-semibold">Inspections</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {users.map((u) => {
                  const isRootAdmin = u.email === "kauteshantanu80@gmail.com";
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {u.full_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                              : u.role === "contractor"
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                              : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {u.analysis_count}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            u.is_active ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Deactivated</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isRootAdmin ? (
                          <span className="text-[11px] text-slate-400 italic">Root Admin</span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              u.is_active
                                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800"
                                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL ANALYSES WITH USER INFO */}
      {activeTab === "analyses" && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Uploaded By</th>
                  <th className="py-3 px-4 font-semibold">User Email</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Score</th>
                  <th className="py-3 px-4 font-semibold">Condition</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {analyses.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">#{item.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {item.user_name || "Guest / Test Runner"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {item.user_email || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-blue-600 dark:text-blue-400">
                      {item.road_health_score.toFixed(1)} / 100
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.condition_label === "Good"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.condition_label === "Fair"
                            ? "bg-amber-100 text-amber-700"
                            : item.condition_label === "Poor"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.condition_label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {item.location_name || "Unpinned"}
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
      )}

      {/* TAB 3: EMAIL LOGS */}
      {activeTab === "emails" && (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Automated Damage Alert Dispatches ({emailLogs.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Logs of email triggers sent to contractor upon detecting Poor or Critical road conditions (&le; 60/100)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Subject</th>
                  <th className="py-3 px-4 font-semibold">Score</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Error / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                {emailLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400">#{log.id}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                      {log.recipient}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-sans truncate max-w-xs">
                      {log.subject}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-500">
                      {log.road_health_score ? `${log.road_health_score.toFixed(1)}` : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === "sent"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-sans text-[11px] truncate max-w-sm">
                      {log.error_message || "Dispatched successfully"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENDING CONTRACTOR APPROVALS SECTION                                      */}
      {/* ========================================================================= */}
      <div
        id="pending-contractor-approvals"
        className="bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/60 rounded-3xl overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pending Contractor Approvals
                </h2>
                {pendingContractors.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse">
                    {pendingContractors.length} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contractors who self-registered and are awaiting admin approval via OTP verification
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              apiClient.get("/admin/pending-contractors").then((r) => setPendingContractors(r.data));
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {pendingContractors.length === 0 ? (
          <div className="py-10 text-center text-slate-400 dark:text-slate-500 italic text-sm">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            No pending contractor approvals. All contractor accounts are reviewed.
          </div>
        ) : (
          <div className="divide-y divide-amber-100 dark:divide-amber-900/40">
            {pendingContractors.map((c) => {
              const status = otpStatus[c.id] || {};
              const isVerified = c.otp_verified || status.verified;
              const isApproving = approvalLoading[c.id] === "approving";
              const isRejecting = approvalLoading[c.id] === "rejecting";
              return (
                <div key={c.id} className="p-5 space-y-4">
                  {/* Contractor Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{c.full_name}</p>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Registered: {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3" />
                          OTP Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3" />
                          OTP Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* OTP Input (only if not yet verified) */}
                  {!isVerified && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="relative flex-1 max-w-[200px]">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={otpInputs[c.id] || ""}
                          onChange={(e) =>
                            setOtpInputs((s) => ({ ...s, [c.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                          }
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-500 font-mono tracking-widest transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerifyOtp(c.id, c.email)}
                          disabled={otpLoading[c.id]}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {otpLoading[c.id] ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          Verify OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResendOtp(c.id, c.email)}
                          disabled={otpLoading[c.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${otpLoading[c.id] ? "animate-spin" : ""}`} />
                          Resend OTP
                        </button>
                      </div>
                      {status.msg && (
                        <span className={`text-xs font-medium ${status.error ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {status.msg}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Approve / Reject Buttons (only if OTP is verified) */}
                  {isVerified && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApproveContractor(c.id, c.email)}
                          disabled={isApproving || isRejecting}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isApproving ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Approve Contractor
                        </button>
                        <button
                          onClick={() =>
                            setRejectReasons((s) => ({
                              ...s,
                              [c.id]: { show: !s[c.id]?.show, reason: s[c.id]?.reason || "" },
                            }))
                          }
                          disabled={isApproving || isRejecting}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isRejecting ? (
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Reject
                        </button>
                      </div>

                      {/* Rejection Reason Inline Form */}
                      {rejectReasons[c.id]?.show && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl">
                          <input
                            type="text"
                            placeholder="Rejection reason (optional)"
                            value={rejectReasons[c.id]?.reason || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRejectReasons((s) => ({
                                ...s,
                                [c.id]: { ...s[c.id], reason: val },
                              }));
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex-1 min-w-[220px] focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRejectContractor(c.id, c.email)}
                              disabled={isRejecting}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() =>
                                setRejectReasons((s) => ({
                                  ...s,
                                  [c.id]: { show: false, reason: "" },
                                }))
                              }
                              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* APPROVED CONTRACTOR MANAGEMENT SECTION                                    */}
      {/* ========================================================================= */}
      <div
        id="contractor-management-section"

        className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-0"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Contractor Management
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                  {contractors.length} Approved
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage approved contractor accounts authorized for highway maintenance and repair operations
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <button
              id="add-contractor-btn"
              onClick={() => {
                setModalError("");
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Contractor Directly</span>
            </button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Directly added contractors are pre-approved and do not require OTP verification.
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold">City</th>
                <th className="py-3 px-4 font-semibold">Area</th>
                <th className="py-3 px-4 font-semibold">Joined date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Analyses count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {contractors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No contractors registered yet. Click &quot;Add Contractor Directly&quot; to provision a contractor account.
                  </td>
                </tr>
              ) : (
                contractors.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {c.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {c.email}
                    </td>
                    <td className="py-3 px-4">
                      {c.service_state ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {c.service_state}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.service_city ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {c.service_city}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {c.service_area ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {c.service_area}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          c.is_active ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {c.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-right">
                      {c.analysis_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD CONTRACTOR MODAL                                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Contractor Directly
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Directly added contractors are pre-approved and do not require OTP verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddContractor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Road Works"
                  value={contractorForm.fullName}
                  onChange={(e) =>
                    setContractorForm({ ...contractorForm, fullName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="contractor@domain.com"
                  value={contractorForm.email}
                  onChange={(e) =>
                    setContractorForm({ ...contractorForm, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-slate-400 font-normal">(min 6 characters)</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={contractorForm.password}
                  onChange={(e) =>
                    setContractorForm({ ...contractorForm, password: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={contractorForm.confirmPassword}
                  onChange={(e) =>
                    setContractorForm({ ...contractorForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError("");
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {modalSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Add Contractor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING TOAST NOTIFICATION                                               */}
      {/* ========================================================================= */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-semibold transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/api";
import { INDIAN_STATES } from "../utils/indianStates";
import {
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  Building2,
  Navigation,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  BellRing,
} from "lucide-react";

export default function ContractorProfilePage() {
  const { user, updateUser } = useAuth();

  const [serviceState, setServiceState] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }

  // Load current contractor details from backend
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/auth/me");
        if (isMounted && res.data) {
          setServiceState(res.data.service_state || "");
          setServiceCity(res.data.service_city || "");
          setServiceArea(res.data.service_area || "");
          updateUser(res.data);
        }
      } catch (err) {
        // Fall back to context user if available
        if (isMounted && user) {
          setServiceState(user.service_state || "");
          setServiceCity(user.service_city || "");
          setServiceArea(user.service_area || "");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const payload = {
        service_state: serviceState.trim() || null,
        service_city: serviceCity.trim() || null,
        service_area: serviceArea.trim() || null,
      };

      const res = await apiClient.put("/contractor/profile", payload);
      updateUser(res.data);
      setToast({
        type: "success",
        message: "Service area profile updated successfully!",
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || "Failed to update contractor service area.";
      setToast({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white shadow-emerald-500/25"
              : "bg-rose-600 text-white shadow-rose-500/25"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Back link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/contractor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Contractor Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-amber-500" />
            <span>Contractor Service Area</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your assigned geographical territory to receive targeted road damage alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Contractor</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Live Service Summary */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-500" />
              <span>Current Territory</span>
            </h2>

            <div className="space-y-3.5 text-sm">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  State
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {serviceState || (
                    <span className="text-slate-400 italic">Not specified</span>
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  City
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {serviceCity || (
                    <span className="text-slate-400 italic">Not specified</span>
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  Area / Zone
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {serviceArea || (
                    <span className="text-slate-400 italic">Not specified</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <BellRing className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  Automated damage alerts (Score ≤ 60) in these locations are sent directly to your email inbox.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update Form */}
        <div className="md:col-span-2">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span>Update Service Coverage</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Keep your jurisdiction details accurate to ensure you never miss emergency road repair dispatches.
              </p>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Loading profile settings...</span>
              </div>
            ) : (
              <>
                {/* State selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    State
                  </label>
                  <select
                    value={serviceState}
                    onChange={(e) => setServiceState(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={serviceCity}
                    onChange={(e) => setServiceCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Enter the city where your response teams operate.
                  </span>
                </div>

                {/* Area input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Area / Zone / Ward
                  </label>
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Katraj, Shivajinagar, Baner"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Specific suburbs, sectors, or zones within the city.
                  </span>
                </div>

                {/* Submit button */}
                <div className="pt-3 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-semibold shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Service Area</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

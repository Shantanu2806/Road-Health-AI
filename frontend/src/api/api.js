import axios from "axios";

export const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
});

let currentAuthToken = null;

export const setApiAuthToken = (token) => {
  currentAuthToken = token;
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

apiClient.interceptors.request.use(
  (config) => {
    if (currentAuthToken && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${currentAuthToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Prefix relative image paths returned by backend with the backend base URL.
 * e.g. "/static/annotated/abc.jpg" -> "http://127.0.0.1:8000/static/annotated/abc.jpg"
 */
export function getFullImageUrl(relativePath) {
  if (!relativePath) return "";
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const cleanPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
}

/**
 * Health check endpoint.
 */
export async function checkHealth() {
  const response = await apiClient.get("/health");
  return response.data;
}

/**
 * Upload an image file for road damage analysis.
 * @param {File} file
 * @param {number} confThreshold
 */
export async function analyzeImage(file, confThreshold = 0.25, locationData = null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("conf_threshold", confThreshold);

  if (locationData) {
    if (locationData.latitude !== null && locationData.latitude !== undefined) {
      formData.append("latitude", locationData.latitude);
    }
    if (locationData.longitude !== null && locationData.longitude !== undefined) {
      formData.append("longitude", locationData.longitude);
    }
    if (locationData.location_name) {
      formData.append("location_name", locationData.location_name);
    }
  }

  console.log("api.js: Submitting POST /analyze with form fields:", {
    file: file?.name,
    conf_threshold: confThreshold,
    latitude: locationData?.latitude ?? null,
    longitude: locationData?.longitude ?? null,
    location_name: locationData?.location_name ?? null,
  });

  const response = await apiClient.post("/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Fetch past analyses history.
 * @param {number} limit
 */
export async function getHistory(limit = 50) {
  const response = await apiClient.get("/history", {
    params: { limit },
  });
  return response.data;
}

/**
 * Fetch a single analysis report by database ID.
 * @param {number|string} analysisId
 */
export async function getAnalysisById(analysisId) {
  const response = await apiClient.get(`/analyses/${analysisId}`);
  return response.data;
}

/**
 * Manually trigger or resend contractor damage alert email.
 * @param {number|string} analysisId
 */
export async function resendDamageAlert(analysisId) {
  const response = await apiClient.post(`/analyses/${analysisId}/resend-alert`);
  return response.data;
}

// ─── Maintenance Ticket API Functions ───

/**
 * List maintenance tickets with optional filters.
 */
export async function getTickets({
  status,
  priority,
  location,
  date_from,
  date_to,
  contractor_id,
  overdue_only,
  assignedToMe,
  limit = 100,
  offset = 0,
} = {}) {
  const params = { limit, offset };
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (location) params.location = location;
  if (date_from) params.date_from = date_from;
  if (date_to) params.date_to = date_to;
  if (contractor_id) params.contractor_id = contractor_id;
  if (overdue_only) params.overdue_only = true;
  if (assignedToMe) params.assigned_to_me = true;
  const response = await apiClient.get("/tickets", { params });
  return response.data;
}

/**
 * Get detailed ticket information.
 */
export async function getTicketDetail(ticketId) {
  const response = await apiClient.get(`/tickets/${ticketId}`);
  return response.data;
}

/**
 * Admin verifies reported ticket.
 */
export async function verifyTicket(ticketId) {
  const response = await apiClient.post(`/tickets/${ticketId}/verify`);
  return response.data;
}

/**
 * Fetch approved contractors (optionally ranked by proximity to ticket location).
 * @param {string} location
 */
export async function getContractors(location = "") {
  const params = {};
  if (location) params.location = location;
  const response = await apiClient.get("/admin/contractors", { params });
  return response.data;
}

/**
 * Assign a ticket to a contractor (admin only).
 */
export async function assignTicket(ticketId, { contractor_id, deadline, deadline_days, road_importance, notes } = {}) {
  const response = await apiClient.post(`/tickets/${ticketId}/assign`, {
    contractor_id,
    deadline,
    deadline_days,
    road_importance: road_importance || "Unknown",
    notes,
  });
  return response.data;
}

/**
 * Start work on a ticket (contractor).
 */
export async function startTicketWork(ticketId, notes = null) {
  const response = await apiClient.post(`/tickets/${ticketId}/start`, { notes, comment: notes });
  return response.data;
}

/**
 * Submit repair proof for a ticket (contractor).
 */
export async function submitRepair(ticketId, { notes, afterImage } = {}) {
  const formData = new FormData();
  if (notes) formData.append("notes", notes);
  if (afterImage) formData.append("after_image", afterImage);

  const response = await apiClient.post(`/tickets/${ticketId}/submit-repair`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * Approve a repair submission (admin).
 */
export async function approveRepair(ticketId) {
  const response = await apiClient.post(`/tickets/${ticketId}/approve-repair`);
  return response.data;
}

/**
 * Reject a repair submission (admin).
 */
export async function rejectRepair(ticketId, rejection_reason) {
  const response = await apiClient.post(`/tickets/${ticketId}/reject-repair`, {
    rejection_reason,
  });
  return response.data;
}

/**
 * Reopen a resolved/rejected ticket (admin).
 */
export async function reopenTicket(ticketId, notes = null) {
  const response = await apiClient.post(`/tickets/${ticketId}/reopen`, { notes, comment: notes });
  return response.data;
}

/**
 * Merge duplicate ticket into target (admin).
 */
export async function mergeTicket(ticketId, { merge_into_ticket_id, reason } = {}) {
  const response = await apiClient.post(`/tickets/${ticketId}/merge`, {
    merge_into_ticket_id,
    reason,
  });
  return response.data;
}

/**
 * Get maintenance summary dashboard (admin).
 */
export async function getMaintenanceSummary() {
  const response = await apiClient.get("/admin/tickets/summary");
  return response.data;
}

/**
 * Export tickets as CSV (admin).
 */
export async function exportTicketsCSV(filters = {}) {
  const response = await apiClient.get("/admin/tickets/export-csv", {
    params: filters,
    responseType: "blob",
  });
  return response.data;
}

/**
 * Get overdue tickets (admin).
 */
export async function getOverdueTickets() {
  const response = await apiClient.get("/admin/tickets/overdue");
  return response.data;
}

export default apiClient;

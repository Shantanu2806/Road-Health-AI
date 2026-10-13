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

export default apiClient;

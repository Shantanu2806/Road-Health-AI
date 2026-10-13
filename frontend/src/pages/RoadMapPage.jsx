import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import apiClient from "../api/api";
import {
  Map as MapIcon,
  Layers,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function RoadMapPage() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  // Fetch public markers from GET /map/markers
  const fetchMarkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/map/markers");
      setMarkers(res.data);
    } catch (err) {
      setError("Failed to load road damage markers from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkers();
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: India (lat: 20.5937, lng: 78.9629, zoom: 5)
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: true,
      });

      // Free OpenStreetMap tile layer (No API key required)
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(mapInstanceRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, []);

  // Render markers onto Leaflet layer group
  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    // Filter markers according to rules:
    // Only show Critical (0-30), Poor (31-60), Fair (61-80)
    // Good (81-100) are NOT shown on map as requested
    const filtered = markers.filter((m) => {
      const score = m.road_health_score;
      if (score > 80.0) return false; // Do not show Good
      if (filterSeverity !== "all" && m.severity?.toLowerCase() !== filterSeverity) return false;
      return true;
    });

    filtered.forEach((item) => {
      const score = item.road_health_score;

      // Color mapping
      let color = "#FFD700"; // Fair (61-80)
      if (score <= 30) {
        color = "#8B0000"; // Critical (0-30) Dark red
      } else if (score <= 60) {
        color = "#FF6600"; // Poor (31-60) Orange
      }

      // Size mapping based on severity
      let radius = 8;
      if (item.severity === "High") radius = 14;
      else if (item.severity === "Medium") radius = 11;
      else radius = 7;

      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius,
        fillColor: color,
        color: "#ffffff",
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85,
      });

      // Popup content (No user info or email as requested)
      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 190px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${color}; letter-spacing: 0.5px;">
              ${item.condition_label} CONDITION
            </span>
            <span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #475569; font-family: monospace;">
              #${item.id}
            </span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">
            ${score.toFixed(1)} <span style="font-size: 11px; font-weight: 600; color: #64748b;">/ 100</span>
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
            <strong>Defects Detected:</strong> ${item.defect_count} defect(s)
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 2px;">
            <strong>Severity:</strong> ${item.severity}
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
            <strong>Location:</strong> ${item.location_name || "Pinned Road"}
          </div>
          <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            ${new Date(item.timestamp).toLocaleString()}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markerGroupRef.current.addLayer(marker);
    });
  }, [markers, filterSeverity]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-950">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Title Badge */}
        <div className="pointer-events-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Road Health Damage Map
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interactive Geospatial Damage Visualizer
            </p>
          </div>
        </div>

        {/* Severity Filters & Refresh */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl">
          <div className="flex items-center gap-1 text-xs">
            {["all", "high", "medium", "low"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all ${
                  filterSeverity === sev
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {sev === "all" ? "All Severities" : `${sev} Severity`}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMarkers}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl max-w-sm">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
          <span>Damage Score Color Scale</span>
          <span className="text-[10px] text-slate-400 font-normal">Public Inspection Data</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#8B0000] border border-white" />
            <span>
              <strong>Critical (Score 0 – 30)</strong> • Immediate repair required
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#FF6600] border border-white" />
            <span>
              <strong>Poor (Score 31 – 60)</strong> • Surface cavities & cracks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#FFD700] border border-white" />
            <span>
              <strong>Fair (Score 61 – 80)</strong> • Moderate distress
            </span>
          </div>
          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200 dark:border-slate-800">
            * Smooth roads in "Good" condition (Score 81–100) are omitted to focus on repair priorities.
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  Camera,
  Cpu,
  BarChart3,
  Ticket,
  HardHat,
  CheckCircle2,
  MapPin,
  Zap,
  Bell,
  Search,
  Sliders,
  Users,
  LineChart,
  Wrench,
  User as UserIcon,
  ShieldCheck,
  Check,
  ChevronRight,
  Sparkles,
  Map as MapIcon,
  FileText,
  Clock,
  AlertTriangle,
  Play,
  Github,
  Layers,
  Flame,
  Award,
  TrendingUp,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import L from "leaflet";
import apiClient from "../api/api";

// =========================================================================
// ENHANCEMENT 6: useCountUp Hook for Stats Count-Up Animation
// =========================================================================
function useCountUp(targetValue, duration = 2000, startOnView = true) {
  const [currentValue, setCurrentValue] = useState(0);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!startOnView || animatedRef.current) return;
    animatedRef.current = true;

    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutQuart (t => 1 - (1 - t)^4)
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = ease * targetValue;
      setCurrentValue(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCurrentValue(targetValue);
      }
    };

    requestAnimationFrame(step);
  }, [targetValue, duration, startOnView]);

  return currentValue;
}

// StatCard component using useCountUp
function StatCard({ stat, statsInView, isDark, idx }) {
  const count = useCountUp(stat.numericTarget, 2000, statsInView);

  let formattedValue = "";
  if (stat.type === "images") {
    formattedValue = `${Math.floor(count).toLocaleString()}+`;
  } else if (stat.type === "map50") {
    formattedValue = `${count.toFixed(1)}%`;
  } else if (stat.type === "stages") {
    formattedValue = `${Math.floor(count)}`;
  } else if (stat.type === "radius") {
    formattedValue = `${Math.floor(count)}m`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut", delay: idx * 0.1 }}
      whileHover={{ y: -6 }}
      className={`relative rounded-3xl p-8 backdrop-blur-xl border overflow-hidden flex flex-col justify-center items-center text-center transition-all duration-300 group ${
        isDark
          ? "bg-white/[0.03] border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]"
          : "bg-white/90 border-indigo-100 hover:border-indigo-300 hover:shadow-xl"
      }`}
    >
      {/* Thin top border in gradient color */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.borderGrad}`}
      />

      <div className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent tabular-nums">
        {formattedValue}
      </div>

      <div
        className={`mt-3 text-sm font-medium leading-snug ${
          isDark ? "text-slate-400" : "text-slate-600"
        }`}
      >
        {stat.label}
      </div>
    </motion.div>
  );
}

// =========================================================================
// ENHANCEMENT 5: Reusable SpotlightCard for Feature Cards Spotlight Effect
// =========================================================================
function SpotlightCard({ children, className = "", ...props }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    // Disabled on touch devices
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) {
      return;
    }
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = (e) => {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) {
      return;
    }
    setIsHovered(true);
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    // On mouse leave: reset x,y to card center
    setMousePos({
      x: rect.width / 2,
      y: rect.height / 2,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Radial Gradient Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(99,102,241,0.08) 0%, transparent 70%)`,
          transition: "background 0.1s ease, opacity 0.2s ease",
        }}
      />
      {/* Card Content kept above with position: relative, z-index: 1 */}
      <div className="relative z-[1] h-full flex flex-col justify-between">
        {children}
      </div>
    </motion.div>
  );
}

// =========================================================================
// REAL LIVE LEAFLET DAMAGE MAP COMPONENT
// =========================================================================
function LiveDamageMapPreview({ isDark }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [activeCity, setActiveCity] = useState("pune");
  const [mouseCoords, setMouseCoords] = useState({ lat: 18.5204, lng: 73.8567 });

  // Verified coordinates for live cluster demo
  const fallbackMarkers = [
    {
      id: 121,
      latitude: 19.20613,
      longitude: 72.94372,
      road_health_score: 18.2,
      condition_label: "Critical",
      severity: "High",
      defect_count: 7,
      location_name: "Wagle Industrial Estate, Thane, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 117,
      latitude: 19.20021,
      longitude: 72.97874,
      road_health_score: 29.8,
      condition_label: "Critical",
      severity: "High",
      defect_count: 10,
      location_name: "Manorpada, Uthalsar, Thane, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 116,
      latitude: 18.45025,
      longitude: 73.85806,
      road_health_score: 64.2,
      condition_label: "Fair",
      severity: "Low",
      defect_count: 2,
      location_name: "Satara Road, Katraj, Pune, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 115,
      latitude: 18.46498,
      longitude: 73.86467,
      road_health_score: 29.8,
      condition_label: "Critical",
      severity: "High",
      defect_count: 10,
      location_name: "Swami Vivekanand Marg, Katraj, Pune",
      timestamp: new Date().toISOString(),
    },
    {
      id: 114,
      latitude: 18.49582,
      longitude: 73.85784,
      road_health_score: 52.4,
      condition_label: "Poor",
      severity: "Medium",
      defect_count: 4,
      location_name: "Swargate Junction, Pune, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 109,
      latitude: 18.49922,
      longitude: 73.85834,
      road_health_score: 68.8,
      condition_label: "Fair",
      severity: "Low",
      defect_count: 2,
      location_name: "FC Road, Shivajinagar, Pune, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 105,
      latitude: 18.5089,
      longitude: 73.8326,
      road_health_score: 41.5,
      condition_label: "Poor",
      severity: "Medium",
      defect_count: 3,
      location_name: "Karve Road, Kothrud, Pune, Maharashtra",
      timestamp: new Date().toISOString(),
    },
    {
      id: 101,
      latitude: 19.076,
      longitude: 72.8777,
      road_health_score: 62.1,
      condition_label: "Fair",
      severity: "Low",
      defect_count: 2,
      location_name: "BKC Expressway Connector, Mumbai, Maharashtra",
      timestamp: new Date().toISOString(),
    },
  ];

  // Fetch real markers from server
  useEffect(() => {
    let active = true;
    const loadMarkers = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/map/markers");
        if (active) {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setMarkers(res.data);
          } else {
            setMarkers(fallbackMarkers);
          }
        }
      } catch (err) {
        if (active) {
          setMarkers(fallbackMarkers);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadMarkers();
    return () => {
      active = false;
    };
  }, []);

  // Initialize Leaflet map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map centered on Pune cluster
      const map = L.map(mapContainerRef.current, {
        center: [18.48, 73.86],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false, // Prevents disrupting page scroll
      });

      // Add zoom control in bottom right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Track coordinates
      map.on("mousemove", (e) => {
        setMouseCoords({
          lat: parseFloat(e.latlng.lat.toFixed(4)),
          lng: parseFloat(e.latlng.lng.toFixed(4)),
        });
      });

      mapInstanceRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
    }

    // Set dark or light tiles
    if (tileLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstanceRef.current);

    // Invalidate size once rendered
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, [isDark]);

  // Update markers on Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    const filtered = markers.filter((m) => {
      const score = m.road_health_score;
      if (score > 80.0) return false;
      if (filterSeverity === "critical") return score <= 30;
      if (filterSeverity === "poor") return score > 30 && score <= 60;
      if (filterSeverity === "fair") return score > 60 && score <= 80;
      return true;
    });

    filtered.forEach((item) => {
      const score = Number(item.road_health_score || 0);
      let color = "#10b981"; // Emerald / Fair
      let label = "FAIR CONDITION";

      if (score <= 30) {
        color = "#f43f5e"; // Rose / Critical
        label = "CRITICAL DEFECT";
      } else if (score <= 60) {
        color = "#f59e0b"; // Amber / Poor
        label = "POOR CONDITION";
      }

      const icon = L.divIcon({
        className: "custom-leaflet-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -14],
        html: `
          <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <div style="position:absolute; width:26px; height:26px; border-radius:50%; background:${color}; opacity:0.35; animation:pulseRing 2.4s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; width:14px; height:14px; border-radius:50%; background:${color}; box-shadow:0 0 12px ${color}, 0 0 4px #ffffff; border:2px solid #ffffff;"></div>
          </div>
        `,
      });

      const marker = L.marker([item.latitude, item.longitude], { icon });

      const popupHtml = `
        <div style="font-family: Inter, system-ui, sans-serif; background: #0c0d1e; color: #f1f5f9; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.14); box-shadow: 0 25px 50px rgba(0,0,0,0.8); min-width: 230px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
            <span style="font-size: 10px; font-weight: 800; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 9999px; background: ${color}22; color: ${color}; border: 1px solid ${color}55;">
              ${label}
            </span>
            <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">#RH-${item.id}</span>
          </div>

          <div style="display:flex; align-items:baseline; gap: 4px; margin-bottom: 6px;">
            <span style="font-size: 26px; font-weight: 900; color: #ffffff;">${score.toFixed(1)}</span>
            <span style="font-size: 11px; font-weight: 600; color: #94a3b8;">/ 100 Health Score</span>
          </div>

          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px;">
            📍 ${item.location_name || "Pinned Inspection Segment"}
          </div>

          <div style="display:flex; justify-content:space-between; font-size: 10px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 4px;">
            <span>Defects: <strong style="color:#ffffff;">${item.defect_count || 1}</strong></span>
            <span>Severity: <strong style="color:${color};">${item.severity || "Active"}</strong></span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "custom-leaflet-popup",
        closeButton: false,
      });

      markerGroupRef.current.addLayer(marker);
    });
  }, [markers, filterSeverity]);

  const flyToRegion = (region) => {
    if (!mapInstanceRef.current) return;
    setActiveCity(region);
    if (region === "pune") {
      mapInstanceRef.current.flyTo([18.48, 73.86], 12, { duration: 1.2 });
    } else if (region === "thane") {
      mapInstanceRef.current.flyTo([19.203, 72.96], 12, { duration: 1.2 });
    } else if (region === "all") {
      if (markers.length > 0) {
        const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude]));
        mapInstanceRef.current.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
      } else {
        mapInstanceRef.current.flyTo([18.8, 73.4], 9, { duration: 1.2 });
      }
    }
  };

  const criticalCount = markers.filter((m) => m.road_health_score <= 30).length;
  const poorCount = markers.filter((m) => m.road_health_score > 30 && m.road_health_score <= 60).length;
  const fairCount = markers.filter((m) => m.road_health_score > 60 && m.road_health_score <= 80).length;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300 ${
        isDark
          ? "bg-[#070714] border-white/10 shadow-indigo-500/10"
          : "bg-white border-indigo-200/60 shadow-xl"
      }`}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Status Live Indicator */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl backdrop-blur-xl bg-black/75 border border-white/15 text-white shadow-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wide flex items-center gap-1.5">
              <span>LIVE TELEMETRY</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {markers.length} Pinned
              </span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Maharashtra Metropolitan Region
            </span>
          </div>
        </div>

        {/* Severity Filters & Region Jumper */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Region Jumpers */}
          <div className="flex items-center gap-1 p-1 rounded-xl backdrop-blur-xl bg-black/75 border border-white/15 text-xs font-mono">
            {[
              { id: "pune", label: "Pune" },
              { id: "thane", label: "Thane/Mumbai" },
              { id: "all", label: "All India" },
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => flyToRegion(reg.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeCity === reg.id
                    ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Severity Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl backdrop-blur-xl bg-black/75 border border-white/15 text-xs font-mono">
            {[
              { id: "all", label: "All" },
              { id: "critical", label: `Critical (${criticalCount})`, color: "text-rose-400" },
              { id: "poor", label: `Poor (${poorCount})`, color: "text-amber-400" },
              { id: "fair", label: `Fair (${fairCount})`, color: "text-emerald-400" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterSeverity(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                  filterSeverity === tab.id
                    ? "bg-white/20 text-white shadow-sm"
                    : `${tab.color || "text-slate-400"} hover:text-white`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actual Interactive Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-[520px] md:h-[580px] z-[10] ${isDark ? "dark-map-container" : ""}`}
        style={{ cursor: "grab" }}
      />

      {/* Bottom Floating Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Dynamic Coordinates HUD */}
        <div className="pointer-events-auto px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-black/75 border border-white/15 text-slate-300 font-mono text-[11px] shadow-lg flex items-center gap-2">
          <span className="text-cyan-400">📍</span>
          <span>
            LAT: {mouseCoords.lat}° N &bull; LON: {mouseCoords.lng}° E
          </span>
        </div>

        {/* Legend */}
        <div className="pointer-events-auto px-3.5 py-1.5 rounded-xl backdrop-blur-xl bg-black/75 border border-white/15 text-white font-mono text-[11px] shadow-lg flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span className="text-slate-300">Critical (&le;30)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-slate-300">Poor (31-60)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-slate-300">Fair (61-80)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [gaugeProgress, setGaugeProgress] = useState(0);
  const videoRef = useRef(null);

  // Set subtle cinematic slow motion playback for ambient hero video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.55;
    }
  }, []);

  // Monitor scroll for navbar opacity & shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Gauge animation on hero mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setGaugeProgress(73);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // ENHANCEMENT 1: Scroll Progress State & Listener
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScrollProgress = () => {
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentScroll = window.scrollY;
        setScrollProgress(
          Math.min(100, Math.max(0, (currentScroll / totalScroll) * 100))
        );
      } else {
        setScrollProgress(0);
      }
    };
    window.addEventListener("scroll", handleScrollProgress, { passive: true });
    handleScrollProgress();
    return () => window.removeEventListener("scroll", handleScrollProgress);
  }, []);

  // ENHANCEMENT 2: Cursor Glow Position, Hero Boundary & Desktop Detection
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [isInHero, setIsInHero] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth > 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleHeroScroll = () => {
      setIsInHero(window.scrollY < window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleHeroScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleHeroScroll);
    };
  }, []);

  // ENHANCEMENT 6: Stats InView IntersectionObserver (Threshold: 0.3, once: true)
  const statsSectionRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const el = statsSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Particles generator (30 floating particles with glow & balanced distribution)
  const particles = [
    { left: "3%", top: "15%", delay: "0s", duration: "9s", size: "3px", color: "#22d3ee" },
    { left: "8%", top: "82%", delay: "1.2s", duration: "11s", size: "4px", color: "#818cf8" },
    { left: "14%", top: "45%", delay: "2.4s", duration: "8s", size: "2px", color: "#22d3ee" },
    { left: "19%", top: "90%", delay: "0.5s", duration: "13s", size: "3px", color: "#818cf8" },
    { left: "24%", top: "25%", delay: "3.1s", duration: "10s", size: "4px", color: "#22d3ee" },
    { left: "29%", top: "68%", delay: "1.8s", duration: "12s", size: "2px", color: "#818cf8" },
    { left: "33%", top: "35%", delay: "4.0s", duration: "9s", size: "3px", color: "#22d3ee" },
    { left: "38%", top: "88%", delay: "0.8s", duration: "14s", size: "4px", color: "#818cf8" },
    { left: "43%", top: "52%", delay: "2.7s", duration: "10s", size: "2px", color: "#22d3ee" },
    { left: "48%", top: "18%", delay: "1.5s", duration: "11s", size: "3px", color: "#818cf8" },
    { left: "53%", top: "75%", delay: "3.6s", duration: "8s", size: "4px", color: "#22d3ee" },
    { left: "57%", top: "40%", delay: "0.3s", duration: "13s", size: "2px", color: "#818cf8" },
    { left: "62%", top: "92%", delay: "2.1s", duration: "9s", size: "3px", color: "#22d3ee" },
    { left: "67%", top: "30%", delay: "4.2s", duration: "12s", size: "4px", color: "#818cf8" },
    { left: "71%", top: "65%", delay: "1.1s", duration: "10s", size: "2px", color: "#22d3ee" },
    { left: "76%", top: "12%", delay: "3.3s", duration: "14s", size: "3px", color: "#818cf8" },
    { left: "80%", top: "84%", delay: "0.6s", duration: "8s", size: "4px", color: "#22d3ee" },
    { left: "85%", top: "48%", delay: "2.9s", duration: "11s", size: "2px", color: "#818cf8" },
    { left: "89%", top: "22%", delay: "1.7s", duration: "13s", size: "3px", color: "#22d3ee" },
    { left: "94%", top: "78%", delay: "3.8s", duration: "10s", size: "4px", color: "#818cf8" },
    { left: "6%", top: "60%", delay: "4.5s", duration: "12s", size: "3px", color: "#818cf8" },
    { left: "16%", top: "30%", delay: "0.9s", duration: "9s", size: "2px", color: "#22d3ee" },
    { left: "27%", top: "50%", delay: "2.2s", duration: "14s", size: "4px", color: "#818cf8" },
    { left: "36%", top: "10%", delay: "3.5s", duration: "10s", size: "3px", color: "#22d3ee" },
    { left: "50%", top: "62%", delay: "1.3s", duration: "11s", size: "2px", color: "#818cf8" },
    { left: "60%", top: "20%", delay: "4.7s", duration: "8s", size: "4px", color: "#22d3ee" },
    { left: "73%", top: "58%", delay: "2.5s", duration: "13s", size: "3px", color: "#818cf8" },
    { left: "82%", top: "38%", delay: "0.4s", duration: "9s", size: "2px", color: "#22d3ee" },
    { left: "91%", top: "60%", delay: "3.0s", duration: "12s", size: "4px", color: "#818cf8" },
    { left: "97%", top: "28%", delay: "1.9s", duration: "10s", size: "3px", color: "#22d3ee" },
  ];

  // Tech stack pills for trust marquee
  const techPills = [
    { name: "YOLOv8", tag: "Computer Vision", color: "from-indigo-500 to-purple-500" },
    { name: "FastAPI", tag: "High Perf API", color: "from-teal-500 to-emerald-500" },
    { name: "React 18", tag: "Concurrent UI", color: "from-cyan-500 to-blue-500" },
    { name: "RDD2022", tag: "38k Dataset", color: "from-amber-500 to-rose-500" },
    { name: "OpenStreetMap", tag: "Global Geospatial", color: "from-green-500 to-emerald-500" },
    { name: "SQLite", tag: "Embedded DB", color: "from-blue-500 to-indigo-500" },
    { name: "JWT Auth", tag: "Secure RBAC", color: "from-purple-500 to-pink-500" },
    { name: "Framer Motion", tag: "Spring Physics", color: "from-rose-500 to-orange-500" },
    { name: "Tailwind CSS", tag: "Atomic Design", color: "from-sky-500 to-cyan-500" },
  ];

  // Headline words for staggered animation
  const headlineWords = [
    { text: "AI-Powered", highlight: false },
    { text: "Road", highlight: false },
    { text: "Damage", highlight: true },
    { text: "Intelligence", highlight: true },
    { text: "at", highlight: false },
    { text: "Scale", highlight: false },
  ];

  // How it works 6 stages
  const workflowStages = [
    {
      step: "01",
      badge: "CITIZEN",
      badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      icon: Camera,
      title: "Upload Image",
      desc: "Drag and drop any road photograph. Supports JPG, PNG, WebP up to 10MB.",
      gradient: "from-indigo-500 to-blue-600",
      highlight: "Instant Exif GPS Parsing",
    },
    {
      step: "02",
      badge: "YOLOv8",
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      icon: Cpu,
      title: "AI Detection",
      desc: "Neural network detects D00 (Longitudinal), D10 (Transverse), D20 (Alligator), D40 (Pothole) damage with bounding boxes.",
      gradient: "from-cyan-500 to-blue-600",
      highlight: "Inference < 500ms",
    },
    {
      step: "03",
      badge: "ALGORITHM",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      icon: BarChart3,
      title: "Health Scoring",
      desc: "Damage Index + Coverage % → Road Health Score 0-100. Severity: Low / Medium / High auto-classified.",
      gradient: "from-purple-500 to-indigo-600",
      highlight: "Deterministic Pavement Metric",
    },
    {
      step: "04",
      badge: "SYSTEM",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: Ticket,
      title: "Auto Ticket",
      desc: "Maintenance ticket RH-YYYY-XXXX auto-created for scores ≤ 60. Priority: Critical / High / Medium ranked by AI.",
      gradient: "from-amber-500 to-orange-600",
      highlight: "Automated Dispatch SLA",
    },
    {
      step: "05",
      badge: "ADMIN",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: Users,
      title: "Contractor Assignment",
      desc: "Admin assigns ticket to area contractor with deadline. Email notification + GPS location sent automatically.",
      gradient: "from-emerald-500 to-teal-600",
      highlight: "Geofenced Jurisdiction Match",
    },
    {
      step: "06",
      badge: "CONTRACTOR",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      icon: CheckCircle2,
      title: "Repair & Verify",
      desc: "Contractor submits before/after photos. Admin verifies. User notified when road is fixed.",
      gradient: "from-rose-500 to-pink-600",
      highlight: "Cryptographic Audit Trail",
    },
  ];

  // Features Grid 3x3
  const featuresList = [
    {
      icon: "🗺️",
      title: "GPS Damage Mapping",
      desc: "Real-time location tagging with interactive heatmaps and cluster analysis across urban sectors.",
      accent: "group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]",
      badge: "Geospatial",
    },
    {
      icon: "⚡",
      title: "Instant AI Analysis",
      desc: "Ultralytics YOLOv8 inference executes under 500ms with precision bounding box localization.",
      accent: "group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]",
      badge: "YOLOv8n",
    },
    {
      icon: "📊",
      title: "Road Health Score",
      desc: "Custom 0–100 mathematical scoring index weighing defect count, surface area, and hazard coefficient.",
      accent: "group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]",
      badge: "0-100 Metric",
    },
    {
      icon: "🎫",
      title: "Ticket Lifecycle",
      desc: "Automated pipeline from Reported → Verified → Assigned → Resolved with real-time audit logs.",
      accent: "group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      badge: "Workflow",
    },
    {
      icon: "🔍",
      title: "Duplicate Detection",
      desc: "GPS-based 50m spatial deduplication prevents redundant tickets for already reported damage.",
      accent: "group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      badge: "50m Radius",
    },
    {
      icon: "⚡",
      title: "Smart Priority",
      desc: "Critical, High, Medium severity auto-ranked by defect depth, class urgency, and traffic exposure.",
      accent: "group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]",
      badge: "AI Triage",
    },
    {
      icon: "👥",
      title: "3-Role System",
      desc: "Customized dedicated workspaces for Citizens, Field Contractors, and Municipal Administrators.",
      accent: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
      badge: "RBAC Security",
    },
    {
      icon: "📈",
      title: "Analytics & CSV Export",
      desc: "Historical deterioration trends, contractor repair SLA analytics, and one-click data exports.",
      accent: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
      badge: "Reports",
    },
    {
      icon: "🔧",
      title: "Repair Verification",
      desc: "Double-blind before and after photo verification guaranteeing civil repair work compliance.",
      accent: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
      badge: "Photo Proof",
    },
  ];
  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans selection:bg-indigo-500 selection:text-white ${
        isDark ? "bg-[#05050a] text-[#f1f5f9]" : "bg-[#f8faff] text-[#0f172a]"
      }`}
    >
      {/* ========================================================================= */}
      {/* ENHANCEMENT 1: SCROLL PROGRESS INDICATOR                                   */}
      {/* ========================================================================= */}
      <div
        className="pointer-events-none fixed top-0 left-0 h-[2px] z-[100]"
        style={{
          width: `${scrollProgress}%`,
          background: "linear-gradient(to right, #6366f1, #8b5cf6, #06b6d4)",
          boxShadow: "0 0 10px rgba(99,102,241,0.8)",
          transition: "width 0.1s linear",
        }}
      />

      {/* ========================================================================= */}
      {/* ENHANCEMENT 2: CURSOR GLOW EFFECT (Hero only, desktop only, dark mode)    */}
      {/* ========================================================================= */}
      {isDesktop && isDark && isInHero && (
        <div
          className="pointer-events-none fixed z-[5] rounded-full"
          style={{
            width: "400px",
            height: "400px",
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 40%, transparent 70%)",
            transition: "left 0.1s ease, top 0.1s ease",
          }}
        />
      )}
      {/* ========================================================================= */}
      {/* SECTION 1: NAVBAR                                                         */}
      {/* ========================================================================= */}
      <header
        className={`sticky top-0 z-50 h-[72px] transition-all duration-300 ${
          isDark
            ? scrolled
              ? "bg-[#05050a]/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-indigo-950/40"
              : "bg-[#05050a]/80 backdrop-blur-2xl border-b border-white/5"
            : scrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-indigo-100 shadow-xl shadow-slate-200/50"
            : "bg-white/90 backdrop-blur-xl border-b border-indigo-100/60"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="relative">
              {/* Outer Pulse Ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 opacity-60 animate-pulse-ring pointer-events-none" />
              {/* Icon Container */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`font-black text-lg tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Road Health
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white tracking-wide shadow-sm shadow-indigo-500/20">
                  AI
                </span>
              </div>
              <span
                className={`hidden md:block text-[10px] tracking-wider font-medium uppercase ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Smart Infrastructure Intelligence
              </span>
            </div>
          </Link>

          {/* Center (Desktop): Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Features", href: "#features", isHash: true },
              { label: "How It Works", href: "#how-it-works", isHash: true },
              { label: "Dashboard", href: isAuthenticated ? "/upload" : "/login", isHash: false },
              { label: "Road Map", href: "/map", isHash: false },
            ].map((link, idx) =>
              link.isHash ? (
                <a
                  key={idx}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href.replace("#", ""))}
                  className={`relative py-1 text-sm font-medium transition-colors duration-200 group ${
                    isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-indigo-600"
                  }`}
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 group-hover:w-full" />
                </a>
              ) : (
                <Link
                  key={idx}
                  to={link.href}
                  className={`relative py-1 text-sm font-medium transition-colors duration-200 group ${
                    isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-indigo-600"
                  }`}
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300 group-hover:w-full" />
                </Link>
              )
            )}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-3.5">
            {/* Theme Toggle with Spring Rotation */}
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.9, rotate: 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              aria-label="Toggle theme"
              className={`p-2.5 rounded-xl border transition-all duration-300 ${
                isDark
                  ? "bg-white/[0.04] border-white/10 text-amber-300 hover:bg-white/[0.08] hover:border-indigo-500/40"
                  : "bg-slate-100 border-indigo-200/60 text-indigo-600 hover:bg-indigo-50"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={
                    user?.role === "admin"
                      ? "/admin/dashboard"
                      : user?.role === "contractor"
                      ? "/contractor/dashboard"
                      : "/upload"
                  }
                  className={`hidden sm:flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                    isDark
                      ? "text-slate-200 hover:bg-white/[0.06] border border-white/10"
                      : "text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                  <span>{user?.name?.split(" ")[0] || "Workspace"}</span>
                </Link>
                <Link
                  to="/upload"
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-300"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <>
                {/* Sign In ghost button */}
                <Link
                  to="/login"
                  className={`hidden sm:inline-flex items-center text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 ${
                    isDark
                      ? "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60"
                  }`}
                >
                  Sign In
                </Link>

                {/* Get Started gradient button */}
                <Link
                  to="/signup"
                  className="relative group inline-flex items-center gap-2 text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.45)] transition-all duration-300"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className={`md:hidden p-2 rounded-xl border ${
                isDark
                  ? "bg-white/[0.04] border-white/10 text-slate-300"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with Height Animation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={`md:hidden border-b overflow-hidden ${
                isDark
                  ? "bg-[#0d0d1a]/95 backdrop-blur-2xl border-white/10"
                  : "bg-white/95 backdrop-blur-2xl border-indigo-100 shadow-xl"
              }`}
            >
              <div className="px-6 py-6 space-y-4">
                {[
                  { label: "Features", href: "#features", isHash: true },
                  { label: "How It Works", href: "#how-it-works", isHash: true },
                  { label: "Road Map", href: "/map", isHash: false },
                  { label: "Sign In", href: "/login", isHash: false },
                  { label: "Create Account", href: "/signup", isHash: false },
                ].map((item, idx) =>
                  item.isHash ? (
                    <a
                      key={idx}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href.replace("#", ""))}
                      className="block text-base font-semibold py-2 text-slate-300 hover:text-indigo-400"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={idx}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-base font-semibold py-2 text-slate-300 hover:text-indigo-400"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ========================================================================= */}
      {/* SECTION 2: HERO                                                           */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen flex flex-col justify-center items-center pt-12 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* BACKGROUND EFFECTS CONTAINER */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {/* Faint Ambient Road Drive Video (Slow-motion loop) */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              isDark ? "opacity-[0.22] mix-blend-screen filter contrast-125 saturate-150" : "opacity-[0.06] filter grayscale"
            }`}
            style={{ pointerEvents: "none" }}
          >
            <source src="/hero_road_drive.mp4" type="video/mp4" />
          </video>

          {/* Video Darkening & Gradient Vignette Mask */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? "radial-gradient(circle at 50% 45%, rgba(5,5,10,0.35) 0%, rgba(5,5,10,0.85) 65%, #05050a 95%)"
                : "radial-gradient(circle at 50% 45%, rgba(248,250,255,0.3) 0%, rgba(248,250,255,0.85) 65%, #f8faff 95%)",
            }}
          />

          {/* Layer 1 — Radial gradient base */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.2) 30%, rgba(6,182,212,0.15) 60%, transparent 80%)"
                : "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
            }}
          />
          {isDark && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 40% at 0% 100%, rgba(99,102,241,0.2) 0%, transparent 60%)",
              }}
            />
          )}

          {/* Top Spotlight / Overhead Light Beam */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: "1200px",
              height: "600px",
              background: isDark
                ? "radial-gradient(ellipse 65% 50% at 50% 0%, rgba(99,102,241,0.38) 0%, rgba(139,92,246,0.2) 35%, transparent 70%)"
                : "radial-gradient(ellipse 65% 50% at 50% 0%, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.06) 35%, transparent 70%)",
              filter: "blur(35px)",
            }}
          />

          {/* Laser Horizon Sweep Line */}
          <div className="absolute top-[36%] left-0 right-0 h-[1px] pointer-events-none opacity-40 overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer-sweep" />
          </div>

          {/* Center Radiant Core Flare */}
          <div
            className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
            style={{
              width: "500px",
              height: "280px",
              background: isDark
                ? "radial-gradient(ellipse at center, rgba(6,182,212,0.24) 0%, rgba(99,102,241,0.12) 50%, transparent 80%)"
                : "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)",
              filter: "blur(50px)",
            }}
          />

          {/* Graphic Designs: Cybernetic HUD Telemetry Overlays */}
          <div className="absolute top-8 left-8 hidden xl:flex items-center gap-3 font-mono text-[10px] text-slate-400/70 uppercase tracking-widest select-none pointer-events-none">
            <span className="w-2.5 h-2.5 border-t border-l border-indigo-400/90" />
            <span>SYS // ROAD_HEALTH_AI • HUD_v2.6</span>
            <span className="text-cyan-400/90">• GPS_ACTIVE</span>
          </div>

          <div className="absolute top-8 right-8 hidden xl:flex items-center gap-3 font-mono text-[10px] text-slate-400/70 uppercase tracking-widest select-none pointer-events-none">
            <span>LAT: 18.5204° N // LON: 73.8567° E</span>
            <span className="w-2.5 h-2.5 border-t border-r border-cyan-400/90" />
          </div>

          <div className="absolute bottom-12 left-8 hidden xl:flex items-center gap-2 font-mono text-[10px] text-slate-400/60 uppercase tracking-wider select-none pointer-events-none">
            <span className="w-2.5 h-2.5 border-b border-l border-purple-400/90" />
            <span>YOLOV8_ENGINE // 0-100 INDEX</span>
          </div>

          <div className="absolute bottom-12 right-8 hidden xl:flex items-center gap-2 font-mono text-[10px] text-slate-400/60 uppercase tracking-wider select-none pointer-events-none">
            <span>CONFIDENCE_THRESHOLD: 0.85</span>
            <span className="w-2.5 h-2.5 border-b border-r border-indigo-400/90" />
          </div>

          {/* Technical Alignment Crosshairs */}
          <div className="absolute top-1/4 left-12 text-slate-500/40 font-mono text-xs select-none pointer-events-none hidden lg:block">
            +
          </div>
          <div className="absolute top-1/4 right-12 text-slate-500/40 font-mono text-xs select-none pointer-events-none hidden lg:block">
            +
          </div>
          <div className="absolute bottom-1/3 left-16 text-slate-500/40 font-mono text-xs select-none pointer-events-none hidden lg:block">
            +
          </div>
          <div className="absolute bottom-1/3 right-16 text-slate-500/40 font-mono text-xs select-none pointer-events-none hidden lg:block">
            +
          </div>

          {/* Layer 2 — Three animated blurred orbs */}
          {/* Orb 1 (Indigo) */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "800px",
              height: "800px",
              top: "-200px",
              left: "-100px",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0.1) 60%, transparent 70%)",
              filter: "blur(80px)",
              opacity: isDark ? 0.7 : 0.15,
              animation: "floatOrb1 20s infinite ease-in-out",
            }}
          />

          {/* Orb 2 (Cyan) */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "700px",
              height: "700px",
              top: "-100px",
              right: "-150px",
              background:
                "radial-gradient(circle, rgba(6,182,212,0.5) 0%, rgba(6,182,212,0.1) 60%, transparent 70%)",
              filter: "blur(80px)",
              opacity: isDark ? 0.6 : 0.12,
              animation: "floatOrb2 25s infinite ease-in-out",
            }}
          />

          {/* Orb 3 (Purple) */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "900px",
              height: "700px",
              bottom: "-200px",
              left: "20%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0.1) 60%, transparent 70%)",
              filter: "blur(100px)",
              opacity: isDark ? 0.5 : 0.1,
              animation: "floatOrb3 30s infinite ease-in-out",
            }}
          />

          {/* Layer 2.5 — Subtle noise texture overlay (Dark mode only) */}
          {isDark && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
                opacity: 0.4,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Layer 3 — SVG Grid Pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: isDark
                ? `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`
                : `radial-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
              opacity: isDark ? 0.06 : 0.08,
            }}
          />

          {/* Layer 4 — 30 Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  backgroundColor: isDark ? p.color : "#6366f1",
                  color: isDark ? p.color : "#6366f1",
                  boxShadow: isDark ? "0 0 6px 2px currentColor" : "none",
                  opacity: isDark ? 1 : 0.4,
                  animationName: "particleRise",
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  animationIterationCount: "infinite",
                  animationTimingFunction: "ease-in-out",
                }}
              />
            ))}
          </div>
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Top Badge: Pill with animated gradient border shimmer */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full relative overflow-hidden backdrop-blur-xl border border-white/10 dark:border-white/10 shadow-lg mb-8"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
            }}
          >
            {/* Shimmer Sweep Effect */}
            <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 animate-shimmer-sweep pointer-events-none" />

            {/* Pulsing Green Dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            <span
              className={`text-xs sm:text-sm font-semibold tracking-wide ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              🚀 Powered by YOLOv8 Neural Network
            </span>

            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              New
            </span>
          </motion.div>

          {/* Headline (Staggered 3-Line Headline with Gradient Shift Animation) */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.08] max-w-4xl mx-auto flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.08,
                ease: [0.215, 0.61, 0.355, 1],
              }}
              className={`inline-block ${
                isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"
              }`}
            >
              AI-Powered
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.22,
                ease: [0.215, 0.61, 0.355, 1],
              }}
              className="inline-block"
              style={{
                background:
                  "linear-gradient(270deg, #6366f1, #8b5cf6, #06b6d4, #8b5cf6, #6366f1)",
                backgroundSize: "300% 300%",
                animation: "gradientShiftText 6s ease infinite",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Road Damage Intelligence
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.36,
                ease: [0.215, 0.61, 0.355, 1],
              }}
              className={`inline-block ${
                isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"
              }`}
            >
              at Scale
            </motion.span>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className={`mt-6 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-normal leading-relaxed ${
              isDark ? "text-[#94a3b8]" : "text-[#475569]"
            }`}
          >
            Upload any road image. YOLOv8 detects damage, computes a 0–100 Road
            Health Score, and auto-creates maintenance tickets — keeping roads safe.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link
              to={isAuthenticated ? "/upload" : "/signup"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] shadow-xl shadow-indigo-500/25 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300"
            >
              <span>Start Analyzing</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setDemoModalOpen(true)}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-base font-semibold border backdrop-blur-xl transition-all duration-300 ${
                isDark
                  ? "bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.1] hover:border-white/20"
                  : "bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-md"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </div>
              <span>Watch Demo</span>
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            {/* 3 Avatars */}
            <div className="flex -space-x-2.5 overflow-hidden">
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#05050a] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                RK
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#05050a] bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white">
                AM
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#05050a] bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center text-[11px] font-bold text-white">
                JD
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <span
                className={`font-semibold ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Trusted by 500+ road inspectors
              </span>
              <div className="flex items-center text-amber-400 ml-1">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i} className="text-sm">
                    {star}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ========================================================================= */}
          {/* HERO FLOATING DASHBOARD MOCKUP                                            */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="relative mt-16 w-full max-w-4xl mx-auto perspective-1200"
          >
            {/* Main Mockup Card with Continuous Float */}
            <div
              className={`animate-hero-float relative rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border transition-all duration-500 text-left shadow-2xl ${
                isDark
                  ? "bg-white/[0.03] border-white/10 shadow-indigo-500/10"
                  : "bg-white/90 border-indigo-200/50 shadow-indigo-200/40"
              }`}
              style={{
                boxShadow: isDark
                  ? "0 25px 70px -15px rgba(99, 102, 241, 0.25), 0 0 50px rgba(99, 102, 241, 0.12)"
                  : "0 25px 70px -15px rgba(99, 102, 241, 0.15)",
              }}
            >
              {/* High-Tech Glowing Corner Brackets */}
              <span className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-indigo-500/90 rounded-tl-xl pointer-events-none shadow-[0_0_8px_#6366f1]" />
              <span className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400/90 rounded-tr-xl pointer-events-none shadow-[0_0_8px_#22d3ee]" />
              <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-cyan-400/90 rounded-bl-xl pointer-events-none shadow-[0_0_8px_#22d3ee]" />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-indigo-500/90 rounded-br-xl pointer-events-none shadow-[0_0_8px_#6366f1]" />

              {/* Glowing Rim Light across Top Border */}
              <div className="absolute top-0 left-16 right-16 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent pointer-events-none shadow-[0_0_12px_#22d3ee]" />
              {/* Mockup Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span
                    className={`font-mono text-xs sm:text-sm font-semibold tracking-wider ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    Live Inspection #RH-2026-0042
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    YOLOv8n
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    mAP50: 56.0%
                  </span>
                </div>
              </div>

              {/* Mockup Body: Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-6 items-center">
                {/* Left Panel: Circular SVG Gauge (Health Score) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      {/* Background Track */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke={isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}
                        strokeWidth="10"
                        fill="transparent"
                      />
                      {/* Animated Gauge Progress */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="url(#heroScoreGrad)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={
                          2 * Math.PI * 48 * (1 - gaugeProgress / 100)
                        }
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="heroScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Inside Score Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black tracking-tight text-white dark:text-white">
                        {gaugeProgress}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">/ 100</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mt-0.5">
                        Health Score
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>⚠️ Poor — 3 defects</span>
                  </div>
                </div>

                {/* Right Panel: Defect Breakdown Progress Bars */}
                <div className="md:col-span-7 space-y-3.5">
                  <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                    Defect Classification Breakdown
                  </div>

                  {[
                    {
                      label: "D40 Pothole",
                      pct: 65,
                      color: "from-rose-500 to-red-600",
                      badge: "High Risk",
                    },
                    {
                      label: "D00 Longitudinal Crack",
                      pct: 42,
                      color: "from-amber-500 to-orange-500",
                      badge: "Medium",
                    },
                    {
                      label: "D10 Transverse Crack",
                      pct: 28,
                      color: "from-blue-500 to-cyan-500",
                      badge: "Moderate",
                    },
                    {
                      label: "D20 Alligator Crack",
                      pct: 18,
                      color: "from-indigo-500 to-purple-500",
                      badge: "Low",
                    },
                  ].map((defect, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-300 dark:text-slate-300">
                          {defect.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                            {defect.badge}
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {defect.pct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${defect.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 + i * 0.15 }}
                          className={`h-full rounded-full bg-gradient-to-r ${defect.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mockup Bottom Bar */}
              <div className="pt-4 border-t border-white/10 dark:border-white/10 flex flex-wrap items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2 text-slate-300 dark:text-slate-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Pune Ring Road, Maharashtra (18.4658°N, 73.8646°E)</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ticket RH-2026-0042 Created</span>
                </div>
              </div>
            </div>

            {/* Floating Mini Cards Around Mockup */}
            {/* Mini Card 1 (Top-Right) */}
            <motion.div
              initial={{ opacity: 0, x: 30, y: -20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={`hidden sm:flex absolute -top-8 -right-6 p-4 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl flex-col gap-1 text-left z-20 border-l-4 border-l-indigo-500 ${
                isDark ? "bg-[#0d0d1a]/90 text-white" : "bg-white/95 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Ticket Auto-Created
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                RH-2026-0042 • Critical Priority
              </span>
            </motion.div>

            {/* Mini Card 2 (Bottom-Left) */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className={`hidden sm:flex absolute -bottom-6 -left-6 p-4 rounded-2xl backdrop-blur-xl border border-white/10 shadow-xl flex-col gap-1 text-left z-20 border-l-4 border-l-cyan-500 ${
                isDark ? "bg-[#0d0d1a]/90 text-white" : "bg-white/95 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Contractor Notified
                </span>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Shyamal D. • Pune Area • 2s ago
              </span>
            </motion.div>

            {/* Mini Card 3 (Top-Left) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className={`hidden lg:flex absolute -top-6 left-12 p-3 rounded-xl backdrop-blur-xl border border-white/10 shadow-xl items-center gap-2 text-left z-20 border-l-4 border-l-purple-500 ${
                isDark ? "bg-[#0d0d1a]/90 text-white" : "bg-white/95 text-slate-900"
              }`}
            >
              <MapPin className="w-4 h-4 text-purple-400" />
              <div className="text-[11px] font-mono leading-tight">
                <div className="font-bold text-slate-200">GPS Pinned</div>
                <div className="text-slate-400">18.4658°N, 73.8646°E</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: LOGOS / TRUST BAR                                              */}
      {/* ========================================================================= */}
      <section className="py-12 border-y border-white/5 dark:border-white/5 overflow-hidden bg-white/[0.01] dark:bg-[#05050a]">
        <div className="max-w-7xl mx-auto px-4 text-center mb-6">
          <p
            className={`text-xs uppercase font-bold tracking-widest ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Built with industry-standard technology
          </p>
        </div>

        {/* Marquee Ticker */}
        <div className="relative w-full overflow-hidden flex">
          <div className="animate-marquee flex items-center gap-4 py-2">
            {[...techPills, ...techPills, ...techPills].map((tech, i) => (
              <div
                key={i}
                className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300 cursor-default ${
                  isDark
                    ? "bg-white/[0.03] border-white/10 text-slate-300 hover:border-indigo-500/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "bg-white/90 border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${tech.color}`}
                />
                <span className="text-sm font-bold tracking-tight">{tech.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                  {tech.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: STATS                                                          */}
      {/* ========================================================================= */}
      <section ref={statsSectionRef} className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              numericTarget: 38000,
              type: "images",
              label: "Road Images in Training Dataset",
              borderGrad: "from-indigo-500 to-purple-500",
            },
            {
              numericTarget: 56.0,
              type: "map50",
              label: "mAP50 Detection Accuracy",
              borderGrad: "from-cyan-500 to-blue-500",
            },
            {
              numericTarget: 6,
              type: "stages",
              label: "Maintenance Lifecycle Stages",
              borderGrad: "from-purple-500 to-pink-500",
            },
            {
              numericTarget: 50,
              type: "radius",
              label: "Duplicate Detection Radius",
              borderGrad: "from-emerald-500 to-teal-500",
            },
          ].map((stat, idx) => (
            <StatCard
              key={idx}
              stat={stat}
              statsInView={statsInView}
              isDark={isDark}
              idx={idx}
            />
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: HOW IT WORKS                                                   */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Automated Architecture
          </div>
          <h2
            className={`text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            From Photo to Fixed Road
          </h2>
          <p
            className={`mt-4 text-base sm:text-lg ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Six automated stages — zero manual coordination
          </p>
        </motion.div>

        {/* 6 Stages with Alternating Left-Right Layout */}
        <div className="space-y-12">
          {workflowStages.map((stage, idx) => {
            const isEven = idx % 2 === 0;
            const Icon = stage.icon;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`flex flex-col lg:flex-row items-center gap-8 p-6 sm:p-10 rounded-3xl backdrop-blur-xl border transition-all duration-300 group ${
                  isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                } ${
                  isDark
                    ? "bg-white/[0.03] border-white/10 hover:border-indigo-500/60 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                    : "bg-white/90 border-indigo-100 hover:border-indigo-400 hover:shadow-xl"
                }`}
              >
                {/* Left Side: Large Gradient Number + Icon in Glow Circle */}
                <div className="flex items-center gap-6 lg:w-1/3">
                  <span className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent font-mono">
                    {stage.step}
                  </span>

                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${stage.gradient} flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                {/* Right Side: Title + Description + Micro-Badge */}
                <div className="lg:w-2/3 flex flex-col items-start text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${stage.badgeColor}`}
                    >
                      {stage.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      • {stage.highlight}
                    </span>
                  </div>

                  <h3
                    className={`text-2xl font-bold tracking-tight mb-2 ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {stage.title}
                  </h3>

                  <p
                    className={`text-base leading-relaxed ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {stage.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: FEATURES GRID                                                  */}
      {/* ========================================================================= */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Platform Capabilities
          </div>
          <h2
            className={`text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Everything you need
          </h2>
          <p
            className={`mt-4 text-base sm:text-lg ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Designed for citizens, contractors, and city administrators
          </p>
        </motion.div>

        {/* 3x3 Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature, idx) => (
            <SpotlightCard
              key={idx}
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: "easeOut", delay: idx * 0.08 }}
              whileHover={{ y: -6 }}
              className={`group rounded-3xl p-7 backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                isDark
                  ? `bg-white/[0.03] border-white/10 ${feature.accent}`
                  : "bg-white/90 border-slate-200 hover:border-indigo-400 hover:shadow-xl"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl p-2.5 rounded-2xl bg-white/[0.05] border border-white/5">
                    {feature.icon}
                  </span>
                  <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                    {feature.badge}
                  </span>
                </div>

                <h3
                  className={`text-xl font-bold tracking-tight mb-2 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {feature.title}
                </h3>

                <p
                  className={`text-sm leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {feature.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Learn specification</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: ROLE CARDS                                                     */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Tailored Experiences
          </div>
          <h2
            className={`text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Built for every stakeholder
          </h2>
          <p
            className={`mt-4 text-base sm:text-lg ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Role-based interfaces structured for end-to-end municipal governance
          </p>
        </motion.div>

        {/* 3 Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Card 1: Citizen (Indigo) */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            whileHover={{ y: -6 }}
            className={`rounded-3xl p-8 backdrop-blur-xl border flex flex-col justify-between transition-all duration-300 ${
              isDark
                ? "bg-white/[0.03] border-white/10 hover:border-indigo-500/60 hover:shadow-[0_0_40px_rgba(99,102,241,0.2)]"
                : "bg-white/90 border-indigo-100 hover:border-indigo-300 hover:shadow-xl"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">
                  👤
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                  CITIZEN
                </span>
              </div>

              <h3
                className={`text-2xl font-bold tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Report & Track
              </h3>
              <p
                className={`text-sm mb-6 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Help your city detect hazardous road defects instantly from your
                smartphone.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Drag & Drop road photo uploads",
                  "Instant YOLOv8 Damage Scoring",
                  "Live ticket status tracking",
                  "Push notification upon repair",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/signup"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
            >
              <span>Sign Up Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Card 2: Contractor (Cyan, FEATURED) */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            whileHover={{ y: -6 }}
            className={`rounded-3xl p-8 backdrop-blur-xl border flex flex-col justify-between transition-all duration-300 relative scale-[1.02] ${
              isDark
                ? "bg-[#0d0d1a] border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                : "bg-white border-cyan-400 shadow-2xl"
            }`}
          >
            {/* "Most Active" Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md">
              Most Active
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl">
                  🦺
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                  CONTRACTOR
                </span>
              </div>

              <h3
                className={`text-2xl font-bold tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Manage Repairs
              </h3>
              <p
                className={`text-sm mb-6 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Accept geolocated repair work orders, log materials, and submit
                proof.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Live Assigned Work Orders feed",
                  "Turn-by-turn defect GPS navigation",
                  "Before / After photo verification",
                  "Direct Municipal invoice submission",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/signup"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/30"
            >
              <span>Join as Contractor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Card 3: Admin (Purple) */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            whileHover={{ y: -6 }}
            className={`rounded-3xl p-8 backdrop-blur-xl border flex flex-col justify-between transition-all duration-300 ${
              isDark
                ? "bg-white/[0.03] border-white/10 hover:border-purple-500/60 hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                : "bg-white/90 border-purple-100 hover:border-purple-300 hover:shadow-xl"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl">
                  🛡️
                </div>
                <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                  ADMIN
                </span>
              </div>

              <h3
                className={`text-2xl font-bold tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Full Control
              </h3>
              <p
                className={`text-sm mb-6 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Supervise regional infrastructure, contractor SLA performance,
                and budgets.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Jurisdiction-wide heatmaps & telemetry",
                  "One-click contractor dispatch",
                  "AI score audit & repair sign-off",
                  "Comprehensive CSV/PDF analytics export",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/30"
            >
              <span>Admin Access</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 8: MAP PREVIEW                                                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* SECTION 8: MAP PREVIEW                                                    */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Real-Time Spatial Grid
          </div>
          <h2
            className={`text-4xl sm:text-5xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Live Damage Intelligence Map
          </h2>
          <p
            className={`mt-4 text-base sm:text-lg ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Every defect, mapped in real-time across India
          </p>
        </motion.div>

        {/* Interactive Real Leaflet Live Damage Intelligence Map */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <LiveDamageMapPreview isDark={isDark} />
        </motion.div>

        {/* CTA Below Map */}
        <div className="mt-8 text-center">
          <Link
            to="/map"
            className="inline-flex items-center gap-2 text-base font-bold text-cyan-400 hover:text-cyan-300 hover:underline transition-all"
          >
            <span>Explore the Live Map</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 9: TESTIMONIAL / ABOUT                                            */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative rounded-3xl p-8 sm:p-12 backdrop-blur-xl border text-center transition-all duration-300 ${
            isDark
              ? "bg-white/[0.03] border-white/10 shadow-2xl shadow-indigo-950/40"
              : "bg-white/95 border-indigo-100 shadow-xl"
          }`}
        >
          {/* Large Gradient Quote Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <Award className="w-8 h-8" />
          </div>

          <h3
            className={`text-2xl sm:text-3xl font-black tracking-tight mb-4 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Academic Research Project
          </h3>

          <p
            className={`text-base sm:text-lg leading-relaxed max-w-3xl mx-auto font-normal ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            “Built as a Deep Learning & Computer Vision academic project. YOLOv8
            fine-tuned on 38,000+ RDD2022 road images across 7 countries.
            Precision: 62.5% | Recall: 51.9% | mAP50: 56.0%.”
          </p>

          {/* Tech Stack Pills Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {["PyTorch", "Ultralytics YOLOv8", "FastAPI", "React 18", "RDD2022", "OpenCV"].map(
              (item, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/[0.05] border border-white/10 text-slate-300"
                >
                  {item}
                </span>
              )
            )}
          </div>

          {/* Disclaimer Note */}
          <p
            className={`mt-6 text-xs max-w-xl mx-auto italic ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            This is not an official government system. Road Health Scores are
            AI-generated decision-support metrics.
          </p>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 10: FINAL CTA                                                     */}
      {/* ========================================================================= */}
      <section className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden text-center">
        {/* Animated Background Shifting Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-cyan-900/60 animate-gradient-shift pointer-events-none" />
        <div className="absolute inset-0 bg-[#05050a]/80 backdrop-blur-2xl pointer-events-none" />

        {/* Floating Particles in CTA Section */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.slice(0, 10).map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animation: `particleRise ${p.duration} ease-in-out infinite`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <motion.h2
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white"
          >
            Roads don't fix themselves.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto"
          >
            Join Road Health AI — detect, report, and repair faster.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={isAuthenticated ? "/upload" : "/signup"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] shadow-xl shadow-indigo-500/30 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all duration-300"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/map"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-all duration-300"
            >
              <span>View Road Map</span>
              <MapIcon className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 11: FOOTER                                                        */}
      {/* ========================================================================= */}
      <footer className="bg-[#05050a] border-t border-white/5 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Col 1: Logo + Tagline + Academic Badge + GitHub */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">
                Road Health <span className="text-indigo-400">AI</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Automated computer vision infrastructure damage inspection and
              maintenance ticket lifecycle system.
            </p>

            <div className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-white/5 border border-white/10 text-indigo-400">
              Academic Project
            </div>

            <div className="pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <div className="text-xs uppercase font-mono font-bold tracking-wider text-white">
              Product
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/upload" className="hover:text-white transition-colors">
                  Upload & Analyze
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition-colors">
                  Road Map
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div className="space-y-3">
            <div className="text-xs uppercase font-mono font-bold tracking-wider text-white">
              Portals
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/upload" className="hover:text-white transition-colors">
                  User Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/contractor/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Contractor Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Admin Panel
                </Link>
              </li>
              <li>
                <Link to="/tickets" className="hover:text-white transition-colors">
                  Tickets
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Tech Stack with Colored Dots */}
          <div className="space-y-3">
            <div className="text-xs uppercase font-mono font-bold tracking-wider text-white">
              Tech Stack
            </div>
            <ul className="space-y-2 text-xs font-mono">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>YOLOv8 Neural Network</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span>FastAPI Microservice</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>React 18 Concurrent</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Tailwind CSS</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>RDD2022 Benchmark</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>SQLite with WAL</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Road Health AI. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with ❤️ using YOLOv8 + FastAPI + React
          </p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* INTERACTIVE DEMO PREVIEW MODAL                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {demoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDemoModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border border-white/10 bg-[#0c0d1c] text-white shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-3 font-mono text-sm font-semibold text-slate-300">
                    Interactive Neural Detection Simulation
                  </span>
                </div>
                <button
                  onClick={() => setDemoModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Simulation Screen */}
              <div className="relative mt-6 rounded-2xl overflow-hidden h-80 bg-slate-900 border border-white/10 flex items-center justify-center">
                {/* Simulated Road Surface Pattern */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Laser scanline */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline" />

                {/* Bounding Box 1 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute left-1/4 top-1/3 w-36 h-28 border-2 border-rose-500 bg-rose-500/10 rounded-lg flex flex-col justify-between p-1.5"
                >
                  <span className="text-[10px] font-mono font-bold bg-rose-500 text-white px-1 rounded w-max">
                    D40: Pothole 94%
                  </span>
                  <span className="text-[9px] font-mono text-rose-300 text-right">
                    Depth: Severe
                  </span>
                </motion.div>

                {/* Bounding Box 2 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute right-1/4 bottom-1/4 w-44 h-20 border-2 border-amber-500 bg-amber-500/10 rounded-lg flex flex-col justify-between p-1.5"
                >
                  <span className="text-[10px] font-mono font-bold bg-amber-500 text-white px-1 rounded w-max">
                    D00: Longitudinal Crack 88%
                  </span>
                  <span className="text-[9px] font-mono text-amber-300 text-right">
                    Length: 1.4m
                  </span>
                </motion.div>

                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Inference: 312ms • GPU: Active</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  Ready to test with your own camera or street photos?
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDemoModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Close
                  </button>
                  <Link
                    to={isAuthenticated ? "/upload" : "/signup"}
                    onClick={() => setDemoModalOpen(false)}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all"
                  >
                    Start Real Inspection
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

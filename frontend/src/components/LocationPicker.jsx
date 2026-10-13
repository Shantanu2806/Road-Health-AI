import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Crosshair,
  X,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Red Pin Marker for Leaflet
const redPinIcon = L.divIcon({
  className: "custom-red-pin",
  html: `<div style="transform: translate(-14px, -36px); pointer-events: none;">
    <svg width="28" height="38" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));">
      <path d="M12 0C5.37258 0 0 5.37258 0 12C0 19.5 12 32 12 32C12 32 24 19.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="#E11D48"/>
      <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
      <circle cx="12" cy="11" r="2.5" fill="#9F1239"/>
    </svg>
  </div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

export default function LocationPicker({ locationData, onChange }) {
  const [isLocating, setIsLocating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Modal map state: default center India [20.5937, 78.9629], zoom 5
  const [modalCoords, setModalCoords] = useState(
    locationData?.latitude && locationData?.longitude
      ? [locationData.latitude, locationData.longitude]
      : [20.5937, 78.9629]
  );
  const [modalLocationName, setModalLocationName] = useState(
    locationData?.location_name || ""
  );
  const [modalGeocoding, setModalGeocoding] = useState(false);

  const previewMapRef = useRef(null);
  const previewMapInstance = useRef(null);
  const modalMapRef = useRef(null);
  const modalMapInstance = useRef(null);
  const modalMarkerInstance = useRef(null);

  // Reverse geocode coordinates to human-readable address via Nominatim
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`
      );
      if (res.ok) {
        const data = await res.json();
        return data.display_name || `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
    }
    return `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`;
  };

  // ISSUE 2 - Requirement 1: "Use My Location"
  const handleUseMyLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Could not get location. Please allow location access in your browser or pick manually.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setGeocoding(true);
        const locName = await reverseGeocode(lat, lon);
        setGeocoding(false);

        onChange({
          latitude: lat,
          longitude: lon,
          location_name: locName,
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation access failed:", err);
        setGeoError("Could not get location. Please allow location access in your browser or pick manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ISSUE 2 - Requirement 2: Open "Pick on Map" modal
  const handleOpenModal = () => {
    const initialCoords =
      locationData?.latitude && locationData?.longitude
        ? [locationData.latitude, locationData.longitude]
        : [20.5937, 78.9629]; // Default India
    setModalCoords(initialCoords);
    setModalLocationName(locationData?.location_name || "");
    setIsModalOpen(true);
  };

  // "Confirm Location" button handler
  const handleConfirmModal = () => {
    const [lat, lon] = modalCoords;
    const locName = modalLocationName || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    onChange({
      latitude: lat,
      longitude: lon,
      location_name: locName,
    });
    setIsModalOpen(false);
  };

  const handleClearLocation = () => {
    onChange({ latitude: null, longitude: null, location_name: null });
  };

  // Small Leaflet Map Preview when coordinates are present
  useEffect(() => {
    if (!previewMapRef.current || !locationData?.latitude || !locationData?.longitude) {
      return;
    }

    const lat = locationData.latitude;
    const lng = locationData.longitude;

    if (!previewMapInstance.current) {
      previewMapInstance.current = L.map(previewMapRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      // Free OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(previewMapInstance.current);

      L.marker([lat, lng], { icon: redPinIcon }).addTo(previewMapInstance.current);
    } else {
      previewMapInstance.current.setView([lat, lng], 14);
      previewMapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          layer.setLatLng([lat, lng]);
        }
      });
    }

    const timer = setTimeout(() => {
      if (previewMapInstance.current) {
        previewMapInstance.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (previewMapInstance.current) {
        previewMapInstance.current.remove();
        previewMapInstance.current = null;
      }
    };
  }, [locationData?.latitude, locationData?.longitude]);

  // Modal Map initialization & click listener for dropping red pin
  useEffect(() => {
    if (!isModalOpen || !modalMapRef.current) return;

    const timer = setTimeout(() => {
      if (!modalMapInstance.current) {
        const hasCustomCoords = locationData?.latitude && locationData?.longitude;
        const initialCenter = hasCustomCoords
          ? [locationData.latitude, locationData.longitude]
          : [20.5937, 78.9629]; // Default India
        const initialZoom = hasCustomCoords ? 12 : 5;

        modalMapInstance.current = L.map(modalMapRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          zoomControl: true,
        });

        // OpenStreetMap tiles without API key
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(modalMapInstance.current);

        // If coordinates already exist, place red pin
        if (hasCustomCoords) {
          modalMarkerInstance.current = L.marker(initialCenter, {
            icon: redPinIcon,
          }).addTo(modalMapInstance.current);
        }

        // Click anywhere on map to drop red pin
        modalMapInstance.current.on("click", async (e) => {
          const lat = e.latlng.lat;
          const lon = e.latlng.lng;
          setModalCoords([lat, lon]);

          if (modalMarkerInstance.current) {
            modalMarkerInstance.current.setLatLng([lat, lon]);
          } else {
            modalMarkerInstance.current = L.marker([lat, lon], {
              icon: redPinIcon,
            }).addTo(modalMapInstance.current);
          }

          setModalGeocoding(true);
          const name = await reverseGeocode(lat, lon);
          setModalLocationName(name);
          setModalGeocoding(false);
        });
      } else {
        modalMapInstance.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (modalMapInstance.current) {
        modalMapInstance.current.remove();
        modalMapInstance.current = null;
        modalMarkerInstance.current = null;
      }
    };
  }, [isModalOpen]);

  const hasLocation = locationData?.latitude !== null && locationData?.latitude !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          <span>Road Geo-Location (Optional)</span>
        </label>
        {hasLocation && (
          <button
            type="button"
            onClick={handleClearLocation}
            className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Remove Location</span>
          </button>
        )}
      </div>

      {/* Action Buttons: Use My Location & Pick on Map */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Detecting GPS Location...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-blue-500" />
              <span>Use My Location</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleOpenModal}
          className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5 text-indigo-500" />
          <span>Pick on Map</span>
        </button>
      </div>

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Selected Location Card & Preview Map once captured */}
      {hasLocation && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Small Leaflet Preview Map */}
          <div
            ref={previewMapRef}
            className="w-full sm:w-28 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 shadow-inner"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Location Captured</span>
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 line-clamp-2">
              {geocoding ? "Resolving location address..." : locationData.location_name || "Pinned Road Location"}
            </p>
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              Lat: {Number(locationData.latitude).toFixed(5)}, Lng: {Number(locationData.longitude).toFixed(5)}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pick on Map */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pick Location on Map
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Map Canvas */}
            <div className="relative flex-1 min-h-[380px]">
              <div ref={modalMapRef} className="w-full h-full min-h-[380px]" />
              <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md text-[11px] text-slate-200 font-medium shadow-md border border-slate-800">
                Click anywhere on the map to drop a red pin
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  Lat: <span className="text-rose-500 font-bold">{modalCoords[0].toFixed(5)}</span>, Lng:{" "}
                  <span className="text-rose-500 font-bold">{modalCoords[1].toFixed(5)}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm truncate">
                  {modalGeocoding ? "Resolving location address..." : modalLocationName || "Click anywhere to place red pin"}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

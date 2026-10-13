import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  X,
  RefreshCw,
  MapPin,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Compass,
  Loader2,
} from "lucide-react";

/**
 * CameraCaptureModal
 * High-performance, mobile & desktop live camera capture with automated GPS Geo-Tagging.
 * Stamps location, coordinates, timestamp, and Road Health AI banner directly onto the photo canvas.
 */
export default function CameraCaptureModal({ isOpen, onClose, onCaptureComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (rear) or 'user' (front)
  
  // GPS & Location State
  const [gpsStatus, setGpsStatus] = useState("detecting"); // 'detecting' | 'locked' | 'failed'
  const [coords, setCoords] = useState(null);
  const [address, setAddress] = useState("");

  // Captured snapshot state (for review before confirming)
  const [capturedSnapshot, setCapturedSnapshot] = useState(null); // { file, previewUrl, coords, address }
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize camera and geolocation when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedSnapshot(null);
      setCameraError(null);
      setIsInitializing(true);
      startCamera(facingMode);
      fetchLiveLocation();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Bind camera stream to video element whenever stream changes or video element mounts
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current
        .play()
        .then(() => {
          setCameraActive(true);
          setIsInitializing(false);
        })
        .catch((err) => {
          console.warn("video.play() failed:", err);
        });
    }
  }, [cameraStream]);

  // Acquire Geolocation
  const fetchLiveLocation = () => {
    setGpsStatus("detecting");
    if (!navigator.geolocation) {
      setGpsStatus("failed");
      setAddress("GPS unavailable on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setGpsStatus("locked");

        // Reverse geocode via Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`
          );
          if (res.ok) {
            const data = await res.json();
            const displayName = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            setAddress(displayName);
          } else {
            setAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
          }
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
        }
      },
      (err) => {
        console.warn("Camera Geolocation access failed:", err);
        setGpsStatus("failed");
        setAddress("Location permission denied or unavailable");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Start Camera Stream with multi-tier fallback
  const startCamera = async (mode) => {
    stopCamera();
    setCameraError(null);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraActive(false);
      setIsInitializing(false);
      setCameraError(
        "Camera media device API is not supported in this browser environment. You can use 'Open Native Device Camera' below."
      );
      return;
    }

    let stream = null;

    // Attempt 1: Facing mode with ideal resolution
    try {
      const constraints = {
        video: {
          facingMode: mode ? { ideal: mode } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err1) {
      console.warn("Camera attempt 1 failed, trying fallback to any video stream:", err1);
      // Attempt 2: Fallback to basic unconstrained video
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        console.error("Camera attempt 2 failed:", err2);
        setCameraActive(false);
        setIsInitializing(false);
        if (err2.name === "NotAllowedError" || err2.name === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was blocked. Please click 'Reload Page' to apply your updated settings."
          );
        } else if (err2.name === "NotFoundError" || err2.name === "DevicesNotFoundError") {
          setCameraError(
            "No webcam or camera device found on this system. You can launch your native mobile camera or select an image."
          );
        } else {
          setCameraError(
            `Could not start camera (${err2.message || err2.name}). Please check device settings or launch native camera.`
          );
        }
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setCameraStream(stream);
      // If video ref is already available, attach directly
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Direct play error:", playErr);
        }
      }
      setCameraActive(true);
      setIsInitializing(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setCameraActive(false);
  };

  // Toggle Camera Front / Rear
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Stamp Geo-tag banner directly onto Canvas
  const stampGeoTagOnCanvas = (canvas, ctx, locCoords, locAddress) => {
    const w = canvas.width;
    const h = canvas.height;

    // Stamp dimensions proportional to image size
    const bannerHeight = Math.max(90, Math.round(h * 0.16));
    const bannerY = h - bannerHeight;

    // Semi-transparent dark background
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)"; // Slate 950 with 88% opacity
    ctx.fillRect(0, bannerY, w, bannerHeight);

    // Accent line at top of banner
    ctx.fillStyle = "#38bdf8"; // Light cyan / sky blue
    ctx.fillRect(0, bannerY, w, Math.max(3, Math.round(bannerHeight * 0.035)));

    // Watermark typography scaling
    const baseFontSize = Math.max(12, Math.round(bannerHeight * 0.17));
    const smallFontSize = Math.max(10, Math.round(bannerHeight * 0.13));
    const paddingX = Math.round(w * 0.035);

    // Title / Brand Stamp (Top Row of Banner)
    ctx.fillStyle = "#38bdf8"; // Cyan
    ctx.font = `bold ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText("ROAD HEALTH AI • GEO-TAGGED INSPECTION", paddingX, bannerY + bannerHeight * 0.28);

    // Date & Time Stamp (Top Right)
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateTimeFormatted = `${dateStr} ${timeStr}`;
    ctx.fillStyle = "#94a3b8"; // Slate 400
    ctx.font = `normal ${smallFontSize}px monospace, -apple-system, sans-serif`;
    const dateWidth = ctx.measureText(dateTimeFormatted).width;
    ctx.fillText(dateTimeFormatted, w - paddingX - dateWidth, bannerY + bannerHeight * 0.28);

    // GPS Coordinates (Middle Row of Banner)
    ctx.fillStyle = "#ffffff"; // White
    ctx.font = `600 ${smallFontSize}px monospace, -apple-system, sans-serif`;
    const coordsText = locCoords
      ? `GPS LAT: ${locCoords.lat.toFixed(5)}° N  |  LON: ${locCoords.lon.toFixed(5)}° E`
      : "GPS: COORDINATES LOCKED AT CAMERA CAPTURE";
    ctx.fillText(coordsText, paddingX, bannerY + bannerHeight * 0.54);

    // Location Address (Bottom Row of Banner)
    ctx.fillStyle = "#cbd5e1"; // Slate 300
    ctx.font = `normal ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const cleanAddress = locAddress || "Field Road Pavement Assessment Location";
    // Truncate if address is very long
    const maxAddressChars = Math.floor(w / (smallFontSize * 0.65));
    const displayAddress =
      cleanAddress.length > maxAddressChars
        ? cleanAddress.substring(0, maxAddressChars - 3) + "..."
        : cleanAddress;
    ctx.fillText(`LOCATION: ${displayAddress}`, paddingX, bannerY + bannerHeight * 0.80);

    ctx.restore();
  };

  // Capture current video frame and stamp Geo-tag
  const capturePhotoFromStream = () => {
    const video = videoRef.current;
    if (!video) return;

    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;
    if (vWidth === 0 || vHeight === 0) {
      console.warn("Video stream dimensions not ready yet");
      return;
    }

    setIsProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = vWidth;
    canvas.height = vHeight;
    const ctx = canvas.getContext("2d");

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stamp Geo-tagging
    stampGeoTagOnCanvas(canvas, ctx, coords, address);

    // Convert canvas to File Blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = Date.now();
          const file = new File([blob], `camera_geotag_${timestamp}.jpg`, {
            type: "image/jpeg",
          });
          const previewUrl = URL.createObjectURL(blob);
          setCapturedSnapshot({
            file,
            previewUrl,
            coords,
            address,
          });
          stopCamera();
        }
        setIsProcessing(false);
      },
      "image/jpeg",
      0.95
    );
  };

  // Handle Native Mobile Camera Fallback
  const handleNativeCameraFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Stamp Geo-tagging
        stampGeoTagOnCanvas(canvas, ctx, coords, address);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const timestamp = Date.now();
              const stampedFile = new File([blob], `camera_geotag_${timestamp}.jpg`, {
                type: "image/jpeg",
              });
              const previewUrl = URL.createObjectURL(blob);
              setCapturedSnapshot({
                file: stampedFile,
                previewUrl,
                coords,
                address,
              });
              stopCamera();
            }
            setIsProcessing(false);
          },
          "image/jpeg",
          0.95
        );
      };
      img.src = loadEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedSnapshot?.previewUrl) {
      URL.revokeObjectURL(capturedSnapshot.previewUrl);
    }
    setCapturedSnapshot(null);
    startCamera(facingMode);
    fetchLiveLocation();
  };

  // Confirm and submit stamped photo
  const handleConfirm = () => {
    if (capturedSnapshot) {
      onCaptureComplete({
        file: capturedSnapshot.file,
        previewUrl: capturedSnapshot.previewUrl,
        latitude: capturedSnapshot.coords?.lat ?? null,
        longitude: capturedSnapshot.coords?.lon ?? null,
        location_name: capturedSnapshot.address || null,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Capture Road Inspection</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  Geo-Tag Enabled
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Stamps GPS coordinates, location address, and timestamp directly onto the image
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Screen Area */}
        <div className="relative flex-1 bg-slate-950 min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Always mounted video element so videoRef is never null */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraActive && !capturedSnapshot ? "block" : "hidden"
            }`}
          />

          {/* Loading State Spinner */}
          {isInitializing && !capturedSnapshot && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 z-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs text-slate-300 font-medium">Connecting to Camera & Locking GPS...</p>
            </div>
          )}

          {/* Review Captured Photo with Geo-tag Stamp */}
          {capturedSnapshot && (
            <div className="relative w-full h-full flex items-center justify-center z-10">
              <img
                src={capturedSnapshot.previewUrl}
                alt="Captured Geo-tagged Preview"
                className="max-h-[60vh] w-auto object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-emerald-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Geo-Tagged & Stamped</span>
              </div>
            </div>
          )}

          {/* Live Viewfinder Overlays (When Camera is Active & not reviewing snapshot) */}
          {cameraActive && !capturedSnapshot && (
            <>
              {/* Viewfinder Targeting Overlays */}
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
                  <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
                  <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />
                </div>
              </div>

              {/* Live GPS Status Indicator Overlay */}
              <div className="absolute top-3 left-3 z-10 max-w-[85%] px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 shadow-lg text-[11px] text-slate-200">
                <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
                  <Compass className={`w-3.5 h-3.5 ${gpsStatus === "detecting" ? "animate-spin text-amber-400" : ""}`} />
                  <span>
                    {gpsStatus === "locked"
                      ? "GPS Locked"
                      : gpsStatus === "detecting"
                      ? "Acquiring GPS Signal..."
                      : "GPS Unavailable"}
                  </span>
                </div>
                {coords && (
                  <div className="font-mono text-[10px] text-slate-300 mt-0.5">
                    {coords.lat.toFixed(5)}°, {coords.lon.toFixed(5)}°
                  </div>
                )}
                {address && (
                  <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                    {address}
                  </div>
                )}
              </div>

              {/* Camera Switch Button (Front/Rear) */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-slate-950/85 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="Switch Camera (Front/Rear)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Error / Permission Fallback View */}
          {!cameraActive && !isInitializing && !capturedSnapshot && (
            <div className="p-8 text-center max-w-md mx-auto space-y-4 z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Camera Access Notice</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {cameraError || "Please allow camera access in your browser or launch native camera below."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    startCamera(facingMode);
                    fetchLiveLocation();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                >
                  Reload Page to Apply
                </button>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                >
                  Open Native Camera
                </button>
              </div>
            </div>
          )}

          {/* Hidden Native Device Camera file input (handles capture="environment") */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeCameraFile}
          />
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate max-w-xs sm:max-w-sm">
              {address || "Detecting geographic road location..."}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {capturedSnapshot ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use This Photo</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {cameraActive && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={capturePhotoFromStream}
                    className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo & Geotag</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

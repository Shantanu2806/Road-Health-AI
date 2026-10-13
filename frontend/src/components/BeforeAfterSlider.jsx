import React, { useState, useRef, useCallback } from "react";
import { MoveHorizontal, Eye } from "lucide-react";

export default function BeforeAfterSlider({
  originalUrl,
  annotatedUrl,
  alt = "Road comparison",
}) {
  // Slider position from 0 (left) to 100 (right), default 50%
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className="relative w-full h-[380px] sm:h-[480px] select-none overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center cursor-ew-resize"
    >
      {/* 1. Underlying Base Image: Annotated Image */}
      <img
        src={annotatedUrl}
        alt={`${alt} - Annotated`}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* 2. Top Clipped Layer: Original Image */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img
          src={originalUrl}
          alt={`${alt} - Original`}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Badges */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-slate-200 pointer-events-none shadow-md">
        Original Road
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-blue-600/90 backdrop-blur-md border border-blue-400/40 text-[11px] font-semibold text-white pointer-events-none shadow-md">
        AI Detection
      </div>

      {/* 3. Divider Line & Grab Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-auto"
        style={{ left: `${sliderPos}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center border-2 border-blue-500 cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
          <MoveHorizontal className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      {/* Hint below */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-slate-300 pointer-events-none">
        Drag slider left/right to compare
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { ConditionBadge } from "./ScoreBadge";

export default function CircularScoreGauge({ score = 0, condition = "Good", size = 180 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score filling from 0 up to the target score on mount
  useEffect(() => {
    const target = Math.max(0, Math.min(100, Number(score) || 0));
    let startTimestamp = null;
    const duration = 1200; // 1.2s smooth fill

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic formula
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Number((easeOut * target).toFixed(1)));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [score]);

  // Color mapping matching Good/Fair/Poor/Critical
  const getGaugeColor = (val) => {
    if (val >= 81) return "#10b981"; // Emerald Green
    if (val >= 61) return "#f59e0b"; // Amber
    if (val >= 31) return "#f97316"; // Orange
    return "#ef4444"; // Red / Critical
  };

  const strokeColor = getGaugeColor(animatedScore);

  const strokeWidth = 12;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        className="transform -rotate-90 drop-shadow-md"
      >
        {/* Background Track */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-800/80 fill-transparent"
        />

        {/* Animated Progress Circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          fill="transparent"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            transition: "stroke 0.3s ease",
          }}
        />
      </svg>

      {/* Center Label (Score & Condition) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
          {animatedScore.toFixed(1)}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          / 100
        </span>
        <div className="mt-1">
          <ConditionBadge condition={condition} size="normal" />
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { getSeverityStyle, getConditionStyle, DAMAGE_CLASSES } from "../utils/colors";

export function SeverityBadge({ severity, className = "" }) {
  const style = getSeverityStyle(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm transition-colors ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full shadow-sm ${style.dot}`} />
      <span>{style.label} Severity</span>
    </span>
  );
}

export function ConditionBadge({ condition, className = "", size = "normal" }) {
  const style = getConditionStyle(condition);
  const sizeClasses =
    size === "large"
      ? "text-sm px-3.5 py-1.5 font-bold"
      : "text-xs px-2.5 py-0.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm transition-colors ${style.bg} ${style.text} ${style.border} ${sizeClasses} ${className}`}
    >
      {style.label}
    </span>
  );
}

export function DamageClassBadge({ code, showName = true, className = "" }) {
  const info = DAMAGE_CLASSES[code] || {
    code: code || "UNK",
    name: "Unknown Damage",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border shadow-sm transition-colors ${info.bgClass} ${info.textClass} ${info.borderClass} ${className}`}
    >
      <span className="font-bold tracking-tight">{info.code}</span>
      {showName && <span className="font-sans text-[11px] opacity-90">({info.name})</span>}
    </span>
  );
}

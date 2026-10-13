/**
 * Shared color styles and badge formatters across all dashboard screens.
 * Designed with dual light/dark high-contrast tokens for vivid presentation.
 */

export const DAMAGE_CLASSES = {
  D00: {
    code: "D00",
    name: "Longitudinal Crack",
    shortName: "Longitudinal",
    weight: 1.0,
    color: "#3b82f6", // Blue
    bgClass: "bg-blue-50 dark:bg-blue-500/15",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-300 dark:border-blue-500/40",
  },
  D10: {
    code: "D10",
    name: "Transverse Crack",
    shortName: "Transverse",
    weight: 1.5,
    color: "#f59e0b", // Amber
    bgClass: "bg-amber-50 dark:bg-amber-500/15",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-300 dark:border-amber-500/40",
  },
  D20: {
    code: "D20",
    name: "Alligator Crack",
    shortName: "Alligator",
    weight: 2.5,
    color: "#a855f7", // Purple
    bgClass: "bg-purple-50 dark:bg-purple-500/15",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-300 dark:border-purple-500/40",
  },
  D40: {
    code: "D40",
    name: "Pothole",
    shortName: "Pothole",
    weight: 3.0,
    color: "#ef4444", // Red
    bgClass: "bg-red-50 dark:bg-red-500/15",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-300 dark:border-red-500/40",
  },
};

export function getSeverityStyle(severity) {
  const norm = (severity || "").toLowerCase();
  if (norm === "low") {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-300 dark:border-emerald-500/35",
      dot: "bg-emerald-500 dark:bg-emerald-400",
      color: "#10b981",
      label: "Low",
    };
  }
  if (norm === "medium") {
    return {
      bg: "bg-amber-50 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-300 dark:border-amber-500/35",
      dot: "bg-amber-500 dark:bg-amber-400",
      color: "#f59e0b",
      label: "Medium",
    };
  }
  return {
    bg: "bg-rose-50 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-500/35",
    dot: "bg-rose-500 dark:bg-rose-400",
    color: "#ef4444",
    label: "High",
  };
}

export function getConditionStyle(condition) {
  const norm = (condition || "").toLowerCase();
  if (norm === "good") {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-300 dark:border-emerald-500/40",
      dot: "bg-emerald-500",
      badge: "border-emerald-400 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50",
      gradient: "from-emerald-500 to-teal-500",
      color: "#10b981",
      label: "Good",
    };
  }
  if (norm === "fair") {
    return {
      bg: "bg-amber-50 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-300 dark:border-amber-500/40",
      dot: "bg-amber-500",
      badge: "border-amber-400 dark:border-amber-500/60 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50",
      gradient: "from-amber-500 to-yellow-500",
      color: "#f59e0b",
      label: "Fair",
    };
  }
  if (norm === "poor") {
    return {
      bg: "bg-orange-50 dark:bg-orange-500/15",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-300 dark:border-orange-500/40",
      dot: "bg-orange-500",
      badge: "border-orange-400 dark:border-orange-500/60 text-orange-800 dark:text-orange-200 bg-orange-50 dark:bg-orange-950/50",
      gradient: "from-orange-500 to-amber-600",
      color: "#f97316",
      label: "Poor",
    };
  }
  return {
    bg: "bg-rose-50 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-500/40",
    dot: "bg-rose-500",
    badge: "border-rose-400 dark:border-rose-500/60 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/50",
    gradient: "from-rose-500 to-red-600",
    color: "#ef4444",
    label: "Critical",
  };
}

export function formatPercent(val) {
  if (val === undefined || val === null) return "0%";
  return `${Number(val).toFixed(1)}%`;
}

export function formatScore(val) {
  if (val === undefined || val === null) return "0.0";
  return Number(val).toFixed(1);
}

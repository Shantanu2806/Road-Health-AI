import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Activity, ShieldCheck, Layers } from "lucide-react";
import { getConditionStyle, getSeverityStyle } from "../utils/colors";

export default function HistoryTrendChart({ records = [] }) {
  if (!records || records.length === 0) return null;

  // Sort chronological (oldest to newest) for plotting
  const chronological = [...records].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : a.id;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : b.id;
    return timeA - timeB;
  });

  const chartData = chronological.map((item, idx) => {
    const dateObj = item.timestamp ? new Date(item.timestamp) : null;
    const shortLabel = dateObj
      ? dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : `#${item.id}`;
    const fullDate = dateObj
      ? dateObj.toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : `Inspection #${item.id}`;

    return {
      id: item.id,
      index: idx + 1,
      shortLabel,
      fullDate,
      score: Number(Number(item.road_health_score ?? 100).toFixed(1)),
      condition: item.condition_label || "Good",
      severity: item.severity || "Low",
      detectionsCount: Array.isArray(item.detections) ? item.detections.length : 0,
      coverage: Number(Number(item.coverage_pct ?? 0).toFixed(1)),
    };
  });

  // Calculate summary metrics
  const totalScans = chartData.length;
  const avgScore =
    totalScans > 0
      ? (chartData.reduce((acc, curr) => acc + curr.score, 0) / totalScans).toFixed(1)
      : "100.0";
  const latestRecord = chartData[chartData.length - 1];
  const avgConditionStyle = getConditionStyle(
    Number(avgScore) >= 81
      ? "Good"
      : Number(avgScore) >= 61
      ? "Fair"
      : Number(avgScore) >= 31
      ? "Poor"
      : "Critical"
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const condStyle = getConditionStyle(data.condition);
      const sevStyle = getSeverityStyle(data.severity);

      return (
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-xs space-y-1.5 z-50">
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              Inspection #{data.id}
            </span>
            <span className="text-[10px] text-slate-400">{data.fullDate}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Road Health:</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {data.score} <span className="text-[10px] text-slate-400">/ 100</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Condition:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}
            >
              {data.condition}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Severity:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
            >
              {data.severity}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500">
            <span>Detections: {data.detectionsCount}</span>
            <span>Coverage: {data.coverage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm transition-all">
      {/* Trend Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Road Health Score Trajectory
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Historical health score trend over past inspection analyses (0–100 scale).
          </p>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-left">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
              Total Audits
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {totalScans}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-left">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
              Average Score
            </span>
            <span className={`text-sm font-bold font-mono ${avgConditionStyle.text}`}>
              {avgScore}{" "}
              <span className="text-[10px] font-normal text-slate-400">({avgConditionStyle.label})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="healthScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />

            <XAxis
              dataKey="shortLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 30, 60, 80, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />

            {/* Threshold Reference Lines */}
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />
            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#healthScoreGradient)"
              activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
        <span>Earliest Analysis</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-emerald-500 inline-block" /> &gt;80 Good
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-500 inline-block" /> 61–80 Fair
          </span>
        </div>
        <span>Latest Analysis</span>
      </div>
    </div>
  );
}

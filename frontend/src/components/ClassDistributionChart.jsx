import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { DAMAGE_CLASSES } from "../utils/colors";

export default function ClassDistributionChart({ detections = [] }) {
  // Count detections by class code
  const counts = { D00: 0, D10: 0, D20: 0, D40: 0 };
  (detections || []).forEach((d) => {
    const code = (d.class_code || "").toUpperCase();
    if (counts[code] !== undefined) {
      counts[code] += 1;
    }
  });

  const chartData = [
    {
      code: "D00",
      name: "Longitudinal",
      count: counts.D00,
      color: DAMAGE_CLASSES.D00.color,
    },
    {
      code: "D10",
      name: "Transverse",
      count: counts.D10,
      color: DAMAGE_CLASSES.D10.color,
    },
    {
      code: "D20",
      name: "Alligator",
      count: counts.D20,
      color: DAMAGE_CLASSES.D20.color,
    },
    {
      code: "D40",
      name: "Pothole",
      count: counts.D40,
      color: DAMAGE_CLASSES.D40.color,
    },
  ];

  const totalDetections = detections.length;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 px-3 py-2 rounded-lg shadow-xl text-xs">
          <p className="font-semibold text-white">
            {data.code} ({data.name})
          </p>
          <p className="text-slate-300 mt-1">
            Count: <span className="font-mono font-bold text-blue-400">{data.count}</span>
          </p>
          <p className="text-slate-400 text-[10px]">
            {totalDetections > 0 ? ((data.count / totalDetections) * 100).toFixed(1) : 0}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="code"
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.code}`} fill={entry.color} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

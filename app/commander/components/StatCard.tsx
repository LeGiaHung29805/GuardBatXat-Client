import React from "react";

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "purple" | "green" | "red" | "orange" | "yellow";
  trend?: {
    value: number; // +15% or -10%
    isPositive: boolean; // true = good, false = bad
  };
  subtitle?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  color,
  trend,
  subtitle,
}: Props) {
  const colorClasses = {
    blue: {
      gradient: "from-blue-900/60 to-blue-800/40",
      border: "border-blue-700",
      glow: "shadow-blue-500/20",
    },
    purple: {
      gradient: "from-purple-900/60 to-purple-800/40",
      border: "border-purple-700",
      glow: "shadow-purple-500/20",
    },
    green: {
      gradient: "from-green-900/60 to-green-800/40",
      border: "border-green-700",
      glow: "shadow-green-500/20",
    },
    red: {
      gradient: "from-red-900/60 to-red-800/40",
      border: "border-red-700",
      glow: "shadow-red-500/20",
    },
    orange: {
      gradient: "from-orange-900/60 to-orange-800/40",
      border: "border-orange-700",
      glow: "shadow-orange-500/20",
    },
    yellow: {
      gradient: "from-yellow-900/60 to-yellow-800/40",
      border: "border-yellow-700",
      glow: "shadow-yellow-500/20",
    },
  };

  const styles = colorClasses[color];

  return (
    <div
      className={`bg-gradient-to-br ${styles.gradient} backdrop-blur-md rounded-2xl p-6 border ${styles.border} shadow-xl ${styles.glow} hover:scale-105 transition-all duration-300 cursor-pointer`}
    >
      {/* Icon */}
      <div className="text-5xl mb-4 animate-bounce-slow">{icon}</div>

      {/* Value */}
      <div className="flex items-end justify-between mb-2">
        <div className="text-4xl font-bold leading-none">
          {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
        </div>

        {/* Trend Badge */}
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              trend.isPositive
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {trend.isPositive ? "↑" : "↓"}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-gray-300 font-medium">{label}</div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-gray-400 text-sm mt-2 flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {subtitle}
        </div>
      )}

      {/* Progress Bar (optional) */}
      {typeof value === "number" && (
        <div className="mt-4 bg-gray-700/50 rounded-full h-2 overflow-hidden">
          <div
            className={`bg-gradient-to-r from-${color}-600 to-${color}-400 h-full transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min((value / 1000) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
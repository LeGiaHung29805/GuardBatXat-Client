import React from "react";
import type { RiskLevel } from "../types";
import { CheckCircle2, AlertTriangle, AlertCircle, Siren, Eye, Download } from "lucide-react"; // Import thư viện Icon

interface Props {
  title: string;
  icon: React.ReactNode; // Đổi sang ReactNode để nhận Icon component thay vì string (emoji)
  riskLevel: RiskLevel;
  affectedAreas: number;
  timestamp: string;
  gradient: string;
  onViewDetails?: () => void;
}

export default function HeatmapCard({
  title,
  icon,
  riskLevel,
  affectedAreas,
  timestamp,
  gradient,
  onViewDetails,
}: Props) {
  const getRiskColor = (level: RiskLevel): string => {
    const colors: Record<RiskLevel, string> = {
      low: "bg-green-100 text-green-800 border-green-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[level];
  };

  const getRiskText = (level: RiskLevel): string => {
    const texts: Record<RiskLevel, string> = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
      critical: "Nghiêm trọng",
    };
    return texts[level];
  };

  // Trả về Component Icon thay vì Emoji
  const getRiskIcon = (level: RiskLevel): React.ReactNode => {
    switch (level) {
      case "low":
        return <CheckCircle2 size={16} />;
      case "medium":
        return <AlertTriangle size={16} />;
      case "high":
        return <AlertCircle size={16} />;
      case "critical":
        return <Siren size={16} className="animate-pulse" />; // Thêm nhấp nháy cho báo động đỏ
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-2xl hover:shadow-3xl transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center">
          <span className="mr-3 text-blue-400">{icon}</span> {/* Nơi chứa Icon truyền từ component cha */}
          {title}
        </h3>
        <span
          className={`px-4 py-2 rounded-full text-sm font-bold border-2 flex items-center gap-1.5 ${getRiskColor(
            riskLevel
          )}`}
        >
          {getRiskIcon(riskLevel)}
          {getRiskText(riskLevel)}
        </span>
      </div>

      {/* Heatmap Visualization */}
      <div
        className={`h-64 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}
      >
        {/* Animated Dots */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                width: `${Math.random() * 40 + 10}px`,
                height: `${Math.random() * 40 + 10}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>

        {/* Main Stats */}
        <div className="text-center z-10">
          <div className="text-7xl font-bold mb-2 drop-shadow-lg">
            {affectedAreas}
          </div>
          <div className="text-xl font-semibold">khu vực bị ảnh hưởng</div>
        </div>

        {/* Timestamp Badge */}
        <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Cập nhật: {timestamp}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={onViewDetails}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Eye size={20} /> {/* Thay SVG bằng Icon Eye */}
          Xem Chi tiết
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center">
          <Download size={20} /> {/* Thay SVG bằng Icon Download */}
        </button>
      </div>
    </div>
  );
}
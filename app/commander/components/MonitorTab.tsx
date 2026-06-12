import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ScenarioLevel } from "../types";
import { Map, Ruler, Droplets, AlertTriangle } from "lucide-react"; // Import thư viện Icon

// Import Map động để tránh lỗi SSR của Next.js
const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

interface Props {
  scenarios: ScenarioLevel[];
  selectedScenario: ScenarioLevel;
  onScenarioChange: (scenario: ScenarioLevel) => void;
  floodData: any[]; // Dữ liệu thật từ DB
  landslideData: any[]; // Dữ liệu thật từ DB
}

export default function MonitorTab({ scenarios, selectedScenario, onScenarioChange, floodData, landslideData }: Props) {
  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ CHÍNH */}
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Map size={32} className="text-blue-500" /> 
        Giám sát Bản đồ Rủi ro Tổng thể
      </h2>

      {/* Tích hợp Bản đồ Leaflet */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Bản đồ Định vị Điểm Nóng</h3>
          
          {/* CHÚ THÍCH (LEGEND) ĐÃ ĐƯỢC NÂNG CẤP ICON */}
          <div className="flex gap-5">
             <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-800/50">
               <Droplets size={16} /> 
               Điểm ngập ({floodData.length})
             </span>
             <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-800/50">
               <AlertTriangle size={16} /> 
               Sạt lở ({landslideData.length})
             </span>
          </div>
        </div>
        
        {/* Bản đồ */}
        <MapComponent floodPoints={floodData} landslidePoints={landslideData} />
      </div>

      {/* Kịch bản Mực Nước */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700">
         <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
           <Ruler size={24} className="text-cyan-400" /> 
           Kịch bản Mực Nước
         </h3>
         <div className="flex flex-wrap gap-4">
          {scenarios.map((level) => (
            <button
              key={level}
              onClick={() => onScenarioChange(level)}
              className={`flex-1 min-w-[120px] p-6 rounded-xl border-2 transition-all ${
                selectedScenario === level
                  ? "bg-blue-600 border-blue-400 shadow-xl scale-[1.02]"
                  : "bg-gray-700 border-gray-600 hover:bg-gray-600"
              }`}
            >
              <div className="text-3xl font-bold">{level}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
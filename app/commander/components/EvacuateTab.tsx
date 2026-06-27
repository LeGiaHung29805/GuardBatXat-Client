import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import api from "../utils/api";
import type { ScenarioLevel, DamageStats } from "../types";
import { 
  Siren, 
  Home, 
  Users, 
  Map as MapIcon, // Đổi tên để tránh trùng lặp nếu có dùng Map của Leaflet sau này
  Construction, 
  ClipboardList,
  BellRing
} from "lucide-react"; // Import thư viện Icon

// Import bản đồ động để tránh lỗi SSR của Next.js
const EvacuationRadiusMap = dynamic(() => import("./EvacuationRadiusMap"), { ssr: false });

interface Props {
  scenarios: ScenarioLevel[];
  selectedScenario: ScenarioLevel;
  damageStats: DamageStats;
  floodData?: any[];
  onActivate: (radius: number) => void;
}

export default function EvacuateTab({
  selectedScenario,
  damageStats,
  floodData = [],
  onActivate,
}: Props) {
  const [radius, setRadius] = useState<number>(1000);
  const [backendCenter, setBackendCenter] = useState<[number, number] | null>(null);

  // Tâm dự phòng tính phía client (centroid điểm ngập); dùng khi backend chưa trả về
  const clientCenter = useMemo<[number, number]>(() => {
    const coords: [number, number][] = [];
    for (const pt of floodData) {
      try {
        const geo = typeof pt.geojson === "string" ? JSON.parse(pt.geojson) : pt.geojson;
        if (geo?.coordinates) coords.push([geo.coordinates[1], geo.coordinates[0]]);
      } catch {
        // bỏ qua điểm lỗi
      }
    }
    if (coords.length === 0) return [22.528534, 103.885091];
    const sumLat = coords.reduce((s, c) => s + c[0], 0);
    const sumLng = coords.reduce((s, c) => s + c[1], 0);
    return [sumLat / coords.length, sumLng / coords.length];
  }, [floodData]);

  // Lấy tâm sơ tán CHÍNH XÁC từ backend (đúng tâm mà lệnh sơ tán sẽ phát đi)
  useEffect(() => {
    let cancelled = false;
    const levelNumber = selectedScenario.replace("m", "");
    api
      .getEvacuationCenter(levelNumber)
      .then((res: any) => {
        if (cancelled) return;
        const lat = res?.centerLat;
        const lng = res?.centerLng;
        if (typeof lat === "number" && typeof lng === "number") {
          setBackendCenter([lat, lng]);
        }
      })
      .catch(() => {
        if (!cancelled) setBackendCenter(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedScenario]);

  // Ưu tiên tâm backend để vòng tròn preview khớp 100% với vùng thực sự nhận lệnh
  const center: [number, number] = backendCenter ?? clientCenter;

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ CHÍNH */}
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Siren size={32} className="text-red-500 animate-pulse" />
        Kích hoạt Kịch bản Sơ tán
      </h2>

      {/* KHUNG KÍCH HOẠT LỆNH SƠ TÁN */}
      <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 backdrop-blur-md rounded-2xl p-8 border-2 border-red-500">
        <div className="flex items-center mb-6">
          <div className="bg-red-600 p-4 rounded-full mr-4 shadow-lg shadow-red-500/30">
            <BellRing size={40} className="text-white" /> {/* Thay thế SVG cũ bằng Icon */}
          </div>
          <div>
            <h3 className="text-2xl font-bold">
              Kịch bản đang chọn: <span className="text-red-400">{selectedScenario}</span>
            </h3>
            <p className="text-gray-300">
              Tối đa ảnh hưởng{" "}
              <span className="font-bold text-white">{damageStats.populationEvacuated.toLocaleString()}</span> người (ước tính)
            </p>
          </div>
        </div>

        {/* 4 Ô THỐNG KÊ CHI TIẾT */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/80 p-4 rounded-xl text-center flex flex-col items-center justify-center border border-gray-700">
            <Home size={32} className="mb-2 text-blue-400" />
            <div className="text-2xl font-bold">{damageStats.housesFlooded}</div>
            <div className="text-sm text-gray-400">Nhà bị ngập</div>
          </div>
          <div className="bg-gray-800/80 p-4 rounded-xl text-center flex flex-col items-center justify-center border border-gray-700">
            <Users size={32} className="mb-2 text-purple-400" />
            <div className="text-2xl font-bold text-red-400">
              {damageStats.populationEvacuated.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Số người tối đa bị ảnh hưởng (ước tính)</div>
          </div>
          <div className="bg-gray-800/80 p-4 rounded-xl text-center flex flex-col items-center justify-center border border-gray-700">
            <MapIcon size={32} className="mb-2 text-green-400" />
            <div className="text-2xl font-bold">
              {damageStats.areaAffected} m²
            </div>
            <div className="text-sm text-gray-400">Diện tích ngập</div>
          </div>
          <div className="bg-gray-800/80 p-4 rounded-xl text-center flex flex-col items-center justify-center border border-gray-700">
            <Construction size={32} className="mb-2 text-orange-400" />
            <div className="text-2xl font-bold">{damageStats.roadsBlocked}</div>
            <div className="text-sm text-gray-400">Đường bị chặn</div>
          </div>
        </div>

        {/* CÀI ĐẶT BÁN KÍNH CẢNH BÁO */}
        <div className="mb-6 bg-gray-900/50 p-5 rounded-xl border border-gray-700">
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Phạm vi phát cảnh báo sơ tán (bán kính theo tâm vùng ngập)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="500" 
              max="10000" 
              step="500"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <span className="font-bold text-xl text-red-400 min-w-[80px] text-right">
              {radius >= 1000 ? `${radius/1000} km` : `${radius} m`}
            </span>
          </div>

          {/* BẢN ĐỒ VÙNG SƠ TÁN: vẽ vòng tròn bán kính quanh tâm vùng ngập */}
          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <MapIcon size={16} className="text-red-400" />
              Phạm vi tác động (vùng đỏ sẽ nhận lệnh sơ tán)
            </div>
            <EvacuationRadiusMap center={center} radius={radius} floodPoints={floodData} />
          </div>
        </div>

        {/* NÚT KÍCH HOẠT LỚN */}
        <button
          onClick={() => onActivate(radius)}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all shadow-xl hover:shadow-red-900/50 hover:scale-[1.02] flex items-center justify-center gap-3"
        >
          <Siren size={24} />
          KÍCH HOẠT LỆNH SƠ TÁN NGAY
        </button>
      </div>

      {/* CHI TIẾT KẾ HOẠCH SƠ TÁN */}
      <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
          <ClipboardList size={24} className="text-blue-400" />
          Chi tiết Kế hoạch Sơ tán
        </h3>
        
        <div className="space-y-4"> {/* Tăng khoảng cách giữa các bước lên một chút */}
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-blue-900/50">
              1
            </div>
            <div className="flex-1 mt-1"> {/* Thêm mt-1 để căn giữa chữ với hình tròn */}
              <div className="font-semibold text-white">Phát lệnh sơ tán khẩn cấp</div>
              <div className="text-sm text-gray-400 mt-0.5">
                Gửi cảnh báo tới người dân trong vùng ảnh hưởng (tối đa ~<span className="text-gray-200 font-medium">{damageStats.populationEvacuated.toLocaleString()}</span> người) qua Push Notification
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-blue-900/50">
              2
            </div>
            <div className="flex-1 mt-1">
              <div className="font-semibold text-white">Hướng dẫn tuyến di chuyển an toàn</div>
              <div className="text-sm text-gray-400 mt-0.5">
                Chỉ dẫn đường đến 8 điểm tị nạn còn sức chứa
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-blue-900/50">
              3
            </div>
            <div className="flex-1 mt-1">
              <div className="font-semibold text-white">Điều động đội cứu hộ</div>
              <div className="text-sm text-gray-400 mt-0.5">
                Huy động 5 đội cứu hộ hỗ trợ vùng nguy hiểm
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-blue-900/50">
              4
            </div>
            <div className="flex-1 mt-1">
              <div className="font-semibold text-white">Theo dõi tiến độ real-time</div>
              <div className="text-sm text-gray-400 mt-0.5">
                Cập nhật trạng thái di chuyển qua GPS tracking
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";
import React, { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "./HeatmapLayer";
import { Flame, MapPin, Home, AlertTriangle } from "lucide-react"; // Import thư viện Icon

interface Props {
  floodPoints: any[];
  landslidePoints: any[];
}

export default function MapComponent({ floodPoints, landslidePoints }: Props) {
  const [mapMode, setMapMode] = useState<'heatmap' | 'points'>('heatmap');

  // Tọa độ trung tâm (Máp đúng tọa độ thật)
  const center: [number, number] = [22.528534, 103.885091];

  // Xử lý tọa độ thật của từng ngôi nhà/đoạn đường để vẽ Bản đồ nhiệt
  const heatData: [number, number, number][] = [
    ...floodPoints.map(pt => {
      const geo = typeof pt.geojson === 'string' ? JSON.parse(pt.geojson) : pt.geojson;
      return [geo.coordinates[1], geo.coordinates[0], pt.muc_do ?? 0.6] as [number, number, number];
    }),
    ...landslidePoints.map(pt => {
      const geo = typeof pt.geojson === 'string' ? JSON.parse(pt.geojson) : pt.geojson;
      return [geo.coordinates[1], geo.coordinates[0], pt.muc_do ?? 1.0] as [number, number, number];
    })
  ];

  return (
    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">

      {/* NÚT CÔNG TẮC ĐIỀU KHIỂN CHẾ ĐỘ BẢN ĐỒ */}
      <div className="absolute top-4 right-4 z-[1000] bg-gray-900/90 backdrop-blur-md p-1.5 rounded-xl border border-gray-700 flex space-x-1 shadow-lg">
        <button
          onClick={() => setMapMode('heatmap')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${mapMode === 'heatmap' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
          <Flame size={18} /> {/* Icon Lửa */}
          Bản đồ Rủi ro (Độ nét cao)
        </button>
        <button
          onClick={() => setMapMode('points')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${mapMode === 'points' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
          <MapPin size={18} /> {/* Icon Điểm Đánh Dấu */}
          Điểm Đánh dấu (Marker)
        </button>
      </div>

      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* HIỂN THỊ LỚP BẢN ĐỒ DỰA VÀO NÚT BẤM */}

        {mapMode === 'heatmap' && (
          <HeatmapLayer
            points={heatData}
            options={{
              radius: 28,         // Kích thước điểm sáng đủ to để bao trùm tòa nhà
              blur: 10,           // Độ nhòe thấp (Tạo lõi sáng rực và viền cứng sắc nét)
              maxZoom: 16,        // Khi zoom qua mức 16, giữ nguyên độ đậm đặc
              minOpacity: 0.85,   // BÍ QUYẾT: Dù chỉ có 1-2 điểm, vẫn phát sáng rực rỡ 85%
              gradient: {
                0.3: '#3b82f6', // Xanh dương
                0.5: '#facc15', // Vàng
                0.7: '#f97316', // Cam
                1.0: '#dc2626'  // Đỏ rực
              }
            }}
          />
        )}

        {mapMode === 'points' && (
          <>
            {floodPoints.map((pt, idx) => {
              const geo = JSON.parse(pt.geojson);
              return (
                <CircleMarker
                  key={`flood-${idx}`}
                  center={[geo.coordinates[1], geo.coordinates[0]]}
                  radius={8}
                  pathOptions={{ fillColor: "#3b82f6", color: "#60a5fa", fillOpacity: 0.7 }}
                >
                  <Popup className="text-gray-900 font-sans">
                    <div className="flex items-center gap-1 mb-1 text-blue-700">
                      <Home size={16} /> {/* Icon Ngôi Nhà */}
                      <strong>Nhà bị ngập</strong>
                    </div>
                    Loại: {pt.loai_nha}<br />
                    Kẹt lại: <span className="text-red-500 font-bold">{pt.so_nguoi} người</span><br />
                    Cao độ: {pt.cao_do}m
                  </Popup>
                </CircleMarker>
              );
            })}

            {landslidePoints.map((pt, idx) => {
              const geo = JSON.parse(pt.geojson);
              return (
                <CircleMarker
                  key={`land-${idx}`}
                  center={[geo.coordinates[1], geo.coordinates[0]]}
                  radius={8}
                  pathOptions={{ fillColor: "#ef4444", color: "#f87171", fillOpacity: 0.9 }}
                >
                  <Popup className="text-gray-900 font-sans">
                    <div className="flex items-center gap-1 mb-1 text-red-600">
                      <AlertTriangle size={16} /> {/* Icon Cảnh Báo */}
                      <strong>Đoạn đường Sạt lở</strong>
                    </div>
                    Độ dốc: {pt.do_doc}°<br />
                    Là cầu: {pt.la_cau === 1 ? "Có" : "Không"}
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
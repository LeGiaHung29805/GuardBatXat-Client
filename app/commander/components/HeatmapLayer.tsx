"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapProps {
  points: [number, number, number][]; // [Vĩ độ, Kinh độ, Cường độ]
  options?: any; // ĐÃ THÊM: Mở cổng để nhận thông số ép sáng từ bên ngoài
}

export default function HeatmapLayer({ points, options }: HeatmapProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Lọc bỏ các điểm lỗi (NaN, ngoài phạm vi tọa độ/cường độ) để tránh hỏng cả lớp nhiệt
    const filteredPoints = points.filter((point) => {
      if (!Array.isArray(point)) return false;
      const [lat, lng, intensity] = point;
      return (
        typeof lat === "number" && typeof lng === "number" && typeof intensity === "number" &&
        !isNaN(lat) && !isNaN(lng) && !isNaN(intensity) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
        intensity >= 0 && intensity <= 1
      );
    });

    if (filteredPoints.length === 0) return;

    // ĐÃ SỬA: Lấy thông số từ options truyền vào, nếu không có thì dùng mặc định
    const heatLayer = (L as any).heatLayer(filteredPoints, {
      radius: options?.radius || 25,
      blur: options?.blur || 15,
      maxZoom: options?.maxZoom || 18,
      minOpacity: options?.minOpacity || 0.4, // ĐÂY LÀ CHÌA KHÓA: Ép điểm ảnh phát sáng
      gradient: options?.gradient || {
        0.4: "blue", 
        0.6: "cyan", 
        0.7: "lime", 
        0.8: "orange", 
        1.0: "red" 
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, options]);

  return null;
}
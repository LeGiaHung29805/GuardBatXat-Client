"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ApiClient } from "@/lib/ApiClient";

// Load Map Client-side
const SafeRouteMap = dynamic(() => import("@/components/ui/SafeRouteMap"), {
  ssr: false,
});

export default function SafeRoutingPage() {
  const [loading, setLoading] = useState(false);
  const [startLoc, setStartLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destLoc, setDestLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [route, setRoute] = useState<[number, number][]>([]);
  const [blockedSegments, setBlockedSegments] = useState<{ coords: [number, number][]; level: 'DANGER' | 'WARNING' }[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Kiểm tra xem user có ở gần Bát Xát không (vĩ độ ~22.6)
          // Nếu ở quá xa (ví dụ: Hà Nội), ta sẽ giả lập vị trí ở Bát Xát để test hệ thống
          let lat = position.coords.latitude;
          let lng = position.coords.longitude;
          
          if (lat < 22.0 || lat > 23.0 || lng < 103.0 || lng > 105.0) {
              console.warn("Vị trí thực tế quá xa Bát Xát, sử dụng vị trí giả lập tại UBND Bát Xát để test lộ trình.");
              lat = 22.6105;
              lng = 103.8012;
          }
          
          setStartLoc({ lat, lng });
        },
        (error) => {
          console.error("Lỗi lấy vị trí GPS:", error);
          // Fallback location
          setStartLoc({ lat: 22.6105, lng: 103.8012 });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        },
      );
    } else {
      alert("Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS.");
    }
  }, []);

  const handleFindRoute = async () => {
    if (!startLoc || !destLoc) {
      alert("Vui lòng click lên bản đồ để chọn điểm đến!");
      return;
    }

    setLoading(true);
    setMessage("");
    setRoute([]);
    setBlockedSegments([]);

    try {
      const res = await ApiClient.getSafeRoute({
        startLat: startLoc.lat,
        startLng: startLoc.lng,
        endLat: destLoc.lat,
        endLng: destLoc.lng,
      });

      const routePoints = res.data.pathPoints || res.data.route_coordinates;
      if (res.code === 200 && routePoints) {
        setRoute(routePoints);
        setBlockedSegments(res.data.blocked_segments || []);
        setMessage("Đã tìm thấy lộ trình an toàn nhất né vùng thiên tai!");
      }
    } catch (error: any) {
      console.error("Lỗi:", error);
      setMessage(error.message || "Không thể tìm đường đến vị trí này.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Cột trái: Bảng điều khiển */}
      <div className="w-full md:w-96 h-[45%] md:h-full p-4 md:p-6 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 z-10 flex flex-col overflow-y-auto shrink-0 shadow-2xl">
        <h1 className="text-xl md:text-2xl font-black text-blue-500 mb-2 flex items-center gap-2">
          Định vị An Toàn
        </h1>
        <p className="text-xs text-slate-400 mb-4 pb-2 border-b border-slate-800 leading-relaxed">
          Chọn một điểm đến tùy ý trên bản đồ. AI sẽ tự động bẻ lái lộ trình để né tránh các khu vực ngập lụt và sạt lở nguy hiểm.
        </p>

        {/* Status Box */}
        <div className="bg-slate-950/60 rounded-xl p-4 mb-4 space-y-3 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-slate-900 shadow"></div>
            <span className="text-xs font-semibold text-slate-300">
              Điểm A: Vị trí của bạn
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-slate-900 shadow"></div>
            <span className="text-xs font-semibold text-slate-300">
              Điểm B:{" "}
              {destLoc
                ? `[${destLoc.lat.toFixed(4)}, ${destLoc.lng.toFixed(4)}]`
                : "(Nhấp vào bản đồ để chọn)"}
            </span>
          </div>
        </div>

        <button
          onClick={handleFindRoute}
          disabled={loading || !destLoc}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-extrabold rounded-xl transition-all shadow-lg active:scale-95"
        >
          {loading ? "Đang tính toán..." : "TÌM ĐƯỜNG ĐI NGAY"}
        </button>

        {/* Box hiển thị thông báo kết quả */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-xl font-bold text-xs border ${
              route.length > 0 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Cột phải: Bản đồ */}
      <div className="flex-1 h-[55%] md:h-full relative">
        <SafeRouteMap
          startLoc={startLoc}
          destLoc={destLoc}
          setDestLoc={setDestLoc}
          routeCoords={route}
          blockedSegments={blockedSegments}
        />
      </div>
    </div>
  );
}

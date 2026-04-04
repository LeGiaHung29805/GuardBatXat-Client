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
  const [message, setMessage] = useState<string>("");

  // // Lấy GPS khi vừa vào trang
  // useEffect(() => {
  //     // TỌA ĐỘ MOCK ĐỂ TEST TRÊN MÁY TÍNH (Bạn có thể đổi sang navigator.geolocation sau)
  //     setStartLoc({ lat: 22.6105, lng: 103.8012 });
  // }, []);
  // Lấy GPS thật của trình duyệt khi vừa vào trang
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Lấy thành công tọa độ từ Chrome
          setStartLoc({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Lỗi lấy vị trí GPS:", error);
          alert("Vui lòng cho phép trình duyệt truy cập vị trí!");
          // Nếu lỗi, gán tạm tọa độ mặc định để không bị lỗi màn hình
          setStartLoc({ lat: 22.6105, lng: 103.8012 });
        },
      );
    } else {
      alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
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

    try {
      const res = await ApiClient.getSafeRoute({
        startLat: startLoc.lat,
        startLng: startLoc.lng,
        endLat: destLoc.lat,
        endLng: destLoc.lng,
      });

      if (res.code === 200 && res.data.route_coordinates) {
        setRoute(res.data.route_coordinates);
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
    <div className="relative w-full h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Cột trái: Bảng điều khiển */}
      <div className="w-full md:w-96 p-5 bg-white shadow-xl z-10 flex flex-col">
        <h1 className="text-2xl font-bold text-blue-700 mb-2">
          Định vị An Toàn
        </h1>
        <p className="text-sm text-gray-600 mb-6 border-b pb-4">
          Chọn một điểm đến tùy ý trên bản đồ. AI sẽ tự động bẻ lái lộ trình để
          né vùng ngập lụt và sạt lở.
        </p>

        {/* Status Box */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm font-medium text-gray-700">
              A: Vị trí của bạn
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white shadow"></div>
            <span className="text-sm font-medium text-gray-700">
              B:{" "}
              {destLoc
                ? `[${destLoc.lat.toFixed(4)}, ${destLoc.lng.toFixed(4)}]`
                : "(Click lên bản đồ để chọn)"}
            </span>
          </div>
        </div>

        <button
          onClick={handleFindRoute}
          disabled={loading || !destLoc}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all"
        >
          {loading ? "Đang tính toán..." : "Tìm Đường Đi Ngay"}
        </button>

        {/* Box hiển thị thông báo kết quả */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg font-medium text-sm ${route.length > 0 ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Cột phải: Bản đồ */}
      <div className="flex-1 h-[60vh] md:h-screen">
        <SafeRouteMap
          startLoc={startLoc}
          destLoc={destLoc}
          setDestLoc={setDestLoc}
          routeCoords={route}
        />
      </div>
    </div>
  );
}

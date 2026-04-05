"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ApiClient } from "@/lib/ApiClient";
import FloodStatsDashboard from "@/components/ui/FloodStatsDashboard";
const AdminCompareMap = dynamic(
  () => import("@/components/ui/AdminCompareMap"),
  { ssr: false },
);

export default function AdminRoutingPage() {
  const [simStats, setSimStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startLoc, setStartLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destLoc, setDestLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [routes, setRoutes] = useState({
    shortest: [],
    safety: [],
    rescue: [],
  });

  // Tọa độ UBND Huyện Bát Xát (Thực tế)
  useEffect(() => {
    setStartLoc({ lat: 22.5458, lng: 103.8895 });
  }, []);

  // THÊM HÀM NÀY: Xử lý khi người dùng click chọn điểm mới trên bản đồ
  const handleMapClick = (loc: { lat: number; lng: number }) => {
    setDestLoc(loc); // 1. Cập nhật vị trí cờ tím (Điểm B)
    setRoutes({ shortest: [], safety: [], rescue: [] }); // 2. Xóa trắng lộ trình cũ
  };
  const handleCompareRoutes = async () => {
    if (!startLoc || !destLoc) return alert("Chọn điểm đến!");
    setLoading(true);
    try {
      const res = await ApiClient.getAdminCompareRoute({
        startLat: startLoc.lat,
        startLng: startLoc.lng,
        endLat: destLoc.lat,
        endLng: destLoc.lng,
      });
      if (res.code === 200) {
        setRoutes({
          shortest: res.data.shortestPath || [],
          safety: res.data.safetyPath || [],
          rescue: res.data.rescuePath || [],
        });
      }
    } catch (error) {
      alert("Khu vực bị cô lập. Không tìm thấy đường thực tế!");
      setRoutes({ shortest: [], safety: [], rescue: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    // DÙNG -m-10 ĐỂ BUNG TRÀN KHỎI PADDING CỦA LAYOUT CHUNG, h-screen ĐỂ FULL CHIỀU CAO
    <div className="-m-10 flex h-screen bg-white overflow-hidden relative">
      {/* 1. BẢN ĐỒ: flex-1 chiếm toàn bộ phần diện tích còn lại */}
      <div className="flex-1 relative z-0">
        <AdminCompareMap
          startLoc={startLoc}
          destLoc={destLoc}
          setDestLoc={handleMapClick} // ĐỔI setDestLoc THÀNH handleMapClick Ở ĐÂY
          routes={routes}
        />
      </div>

      {/* 2. PANEL ĐIỀU KHIỂN: Ghim sát mép phải, có bóng đổ mạnh (shadow-2xl) phân tách với bản đồ */}
      <div className="w-80 bg-white p-6 shadow-2xl z-10 flex flex-col border-l border-slate-200">
        <h1 className="text-xl font-black text-slate-800 mb-4">
          Kiểm chứng AI
        </h1>

        <button
          onClick={handleCompareRoutes}
          disabled={loading || !destLoc}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 mb-6 transition-all shadow-lg shadow-blue-500/40 text-sm"
        >
          {loading ? "Đang phân tích..." : "So sánh Lộ trình"}
        </button>

        {/* BẢNG CHÚ THÍCH (LEGEND) */}
        <div className="space-y-6 border-t border-slate-100 pt-6">
          <h3 className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">
            Chú giải lộ trình
          </h3>

          <div className="flex items-center gap-4">
            <div className="w-8 border-b-4 border-dashed border-red-500"></div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-700">
                Ngắn nhất
              </span>
              <span className="text-[11px] text-slate-500">
                Bất chấp rủi ro ngập/sạt
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 border-b-[6px] border-green-500"></div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-700">
                An toàn
              </span>
              <span className="text-[11px] text-slate-500">
                Dân sự - Ưu tiên né rủi ro
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 border-b-[6px] border-yellow-500"></div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-700">
                Cứu hộ
              </span>
              <span className="text-[11px] text-slate-500">
                Xe đặc chủng - Ưu tiên tốc độ
              </span>
            </div>
          </div>
        </div>

        {/* Hướng dẫn nho nhỏ ở dưới cùng */}
        <div className="mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-[12px] text-blue-600 font-medium leading-relaxed text-center">
            Click bản đồ để chọn đích <br /> sau đó bấm "So sánh"
          </p>
        </div>
      </div>
    </div>
  );
}

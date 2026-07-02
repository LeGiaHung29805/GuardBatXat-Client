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

  // State điều khiển đóng/mở panel trên di động
  const [isPanelOpen, setIsPanelOpen] = useState(false);

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
        // Tự động thu nhỏ panel trên di động sau khi bấm so sánh để xem bản đồ
        if (window.innerWidth < 768) {
          setIsPanelOpen(false);
        }
      }
    } catch (error) {
      alert("Khu vực bị cô lập. Không tìm thấy đường thực tế!");
      setRoutes({ shortest: [], safety: [], rescue: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    // DÙNG LỚP BIÊN ÂM RESPONSIVE, h-full HOẶC h-[calc(100vh-68px)] TRÊN DI ĐỘNG ĐỂ KHÔNG BỊ TRÀN VIEWPORT
    <div className="-m-5 sm:-m-8 md:-m-10 flex flex-col md:flex-row h-[calc(100vh-68px)] md:h-screen bg-white overflow-hidden relative">
      {/* 1. BẢN ĐỒ: flex-1 chiếm toàn bộ phần diện tích còn lại */}
      <div className="flex-1 h-full w-full relative z-0">
        <AdminCompareMap
          startLoc={startLoc}
          destLoc={destLoc}
          setDestLoc={handleMapClick}
          routes={routes}
        />

        {/* Nút nổi mở điều khiển trên di động */}
        <button
          onClick={() => setIsPanelOpen(true)}
          className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white px-5 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:bg-black transition active:scale-95 text-xs tracking-wider uppercase"
        >
          <span>So sánh Lộ trình</span>
          {destLoc && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
        </button>
      </div>

      {/* LỚP PHỦ MỜ CHO PANEL DI ĐỘNG */}
      {isPanelOpen && (
        <div
          onClick={() => setIsPanelOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* 2. PANEL ĐIỀU KHIỂN: Ghim sát mép phải (desktop) hoặc biến thành Bottom Sheet (di động) */}
      <div
        className={`fixed inset-x-0 bottom-0 md:static md:inset-auto z-30 w-full md:w-80 bg-white p-6 shadow-2xl md:shadow-none flex flex-col border-t md:border-t-0 md:border-l border-slate-200 transition-transform duration-300 rounded-t-[2rem] md:rounded-none max-h-[80vh] md:max-h-none overflow-y-auto ${
          isPanelOpen ? "translate-y-0" : "translate-y-full md:translate-y-0"
        }`}
      >
        {/* Thanh kéo / Nhận diện kéo Bottom Sheet trên mobile */}
        <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsPanelOpen(false)} />

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-black text-slate-800">
            Kiểm chứng AI
          </h1>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 transition"
          >
            Đóng
          </button>
        </div>

        <button
          onClick={handleCompareRoutes}
          disabled={loading || !destLoc}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6 transition-all shadow-lg shadow-blue-500/25 text-sm"
        >
          {loading ? "Đang phân tích..." : "So sánh Lộ trình"}
        </button>

        {/* BẢNG CHÚ THÍCH (LEGEND) */}
        <div className="space-y-5 border-t border-slate-100 pt-5">
          <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">
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
        <div className="mt-6 md:mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-[12px] text-blue-600 font-semibold leading-relaxed text-center">
            {destLoc ? "Đã chọn điểm đích. Nhấn nút So sánh!" : "Chạm bản đồ để chọn điểm đích, sau đó bấm So sánh"}
          </p>
        </div>
      </div>
    </div>
  );
}

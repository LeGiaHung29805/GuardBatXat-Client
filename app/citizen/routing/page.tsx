"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ApiClient } from "@/lib/ApiClient";
import ToastContainer, { showToast } from "@/components/ui/Toast";
import { getDistanceToPolyline } from "@/lib/utils";
import { isDemoQrSession, watchEffectiveLocation } from "@/lib/effectiveLocation";

const SafeRouteMap = dynamic(() => import("@/components/ui/SafeRouteMap"), { ssr: false });

export default function SafeRoutingPage() {
  const [loading, setLoading] = useState(false);
  const [startLoc, setStartLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [destLoc, setDestLoc] = useState<{ lat: number; lng: number } | null>(null);
  
  // Quản lý 3 lộ trình an toàn và lộ trình đang được người dùng lựa chọn
  const [routes, setRoutes] = useState<{ pathPoints: [number, number][]; totalDistance: number }[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  
  const [blockedSegments, setBlockedSegments] = useState<{ coords: [number, number][]; level: 'DANGER' | 'WARNING' }[]>([]);
  const [message, setMessage] = useState<string>("");
  
  const [panelHeight, setPanelHeight] = useState(350);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const lastRerouteTimeRef = useRef<number>(0);
  const rerouteCooldownMs = 15000; // Khoảng cách tối thiểu giữa 2 lần tự động tái định tuyến (15s)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPanelHeight(Math.floor(window.innerHeight * 0.45));
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY.current;
    const newHeight = dragStartHeight.current - deltaY;
    const minHeight = 60;
    const maxHeight = window.innerHeight * 0.9;
    setPanelHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Theo dõi GPS thời gian thực (watchPosition) để kiểm tra lệch hướng và làm mờ đoạn đã đi qua
  useEffect(() => {
    const stopWatching = watchEffectiveLocation(
        (location) => {
          let lat = location.lat;
          let lng = location.lng;
          
          // Giả lập đưa về Bát Xát nếu thiết bị đang test ở địa phương khác
          if (location.source === "DEVICE_GPS" && (lat < 22.0 || lat > 23.0 || lng < 103.0 || lng > 105.0)) {
            lat = 22.6105; 
            lng = 103.8012;
          }
          
          setStartLoc(prev => {
            if (prev && prev.lat === lat && prev.lng === lng) return prev;
            return { lat, lng };
          });
        },
        (error) => {
          if (isDemoQrSession()) {
            showToast('danger', 'VỊ TRÍ TRÌNH DIỄN', error.message);
            return;
          }
          showToast('danger', 'LỖI ĐỊNH VỊ GPS', 'Không thể xác định vị trí. Đã dùng UBND huyện Bát Xát làm điểm mặc định.');
          setStartLoc(prev => prev || { lat: 22.6105, lng: 103.8012 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    return stopWatching;
  }, []);

  // Tự động tái định tuyến (Auto-Rerouting) khi đi chệch khỏi tuyến đang chọn > 30m
  useEffect(() => {
    if (!startLoc || !destLoc || routes.length === 0) return;

    const currentRoute = routes[selectedRouteIndex];
    if (!currentRoute || !currentRoute.pathPoints || currentRoute.pathPoints.length === 0) return;

    const dist = getDistanceToPolyline(startLoc.lat, startLoc.lng, currentRoute.pathPoints);
    
    if (dist > 30) {
      const now = Date.now();
      if (now - lastRerouteTimeRef.current > rerouteCooldownMs) {
        lastRerouteTimeRef.current = now;
        showToast('warning', 'TÁI ĐỊNH TUYẾN TỰ ĐỘNG', 'Bạn đi chệch khỏi lộ trình an toàn > 30m. Đang tìm lại đường đi tối ưu mới.');

        const triggerRerouting = async () => {
          try {
            const res = await ApiClient.compareSafetyRoutes({
              startLat: startLoc.lat,
              startLng: startLoc.lng,
              endLat: destLoc.lat,
              endLng: destLoc.lng
            });
            if (res.code === 200 && res.data.routes) {
              setRoutes(res.data.routes);
              setSelectedRouteIndex(0);
              showToast('info', 'ĐÃ CẬP NHẬT LỘ TRÌNH', 'Đã tải 3 lộ trình an toàn mới từ vị trí hiện tại.');
            }
          } catch (e) {
            console.error("Tự động tái định tuyến thất bại", e);
          }
        };
        triggerRerouting();
      }
    }
  }, [startLoc, destLoc, routes, selectedRouteIndex]);

  const handleFindRoute = async () => {
    if (!startLoc || !destLoc) { 
      showToast('warning', 'THIẾU ĐIỂM ĐẾN', 'Vui lòng click lên bản đồ để chọn điểm đến!'); 
      return; 
    }
    setLoading(true); 
    setMessage(""); 
    setRoutes([]); 
    setBlockedSegments([]);
    
    try {
      const res = await ApiClient.compareSafetyRoutes({ 
        startLat: startLoc.lat, 
        startLng: startLoc.lng, 
        endLat: destLoc.lat, 
        endLng: destLoc.lng 
      });
      
      if (res.code === 200 && res.data.routes && res.data.routes.length > 0) {
        setRoutes(res.data.routes);
        setSelectedRouteIndex(0);
        setMessage("Đã đề xuất 3 tuyến đường có độ an toàn (Safety) cao nhất!");
        setPanelHeight(Math.floor(window.innerHeight * 0.45)); // Co lại hoặc mở rộng phù hợp
      } else {
        throw new Error("Không tìm thấy tuyến đường an toàn nào.");
      }
    } catch (error: any) {
      setMessage(error.message || "Không thể tìm đường đến vị trí này.");
    } finally { 
      setLoading(false); 
    }
  };

  const PanelContent = () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-blue-500 mb-1">Định vị An Toàn</h1>
        <p className="text-xs text-slate-400 leading-relaxed">Chọn một điểm đến tùy ý trên bản đồ. AI sẽ so sánh và tìm ra **3 đường đi an toàn nhất**, né tránh các vùng sạt lở hoặc ngập lụt.</p>
      </div>
      
      <div className="bg-slate-950/60 rounded-xl p-3 space-y-2.5 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 shadow shrink-0"></div>
          <span className="text-xs font-semibold text-slate-300">Điểm A: Vị trí của bạn</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900 shadow shrink-0"></div>
          <span className="text-xs font-semibold text-slate-300">Điểm B: {destLoc ? `[${destLoc.lat.toFixed(4)}, ${destLoc.lng.toFixed(4)}]` : "(Nhấp vào bản đồ để chọn)"}</span>
        </div>
      </div>

      <button 
        onClick={handleFindRoute} 
        disabled={loading || !destLoc} 
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-extrabold rounded-xl transition-all shadow-lg active:scale-95"
      >
        {loading ? "Đang tính toán..." : "TÌM ĐƯỜNG ĐI NGAY"}
      </button>

      {message && (
        <div className={`p-3 rounded-xl font-bold text-xs border ${routes.length > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
          {message}
        </div>
      )}

      {/* Hiển thị danh sách so sánh 3 đường đi an toàn nhất */}
      {routes.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn 1 trong 3 đường đi gợi ý:</label>
          <div className="space-y-2">
            {routes.map((r, idx) => {
              const isSelected = selectedRouteIndex === idx;
              const themeColor = idx === 0 ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-400" : idx === 1 ? "border-cyan-500/80 bg-cyan-500/10 text-cyan-400" : "border-violet-500/80 bg-violet-500/10 text-violet-400";
              const dotColor = idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-cyan-500" : "bg-violet-500";
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected 
                      ? `${themeColor} ring-2 ring-blue-500 font-extrabold shadow-lg` 
                      : "border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${dotColor} border border-slate-900 shadow shrink-0`}></span>
                    <div>
                      <div className="text-xs">Đường đi gợi ý {idx + 1} {idx === 0 && "🌟"}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        Độ an toàn: {idx === 0 ? "Tối ưu nhất" : idx === 1 ? "Rất an toàn" : "Trung bình"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold">{Math.round(r.totalDistance)}m</div>
                    <div className="text-[9px] text-slate-500 font-normal">Chỉ số MCDM</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full bg-slate-950 text-slate-100">
      <ToastContainer />

      {/* Map chiếm toàn bộ màn hình */}
      <div className="absolute inset-0">
        <SafeRouteMap 
          startLoc={startLoc} 
          destLoc={destLoc} 
          setDestLoc={setDestLoc} 
          routes={routes} 
          selectedRouteIndex={selectedRouteIndex}
          onSelectRouteIndex={setSelectedRouteIndex}
          blockedSegments={blockedSegments} 
        />
      </div>

      {/* Desktop: Sidebar trái */}
      <div className="hidden md:flex absolute top-0 left-0 h-full w-96 p-6 bg-slate-900/95 backdrop-blur border-r border-slate-800 z-10 flex-col overflow-y-auto shadow-2xl">
        <PanelContent />
      </div>

      {/* Mobile: Bottom sheet */}
      <div
        className="md:hidden absolute bottom-0 left-0 right-0 bg-slate-900/97 backdrop-blur border-t border-slate-700 z-20 flex flex-col transition-all duration-75 ease-out"
        style={{ height: `${panelHeight}px`, borderRadius: '20px 20px 0 0' }}
      >
        {/* Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex flex-col items-center justify-center pt-3 pb-1 gap-1 shrink-0 cursor-row-resize touch-none select-none"
        >
          <div className="w-10 h-1 bg-slate-600 rounded-full"></div>
          <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Vuốt để kéo lên/xuống</div>
        </div>
        {panelHeight > 70 && (
          <div className="flex-1 overflow-y-auto px-4 pb-20">
            <PanelContent />
          </div>
        )}
      </div>
    </div>
  );
}

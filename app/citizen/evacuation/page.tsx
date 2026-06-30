'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApiClient } from '@/lib/ApiClient';
import { EvacuationOption } from '@/lib/Model';
import ToastContainer, { showToast } from '@/components/ui/Toast';

const EvacuationMap = dynamic(() => import('@/components/ui/EvacuationMap'), { ssr: false });

export default function EvacuationPage() {
    const [loading, setLoading] = useState(false);
    // Chỉ dùng 1 state duy nhất cho vị trí người dùng
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    const [options, setOptions] = useState<EvacuationOption[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [rescueTracking, setRescueTracking] = useState<any>(null);
    const [rescueRoute, setRescueRoute] = useState<any>(null);
    const [rescueTrackingPath, setRescueTrackingPath] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadLatestTracking = () => {
            const storedTracking = localStorage.getItem("rescue:latest-tracking-update");
            if (storedTracking) {
                try {
                    const parsed = JSON.parse(storedTracking);
                    setRescueTracking(parsed);
                } catch (e) {
                    console.error(e);
                }
            }

            const storedRoutePath = localStorage.getItem("rescue:latest-route-path");
            if (storedRoutePath) {
                try {
                    const parsed = JSON.parse(storedRoutePath);
                    setRescueRoute({
                        coordinates: parsed,
                        start: parsed[0],
                        dest: parsed[parsed.length - 1],
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        };

        loadLatestTracking();

        const handleTrackingUpdate = (event: Event) => {
            const data = (event as CustomEvent).detail;
            setRescueTracking(data);
            if (data && data.lat && data.lng) {
                setRescueTrackingPath(prev => {
                    const nextPoint = { lat: data.lat, lng: data.lng, remainingKm: data.remainingKm };
                    const lastPoint = prev[prev.length - 1];
                    if (lastPoint?.lat === nextPoint.lat && lastPoint?.lng === nextPoint.lng) {
                        return prev;
                    }
                    return [...prev, nextPoint];
                });
            }
        };

        const handleRoutePathUpdate = (event: Event) => {
            const data = (event as CustomEvent).detail;
            if (data?.path) {
                setRescueRoute({
                    coordinates: data.path,
                    start: data.path[0],
                    dest: data.path[data.path.length - 1],
                });
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "rescue:latest-tracking-update") {
                if (e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        setRescueTracking(parsed);
                        if (parsed.lat && parsed.lng) {
                            setRescueTrackingPath(prev => {
                                const nextPoint = { lat: parsed.lat, lng: parsed.lng, remainingKm: parsed.remainingKm };
                                const lastPoint = prev[prev.length - 1];
                                if (lastPoint?.lat === nextPoint.lat && lastPoint?.lng === nextPoint.lng) {
                                    return prev;
                                }
                                return [...prev, nextPoint];
                            });
                        }
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    setRescueTracking(null);
                }
            } else if (e.key === "rescue:latest-route-path") {
                if (e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        setRescueRoute({
                            coordinates: parsed,
                            start: parsed[0],
                            dest: parsed[parsed.length - 1],
                        });
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    setRescueRoute(null);
                }
            }
        };

        window.addEventListener("rescue-tracking-update", handleTrackingUpdate);
        window.addEventListener("rescue-route-path-update", handleRoutePathUpdate);
        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("rescue-tracking-update", handleTrackingUpdate);
            window.removeEventListener("rescue-route-path-update", handleRoutePathUpdate);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    // 1. TỰ ĐỘNG LẤY VỊ TRÍ NGAY KHI LOAD TRANG
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Lỗi lấy vị trí GPS:", error);
                    showToast('warning', 'ĐỊNH VỊ GPS', 'Không thể tự động lấy vị trí của bạn. Vui lòng cấp quyền truy cập vị trí!');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            showToast('danger', 'HỖ TRỢ GPS', 'Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS.');
        }
    }, []);

    // 2. HÀM TÌM KIẾM ĐƯỜNG ĐI
    const handleFindShelter = async () => {
        // Kiểm tra xem đã có vị trí chưa (nếu mạng/GPS chậm chưa lấy kịp)
        if (!userLocation) {
            showToast('warning', 'ĐỊNH VỊ CHƯA SẴN SÀNG', 'Đang xác định vị trí GPS của bạn, vui lòng đợi vài giây.');
            return;
        }

        setLoading(true);
        try {
            // Dùng luôn userLocation đã lấy được từ useEffect, không cần gọi lại geolocation
            const result = await ApiClient.findSafeShelters({
                currentLat: userLocation.lat,
                currentLng: userLocation.lng,
                strategy: 'safety'
            });

            if (result.code === 200 && result.data?.options) {
                setOptions(result.data.options);
                setSelectedIndex(0);
                showToast('info', 'DÒ QUÉT THÀNH CÔNG', 'Đã tìm thấy 3 điểm trú ẩn an toàn nhất xung quanh.');
            } else {
                showToast('warning', 'KẾT QUẢ TÌM KIẾM', result.data?.message || "Không tìm thấy đường đi an toàn.");
            }
        } catch (error: any) {
            console.error("Error finding shelter:", error);
            const errorMsg = error?.message || "Lỗi kết nối đến máy chủ hệ thống.";
            showToast('danger', 'LỖI HỆ THỐNG', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col md:flex-row bg-slate-950 text-slate-100">
            <ToastContainer />
            {/* Cột trái: UI Điều khiển & Danh sách 3 Options */}
            <div className="w-full md:w-96 h-[45%] md:h-full p-4 md:p-6 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 z-10 flex flex-col overflow-y-auto shrink-0 shadow-2xl">
                <div className="space-y-1 mb-4">
                    <h1 className="text-xl md:text-2xl font-black text-red-500 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        Sơ Tán Khẩn Cấp
                    </h1>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Hệ thống AI dò tìm 3 điểm trú ẩn an toàn nhất, tránh vùng ngập và sạt lở quanh vị trí của bạn.
                    </p>
                </div>

                <button
                    onClick={handleFindShelter}
                    disabled={loading || !userLocation}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold rounded-xl mb-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-900/20 active:scale-95"
                >
                    {loading ? 'Đang dò quét Radar...' : (!userLocation ? 'Đang dò GPS...' : 'TÌM ĐIỂM SƠ TÁN NGAY')}
                </button>

                <div className="flex-1 flex flex-col gap-3">
                    {options.length > 0 ? (
                        options.map((opt, index) => (
                            <div
                                key={opt.destination.id}
                                onClick={() => setSelectedIndex(index)}
                                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                                    selectedIndex === index
                                        ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-950/30'
                                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                        Lựa chọn {index + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                        index === 0 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                        {index === 0 ? 'Khuyên dùng' : 'Tùy chọn'}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-100 text-sm mb-1">{opt.destination.name}</h4>
                                <p className="text-xs text-slate-400">
                                    Sức chứa còn lại: <span className="font-black text-emerald-400">{opt.destination.available_capacity} chỗ</span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 border border-dashed border-slate-800 rounded-xl p-5 bg-slate-950/20 flex flex-col justify-center space-y-4">
                            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider text-center">
                                Hướng dẫn sơ tán khẩn cấp
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex gap-2">
                                    <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold shrink-0">1</span>
                                    <p className="text-slate-450 leading-relaxed">
                                        Đứng ở nơi cao ráo và bấm nút <strong>TÌM ĐIỂM SƠ TÁN</strong> phía trên.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">2</span>
                                    <p className="text-slate-450 leading-relaxed">
                                        Xem 3 điểm trú ẩn gần nhất do bản đồ đề xuất (ưu tiên lựa chọn 1 khuyên dùng).
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">3</span>
                                    <p className="text-slate-450 leading-relaxed">
                                        Di chuyển khẩn cấp theo cung đường được vẽ trên bản đồ để đảm bảo tránh ngập úng.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="flex-1 h-[55%] md:h-full relative">
                <EvacuationMap
                    userLocation={userLocation}
                    options={options}
                    selectedIndex={selectedIndex}
                    rescueTracking={rescueTracking}
                    rescueTrackingPath={rescueTrackingPath}
                    rescueRoute={rescueRoute}
                />
            </div>
        </div>
    );
}
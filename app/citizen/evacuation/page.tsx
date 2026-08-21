'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ApiClient } from '@/lib/ApiClient';
import { EvacuationOption } from '@/lib/Model';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import { getDistanceToPolyline } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { isDemoQrSession, watchEffectiveLocation } from '@/lib/effectiveLocation';

const EvacuationMap = dynamic(() => import('@/components/ui/EvacuationMap'), { ssr: false });

export default function EvacuationPage() {
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [options, setOptions] = useState<EvacuationOption[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [rescueTracking, setRescueTracking] = useState<any>(null);
    const [rescueRoute, setRescueRoute] = useState<any>(null);
    const [rescueTrackingPath, setRescueTrackingPath] = useState<any[]>([]);
    const [mapMode, setMapMode] = useState<'evacuation' | 'rescue'>('evacuation');
    const [hasActiveSos, setHasActiveSos] = useState<boolean>(false);
    
    const [panelHeight, setPanelHeight] = useState(350);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkIsMySos = (data: any) => {
            if (!data) return false;
            const mySosId = localStorage.getItem('sos:my_sos_id');
            const myPhone = localStorage.getItem('sos:my_phone');
            if (!mySosId && !myPhone) return false;
            return !!(
                (mySosId && (String(data.sosId) === String(mySosId) || String(data.missionId) === String(mySosId) || String(data.entityId) === String(mySosId))) ||
                (myPhone && (data.message?.includes(myPhone) || String(data.entityId) === String(myPhone)))
            );
        };
        const loadLatestTracking = () => {
            const mySosId = localStorage.getItem('sos:my_sos_id');
            const myPhone = localStorage.getItem('sos:my_phone');
            const hasSos = !!(mySosId || myPhone);
            setHasActiveSos(hasSos);
            if (!hasSos) { setRescueTracking(null); setRescueRoute(null); setRescueTrackingPath([]); return; }
            const storedTracking = localStorage.getItem("rescue:latest-tracking-update");
            let parsedTracking: any = null;
            if (storedTracking) {
                try {
                    const parsed = JSON.parse(storedTracking);
                    if (checkIsMySos(parsed)) { parsedTracking = parsed; setRescueTracking(parsed); } else { setRescueTracking(null); }
                } catch { setRescueTracking(null); }
            }
            let storedRoutePath = mySosId ? localStorage.getItem(`rescue:route-path:${mySosId}`) : null;
            if (!storedRoutePath) storedRoutePath = localStorage.getItem("rescue:latest-route-path");
            if (storedRoutePath) {
                try {
                    const parsed = JSON.parse(storedRoutePath);
                    if (mySosId || parsedTracking) { setRescueRoute({ coordinates: parsed, start: parsed[0], dest: parsed[parsed.length - 1] }); } else { setRescueRoute(null); }
                } catch { setRescueRoute(null); }
            }
        };
        loadLatestTracking();
        const handleTrackingUpdate = (event: Event) => {
            const data = (event as CustomEvent).detail;
            if (!checkIsMySos(data)) return;
            setRescueTracking(data);
            if (data?.lat && data?.lng) {
                setRescueTrackingPath(prev => {
                    const nextPoint = { lat: data.lat, lng: data.lng, remainingKm: data.remainingKm };
                    const lastPoint = prev[prev.length - 1];
                    if (lastPoint?.lat === nextPoint.lat && lastPoint?.lng === nextPoint.lng) return prev;
                    return [...prev, nextPoint];
                });
            }
        };
        const handleRoutePathUpdate = (event: Event) => {
            const data = (event as CustomEvent).detail;
            const mySosId = localStorage.getItem('sos:my_sos_id');
            if (mySosId && String(data?.missionId) === String(mySosId) && data?.path) {
                setRescueRoute({ coordinates: data.path, start: data.path[0], dest: data.path[data.path.length - 1] });
            }
        };
        const handleSosSent = () => setHasActiveSos(true);
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "sos:my_sos_id" || e.key === "sos:my_phone") {
                const hasSos = !!(localStorage.getItem('sos:my_sos_id') || localStorage.getItem('sos:my_phone'));
                setHasActiveSos(hasSos);
                if (!hasSos) { setRescueTracking(null); setRescueRoute(null); setRescueTrackingPath([]); }
            }
        };
        window.addEventListener("rescue-tracking-update", handleTrackingUpdate);
        window.addEventListener("rescue-route-path-update", handleRoutePathUpdate);
        window.addEventListener("sos-sent", handleSosSent);
        window.addEventListener("storage", handleStorageChange);
        return () => {
            window.removeEventListener("rescue-tracking-update", handleTrackingUpdate);
            window.removeEventListener("rescue-route-path-update", handleRoutePathUpdate);
            window.removeEventListener("sos-sent", handleSosSent);
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const lastRerouteTimeRef = useRef<number>(0);
    const rerouteCooldownMs = 15000;

    const hasAttemptedFetch = useRef(false);

    useEffect(() => {
        const stopWatching = watchEffectiveLocation(
                (location) => {
                    let lat = location.lat;
                    let lng = location.lng;
                    
                    // Giả lập đưa về Bát Xát nếu thiết bị đang test ở địa phương khác
                    if (location.source === 'DEVICE_GPS' && (lat < 22.0 || lat > 23.0 || lng < 103.0 || lng > 105.0)) {
                        lat = 22.6105; 
                        lng = 103.8012;
                    }
                    
                    setUserLocation(prev => {
                        if (prev && prev.lat === lat && prev.lng === lng) return prev;
                        return { lat, lng };
                    });
                },
                (error) => {
                    if (isDemoQrSession()) {
                        showToast('danger', 'VỊ TRÍ TRÌNH DIỄN', error.message);
                        return;
                    }
                    showToast('warning', 'ĐỊNH VỊ GPS', 'Không thể tự động lấy vị trí. Đã dùng UBND huyện Bát Xát làm mặc định.');
                    setUserLocation(prev => prev || { lat: 22.6105, lng: 103.8012 });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        return stopWatching;
    }, []);

    // Tự động tìm kiếm điểm trú ẩn an toàn nhất khi có tọa độ vị trí (GPS hoặc mặc định)
    useEffect(() => {
        if (userLocation && options.length === 0 && !loading && !hasAttemptedFetch.current) {
            hasAttemptedFetch.current = true;
            handleFindShelter();
        }
    }, [userLocation, options.length, loading]);

    // Tái định tuyến sơ tán tự động (Auto-Rerouting) khi đi chệch khỏi tuyến đang chọn > 30m
    useEffect(() => {
        if (!userLocation || options.length === 0) return;

        const currentOpt = options[selectedIndex];
        if (!currentOpt || !currentOpt.route_coordinates || currentOpt.route_coordinates.length === 0) return;

        const dist = getDistanceToPolyline(userLocation.lat, userLocation.lng, currentOpt.route_coordinates);
        
        if (dist > 30) {
            const now = Date.now();
            if (now - lastRerouteTimeRef.current > rerouteCooldownMs) {
                lastRerouteTimeRef.current = now;
                showToast('warning', 'TÁI ĐỊNH TUYẾN TỰ ĐỘNG', 'Bạn đi chệch khỏi lộ trình sơ tán > 30m. Đang dò lại đường đi an toàn mới.');

                const triggerRerouting = async () => {
                    try {
                        const result = await ApiClient.findSafeShelters({ 
                            currentLat: userLocation.lat, 
                            currentLng: userLocation.lng, 
                            strategy: 'safety' 
                        });
                        if (result.code === 200 && result.data?.options) {
                            setOptions(result.data.options);
                            // Cố gắng giữ nguyên shelter cũ đang chọn nếu nó vẫn có trong kết quả mới
                            const oldShelterId = currentOpt.destination.id;
                            const newIdx = result.data.options.findIndex((opt: any) => opt.destination.id === oldShelterId);
                            setSelectedIndex(newIdx !== -1 ? newIdx : 0);
                            showToast('info', 'ĐÃ CẬP NHẬT LỘ TRÌNH', 'Đã tải lộ trình sơ tán an toàn mới từ vị trí hiện tại.');
                        }
                    } catch (e) {
                        console.error("Tái định tuyến sơ tán thất bại", e);
                    }
                };
                triggerRerouting();
            }
        }
    }, [userLocation, options, selectedIndex]);

    const handleFindShelter = async () => {
        if (!userLocation) { showToast('warning', 'ĐỊNH VỊ CHƯA SẴN SÀNG', 'Đang xác định vị trí GPS, vui lòng đợi vài giây.'); return; }
        setLoading(true);
        try {
            const result = await ApiClient.findSafeShelters({ currentLat: userLocation.lat, currentLng: userLocation.lng, strategy: 'safety' });
            if (result.code === 200 && result.data?.options) {
                setOptions(result.data.options);
                setSelectedIndex(0);
                showToast('info', 'DÒ QUÉT THÀNH CÔNG', 'Đã tìm thấy 3 điểm trú ẩn an toàn nhất xung quanh.');
                setPanelHeight(Math.floor(window.innerHeight * 0.45));
            } else {
                showToast('warning', 'KẾT QUẢ TÌM KIẾM', result.data?.message || "Không tìm thấy đường đi an toàn.");
            }
        } catch (error: any) {
            showToast('danger', 'LỖI HỆ THỐNG', error?.message || "Lỗi kết nối đến máy chủ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    const ShelterList = ({ onSelect }: { onSelect?: () => void }) => (
        <>
            {options.length > 0 ? options.map((opt, index) => (
                <div key={opt.destination.id} onClick={() => { setSelectedIndex(index); onSelect?.(); }}
                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedIndex === index ? 'border-red-500 bg-red-950/20 shadow-lg shadow-red-950/30' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Lựa chọn {index + 1}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${index === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{index === 0 ? 'Khuyên dùng' : 'Tùy chọn'}</span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-sm mb-0.5">{opt.destination.name}</h4>
                    <p className="text-xs text-slate-400">Sức chứa còn lại: <span className="font-black text-emerald-400">{opt.destination.available_capacity} chỗ</span></p>
                </div>
            )) : (
                <div className="border border-dashed border-slate-800 rounded-xl p-5 bg-slate-950/20 space-y-3">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider text-center">Hướng dẫn sơ tán</h3>
                    {[{ n: 1, t: 'Đứng ở nơi cao ráo và bấm nút TÌM ĐIỂM SƠ TÁN.' }, { n: 2, t: 'Xem 3 điểm trú ẩn gần nhất (ưu tiên lựa chọn 1).' }, { n: 3, t: 'Di chuyển theo cung đường trên bản đồ để tránh ngập.' }].map(({ n, t }) => (
                        <div key={n} className="flex gap-2 text-xs"><span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold shrink-0">{n}</span><p className="text-slate-400 leading-relaxed">{t}</p></div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div className="relative w-full h-full bg-slate-950 text-slate-100">
            <ToastContainer />

            {/* Bản đồ luôn full màn hình */}
            <div className="absolute inset-0">
                {!!(rescueRoute || rescueTracking || hasActiveSos) && (
                    <div className="absolute top-4 left-4 z-[1000] flex gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
                        <button type="button" onClick={() => setMapMode('evacuation')} className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${mapMode === 'evacuation' ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}>Sơ tán</button>
                        <button type="button" onClick={() => setMapMode('rescue')} className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${mapMode === 'rescue' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}>Cứu hộ</button>
                    </div>
                )}
                <EvacuationMap userLocation={userLocation} options={options} selectedIndex={selectedIndex} rescueTracking={rescueTracking} rescueTrackingPath={rescueTrackingPath} rescueRoute={rescueRoute} mapMode={mapMode} />
            </div>

            {/* Desktop: Sidebar trái cố định */}
            <div className="absolute top-0 left-0 z-10 hidden h-full min-h-0 w-96 flex-col overflow-hidden border-r border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur md:flex">
                <div className="space-y-1 mb-4">
                    <h1 className="text-2xl font-black text-red-500 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        Sơ Tán Khẩn Cấp
                    </h1>
                    <p className="text-xs text-slate-400 leading-relaxed">Hệ thống AI dò tìm 3 điểm trú ẩn an toàn nhất, tránh vùng ngập và sạt lở quanh vị trí của bạn.</p>
                </div>
                <button onClick={handleFindShelter} disabled={loading || !userLocation} className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold rounded-xl mb-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-95">
                    {loading ? 'Đang dò quét Radar...' : (!userLocation ? 'Đang dò GPS...' : 'TÌM ĐIỂM SƠ TÁN NGAY')}
                </button>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"><ShelterList /></div>
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
                    <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-black text-red-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                Sơ Tán Khẩn Cấp
                            </h1>
                            <span className="text-[10px] text-slate-500">{userLocation ? '✓ GPS sẵn sàng' : '⏳ Đang dò GPS...'}</span>
                        </div>
                        <button onClick={handleFindShelter} disabled={loading || !userLocation} className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold rounded-xl transition-all disabled:opacity-40 active:scale-95">
                            {loading ? 'Đang dò quét Radar...' : 'TÌM ĐIỂM SƠ TÁN NGAY'}
                        </button>
                        <ShelterList onSelect={() => setPanelHeight(60)} />
                    </div>
                )}
            </div>
        </div>
    );
}

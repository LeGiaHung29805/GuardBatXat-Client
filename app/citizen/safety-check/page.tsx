'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ApiClient } from '@/lib/ApiClient';
import { LocationCheckResponse, NeighborhoodSafetyResponse, NeighborhoodBuilding } from '@/lib/Model';
import 'leaflet/dist/leaflet.css';
import websocket from '@/app/commander/utils/websocket';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import { ShieldCheck, Siren, Waves, HelpCircle, Building2, MapPin, Eye, ChevronUp, ChevronDown } from 'lucide-react';

// Load Leaflet elements dynamically to avoid SSR errors
const BatXatBoundaryMap = dynamic(() => import('@/components/ui/BatXatBoundaryMap'), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });

const MapAutoCenter = dynamic(
    () => import('react-leaflet').then((mod) => {
        return function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
            const map = mod.useMap();
            useEffect(() => {
                if (lat && lng) {
                    map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
                }
            }, [lat, lng, map]);
            return null;
        };
    }),
    { ssr: false }
);

// Helper function to parse WKT POLYGON/MULTIPOLYGON strings into Leaflet polygon coordinate arrays
function parseWktToCoords(wkt: string): [number, number][] {
    if (!wkt) return [];
    try {
        const clean = wkt.replace(/MULTIPOLYGON\s*\(\(\(|\)\)\)/gi, '')
                         .replace(/POLYGON\s*\(\(|\)\)/gi, '')
                         .replace(/\(/g, '')
                         .replace(/\)/g, '');
        const points = clean.split(',');
        return points.map(p => {
            const parts = p.trim().split(/\s+/);
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            return [lat, lng] as [number, number];
        }).filter((coord): coord is [number, number] => !isNaN(coord[0]) && !isNaN(coord[1]));
    } catch (e) {
        console.error("Lỗi parse WKT:", e, wkt);
        return [];
    }
}

export default function SafetyCheckPage() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LocationCheckResponse | null>(null);
    const [neighborhood, setNeighborhood] = useState<NeighborhoodSafetyResponse | null>(null);
    const [markerIcon, setMarkerIcon] = useState<any>(null);
    const [currentLoc, setCurrentLoc] = useState<{ lat: number, lng: number } | null>(null);
    
    // Personal Flood Simulator Level State (meters)
    const [simulatedWaterLevel, setSimulatedWaterLevel] = useState<number>(0.0);
    const [showNeighborhoodDetails, setShowNeighborhoodDetails] = useState<boolean>(true);

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

    // Initial setup
    useEffect(() => {
        let isMounted = true;

        // Initialize User Location Icon
        import('leaflet').then((L) => {
            if (!isMounted) return;
            const customIcon = L.divIcon({
                className: 'bg-transparent border-none',
                html: `
                <div class="relative flex h-6 w-6 items-center justify-center">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
                </div>
            `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
            setMarkerIcon(customIcon);
        });

        // Fetch location GPS on start
        if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isMounted) {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setCurrentLoc({ lat, lng });
                        fetchSafetyAndNeighborhood(lat, lng, 0.0);
                    }
                },
                (error) => {
                    console.warn("Lỗi lấy GPS tự động:", error.message);
                    if (isMounted) setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }

        return () => { isMounted = false; };
    }, []);

    const currentLocRef = useRef(currentLoc);
    useEffect(() => {
        currentLocRef.current = currentLoc;
    }, [currentLoc]);

    // WebSocket subscription for alerts
    useEffect(() => {
        const token = localStorage.getItem("token") || "guest";
        websocket.connect(token);

        websocket.subscribe("/topic/safety-alerts", (data: LocationCheckResponse) => {
            if (data.alertLevel === 'DANGER' || data.alertLevel === 'WARNING') {
                showToast(
                    data.alertLevel === 'DANGER' ? 'danger' : 'warning',
                    'CẢNH BÁO RỦI RO THỜI GIAN THỰC',
                    data.message
                );
            }
            if (currentLocRef.current && data.alertLevel === 'DANGER') {
                setResult(data);
            }
        });

        return () => {
            websocket.unsubscribe("/topic/safety-alerts");
        };
    }, []);

    // Fetch data handler
    const fetchSafetyAndNeighborhood = async (lat: number, lng: number, waterLevel: number) => {
        setLoading(true);
        try {
            const [safetyRes, neighborhoodRes] = await Promise.all([
                ApiClient.checkSafety({ latitude: lat, longitude: lng, waterLevel }),
                ApiClient.checkNeighborhood({ latitude: lat, longitude: lng, waterLevel })
            ]);

            if (safetyRes.code === 200) setResult(safetyRes.data);
            if (neighborhoodRes.code === 200) setNeighborhood(neighborhoodRes.data);
        } catch (error: any) {
            console.error("Lỗi lấy dữ liệu an toàn:", error);
            showToast('danger', 'LỖI HỆ THỐNG', error.message || 'Không thể kết nối đến máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    const handleUseGPS = () => {
        setLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setCurrentLoc({ lat, lng });
                    fetchSafetyAndNeighborhood(lat, lng, simulatedWaterLevel);
                },
                () => {
                    showToast('warning', 'LỖI GPS', 'Không thể lấy định vị GPS. Vui lòng cấp quyền vị trí trên trình duyệt.');
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            showToast('danger', 'HỖ TRỢ GPS', 'Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS.');
            setLoading(false);
        }
    };

    const handleSearchAddress = async () => {
        if (!address) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}+Bat+Xat+Lao+Cai`);
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setCurrentLoc({ lat, lng });
                fetchSafetyAndNeighborhood(lat, lng, simulatedWaterLevel);
            } else {
                showToast('warning', 'ĐỊA CHỈ KHÔNG TÌM THẤY', 'Không tìm thấy địa chỉ này tại Bát Xát, Lào Cai.');
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    // Re-trigger analysis when simulation water level slider stops moving / is updated
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setSimulatedWaterLevel(val);
    };

    const handleSliderRelease = () => {
        if (currentLoc) {
            fetchSafetyAndNeighborhood(currentLoc.lat, currentLoc.lng, simulatedWaterLevel);
        }
    };

    const renderLeftPanelContent = () => (
        <>
            <div>
                <h1 className="text-xl md:text-2xl font-black text-emerald-400 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" /> Tra Cứu An Toàn
                </h1>
                <p className="text-xs text-slate-400">
                    Phân tích rủi ro ngập lụt, sạt lở & đánh giá mức độ an toàn vùng lân cận công trình.
                </p>
            </div>

            {/* Tìm kiếm */}
            <div className="flex gap-2 shrink-0">
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nhập tên đường, thôn, xã..."
                    className="flex-1 p-2.5 bg-slate-950 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button
                    onClick={handleSearchAddress}
                    disabled={loading}
                    className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                    Tìm
                </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={handleUseGPS}
                    disabled={loading}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                    Dùng vị trí GPS của tôi
                </button>
            </div>

            {/* Slider Giả Lập Ngập Lụt Cá Nhân */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-blue-400 animate-pulse" /> Giả lập ngập lụt cá nhân
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-mono text-xs font-bold">
                        +{simulatedWaterLevel.toFixed(1)}m nước dâng
                    </span>
                </div>
                <input
                    type="range"
                    min="0.0"
                    max="5.0"
                    step="0.1"
                    value={simulatedWaterLevel}
                    onChange={handleSliderChange}
                    onMouseUp={handleSliderRelease}
                    onTouchEnd={handleSliderRelease}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold font-mono">
                    <span>0.0m (Bình thường)</span>
                    <span>2.5m (Lũ vừa)</span>
                    <span>5.0m (Lũ lịch sử)</span>
                </div>
            </div>

            {loading && (
                <div className="text-center font-bold text-xs text-emerald-400 animate-pulse my-2 shrink-0">
                    Đang phân tích địa hình & chạy mô phỏng ngập lụt...
                </div>
            )}

            {/* Kết quả phân tích tại điểm chính */}
            {result && !loading && (
                <div className="animate-fade-in-up space-y-4 flex-1 overflow-y-auto">
                    <div className={`p-4 rounded-xl border shadow-lg transition-all ${
                        result.alertLevel === 'DANGER' 
                            ? 'bg-red-950/20 border-red-500/40 text-red-400' 
                            : result.alertLevel === 'WARNING' 
                                ? 'bg-amber-950/20 border-amber-500/40 text-amber-400' 
                                : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    }`}>
                        <div className="flex items-center gap-2 mb-1">
                            {result.alertLevel === 'DANGER' && <Siren className="w-5 h-5 animate-bounce" />}
                            <h2 className="text-md font-black">
                                Vị trí: {result.alertLevel === 'DANGER' ? 'NGUY HIỂM CỰC ĐỘ' : result.alertLevel === 'WARNING' ? 'CẦN CHÚ Ý' : 'AN TOÀN'}
                            </h2>
                        </div>
                        <p className="text-slate-350 text-xs leading-relaxed">{result.message}</p>
                    </div>

                    {/* Vùng lân cận (Neighborhood) */}
                    {neighborhood && (
                        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-emerald-400" /> Vùng lân cận (Bán kính 200m)
                                </span>
                                <button
                                    onClick={() => setShowNeighborhoodDetails(!showNeighborhoodDetails)}
                                    className="text-[10px] text-emerald-400 font-extrabold hover:underline"
                                >
                                    {showNeighborhoodDetails ? 'Ẩn bớt' : 'Xem chi tiết'}
                                </button>
                            </div>

                            {showNeighborhoodDetails && (
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Tổng số tòa nhà:</span>
                                        <span className="text-slate-200 font-bold font-mono text-sm">{neighborhood.totalBuildings}</span>
                                    </div>
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Tòa nhà nguy hiểm:</span>
                                        <span className="text-red-400 font-bold font-mono text-sm">{neighborhood.dangerBuildings}</span>
                                    </div>
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Cao độ trung bình:</span>
                                        <span className="text-emerald-400 font-bold font-mono text-sm">{neighborhood.averageElevation}m</span>
                                    </div>
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Độ sâu ngập lớn nhất:</span>
                                        <span className="text-red-400 font-bold font-mono text-sm">{neighborhood.maxFloodDepth}m</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chi tiết vật lý & dự báo công trình chính */}
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <span className="text-slate-400">Loại công trình:</span>
                        <span className="text-slate-200 font-semibold text-right">{result.buildingType}</span>
                        
                        <span className="text-slate-400">Độ cao mặt đất:</span>
                        <span className="text-emerald-400 font-bold text-right font-mono">{result.currentElevation} m</span>

                        <span className="text-slate-400">Khoảng cách đến sông ngòi:</span>
                        <span className="text-slate-200 font-semibold text-right font-mono">
                            {result.distanceToWater > 0 ? `${result.distanceToWater.toFixed(1)} m` : 'N/A'}
                        </span>

                        <span className="text-slate-400">Ngập sâu dự báo:</span>
                        <span className={`font-bold text-right font-mono ${result.floodDepth > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {result.floodDepth} m
                        </span>
                        
                        <span className="text-slate-400">Nguy cơ sạt lở đất:</span>
                        <span className={`font-bold text-right font-mono ${
                            result.landslideRiskStatus === 'HIGH' ? 'text-red-400' : result.landslideRiskStatus === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            {result.landslideRiskStatus === 'HIGH' ? '⚠️ Nguy cơ Cao' : result.landslideRiskStatus === 'WARNING' ? '⚠️ Cần chú ý' : '✓ An toàn'}
                        </span>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="flex h-full w-full bg-slate-950 text-slate-100 relative">
            <ToastContainer />
            
            {/* Desktop: Sidebar trái cố định */}
            <div className="hidden md:flex absolute top-0 left-0 h-full w-[480px] p-6 bg-slate-900/95 backdrop-blur border-r border-slate-800 z-10 overflow-y-auto flex-col shrink-0 shadow-2xl space-y-4">
                {renderLeftPanelContent()}
            </div>

            {/* Mobile: Bottom sheet kéo lên xuống */}
            <div
                className="md:hidden absolute bottom-0 left-0 right-0 bg-slate-900/97 backdrop-blur border-t border-slate-700 z-20 flex flex-col transition-all duration-75 ease-out"
                style={{ height: `${panelHeight}px`, borderRadius: '20px 20px 0 0' }}
            >
                {/* Drag handle */}
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
                    <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">
                        {renderLeftPanelContent()}
                    </div>
                )}
            </div>

            {/* Bản đồ: full màn hình (dưới panel) */}
            <div className="absolute inset-0 z-0 bg-slate-950">
                <BatXatBoundaryMap>
                    {currentLoc && <MapAutoCenter lat={currentLoc.lat} lng={currentLoc.lng} />}

                    {/* Vị trí trung tâm tra cứu */}
                    {currentLoc && markerIcon && (
                        <Marker position={[currentLoc.lat, currentLoc.lng]} icon={markerIcon}>
                            <Popup>
                                <div className="text-center font-bold text-slate-900 text-xs">
                                    Vị trí tra cứu <br />
                                    <span className="text-[10px] text-gray-500 font-mono">[{currentLoc.lat.toFixed(5)}, {currentLoc.lng.toFixed(5)}]</span>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Render đa giác các tòa nhà xung quanh vùng lân cận */}
                    {neighborhood?.buildings?.map((b: NeighborhoodBuilding) => {
                        const coords = parseWktToCoords(b.geomWkt);
                        if (coords.length === 0) return null;

                        const color = b.alertLevel === 'DANGER' 
                            ? '#ef4444' 
                            : b.alertLevel === 'WARNING' 
                                ? '#f59e0b' 
                                : '#10b981';

                        return (
                            <Polygon 
                                key={b.id} 
                                positions={coords} 
                                pathOptions={{
                                    color: color,
                                    weight: 2,
                                    fillColor: color,
                                    fillOpacity: 0.4
                                }}
                            >
                                <Popup>
                                    <div className="text-slate-900 text-xs space-y-1">
                                        <div className="font-extrabold border-b pb-1 text-slate-800">
                                            {b.buildingType === 'Private House' ? 'Nhà dân' : 'Công trình công cộng'} #{b.id}
                                        </div>
                                        <div>Cao độ: <b>{b.elevationZ}m</b></div>
                                        <div>Độ sâu ngập: <b className={b.floodDepth > 0 ? 'text-red-600' : 'text-emerald-600'}>{b.floodDepth}m</b></div>
                                        <div>Nguy cơ sạt lở: <b>{(b.aiLandslideProb * 100).toFixed(0)}%</b></div>
                                        <div className="pt-1">
                                            Trạng thái: 
                                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white ${
                                                b.alertLevel === 'DANGER' ? 'bg-red-500' : b.alertLevel === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}>
                                                {b.alertLevel === 'DANGER' ? 'NGUY HIỂM' : b.alertLevel === 'WARNING' ? 'CHÚ Ý' : 'AN TOÀN'}
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Polygon>
                        );
                    })}
                </BatXatBoundaryMap>
            </div>
        </div>
    );
}
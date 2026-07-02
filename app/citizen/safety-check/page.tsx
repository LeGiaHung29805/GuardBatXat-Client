'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ApiClient } from '@/lib/ApiClient';
import { LocationCheckResponse, NeighborhoodSafetyResponse, NeighborhoodBuilding } from '@/lib/Model';
import 'leaflet/dist/leaflet.css';
import websocket from '@/app/commander/utils/websocket';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import { ShieldCheck, Siren, Waves, HelpCircle, Building2, MapPin, Eye } from 'lucide-react';

const dynamicImport = (path: string, options: any) => {
    return require('next/dynamic')(() => import(`react-leaflet`).then((mod: any) => mod[path]), options);
};

// Load Leaflet elements dynamically to avoid SSR errors
const BatXatBoundaryMap = require('next/dynamic')(() => import('@/components/ui/BatXatBoundaryMap'), { ssr: false });
const Marker = require('next/dynamic')(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = require('next/dynamic')(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polygon = require('next/dynamic')(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });

const MapAutoCenter = require('next/dynamic')(
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
            if (currentLoc && data.alertLevel === 'DANGER') {
                setResult(data);
            }
        });

        return () => {
            websocket.disconnect();
        };
    }, [currentLoc]);

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

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-slate-950 text-slate-100 relative">
            <ToastContainer />
            
            {/* Cột trái: Bảng điều khiển */}
            <div className="w-full md:w-[480px] h-[55%] md:h-full p-4 md:p-6 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 z-10 overflow-y-auto flex flex-col shrink-0 shadow-2xl space-y-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-emerald-400 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" /> Tra Cứu An Toàn
                    </h1>
                    <p className="text-xs text-slate-400">
                        Phân tích rủi ro ngập lụt, sạt lở & đánh giá mức độ an toàn vùng lân cận công trình.
                    </p>
                </div>

                {/* Tìm kiếm */}
                <div className="flex gap-2">
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

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUseGPS}
                        disabled={loading}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                    >
                        Dùng vị trí GPS của tôi
                    </button>
                </div>

                {/* Slider Giả Lập Ngập Lụt Cá Nhân */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
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
                    <div className="text-center font-bold text-xs text-emerald-400 animate-pulse my-2">
                        Đang phân tích địa hình & chạy mô phỏng ngập lụt...
                    </div>
                )}

                {/* Kết quả phân tích tại điểm chính */}
                {result && !loading && (
                    <div className="animate-fade-in-up space-y-4">
                        <div className={`p-4 rounded-xl border shadow-lg transition-all ${
                            result.alertLevel === 'DANGER' 
                                ? 'bg-red-950/20 border-red-500/40 text-red-400' 
                                : result.alertLevel === 'WARNING' 
                                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-400' 
                                    : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                        }`}>
                            <div className="flex justify-between items-start mb-1">
                                <h2 className="text-md font-black">
                                    Vị trí chọn: {result.alertLevel === 'DANGER' ? 'NGUY HIỂM CỰC ĐỘ' : result.alertLevel === 'WARNING' ? 'CẦN CHÚ Ý' : 'AN TOÀN'}
                                </h2>
                            </div>
                            <p className="text-slate-300 text-xs font-medium mb-3 leading-relaxed">{result.message}</p>

                            {result.alertLevel === 'DANGER' && (
                                <Link href="/citizen/evacuation">
                                    <button className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95">
                                        TÌM ĐƯỜNG SƠ TÁN KHẨN CẤP NGAY
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Thước đo mức độ nguy hiểm trực quan */}
                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                            <span className="font-extrabold text-xs text-slate-350 block">
                                📊 Đánh Giá Mức Độ Nguy Hiểm Tổng Thể
                            </span>
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between text-[10px] font-semibold">
                                    <span className="text-emerald-400 font-bold">An Toàn</span>
                                    <span className="text-amber-400 font-bold">Chú Ý</span>
                                    <span className="text-red-500 font-bold">Nguy Hiểm</span>
                                </div>
                                <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-800 relative border border-slate-750">
                                    <div style={{ width: '33.33%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div>
                                    <div style={{ width: '33.33%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"></div>
                                    <div style={{ width: '33.34%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-600"></div>
                                    
                                    {/* Kim chỉ thị vị trí */}
                                    <div 
                                        style={{ 
                                            left: `${Math.min(100, Math.max(0, 
                                                result.alertLevel === 'DANGER' ? 85 : result.alertLevel === 'WARNING' ? 50 : 15
                                            ))}%` 
                                        }} 
                                        className="absolute top-0 bottom-0 w-2.5 bg-white border border-slate-950 transform -translate-x-1/2 rounded shadow-md"
                                    ></div>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-450 text-center leading-relaxed font-medium">
                                Phân tích tại vị trí: <span className={`font-black ${
                                    result.alertLevel === 'DANGER' ? 'text-red-400' : result.alertLevel === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                    {result.alertLevel === 'DANGER' ? '⚠️ NGUY HIỂM KHẨN CẤP' : result.alertLevel === 'WARNING' ? '⚠️ CẦN CHÚ Ý THEO DÕI' : '✓ AN TOÀN BÌNH THƯỜNG'}
                                </span>
                            </div>
                        </div>

                        {/* Thông tin vùng lân cận */}
                        {neighborhood && (
                            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-xs text-slate-300 flex items-center gap-1">
                                        <Building2 className="w-4 h-4 text-emerald-400" /> Khu vực xung quanh (bán kính 500m)
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {neighborhood.totalBuildings} công trình
                                    </span>
                                </div>

                                {/* Báo cáo số liệu dạng badge */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2 text-center">
                                        <div className="text-md font-black text-emerald-400">{neighborhood.safeBuildings}</div>
                                        <div className="text-[9px] text-slate-400 uppercase font-bold">An toàn</div>
                                    </div>
                                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2 text-center">
                                        <div className="text-md font-black text-amber-400">{neighborhood.warningBuildings}</div>
                                        <div className="text-[9px] text-slate-400 uppercase font-bold">Chú ý</div>
                                    </div>
                                    <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2 text-center">
                                        <div className="text-md font-black text-red-400">{neighborhood.dangerBuildings}</div>
                                        <div className="text-[9px] text-slate-400 uppercase font-bold">Nguy hiểm</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Độ cao đất trung bình:</span>
                                        <span className="text-slate-200 font-bold font-mono text-sm">{neighborhood.averageElevation}m</span>
                                    </div>
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                                        <span className="text-slate-400 block text-[10px]">Độ sâu ngập lớn nhất:</span>
                                        <span className="text-red-400 font-bold font-mono text-sm">{neighborhood.maxFloodDepth}m</span>
                                    </div>
                                </div>
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
            </div>

            {/* Cột phải: Bản đồ hiển thị đa giác các khối nhà */}
            <div className="flex-1 h-[45%] md:h-full z-0 relative bg-slate-950">
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
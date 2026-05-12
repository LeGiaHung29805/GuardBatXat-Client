'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ApiClient } from '@/lib/ApiClient';
import { LocationCheckResponse } from '@/lib/Model';
import 'leaflet/dist/leaflet.css';
import websocket from '@/app/commander/utils/websocket';
import ToastContainer, { showToast } from '@/components/ui/Toast';

// Load bản đồ và các component của Leaflet
const BatXatBoundaryMap = dynamic(() => import('@/components/ui/BatXatBoundaryMap'), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

// Component ẩn giúp điều khiển Camera của bản đồ bay tới tọa độ
const MapAutoCenter = dynamic(
    () => import('react-leaflet').then((mod) => {
        return function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
            const map = mod.useMap();
            useEffect(() => {
                if (lat && lng) {
                    map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
                }
            }, [lat, lng, map]);
            return null;
        };
    }),
    { ssr: false }
);

export default function SafetyCheckPage() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LocationCheckResponse | null>(null);
    const [markerIcon, setMarkerIcon] = useState<any>(null);

    // Sử dụng chung MỘT state duy nhất cho tọa độ hiển thị trên bản đồ
    const [currentLoc, setCurrentLoc] = useState<{ lat: number, lng: number } | null>(null);

    // Tự động chạy khi vừa vào trang
    useEffect(() => {
        let isMounted = true;

        // 1. Khởi tạo Icon
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

        // 2. Lấy GPS ngay lập tức
        if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
            setLoading(true);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isMounted) {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;

                        // SỬA CHÍNH TẠI ĐÂY: Lưu ngay tọa độ để bản đồ render lập tức
                        setCurrentLoc({ lat, lng });

                        // Bắt đầu gọi API ngầm
                        fetchSafetyData(lat, lng);
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

    // 3. Khởi tạo kết nối WebSocket để nhận cảnh báo theo thời gian thực
    useEffect(() => {
        const token = localStorage.getItem("token") || "guest";
        websocket.connect(token);

        websocket.subscribe("/topic/safety-alerts", (data: LocationCheckResponse) => {
            // Khi có cảnh báo mới, hiển thị Toast nếu đây là Danger
            if (data.alertLevel === 'DANGER' || data.alertLevel === 'WARNING') {
                showToast(
                    data.alertLevel === 'DANGER' ? 'danger' : 'warning',
                    'CẢNH BÁO RỦI RO THỜI GIAN THỰC',
                    data.message
                );
            }
            
            // Nếu người dùng đang tra cứu và vị trí trùng với vùng cảnh báo, tự động cập nhật kết quả
            // (Trong thực tế cần kiểm tra tọa độ, ở đây demo sẽ override nếu có risk)
            if (currentLoc && data.alertLevel === 'DANGER') {
                setResult(data);
            }
        });

        return () => {
            websocket.disconnect();
        };
    }, [currentLoc]);

    const handleUseGPS = () => {
        setLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setCurrentLoc({ lat, lng });
                    fetchSafetyData(lat, lng);
                },
                () => {
                    alert("Không thể lấy GPS. Vui lòng kiểm tra quyền truy cập vị trí trên trình duyệt!");
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Trình duyệt không hỗ trợ định vị GPS.");
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
                fetchSafetyData(lat, lng);
            } else {
                alert("Không tìm thấy địa chỉ này trên bản đồ.");
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    const fetchSafetyData = async (lat: number, lng: number) => {
        try {
            const res = await ApiClient.checkSafety({ latitude: lat, longitude: lng });
            if (res.code === 200) setResult(res.data);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-gray-50 relative">
            <ToastContainer />
            
            {/* Cột trái */}
            <div className="w-full md:w-[450px] h-auto md:h-full p-6 bg-white shadow-2xl z-10 overflow-y-auto flex flex-col">
                <h1 className="text-2xl font-black text-blue-700 mb-2">Tra Cứu An Toàn</h1>
                <p className="text-sm text-gray-500 mb-6 border-b pb-4">
                    Đánh giá rủi ro ngập lụt & sạt lở tại nơi bạn đang đứng hoặc khu vực bạn quan tâm.
                </p>

                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập tên đường, thôn, xã..."
                        className="flex-1 p-3 border border-gray-300 text-gray-700 font-semibold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                        onClick={handleSearchAddress}
                        disabled={loading}
                        className="px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Tìm
                    </button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">HOẶC</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                    onClick={handleUseGPS}
                    disabled={loading}
                    className="w-full py-3 mt-2 mb-6 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg disabled:opacity-50"
                >
                    Dùng định vị GPS của tôi
                </button>

                {loading && (
                    <div className="text-center font-bold text-blue-600 animate-pulse my-4">
                        AI đang phân tích dữ liệu địa hình và thời tiết...
                    </div>
                )}

                {result && !loading && (
                    <div className="animate-fade-in-up">
                        {/* Thẻ trạng thái lớn */}
                        <div className={`p-5 rounded-2xl mb-4 border-2 shadow-lg transition-all ${result.alertLevel === 'DANGER' ? 'bg-red-50 border-red-500' :
                            result.alertLevel === 'WARNING' ? 'bg-amber-50 border-amber-500' : 'bg-emerald-50 border-emerald-500'
                            }`}>
                            <h2 className={`text-2xl font-black mb-2 ${result.alertLevel === 'DANGER' ? 'text-red-700' :
                                result.alertLevel === 'WARNING' ? 'text-amber-700' : 'text-emerald-700'
                                }`}>
                                {result.alertLevel === 'DANGER' ? 'NGUY HIỂM' : result.alertLevel === 'WARNING' ? 'CHÚ Ý' : 'AN TOÀN'}
                            </h2>
                            <p className="text-gray-700 font-medium mb-4">{result.message}</p>

                            {/* Nút gọi sơ tán khẩn */}
                            {result.alertLevel === 'DANGER' && (
                                <Link href="/citizen/evacuation">
                                    <button className="w-full py-3 bg-red-600 text-white font-black rounded-lg shadow-md hover:bg-red-700 animate-bounce">
                                        TÌM ĐƯỜNG SƠ TÁN NGAY
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Chi tiết vật lý công trình */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                            <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-3">Thông tin Khu vực</h3>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <span className="text-gray-500">Loại nhà:</span> <span className="text-green-600 font-semibold text-right">{result.buildingType}</span>
                                <span className="text-gray-500">Cao độ nền:</span> <span className="text-green-600 font-semibold text-right">{result.currentElevation} m</span>
                                <span className="text-gray-500">Cách bờ sông:</span> <span className="text-green-600 font-semibold text-right">{result.distanceToWater > 0 ? `${result.distanceToWater} m` : 'N/A'}</span>
                            </div>
                        </div>

                        {/* Chi tiết rủi ro AI */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-700 border-b border-gray-200 pb-2 mb-3">Dự báo Rủi ro</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Mức độ ngập:</span>
                                    <span className={`font-bold px-2 py-1 rounded ${result.floodDepth > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {result.floodRiskStatus} ({result.floodDepth}m)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Sạt lở (AI dự báo):</span>
                                    <span className={`font-bold px-2 py-1 rounded ${result.aiLandslideProb > 0.5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {result.landslideRiskStatus} ({(result.aiLandslideProb * 100).toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Nguy cơ lũ quét:</span>
                                    <span className={`font-bold px-2 py-1 rounded ${result.floodDepth > 0 || result.aiFloodProb > 0.6 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        AI: {(result.aiFloodProb * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="flex-1 h-[50vh] md:h-full z-0 relative bg-gray-200">
                <BatXatBoundaryMap>
                    {/* Camera tự động bay theo currentLoc */}
                    {currentLoc && <MapAutoCenter lat={currentLoc.lat} lng={currentLoc.lng} />}

                    {/* Marker cắm ngay khi currentLoc có giá trị */}
                    {currentLoc && markerIcon && (
                        <Marker position={[currentLoc.lat, currentLoc.lng]} icon={markerIcon}>
                            <Popup>
                                <div className="text-center font-semibold">
                                    Vị trí tra cứu <br />
                                    <span className="text-xs text-gray-500">[{currentLoc.lat.toFixed(4)}, {currentLoc.lng.toFixed(4)}]</span>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </BatXatBoundaryMap>
            </div>
        </div>
    );
}
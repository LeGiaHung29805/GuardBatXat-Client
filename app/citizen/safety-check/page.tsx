'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ApiClient } from '@/lib/ApiClient';
import { LocationCheckResponse } from '@/lib/Model';

// Load bản đồ (sử dụng lại BatXatBoundaryMap để bao ngoài)
const BatXatBoundaryMap = dynamic(() => import('@/components/ui/BatXatBoundaryMap'), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

export default function SafetyCheckPage() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<LocationCheckResponse | null>(null);
    const [targetLoc, setTargetLoc] = useState<{ lat: number, lng: number } | null>(null);

    // Dùng GPS thiết bị
    const handleUseGPS = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchSafetyData(pos.coords.latitude, pos.coords.longitude),
            () => { alert("Không thể lấy GPS."); setLoading(false); }
        );
    };

    // Dịch Địa chỉ -> Tọa độ bằng OpenStreetMap (Nominatim)
    const handleSearchAddress = async () => {
        if (!address) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}+Bat+Xat+Lao+Cai`);
            const data = await res.json();
            if (data && data.length > 0) {
                fetchSafetyData(parseFloat(data[0].lat), parseFloat(data[0].lon));
            } else {
                alert("Không tìm thấy địa chỉ này trên bản đồ.");
                setLoading(false);
            }
        } catch (e) {
            setLoading(false);
        }
    };

    // Gọi Spring Boot API
    const fetchSafetyData = async (lat: number, lng: number) => {
        setTargetLoc({ lat, lng });
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
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
            {/* Cột trái: Form & Kết quả */}
            <div className="w-full md:w-[450px] p-6 bg-white shadow-2xl z-10 overflow-y-auto">
                <h1 className="text-2xl font-black text-gray-800 mb-2">Tra Cứu An Toàn</h1>
                <p className="text-sm text-gray-500 mb-6">Đánh giá rủi ro ngập lụt & sạt lở tại nơi bạn đang đứng.</p>

                {/* Input tìm kiếm */}
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={address} onChange={(e) => setAddress(e.target.value)}
                        placeholder="Nhập tên đường, thôn, xã..."
                        className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={handleSearchAddress} className="px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Tìm</button>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">HOẶC</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button onClick={handleUseGPS} className="w-full py-3 mt-2 mb-6 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg flex justify-center items-center gap-2">
                    📍 Dùng định vị GPS của tôi
                </button>

                {/* Hiển thị kết quả đánh giá */}
                {loading && <div className="text-center font-bold text-blue-600 animate-pulse">AI đang phân tích rủi ro...</div>}

                {result && !loading && (
                    <div className="animate-fade-in-up">
                        {/* Thẻ trạng thái lớn */}
                        <div className={`p-5 rounded-2xl mb-4 border-2 shadow-lg ${result.alertLevel === 'DANGER' ? 'bg-red-50 border-red-500' :
                                result.alertLevel === 'WARNING' ? 'bg-amber-50 border-amber-500' : 'bg-emerald-50 border-emerald-500'
                            }`}>
                            <h2 className={`text-2xl font-black mb-2 ${result.alertLevel === 'DANGER' ? 'text-red-700' : result.alertLevel === 'WARNING' ? 'text-amber-700' : 'text-emerald-700'
                                }`}>
                                {result.alertLevel === 'DANGER' ? '🚨 NGUY HIỂM' : result.alertLevel === 'WARNING' ? '⚠️ CHÚ Ý' : '✅ AN TOÀN'}
                            </h2>
                            <p className="text-gray-700 font-medium mb-4">{result.message}</p>

                            {/* Nút gọi sơ tán khẩn */}
                            {result.alertLevel === 'DANGER' && (
                                <Link href="/citizen/evacuation">
                                    <button className="w-full py-3 bg-red-600 text-white font-black rounded-lg shadow-md hover:bg-red-700 animate-bounce">
                                        🏃 TÌM ĐƯỜNG SƠ TÁN NGAY
                                    </button>
                                </Link>
                            )}
                        </div>

                        {/* Chi tiết vật lý công trình */}
                        <div className="bg-gray-50 p-4 rounded-xl border mb-4">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">Thông tin Công trình</h3>
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <span className="text-gray-500">Loại nhà:</span> <span className="font-semibold text-right">{result.buildingType}</span>
                                <span className="text-gray-500">Cao độ nền:</span> <span className="font-semibold text-right">{result.currentElevation} m</span>
                                <span className="text-gray-500">Cách bờ sông:</span> <span className="font-semibold text-right">{result.distanceToWater > 0 ? `${result.distanceToWater} m` : 'N/A'}</span>
                            </div>
                        </div>

                        {/* Chi tiết rủi ro AI */}
                        <div className="bg-gray-50 p-4 rounded-xl border">
                            <h3 className="font-bold text-gray-700 border-b pb-2 mb-3">Dự báo Thiên tai</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Lũ lụt:</span>
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
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="flex-1 h-[50vh] md:h-screen">
                <BatXatBoundaryMap>
                    {targetLoc && (
                        <Marker position={[targetLoc.lat, targetLoc.lng]}>
                            <Popup>Vị trí tra cứu</Popup>
                        </Marker>
                    )}
                </BatXatBoundaryMap>
            </div>
        </div>
    );
}
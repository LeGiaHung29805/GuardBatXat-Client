'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ApiClient } from '@/lib/ApiClient';
import { EvacuationOption } from '@/lib/Model';

const EvacuationMap = dynamic(() => import('@/components/ui/EvacuationMap'), { ssr: false });

export default function EvacuationPage() {
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    const [options, setOptions] = useState<EvacuationOption[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    const handleFindShelter = () => {
        setLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setUserLocation({ lat, lng });

                try {
                    // Gọi API thông qua ApiClient chuẩn mực
                    const result = await ApiClient.findSafeShelters({
                        currentLat: lat,
                        currentLng: lng,
                        strategy: 'safety'
                    });

                    if (result.code === 200 && result.data?.options) {
                        setOptions(result.data.options);
                        setSelectedIndex(0);
                    } else {
                        alert(result.data?.message || "Không tìm thấy đường đi an toàn.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("Lỗi kết nối đến máy chủ hệ thống.");
                } finally {
                    setLoading(false);
                }
            }, (error) => {
                alert("Bạn cần bật định vị GPS để tìm đường!");
                setLoading(false);
            });
        } else {
            alert("Trình duyệt không hỗ trợ định vị GPS.");
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen flex flex-col md:flex-row bg-gray-50">
            {/* Cột trái: UI Điều khiển & Danh sách 3 Options */}
            <div className="w-full md:w-96 p-4 bg-white shadow-xl z-10 flex flex-col overflow-y-auto">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Sơ Tán Khẩn Cấp</h1>
                <p className="text-sm text-gray-600 mb-4">Hệ thống AI sẽ quét và đưa ra 3 điểm trú ẩn an toàn nhất xung quanh bạn.</p>

                <button
                    onClick={handleFindShelter}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg mb-6 transition-all"
                >
                    {loading ? 'Đang dò quét Radar...' : 'Tìm Điểm Sơ Tán Ngay'}
                </button>

                <div className="flex flex-col gap-3">
                    {options.map((opt, index) => (
                        <div
                            key={opt.destination.id}
                            onClick={() => setSelectedIndex(index)}
                            className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${selectedIndex === index
                                    ? 'border-red-500 bg-red-50 shadow-md'
                                    : 'border-gray-200 hover:border-red-300'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800 text-lg">Option {index + 1}</h3>
                                <span className={`px-2 py-1 text-xs font-bold rounded text-white ${index === 0 ? 'bg-emerald-500' : index === 1 ? 'bg-blue-500' : 'bg-amber-500'
                                    }`}>
                                    {index === 0 ? 'Khuyên dùng' : 'Tùy chọn'}
                                </span>
                            </div>
                            <p className="font-semibold text-gray-700 mb-1">{opt.destination.name}</p>
                            <p className="text-sm text-gray-500">
                                Sức chứa: <span className="font-bold text-green-600">{opt.destination.available_capacity} chỗ</span>
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="flex-1 h-[60vh] md:h-screen bg-gray-200">
                <EvacuationMap
                    userLocation={userLocation}
                    options={options}
                    selectedIndex={selectedIndex}
                />
            </div>
        </div>
    );
}
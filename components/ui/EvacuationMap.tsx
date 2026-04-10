'use client';

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// 1. TẠO ICON TÙY CHỈNH (Trực quan hơn icon mặc định)
// Icon người dùng (Màu xanh)
const userIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-xl"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Icon Điểm sơ tán (Màu đỏ, có hiệu ứng đập nhịp tim - pulse)
const shelterIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-4 border-white shadow-xl animate-pulse flex items-center justify-center">
             <div class="w-2 h-2 bg-white rounded-full"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// 2. COMPONENT ĐIỀU KHIỂN BẢN ĐỒ (Tự động zoom vừa vặn tuyến đường)
function MapController({ selectedOption, userLocation }: { selectedOption: any, userLocation: any }) {
    const map = useMap();

    useEffect(() => {
        if (selectedOption && selectedOption.route_coordinates && selectedOption.route_coordinates.length > 0) {
            // Lấy toàn bộ tọa độ của tuyến đường được chọn
            const routeCoords = selectedOption.route_coordinates.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);

            // Tạo một "khung" (Bounds) bao quanh toàn bộ tuyến đường này
            const bounds = L.latLngBounds(routeCoords);

            // Ép bản đồ zoom sao cho vừa vặn cái khung đó (có chừa lề 50px cho đẹp)
            map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
        }
        else if (userLocation) {
            // Nếu chưa có đường, chỉ zoom vào người dùng
            map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
        }
    }, [selectedOption, userLocation, map]);

    return null;
}

export default function EvacuationMap({ userLocation, options, selectedIndex }: any) {
    const selectedOption = options && options.length > 0 ? options[selectedIndex] : null;

    return (
        <MapContainer
            center={userLocation ? [userLocation.lat, userLocation.lng] : [22.6105, 103.8012]}
            zoom={15}
            className="w-full h-full z-0"
        >
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            <TileLayer
                url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
                attribution='Map tiles by Stamen Design'
            />

            <MapController selectedOption={selectedOption} userLocation={userLocation} />

            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                    <Popup>Vị trí của bạn</Popup>
                </Marker>
            )}

            {selectedOption && selectedOption.route_coordinates && selectedOption.route_coordinates.length > 0 && (
                <>
                    {/* ======================================================== */}
                    {/* NÉT ĐỨT 1: TỪ VỊ TRÍ NGƯỜI DÙNG RA ĐẦU ĐƯỜNG CHÍNH       */}
                    {/* ======================================================== */}
                    {userLocation && (
                        <Polyline
                            positions={[
                                [userLocation.lat, userLocation.lng], // Điểm A: User
                                selectedOption.route_coordinates[0]   // Điểm B: Đầu đường AI tìm được
                            ]}
                            color="#fde047"
                            weight={4}
                            dashArray="8, 8"
                            opacity={0.8}
                        />
                    )}

                    {/* ======================================================== */}
                    {/* ĐƯỜNG ĐI CHÍNH (Liền mạch do AI tìm ra)                  */}
                    {/* ======================================================== */}
                    <Polyline
                        positions={selectedOption.route_coordinates}
                        color="#fde047" // Màu vàng (yellow-300)
                        weight={6}
                        opacity={0.9}
                        lineCap="round"
                        lineJoin="round"
                    />

                    {/* ======================================================== */}
                    {/* NÉT ĐỨT 2: TỪ CUỐI ĐƯỜNG CHÍNH VÀO CỬA TÒA NHÀ SƠ TÁN    */}
                    {/* ======================================================== */}
                    <Polyline
                        positions={[
                            selectedOption.route_coordinates[selectedOption.route_coordinates.length - 1], // Điểm A: Cuối đường AI
                            [selectedOption.destination.lat, selectedOption.destination.lng]               // Điểm B: Tòa nhà
                        ]}
                        color="#fde047"
                        weight={4}
                        dashArray="8, 8"
                        opacity={0.8}
                    />

                    {/* Điểm đích (Tòa nhà sơ tán) */}
                    <Marker position={[selectedOption.destination.lat, selectedOption.destination.lng]} icon={shelterIcon}>
                        <Popup>
                            <div className="text-center p-1">
                                <strong className="text-red-600 block mb-1 text-base">{selectedOption.destination.name}</strong>
                                Sức chứa: <b className="text-green-600">{selectedOption.destination.available_capacity}</b> người<br />
                                Tình trạng: <span className="text-green-600 font-semibold">An toàn</span>
                            </div>
                        </Popup>
                    </Marker>
                </>
            )}
        </MapContainer>
    );
}
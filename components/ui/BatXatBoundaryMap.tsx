'use client';

import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

// 1. COMPONENT ĐIỀU KHIỂN BẢN ĐỒ (Zoom khít vào ranh giới khi vừa load)
function MapBoundaryController({ boundaryData }: { boundaryData: any }) {
    const map = useMap();
    useEffect(() => {
        if (boundaryData) {
            // Tạo bounds từ GeoJSON data
            const geoJsonLayer = L.geoJSON(boundaryData);
            const bounds = geoJsonLayer.getBounds();
            // Zoom vừa khít phạm vi ranh giới Bát Xát
            map.fitBounds(bounds, { padding: [20, 20], animate: true });
        }
    }, [boundaryData, map]);
    return null;
}

// 2. COMPONENT BẢN ĐỒ NỀN (Chỉ chứa ranh giới & Tile Layer)
export default function BatXatBoundaryMap({ children }: { children?: React.ReactNode }) {
    const [boundaryData, setBoundaryData] = useState<any>(null);

    // Load file GeoJSON tĩnh từ thư mục public/data/
    useEffect(() => {
        fetch('/data/batxat_boundary.json')
            .then(res => res.json())
            .then(data => setBoundaryData(data))
            .catch(err => console.error("Không thể tải file ranh giới:", err));
    }, []);

    // Phong cách vẽ ranh giới (Viền đỏ nét đứt)
    const boundaryStyle = {
        color: '#ef4444', // Màu đỏ (red-500)
        weight: 3,
        opacity: 0.8,
        fillColor: 'transparent', // Không tô màu nền (để thấy bản đồ)
        dashArray: '8, 8', // Đường nét đứt (mỗi đoạn 8px)
    };

    return (
        <MapContainer center={[22.6105, 103.8012]} zoom={11} className="w-full h-full z-0 cursor-crosshair">
            {/* Bản đồ vệ tinh Esri */}
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
            />
            {/* Lớp Overlay tên đường */}
            <TileLayer url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png" />

            {/* Gọi Component tự động điều khiển camera ban đầu */}
            <MapBoundaryController boundaryData={boundaryData} />

            {/* VẼ RANH GIỚI GEOJSON (SHAPEFILE) */}
            {boundaryData && (
                <GeoJSON
                    data={boundaryData}
                    style={boundaryStyle}
                />
            )}

            {/* Nơi chèn các Marker, Polyline của từng trang cụ thể */}
            {children}
        </MapContainer>
    );
}
'use client';

import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Icon Điểm A (Vị trí của bạn - Màu xanh)
const startIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-xl"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Icon Điểm B (Đích đến - Màu tím có chấm)
const endIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-purple-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
             <div class="w-2 h-2 bg-white rounded-full animate-ping"></div>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

// Component điều khiển Camera zoom vừa khít đường đi
function RouteController({ routeCoords, startNode }: { routeCoords: any[], startNode: any }) {
    const map = useMap();
    useEffect(() => {
        if (routeCoords && routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        } else if (startNode) {
            map.setView([startNode.lat, startNode.lng], 15, { animate: true });
        }
    }, [routeCoords, startNode, map]);
    return null;
}

// Component Bắt sự kiện Click trên bản đồ để cắm cờ
function ClickHandler({ setDestination }: { setDestination: (latlng: {lat: number, lng: number}) => void }) {
    useMapEvents({
        click(e) {
            setDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

export default function SafeRouteMap({ startLoc, destLoc, setDestLoc, routeCoords }: any) {
    return (
        <MapContainer center={[22.6105, 103.8012]} zoom={14} className="w-full h-full z-0 cursor-crosshair">
            <TileLayer 
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
            />
            <TileLayer url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png" />

            <RouteController routeCoords={routeCoords} startNode={startLoc} />
            <ClickHandler setDestination={setDestLoc} />

            {/* Điểm xuất phát (A) */}
            {startLoc && (
                <Marker position={[startLoc.lat, startLoc.lng]} icon={startIcon}>
                    <Popup>Vị trí của bạn</Popup>
                </Marker>
            )}

            {/* Điểm cắm cờ đích (B) */}
            {destLoc && (
                <Marker position={[destLoc.lat, destLoc.lng]} icon={endIcon}>
                    <Popup>Điểm bạn muốn đến</Popup>
                </Marker>
            )}

            {/* Tuyến đường AI vẽ */}
            {routeCoords && routeCoords.length > 0 && (
                <Polyline 
                    positions={routeCoords} 
                    color="#fde047" // Vàng nổi bật
                    weight={6}
                    opacity={0.9}
                />
            )}
        </MapContainer>
    );
}
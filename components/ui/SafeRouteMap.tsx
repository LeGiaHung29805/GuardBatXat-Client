"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Icon Điểm A (Vị trí của bạn - Màu xanh dương)
const startIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `
        <div class="relative flex h-6 w-6 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-md"></span>
        </div>
    `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Icon Điểm B (Đích đến - Màu tím)
const endIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `
        <div class="relative flex h-6 w-6 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 bg-purple-600 border-2 border-white shadow-md"></span>
        </div>
    `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Component điều khiển Camera zoom vừa khít đường đi
function RouteController({
  routeCoords,
  startNode,
}: {
  routeCoords: any[];
  startNode: any;
}) {
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

function ClickHandler({
  setDestination,
}: {
  setDestination: (latlng: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      setDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function SafeRouteMap({
  startLoc,
  destLoc,
  setDestLoc,
  routeCoords,
  blockedSegments = [],
}: any) {
  return (
    <MapContainer
      center={[22.6105, 103.8012]}
      zoom={14}
      className="w-full h-full z-0 cursor-crosshair"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="&copy; Esri"
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

      {/* Đường đi an toàn */}
      {routeCoords && routeCoords.length > 0 && (
        <>
          {startLoc && (
            <Polyline
              positions={[[startLoc.lat, startLoc.lng], routeCoords[0]]}
              color="#3b82f6" // Xanh dương cho đoạn kết nối GPS
              weight={4}
              dashArray="8, 8"
              opacity={0.8}
            />
          )}

          <Polyline
            positions={routeCoords}
            color="#10b981" // Xanh lá Emerald an toàn
            weight={6}
            opacity={0.9}
            lineCap="round"
            lineJoin="round"
          />

          {destLoc && (
            <Polyline
              positions={[
                routeCoords[routeCoords.length - 1],
                [destLoc.lat, destLoc.lng],
              ]}
              color="#3b82f6" // Xanh dương cho đoạn kết nối Đích
              weight={4}
              dashArray="8, 8"
              opacity={0.8}
            />
          )}
        </>
      )}

      {/* Các đoạn đường bị chặn cản trở gần đó */}
      {blockedSegments && blockedSegments.map((seg: any, idx: number) => (
        <Polyline
          key={idx}
          positions={seg.coords}
          color={seg.level === 'DANGER' ? '#ef4444' : '#f97316'} // Đỏ cho DANGER, Cam cho WARNING
          weight={5}
          dashArray="6, 6"
          opacity={0.8}
        >
          <Popup>
            <div className="text-xs font-bold text-red-600">
              ⚠️ ĐOẠN ĐƯỜNG BỊ TẮC NGHẼN/THIÊN TAI
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              AI đã chủ động chuyển lộ trình của bạn để tránh điểm này.
            </div>
          </Popup>
        </Polyline>
      ))}
    </MapContainer>
  );
}

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
import { findClosestIndex } from "@/lib/utils";

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
  routes = [],
  selectedRouteIndex = 0,
  onSelectRouteIndex,
  blockedSegments = [],
}: any) {
  // Chuẩn hóa dữ liệu tuyến đường để tương thích ngược với routeCoords cũ
  const activeRoutes = routes && routes.length > 0
    ? routes
    : routeCoords && routeCoords.length > 0
      ? [{ pathPoints: routeCoords, totalDistance: 0 }]
      : [];
  const activeIndex = selectedRouteIndex ?? 0;

  // Lấy danh sách điểm của tuyến đang chọn để RouteController lấy bounds zoom map
  const selectedRoutePoints = activeRoutes[activeIndex]?.pathPoints || [];

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

      <RouteController routeCoords={selectedRoutePoints} startNode={startLoc} />
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

      {/* Danh sách các lộ trình an toàn tìm được */}
      {activeRoutes.map((r: any, idx: number) => {
        const isSelected = idx === activeIndex;
        const coords = r.pathPoints;
        if (!coords || coords.length === 0) return null;

        if (isSelected) {
          // Tính điểm gần GPS nhất để chia và làm mờ đoạn đã đi qua
          let closestIdx = 0;
          if (startLoc) {
            closestIdx = findClosestIndex(coords, [startLoc.lat, startLoc.lng]);
          }

          const traversedCoords = coords.slice(0, closestIdx + 1);
          const remainingCoords = coords.slice(closestIdx);

          // Phối màu cho các tuyến đường (Tuyến 1: xanh lá, Tuyến 2: cyan/xanh dương, Tuyến 3: tím)
          const activeColor = idx === 0 ? "#10b981" : idx === 1 ? "#06b6d4" : "#8b5cf6";

          return (
            <div key={`active-route-${idx}`}>
              {/* Nối nét đứt từ GPS hiện tại tới điểm bắt đầu lộ trình còn lại */}
              {startLoc && remainingCoords.length > 0 && (
                <Polyline
                  positions={[[startLoc.lat, startLoc.lng], remainingCoords[0]]}
                  color="#3b82f6"
                  weight={4}
                  dashArray="6, 6"
                  opacity={0.8}
                />
              )}

              {/* Đoạn đã đi qua (Xám mờ) */}
              {traversedCoords.length > 1 && (
                <Polyline
                  positions={traversedCoords}
                  color="#64748b"
                  weight={4}
                  opacity={0.4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Đoạn còn lại (Màu chủ đạo nổi bật) */}
              {remainingCoords.length > 1 && (
                <Polyline
                  positions={remainingCoords}
                  color={activeColor}
                  weight={6}
                  opacity={0.95}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Nối nét đứt từ điểm cuối lộ trình tới đích thực tế */}
              {destLoc && remainingCoords.length > 0 && (
                <Polyline
                  positions={[
                    remainingCoords[remainingCoords.length - 1],
                    [destLoc.lat, destLoc.lng],
                  ]}
                  color="#3b82f6"
                  weight={4}
                  dashArray="6, 6"
                  opacity={0.8}
                />
              )}
            </div>
          );
        } else {
          // Lộ trình phụ: vẽ mờ nét đứt để người dân click chọn thay đổi
          return (
            <Polyline
              key={`alt-route-${idx}`}
              positions={coords}
              color="#94a3b8"
              weight={4}
              opacity={0.45}
              dashArray="5, 5"
              lineCap="round"
              lineJoin="round"
              eventHandlers={{
                click: () => {
                  if (onSelectRouteIndex) {
                    onSelectRouteIndex(idx);
                  }
                },
              }}
            />
          );
        }
      })}

      {/* Các đoạn đường bị chặn cản trở gần đó */}
      {blockedSegments && blockedSegments.map((seg: any, idx: number) => (
        <Polyline
          key={idx}
          positions={seg.coords}
          color={seg.level === 'DANGER' ? '#ef4444' : '#f97316'}
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

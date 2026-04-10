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

// --- INTERFACES ---
interface Location {
  lat: number;
  lng: number;
}

interface RoutesData {
  shortest: [number, number][];
  safety: [number, number][];
  rescue: [number, number][];
}

interface AdminCompareMapProps {
  startLoc: Location | null;
  destLoc: Location | null;
  setDestLoc: (loc: Location) => void;
  routes: RoutesData;
}

// --- ICONS ---
const startIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-lg ring-2 ring-blue-400/50"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const endIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div class="relative flex items-center justify-center">
             <div class="absolute w-8 h-8 bg-purple-500 rounded-full animate-ping opacity-20"></div>
             <div class="w-6 h-6 bg-purple-600 rounded-full border-4 border-white shadow-xl z-10"></div>
           </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// --- CONTROLLERS ---
function RouteController({
  routes,
  startLoc,
}: {
  routes: RoutesData;
  startLoc: Location | null;
}) {
  const map = useMap();

  useEffect(() => {
    // Gộp tất cả tọa độ lại để zoom bản đồ cho vừa khít cả 3 đường
    const allCoords = [...routes.shortest, ...routes.safety, ...routes.rescue];

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    } else if (startLoc) {
      map.flyTo([startLoc.lat, startLoc.lng], 15);
    }
  }, [routes, startLoc, map]);

  return null;
}

function ClickHandler({
  setDestination,
}: {
  setDestination: (loc: Location) => void;
}) {
  useMapEvents({
    click(e) {
      setDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function AdminCompareMap({
  startLoc,
  destLoc,
  setDestLoc,
  routes,
}: AdminCompareMapProps) {
  return (
    <div className="w-full h-full relative group z-0">
      <MapContainer
        center={[22.5458, 103.8895]} // Tâm mặc định tại Bát Xát
        zoom={14}
        className="w-full h-full cursor-crosshair"
      >
        {/* LỚP VỆ TINH */}
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        {/* LỚP NHÃN ĐỊA DANH */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.8}
        />

        <RouteController routes={routes} startLoc={startLoc} />
        <ClickHandler setDestination={setDestLoc} />

        {startLoc && (
          <Marker position={[startLoc.lat, startLoc.lng]} icon={startIcon}>
            <Popup>
              <div className="font-bold text-blue-700">Điểm xuất phát (A)</div>
            </Popup>
          </Marker>
        )}

        {destLoc && (
          <Marker position={[destLoc.lat, destLoc.lng]} icon={endIcon}>
            <Popup>
              <div className="font-bold text-purple-700">
                Điểm đến đã chọn (B)
              </div>
            </Popup>
          </Marker>
        )}

        {/* 1. ĐƯỜNG NGẮN NHẤT (Màu Đỏ, Nét đứt) */}
        {routes.shortest && routes.shortest.length > 0 && (
          <Polyline
            positions={routes.shortest}
            pathOptions={{
              color: "#ef4444",
              weight: 5,
              dashArray: "10, 10",
              opacity: 0.8,
            }}
          />
        )}

        {/* 2. ĐƯỜNG AN TOÀN - DÂN SỰ (Màu Xanh lá, Nét liền) */}
        {routes.safety && routes.safety.length > 0 && (
          <Polyline
            positions={routes.safety}
            pathOptions={{
              color: "#22c55e",
              weight: 6,
              opacity: 0.9,
              lineJoin: "round",
            }}
          />
        )}

        {/* 3. ĐƯỜNG CỨU HỘ - XE CHUYÊN DỤNG (Màu Vàng cam, Nét liền) */}
        {routes.rescue && routes.rescue.length > 0 && (
          <Polyline
            positions={routes.rescue}
            pathOptions={{
              color: "#eab308",
              weight: 6,
              opacity: 0.9,
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

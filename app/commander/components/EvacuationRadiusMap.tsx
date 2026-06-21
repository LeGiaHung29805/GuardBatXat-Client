"use client";
import React from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  center: [number, number];
  radius: number; // mét
  floodPoints: any[];
}

export default function EvacuationRadiusMap({ center, radius, floodPoints }: Props) {
  return (
    <div className="relative h-[420px] w-full rounded-xl overflow-hidden border border-gray-700 shadow-xl">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap"
        />

        {/* Vòng tròn bán kính sơ tán quanh tâm vùng ngập */}
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.15,
            weight: 2,
          }}
        />

        {/* Tâm vùng ngập */}
        <CircleMarker
          center={center}
          radius={7}
          pathOptions={{ color: "#fca5a5", fillColor: "#dc2626", fillOpacity: 1 }}
        >
          <Popup className="text-gray-900 font-sans">
            <strong>Tâm vùng ngập</strong>
            <br />
            Bán kính cảnh báo: {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
          </Popup>
        </CircleMarker>

        {/* Các điểm ngập trong vùng (tham chiếu) */}
        {floodPoints.map((pt, idx) => {
          try {
            const geo = typeof pt.geojson === "string" ? JSON.parse(pt.geojson) : pt.geojson;
            return (
              <CircleMarker
                key={`flood-${idx}`}
                center={[geo.coordinates[1], geo.coordinates[0]]}
                radius={4}
                pathOptions={{ color: "#3b82f6", fillColor: "#60a5fa", fillOpacity: 0.6 }}
              />
            );
          } catch {
            return null;
          }
        })}
      </MapContainer>
    </div>
  );
}

"use client";
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ShieldAlert } from "lucide-react";
import { DARK_TILE_CLASS, OSM_ATTRIBUTION, OSM_TILE_URL } from "@/lib/mapTiles";

interface Props {
  lat: number;
  lng: number;
  incidentType: string;
  impactLevel: string;
}

// Helper component to pan/zoom map when coordinates change
function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function IncidentMiniMap({ lat, lng, incidentType, impactLevel }: Props) {
  const center: [number, number] = [lat, lng];

  const getColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return { fill: "#dc2626", border: "#f87171" }; // Red
      case "HIGH":
        return { fill: "#ea580c", border: "#fb923c" }; // Orange
      case "MEDIUM":
        return { fill: "#eab308", border: "#fef08a" }; // Yellow
      case "LOW":
      default:
        return { fill: "#2563eb", border: "#60a5fa" }; // Blue
    }
  };

  const colors = getColor(impactLevel);

  return (
    <div className="relative h-[250px] w-full rounded-xl overflow-hidden border border-gray-700 shadow-inner">
      <MapContainer center={center} zoom={15} className="h-full w-full z-0">
        <TileLayer
          url={OSM_TILE_URL}
          attribution={OSM_ATTRIBUTION}
          className={DARK_TILE_CLASS}
        />
        <MapController lat={lat} lng={lng} />
        
        <CircleMarker
          center={center}
          radius={12}
          pathOptions={{
            fillColor: colors.fill,
            color: colors.border,
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Popup className="text-gray-900 font-sans">
            <div className="flex items-center gap-1.5 font-bold text-red-600 mb-1">
              <ShieldAlert size={16} />
              <span>{incidentType}</span>
            </div>
            <div className="text-xs text-gray-500">
              Mức độ: <span className="font-semibold">{impactLevel}</span><br />
              Tọa độ: {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

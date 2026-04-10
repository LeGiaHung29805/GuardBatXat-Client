'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
};

interface RescueMapProps {
  startPos: [number, number];
  destPos: [number, number];
}

export default function RescueMap({ startPos, destPos }: RescueMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fixLeafletIcon();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Route mẫu (đường thẳng)
  const routePath: [number, number][] = [startPos, destPos];

  return (
    <MapContainer
      center={startPos}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Start Marker */}
      <Marker position={startPos}>
        <Popup>Vị trí của bạn (Đội cứu hộ)</Popup>
      </Marker>

      {/* Destination Marker */}
      <Marker position={destPos}>
        <Popup>📍 Điểm SOS cần đến</Popup>
      </Marker>

      {/* Route */}
      <Polyline
        positions={routePath}
        color="#3B82F6"
        weight={4}
        opacity={0.8}
      />
    </MapContainer>
  );
}
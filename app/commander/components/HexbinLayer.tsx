"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "@asymmetrik/leaflet-hexbin";
import "leaflet-hexbin-layer";

interface HexbinProps {
  points: { lat: number, lng: number, intensity: number }[]; // Dữ liệu điểm rủi ro
}

export default function HexbinLayer({ points }: HexbinProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Cấu hình thang màu cho Hexbin
    const colorScale = (L as any).chromaScale()
      .domain([0, 0.4, 0.6, 0.8, 1])
      .range(["#000000", "blue", "cyan", "lime", "yellow", "red"]);

    // Cấu hình và vẽ HexbinLayer
    // cellSize: 10 (mét) - Kích thước ô tương đương một ngôi nhà
    const hexbinLayer = (L as any).hexbinLayer({
      cellSize: 10,
      opacity: 0.8,
      fill: (data: any) => {
        // data contains array of points in the hexagon
        const intensityValues = data.map((d: any) => d[2]);
        const maxIntensity = intensityValues.length > 0 ? Math.max(...intensityValues) : 0;
        return colorScale(maxIntensity / 100); // Intensity ranges from 0 to 100
      },
      color: "#666",
      strokeWidth: 1,
    }).addTo(map);

    // Chuẩn bị dữ liệu cho lớp hexbin: [lng, lat, intensity]
    const hexData = points.map(item => [item.lng, item.lat, item.intensity]);
    hexbinLayer.data(hexData);

    // Dọn dẹp layer khi unmount
    return () => {
      map.removeLayer(hexbinLayer);
    };
  }, [map, points]);

  return null; // Component này không render HTML
}
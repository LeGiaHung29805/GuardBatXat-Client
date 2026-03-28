import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';


interface HeatmapLayerProps {
    points: [number, number, number][];
    options?: L.HeatMapOptions;
}

export default function HeatmapLayer({ points, options }: HeatmapLayerProps) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const heatLayer = (L as any).heatLayer(points, {
            radius: options?.radius || 25, // Bán kính tỏa nhiệt
            blur: options?.blur || 15,     // Độ nhòe
            maxZoom: options?.maxZoom || 18,
            gradient: options?.gradient || { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }, // Thang màu cảnh báo
            ...options
        });

        heatLayer.addTo(map);
        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points, options]);
    return null;
}
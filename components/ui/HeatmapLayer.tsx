'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][];
  options?: L.HeatMapOptions;
}

export default function HeatmapLayer({ points, options }: HeatmapLayerProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Validate points data
    let validPoints = points || [];
    
    if (!validPoints.length) {
      console.warn('[HeatmapLayer] No points data');
      return;
    }

    // Filter invalid points
    const filteredPoints = validPoints.filter(point => {
      if (!point || !Array.isArray(point)) return false;
      const [lat, lng, intensity] = point;
      return (
        typeof lat === 'number' && 
        typeof lng === 'number' && 
        typeof intensity === 'number' &&
        !isNaN(lat) && !isNaN(lng) && !isNaN(intensity) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        intensity >= 0 && intensity <= 1
      );
    });

    if (filteredPoints.length === 0) {
      console.warn('[HeatmapLayer] No valid points after filtering');
      return;
    }

    // Remove old layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Create new heatmap layer
    const heatLayer = (L as any).heatLayer(filteredPoints, {
      radius: options?.radius || 25,
      blur: options?.blur || 15,
      maxZoom: options?.maxZoom || 18,
      minOpacity: options?.minOpacity || 0.3,
      gradient: options?.gradient || {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      },
      ...options,
    });

    heatLayer.addTo(map);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, options]);

  return null;
}
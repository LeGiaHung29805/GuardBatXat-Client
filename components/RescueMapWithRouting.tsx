'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface Props {
  startPos: [number, number];
  destPos: [number, number];
  onRouteFound?: (distance: number, duration: number, coordinates?: [number, number][]) => void;
  simulationRunId?: number;
  onSimulationStep?: (position: { lat: number; lng: number; progress: number; remainingKm: number }) => void;
  onSimulationEnd?: () => void;
}

const SIMULATION_SAMPLE_COUNT = 480;
const SIMULATION_STEP_MS = 900;

const getDistanceMeters = (from: [number, number], to: [number, number]) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to[0] - from[0]);
  const dLng = toRadians(to[1] - from[1]);
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findClosestIndex = (coords: [number, number][], target: [number, number]) => {
  let minDistance = Infinity;
  let closestIndex = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lat, lng] = coords[i];
    const dist = (lat - target[0]) ** 2 + (lng - target[1]) ** 2;
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }
  return closestIndex;
};

const buildRouteSamples = (points: [number, number][], sampleCount = 180) => {
  if (points.length < 2) {
    return points.map((point) => ({
      lat: point[0],
      lng: point[1],
      progress: 1,
      remainingKm: 0,
    }));
  }

  const cumulativeDistances = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulativeDistances[i] = cumulativeDistances[i - 1] + getDistanceMeters(points[i - 1], points[i]);
  }

  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  if (totalDistance === 0) {
    return [{ lat: points[0][0], lng: points[0][1], progress: 1, remainingKm: 0 }];
  }

  const samples = [];
  let segmentIndex = 1;
  const count = Math.max(2, sampleCount);

  for (let i = 0; i < count; i += 1) {
    const targetDistance = (totalDistance * i) / (count - 1);
    while (segmentIndex < cumulativeDistances.length - 1 && cumulativeDistances[segmentIndex] < targetDistance) {
      segmentIndex += 1;
    }

    const segmentStartDistance = cumulativeDistances[segmentIndex - 1];
    const segmentEndDistance = cumulativeDistances[segmentIndex];
    const segmentRatio = segmentEndDistance === segmentStartDistance
      ? 0
      : (targetDistance - segmentStartDistance) / (segmentEndDistance - segmentStartDistance);
    const start = points[segmentIndex - 1];
    const end = points[segmentIndex];

    samples.push({
      lat: start[0] + (end[0] - start[0]) * segmentRatio,
      lng: start[1] + (end[1] - start[1]) * segmentRatio,
      progress: i / (count - 1),
      remainingKm: Math.round(((totalDistance - targetDistance) / 1000) * 10) / 10,
    });
  }

  return samples;
};

// ── Điểm xuất phát — pulse dot + label ──
const startIcon = L.divIcon({
  className: '',
  iconSize: [56, 62],
  iconAnchor: [28, 22],
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(66,133,244,0.15);animation:pr 2s ease-out infinite;"></div>
        <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(66,133,244,0.08);animation:pr 2s ease-out infinite 0.6s;"></div>
        <div style="position:absolute;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
        <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#4285F4;"></div>
      </div>
      <div style="background:#4285F4;color:white;font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.2);letter-spacing:0.3px;">Xuất phát</div>
    </div>
    <style>
      @keyframes pr{0%{transform:scale(0.5);opacity:0.9}100%{transform:scale(1.5);opacity:0}}
    </style>
  `,
});

// ── Điểm đến — pin đỏ + pulse + label SOS ──
const destIcon = L.divIcon({
  className: '',
  iconSize: [48, 72],
  iconAnchor: [24, 58],
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="position:relative;width:36px;height:48px;">
        <!-- Pulse dưới pin -->
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:rgba(234,67,53,0.2);animation:pr2 1.6s ease-out infinite;"></div>
        <svg viewBox="0 0 32 44" width="36" height="48" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.3))">
          <path d="M16 1C9.373 1 4 6.373 4 13c0 9.5 12 30 12 30S28 22.5 28 13C28 6.373 22.627 1 16 1z" fill="#EA4335"/>
          <path d="M16 1C9.373 1 4 6.373 4 13c0 9.5 12 30 12 30S28 22.5 28 13C28 6.373 22.627 1 16 1z" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
          <circle cx="16" cy="13" r="6" fill="white"/>
          <circle cx="16" cy="13" r="3.5" fill="#EA4335"/>
        </svg>
      </div>
      <div style="background:#EA4335;color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(234,67,53,0.4);letter-spacing:0.5px;margin-top:3px;">SOS</div>
    </div>
    <style>
      @keyframes pr2{0%{transform:translateX(-50%) scale(0.4);opacity:0.9}100%{transform:translateX(-50%) scale(1.6);opacity:0}}
    </style>
  `,
});

export default function RescueMapWithRouting({
  startPos,
  destPos,
  onRouteFound,
  simulationRunId = 0,
  onSimulationStep,
  onSimulationEnd,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routingRef = useRef<any>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);
  const lastRouteWaypointsRef = useRef<{ start: [number, number]; dest: [number, number] } | null>(null);
  const onRouteFoundRef = useRef(onRouteFound);
  const onSimulationStepRef = useRef(onSimulationStep);
  const onSimulationEndRef = useRef(onSimulationEnd);
  const simulationTimerRef = useRef<number | null>(null);
  const simulatingRef = useRef(false);
  const routeShadowRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    onRouteFoundRef.current = onRouteFound;
  }, [onRouteFound]);

  useEffect(() => {
    onSimulationStepRef.current = onSimulationStep;
    onSimulationEndRef.current = onSimulationEnd;
  }, [onSimulationStep, onSimulationEnd]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    const map = L.map(containerRef.current, {
      center: [
        (startPos[0] + destPos[0]) / 2,
        (startPos[1] + destPos[1]) / 2,
      ],
      zoom: 13,
      zoomControl: false,
    });

    mapRef.current = map;

    // Zoom control góc phải dưới
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
      pane: 'overlayPane',
    }).addTo(map);

    // Popup style đẹp
    const popupOpts: L.PopupOptions = {
      className: 'custom-popup',
      closeButton: false,
      offset: [0, -8],
    };

    startMarkerRef.current = L.marker(startPos, { icon: startIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui,sans-serif;font-size:13px;min-width:130px;">
          <div style="font-weight:600;color:#1a1a1a;margin-bottom:2px;">Đội cứu hộ</div>
          <div style="color:#666;font-size:12px;">Điểm xuất phát</div>
        </div>`, popupOpts);

    destMarkerRef.current = L.marker(destPos, { icon: destIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui,sans-serif;font-size:13px;min-width:130px;">
          <div style="font-weight:600;color:#EA4335;margin-bottom:2px;">Hiện trường SOS</div>
          <div style="color:#666;font-size:12px;">Điểm cần đến</div>
        </div>`, popupOpts);

    const routeShadow = L.polyline([], {
      color: 'white',
      weight: 11,
      opacity: 0.55,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeShadowRef.current = routeShadow;

    const routeLine = L.polyline([], {
      color: '#0D47A1',
      weight: 7,
      opacity: 1.0,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeLineRef.current = routeLine;

    // Routing
    import('leaflet-routing-machine').then(() => {
      if (disposed || !mapRef.current) return;

      const routing = (L as any).Routing.control({
        waypoints: [
          L.latLng(startPos[0], startPos[1]),
          L.latLng(destPos[0], destPos[1]),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        createMarker: () => null,
        lineOptions: {
          styles: [],
        },
        router: (L as any).Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
        }),
      }).addTo(map);
      const originalClearLines = routing._clearLines?.bind(routing);
      if (originalClearLines) {
        routing._clearLines = function guardedClearLines(this: any) {
          if (!this._map) return;
          return originalClearLines();
        };
      }
      routingRef.current = routing;
      lastRouteWaypointsRef.current = { start: startPos, dest: destPos };

      const hidePanel = () => {
        if (disposed) return;
        const c = routing.getContainer();
        if (c) c.style.display = 'none';
      };
      routing.on('routingstart', hidePanel);
      routing.on('routesfound', (e: any) => {
        if (disposed) return;
        hidePanel();
        const routeCoordinates = e.routes[0].coordinates.map((coord: L.LatLng) => [coord.lat, coord.lng] as [number, number]);
        routeCoordinatesRef.current = routeCoordinates;

        routeShadow.setLatLngs(routeCoordinates.map((coord: [number, number]) => L.latLng(coord[0], coord[1])));
        routeLine.setLatLngs(routeCoordinates.map((coord: [number, number]) => L.latLng(coord[0], coord[1])));

        const summary = e.routes[0].summary;
        const rawKm  = summary.totalDistance / 1000;
        const distKm = Math.round(rawKm * 10) / 10;
        // Tính thời gian dựa trên vận tốc mặc định 40km/h
        const durMin = Math.round((rawKm / 40) * 60);
        onRouteFoundRef.current?.(distKm, durMin, routeCoordinates);
      });
    });

    return () => {
      disposed = true;
      if (routingRef.current) {
        try {
          routingRef.current.off();
          map.removeControl(routingRef.current);
        } catch (error) {
          console.warn('Không thể dọn routing control:', error);
        }
        routingRef.current = null;
      }
      routeShadowRef.current = null;
      routeLineRef.current = null;
      map.remove();
      mapRef.current = null;
      startMarkerRef.current = null;
      destMarkerRef.current = null;
      routeCoordinatesRef.current = [];
      lastRouteWaypointsRef.current = null;
      if (simulationTimerRef.current !== null) {
        window.clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      simulatingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (simulatingRef.current) return;

    startMarkerRef.current?.setLatLng(startPos);
    destMarkerRef.current?.setLatLng(destPos);

    const previous = lastRouteWaypointsRef.current;
    const shouldUpdateRoute =
      !previous ||
      getDistanceMeters(previous.start, startPos) >= 50 ||
      getDistanceMeters(previous.dest, destPos) >= 10;

    if (shouldUpdateRoute && routingRef.current) {
      routingRef.current.setWaypoints([
        L.latLng(startPos[0], startPos[1]),
        L.latLng(destPos[0], destPos[1]),
      ]);
      lastRouteWaypointsRef.current = { start: startPos, dest: destPos };
    }
  }, [startPos, destPos]);

  useEffect(() => {
    if (!simulationRunId || !startMarkerRef.current || routeCoordinatesRef.current.length < 2) return;

    if (simulationTimerRef.current !== null) {
      window.clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    const samples = buildRouteSamples(routeCoordinatesRef.current, SIMULATION_SAMPLE_COUNT);
    let currentSampleIndex = 0;
    simulatingRef.current = true;

    simulationTimerRef.current = window.setInterval(() => {
      const sample = samples[currentSampleIndex];
      if (!sample) return;

      const latLng = L.latLng(sample.lat, sample.lng);
      startMarkerRef.current?.setLatLng(latLng);
      onSimulationStepRef.current?.(sample);

      // Slice route coordinates
      const closestIdx = findClosestIndex(routeCoordinatesRef.current, [sample.lat, sample.lng]);
      const remainingCoords = [[sample.lat, sample.lng], ...routeCoordinatesRef.current.slice(closestIdx + 1)];
      routeShadowRef.current?.setLatLngs(remainingCoords.map((coord: number[]) => L.latLng(coord[0], coord[1])));
      routeLineRef.current?.setLatLngs(remainingCoords.map((coord: number[]) => L.latLng(coord[0], coord[1])));

      currentSampleIndex += 1;
      if (currentSampleIndex >= samples.length) {
        if (simulationTimerRef.current !== null) {
          window.clearInterval(simulationTimerRef.current);
          simulationTimerRef.current = null;
        }
        simulatingRef.current = false;
        onSimulationEndRef.current?.();
      }
    }, SIMULATION_STEP_MS);

    return () => {
      if (simulationTimerRef.current !== null) {
        window.clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      simulatingRef.current = false;
    };
  }, [simulationRunId]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
  );
}

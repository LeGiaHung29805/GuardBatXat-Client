'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface Props {
  startPos: [number, number];
  destPos: [number, number];
  onRouteFound?: (distance: number, duration: number) => void;
}

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

export default function RescueMapWithRouting({ startPos, destPos, onRouteFound }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    // CartoDB Positron — nền sáng nhẹ, đường nổi hơn OSM
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Popup style đẹp
    const popupOpts: L.PopupOptions = {
      className: 'custom-popup',
      closeButton: false,
      offset: [0, -8],
    };

    L.marker(startPos, { icon: startIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui,sans-serif;font-size:13px;min-width:130px;">
          <div style="font-weight:600;color:#1a1a1a;margin-bottom:2px;">Đội cứu hộ</div>
          <div style="color:#666;font-size:12px;">Điểm xuất phát</div>
        </div>`, popupOpts);

    L.marker(destPos, { icon: destIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui,sans-serif;font-size:13px;min-width:130px;">
          <div style="font-weight:600;color:#EA4335;margin-bottom:2px;">Hiện trường SOS</div>
          <div style="color:#666;font-size:12px;">Điểm cần đến</div>
        </div>`, popupOpts);

    // Routing
    import('leaflet-routing-machine').then(() => {
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
          styles: [
            { color: 'white',   weight: 11, opacity: 0.55 },
            { color: '#0D47A1', weight: 7,  opacity: 1.0  },
          ],
        },
        router: (L as any).Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving',
        }),
      }).addTo(map);

      const hidePanel = () => {
        const c = routing.getContainer();
        if (c) c.style.display = 'none';
      };
      routing.on('routingstart', hidePanel);
      routing.on('routesfound', (e: any) => {
        hidePanel();
        const summary = e.routes[0].summary;
        const rawKm  = summary.totalDistance / 1000;
        const distKm = Math.round(rawKm * 10) / 10;
        const durMin = Math.round(summary.totalTime / 60);
        onRouteFound?.(distKm, durMin);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
  );
}
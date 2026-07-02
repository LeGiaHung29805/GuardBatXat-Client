'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LatLngPoint = {
    lat: number;
    lng: number;
    remainingKm?: number;
    timestamp?: string;
};

type RescueTrackingUpdate = {
    missionId?: string | number;
    sosId?: string | number;
    status?: string;
    message?: string;
    lat?: number;
    lng?: number;
    remainingKm?: number;
    timestamp?: string;
};

type RescueRouteData = {
    missionId: string;
    start: [number, number];
    dest: [number, number];
    coordinates: [number, number][];
    distanceKm: number;
    durationMin: number;
    timestamp: string;
};

type RescueMapPosition = LatLngPoint & {
    message?: string;
};

const userIcon = L.divIcon({
    className: 'bg-transparent',
    html: '<div class="w-5 h-5 rounded-full border-4 border-white bg-blue-600 shadow-xl"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const shelterIcon = L.divIcon({
    className: 'bg-transparent',
    html: '<div class="flex h-6 w-6 animate-pulse items-center justify-center rounded-full border-4 border-white bg-red-600 shadow-xl"><div class="h-2 w-2 rounded-full bg-white"></div></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const rescueStartIcon = L.divIcon({
    className: 'bg-transparent',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:42px;height:42px;display:flex;align-items:center;justify-content:center;position:relative;">
          <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(66,133,244,0.15);animation:rescuePulse 2s ease-out infinite;"></div>
          <div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(66,133,244,0.08);animation:rescuePulse 2s ease-out infinite 0.6s;"></div>
          <div style="position:absolute;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.28);"></div>
          <div style="position:absolute;width:13px;height:13px;border-radius:50%;background:#2563eb;"></div>
        </div>
        <div style="background:#3b82f6;color:white;font-size:11px;font-weight:800;padding:3px 9px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 7px rgba(0,0,0,0.28);">Xuất phát</div>
      </div>
      <style>@keyframes rescuePulse{0%{transform:scale(0.5);opacity:0.9}100%{transform:scale(1.45);opacity:0}}</style>
    `,
    iconSize: [64, 56],
    iconAnchor: [32, 20],
});

const rescueSosIcon = L.divIcon({
    className: 'bg-transparent',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;width:38px;height:50px;">
          <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;background:rgba(239,68,68,0.2);animation:sosPulse 1.6s ease-out infinite;"></div>
          <svg viewBox="0 0 32 44" width="38" height="50" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))">
            <path d="M16 1C9.373 1 4 6.373 4 13c0 9.5 12 30 12 30S28 22.5 28 13C28 6.373 22.627 1 16 1z" fill="#ef4444"/>
            <circle cx="16" cy="13" r="6" fill="white"/>
            <circle cx="16" cy="13" r="3.5" fill="#ef4444"/>
          </svg>
        </div>
        <div style="background:#ef4444;color:white;font-size:11px;font-weight:900;padding:3px 10px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);letter-spacing:0.5px;">SOS</div>
      </div>
      <style>@keyframes sosPulse{0%{transform:translateX(-50%) scale(0.45);opacity:0.9}100%{transform:translateX(-50%) scale(1.65);opacity:0}}</style>
    `,
    iconSize: [58, 76],
    iconAnchor: [29, 58],
});

const toRoutePositions = (coordinates?: [number, number][]) =>
    (coordinates || []).filter((point) =>
        Array.isArray(point) &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number',
    );

const findClosestIndex = (coords: [number, number][], target: [number, number]) => {
    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < coords.length; i++) {
        const [lat, lng] = coords[i];
        const dist = Math.pow(lat - target[0], 2) + Math.pow(lng - target[1], 2);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = i;
        }
    }
    return closestIndex;
};

function MapController({
    selectedOption,
    userLocation,
    rescueRoutePositions,
    rescueTrackingPath,
}: {
    selectedOption: any;
    userLocation: { lat: number; lng: number } | null;
    rescueRoutePositions: [number, number][];
    rescueTrackingPath: LatLngPoint[];
}) {
    const map = useMap();
    const lastFitKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (rescueRoutePositions.length > 1) {
            const first = rescueRoutePositions[0];
            const last = rescueRoutePositions[rescueRoutePositions.length - 1];
            const fitKey = `rescue:${rescueRoutePositions.length}:${first.join(',')}:${last.join(',')}`;
            if (lastFitKeyRef.current === fitKey) return;

            map.fitBounds(L.latLngBounds(rescueRoutePositions), { padding: [70, 70], animate: true, duration: 1 });
            lastFitKeyRef.current = fitKey;
            return;
        }

        if (selectedOption?.route_coordinates?.length > 0) {
            const routeCoords = selectedOption.route_coordinates.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
            const first = routeCoords[0];
            const last = routeCoords[routeCoords.length - 1];
            const fitKey = `shelter:${selectedOption.destination?.id ?? 'route'}:${routeCoords.length}:${first.join(',')}:${last.join(',')}`;
            if (lastFitKeyRef.current === fitKey) return;

            map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50], animate: true, duration: 1 });
            lastFitKeyRef.current = fitKey;
            return;
        }

        if (userLocation && rescueTrackingPath.length > 1) {
            const pathCoords = rescueTrackingPath.map((point) => [point.lat, point.lng] as [number, number]);
            const first = pathCoords[0];
            const last = pathCoords[pathCoords.length - 1];
            const fitKey = `tracking:${pathCoords.length}:${first.join(',')}:${last.join(',')}`;
            if (lastFitKeyRef.current === fitKey) return;

            map.fitBounds(L.latLngBounds([[userLocation.lat, userLocation.lng], ...pathCoords]), {
                padding: [70, 70],
                animate: true,
                duration: 1,
            });
            lastFitKeyRef.current = fitKey;
            return;
        }

        if (userLocation) {
            const fitKey = `user:${userLocation.lat}:${userLocation.lng}`;
            if (lastFitKeyRef.current === fitKey) return;

            map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
            lastFitKeyRef.current = fitKey;
        }
    }, [selectedOption, userLocation, rescueRoutePositions, rescueTrackingPath, map]);

    return null;
}

export default function EvacuationMap({
    userLocation,
    options,
    selectedIndex,
    rescueTracking,
    rescueTrackingPath = [],
    rescueRoute,
}: {
    userLocation: { lat: number; lng: number } | null;
    options: any[];
    selectedIndex: number;
    rescueTracking?: RescueTrackingUpdate | null;
    rescueTrackingPath?: LatLngPoint[];
    rescueRoute?: RescueRouteData | null;
}) {
    const selectedOption = options?.length > 0 ? options[selectedIndex] : null;
    const rescuePosition: RescueMapPosition | null = rescueTracking &&
        typeof rescueTracking.lat === 'number' &&
        typeof rescueTracking.lng === 'number'
        ? {
            lat: rescueTracking.lat,
            lng: rescueTracking.lng,
            remainingKm: rescueTracking.remainingKm,
            timestamp: rescueTracking.timestamp,
            message: rescueTracking.message,
        }
        : null;

    const rescueRoutePositions = useMemo(
        () => toRoutePositions(rescueRoute?.coordinates),
        [rescueRoute],
    );
    const fallbackTrackingPositions = rescueTrackingPath
        .filter((point) => typeof point.lat === 'number' && typeof point.lng === 'number')
        .map((point) => [point.lat, point.lng] as [number, number]);

    const rescueMarkerPosition: [number, number] | null = rescuePosition
        ? [rescuePosition.lat, rescuePosition.lng]
        : rescueRoute?.start ?? null;

    const displayedRescueRoute = useMemo(() => {
        if (rescueRoutePositions.length > 1) {
            if (rescueMarkerPosition) {
                const closestIdx = findClosestIndex(rescueRoutePositions, rescueMarkerPosition);
                return [rescueMarkerPosition, ...rescueRoutePositions.slice(closestIdx + 1)];
            }
            return rescueRoutePositions;
        }
        return fallbackTrackingPositions;
    }, [rescueRoutePositions, rescueMarkerPosition, fallbackTrackingPositions]);

    const sosPosition: [number, number] | null = rescueRoute?.dest ??
        (userLocation ? [userLocation.lat, userLocation.lng] : null);

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={userLocation ? [userLocation.lat, userLocation.lng] : [22.6105, 103.8012]}
                zoom={15}
                className="z-0 h-full w-full"
            >
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                />
                <TileLayer
                    url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
                    attribution="Map tiles by Stamen Design"
                />

                <MapController
                    selectedOption={selectedOption}
                    userLocation={userLocation}
                    rescueRoutePositions={rescueRoutePositions}
                    rescueTrackingPath={rescueTrackingPath}
                />

                {!rescueRoute && userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup>Vị trí của bạn</Popup>
                    </Marker>
                )}

                {selectedOption?.route_coordinates?.length > 0 && (
                    <>
                        {userLocation && (
                            <Polyline
                                positions={[
                                    [userLocation.lat, userLocation.lng],
                                    selectedOption.route_coordinates[0],
                                ]}
                                color="#fde047"
                                weight={4}
                                dashArray="8, 8"
                                opacity={0.8}
                            />
                        )}
                        <Polyline
                            positions={selectedOption.route_coordinates}
                            color="#fde047"
                            weight={6}
                            opacity={0.9}
                            lineCap="round"
                            lineJoin="round"
                        />
                        <Polyline
                            positions={[
                                selectedOption.route_coordinates[selectedOption.route_coordinates.length - 1],
                                [selectedOption.destination.lat, selectedOption.destination.lng],
                            ]}
                            color="#fde047"
                            weight={4}
                            dashArray="8, 8"
                            opacity={0.8}
                        />
                        <Marker position={[selectedOption.destination.lat, selectedOption.destination.lng]} icon={shelterIcon}>
                            <Popup>
                                <div className="p-1 text-center">
                                    <strong className="mb-1 block text-base text-red-600">{selectedOption.destination.name}</strong>
                                    Sức chứa: <b className="text-green-600">{selectedOption.destination.available_capacity || (selectedOption.destination.max_capacity - selectedOption.destination.current_occupancy)} / {selectedOption.destination.max_capacity}</b> người<br />
                                    Tình trạng: <span className="font-semibold text-green-600">An toàn</span>
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}

                {displayedRescueRoute.length > 1 && (
                    <>
                        <Polyline
                            positions={displayedRescueRoute}
                            color="white"
                            weight={11}
                            opacity={0.65}
                            lineCap="round"
                            lineJoin="round"
                        />
                        <Polyline
                            positions={displayedRescueRoute}
                            color="#0d47a1"
                            weight={7}
                            opacity={1}
                            lineCap="round"
                            lineJoin="round"
                        />
                    </>
                )}

                {rescueMarkerPosition && (
                    <Marker position={rescueMarkerPosition} icon={rescueStartIcon}>
                        <Popup>
                            <div className="min-w-40 p-1">
                                <strong className="mb-1 block text-blue-700">Đội cứu hộ</strong>
                                {typeof rescuePosition?.remainingKm === 'number' && (
                                    <div>Còn khoảng <b>{rescuePosition.remainingKm} km</b> tới SOS</div>
                                )}
                                {rescueTracking?.message && (
                                    <div className="mt-1 text-xs text-slate-600">{rescueTracking.message}</div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {sosPosition && (rescueRoute || rescuePosition) && (
                    <Marker position={sosPosition} icon={rescueSosIcon}>
                        <Popup>
                            <div className="p-1 text-center">
                                <strong className="mb-1 block text-red-600">Tín hiệu SOS</strong>
                                Vị trí người gửi yêu cầu cứu hộ
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>

            {/*
                <div className="pointer-events-none absolute left-4 top-4 z-[1000] max-w-[calc(100%-2rem)] rounded-xl border border-blue-400/60 bg-slate-950/85 px-4 py-3 text-white shadow-2xl backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Đội cứu hộ đang di chuyển</p>
                    <p className="mt-1 text-sm font-bold">
                        {typeof rescuePosition?.remainingKm === 'number'
                            ? `Còn khoảng ${rescuePosition.remainingKm} km tới điểm SOS`
                            : 'Đã nhận tuyến cứu hộ trên bản đồ'}
                    </p>
                    {rescueRoute && (
                        <p className="mt-1 text-[11px] text-slate-400">
                            Tuyến xanh dương · {rescueRoute.distanceKm} km · {rescueRoute.durationMin} phút
                        </p>
                    )}
                </div>
            */}
        </div>
    );
}

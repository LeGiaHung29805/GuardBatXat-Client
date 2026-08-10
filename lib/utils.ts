import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getDistanceToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const x = pLng - aLng;
  const y = pLat - aLat;
  const dx = bLng - aLng;
  const dy = bLat - aLat;

  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq !== 0) {
    t = (x * dx + y * dy) / lenSq;
    t = Math.max(0, Math.min(1, t)); // clamp to segment
  }

  const projLat = aLat + t * dy;
  const projLng = aLng + t * dx;

  return getDistanceInMeters(pLat, pLng, projLat, projLng);
}

export function getDistanceToPolyline(
  pLat: number,
  pLng: number,
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length === 0) return Infinity;
  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = getDistanceToSegment(
      pLat,
      pLng,
      polyline[i][0],
      polyline[i][1],
      polyline[i + 1][0],
      polyline[i + 1][1]
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

export function findClosestIndex(
  coords: [number, number][],
  target: [number, number]
): number {
  if (!coords || coords.length === 0) return 0;
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
}

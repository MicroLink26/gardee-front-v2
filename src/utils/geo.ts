import type { User } from '../types';

export function getLatLng(user: User): [number, number] | null {
  const coords = user.location?.coordinates;
  if (!coords || coords.length < 2) return null;
  return [coords[1], coords[0]]; // GeoJSON [lng, lat] → Leaflet [lat, lng]
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Zamboanga City Map Bounds and Utilities
 * Restricts map views to Zamboanga City, Philippines
 */

// Zamboanga City approximate bounds
// North: 6.9°N, South: 6.8°N, East: 122.1°E, West: 121.9°E
export const ZAMBOANGA_CITY_BOUNDS = {
  north: 6.95,
  south: 6.80,
  east: 122.15,
  west: 121.85,
  center: [6.9271, 122.0789] as [number, number], // City center
};

/**
 * Check if a coordinate is within Zamboanga City bounds
 */
export function isWithinZamboangaCity(lat: number, lon: number): boolean {
  return (
    lat >= ZAMBOANGA_CITY_BOUNDS.south &&
    lat <= ZAMBOANGA_CITY_BOUNDS.north &&
    lon >= ZAMBOANGA_CITY_BOUNDS.west &&
    lon <= ZAMBOANGA_CITY_BOUNDS.east
  );
}

/**
 * Clamp a coordinate to Zamboanga City bounds
 */
export function clampToZamboangaCity(lat: number, lon: number): [number, number] {
  const clampedLat = Math.max(
    ZAMBOANGA_CITY_BOUNDS.south,
    Math.min(ZAMBOANGA_CITY_BOUNDS.north, lat)
  );
  const clampedLon = Math.max(
    ZAMBOANGA_CITY_BOUNDS.west,
    Math.min(ZAMBOANGA_CITY_BOUNDS.east, lon)
  );
  return [clampedLat, clampedLon];
}

/**
 * Filter points to only include those within Zamboanga City
 */
export function filterPointsInZamboangaCity<T extends { lat: number; lon: number }>(
  points: T[]
): T[] {
  return points.filter(p => isWithinZamboangaCity(p.lat, p.lon));
}

/**
 * Get Leaflet LatLngBounds for Zamboanga City
 */
export function getZamboangaCityBounds(L: any) {
  return L.latLngBounds(
    [ZAMBOANGA_CITY_BOUNDS.south, ZAMBOANGA_CITY_BOUNDS.west],
    [ZAMBOANGA_CITY_BOUNDS.north, ZAMBOANGA_CITY_BOUNDS.east]
  );
}

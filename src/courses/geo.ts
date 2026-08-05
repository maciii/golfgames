export interface GeoPoint {
  latitude: number
  longitude: number
}

/** Vzdálenost dvou bodů po povrchu Země v kilometrech. */
export function distanceKm(
  from: GeoPoint,
  latitude?: number,
  longitude?: number,
): number | undefined {
  if (latitude === undefined || longitude === undefined) return undefined

  const earthRadiusKm = 6371
  const lat1 = (from.latitude * Math.PI) / 180
  const lat2 = (latitude * Math.PI) / 180
  const deltaLat = ((latitude - from.latitude) * Math.PI) / 180
  const deltaLon = ((longitude - from.longitude) * Math.PI) / 180
  const halfChord =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(halfChord))
}

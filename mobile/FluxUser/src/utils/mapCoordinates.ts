import type {Region} from 'react-native-maps';

export type MapCoordinate = {latitude: number; longitude: number};

export const DEFAULT_MAP_COORDINATE: MapCoordinate = {
  latitude: 28.6139,
  longitude: 77.209,
};

const numberOrNull = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toMapCoordinate = (
  latitude: unknown,
  longitude: unknown,
): MapCoordinate | null => {
  const lat = numberOrNull(latitude);
  const lng = numberOrNull(longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return {latitude: lat, longitude: lng};
};

export const isMapCoordinate = (value: unknown): value is MapCoordinate => {
  const candidate = value as Partial<MapCoordinate> | null;
  return !!candidate && !!toMapCoordinate(candidate.latitude, candidate.longitude);
};

export const coordinateOrDefault = (
  value: Partial<MapCoordinate> | null | undefined,
  fallback: MapCoordinate = DEFAULT_MAP_COORDINATE,
): MapCoordinate => toMapCoordinate(value?.latitude, value?.longitude) || fallback;

export const normalizeMapRegion = (region?: Partial<Region> | null): Region => {
  const coordinate = coordinateOrDefault(region);
  const latitudeDelta = numberOrNull(region?.latitudeDelta);
  const longitudeDelta = numberOrNull(region?.longitudeDelta);
  return {
    ...coordinate,
    latitudeDelta:
      latitudeDelta !== null && latitudeDelta > 0 && latitudeDelta <= 180
        ? latitudeDelta
        : 0.025,
    longitudeDelta:
      longitudeDelta !== null && longitudeDelta > 0 && longitudeDelta <= 360
        ? longitudeDelta
        : 0.025,
  };
};

export const sanitizeRouteCoordinates = (value: unknown): MapCoordinate[] =>
  Array.isArray(value)
    ? value
        .map(point =>
          toMapCoordinate(
            (point as Partial<MapCoordinate>)?.latitude,
            (point as Partial<MapCoordinate>)?.longitude,
          ),
        )
        .filter((point): point is MapCoordinate => point !== null)
    : [];

export const distanceMetres = (a: MapCoordinate, b: MapCoordinate): number => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const isPlausibleLocationUpdate = (
  previous: {coordinate: MapCoordinate; timestamp: number} | null,
  coordinate: MapCoordinate,
  timestamp: number,
): boolean => {
  if (!previous) {
    return true;
  }
  const elapsedSeconds = Math.max((timestamp - previous.timestamp) / 1000, 1);
  return distanceMetres(previous.coordinate, coordinate) / elapsedSeconds <= 100;
};

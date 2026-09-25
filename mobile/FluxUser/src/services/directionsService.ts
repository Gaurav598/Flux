import axios from 'axios';
import {LOCATION_IQ_API_KEY, ROUTING_API_BASE_URL} from '../config/env';
import polyline from '@mapbox/polyline';
import {
  sanitizeRouteCoordinates,
  toMapCoordinate,
} from '../utils/mapCoordinates';

export interface RouteInfo {
  coordinates: {latitude: number; longitude: number}[];
  distanceKm: number;
  durationMin: number;
}

export const getDrivingRoute = async (
  origin: {latitude: number; longitude: number},
  destination: {latitude: number; longitude: number},
): Promise<RouteInfo | null> => {
  const safeOrigin = toMapCoordinate(origin?.latitude, origin?.longitude);
  const safeDestination = toMapCoordinate(
    destination?.latitude,
    destination?.longitude,
  );
  if (!safeOrigin || !safeDestination || !LOCATION_IQ_API_KEY) {
    return null;
  }
  try {
    const url = `${ROUTING_API_BASE_URL}/directions/driving/${safeOrigin.longitude},${safeOrigin.latitude};${safeDestination.longitude},${safeDestination.latitude}`;
    const response = await axios.get(url, {
      params: {
        key: LOCATION_IQ_API_KEY,
        geometries: 'polyline',
        overview: 'full',
      },
      timeout: 10000,
    });

    if (
      response.data &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      const route = response.data.routes[0];
      const encodedPolyline = route.geometry;
      
      // Decode polyline (returns array of [latitude, longitude])
      const decoded = polyline.decode(encodedPolyline);
      const coordinates = sanitizeRouteCoordinates(decoded.map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1],
      })));
      const distanceKm = Number(route.distance) / 1000;
      const durationMin = Number(route.duration) / 60;
      if (coordinates.length < 2 || !Number.isFinite(distanceKm) || !Number.isFinite(durationMin)) {
        return null;
      }

      return {
        coordinates,
        distanceKm,
        durationMin,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching driving route via LocationIQ:', error);
    return null;
  }
};

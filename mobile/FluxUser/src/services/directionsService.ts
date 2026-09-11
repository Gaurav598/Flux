import axios from 'axios';
import {LOCATION_IQ_API_KEY} from '../config/env';
import polyline from '@mapbox/polyline';

export interface RouteInfo {
  coordinates: {latitude: number; longitude: number}[];
  distanceKm: number;
  durationMin: number;
}

export const getDrivingRoute = async (
  origin: {latitude: number; longitude: number},
  destination: {latitude: number; longitude: number},
): Promise<RouteInfo | null> => {
  try {
    const url = `https://us1.locationiq.com/v1/directions/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
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
      const coordinates = decoded.map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1],
      }));

      return {
        coordinates,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching driving route via LocationIQ:', error);
    return null;
  }
};

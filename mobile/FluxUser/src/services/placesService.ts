import axios from 'axios';
import {LOCATION_IQ_API_KEY} from '../config/env';

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  type?: 'work' | 'transit' | 'airport' | 'area';
}

export const searchPlaces = async (
  query: string,
  location?: {latitude: number; longitude: number},
): Promise<PlaceResult[]> => {
  try {
    const params: any = {
      q: query,
      key: LOCATION_IQ_API_KEY,
      countrycodes: 'in',
      limit: 10,
    };

    if (location) {
      params.lat = location.latitude;
      params.lon = location.longitude;
    }

    const response = await axios.get(
      'https://api.locationiq.com/v1/autocomplete.php',
      {params, timeout: 8000},
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data.map((place: any) => ({
        id: place.place_id,
        name: place.address?.name || place.display_name.split(',')[0],
        address: place.display_place || place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
        type: place.class === 'highway' ? 'transit' : 'area',
      }));
    }

    return [];
  } catch (error) {
    console.error('Error searching places via LocationIQ:', error);
    return [];
  }
};

export const getPlaceDetails = async (
  placeId: string,
): Promise<{latitude: number; longitude: number} | null> => {
  // LocationIQ autocomplete already returns latitude/longitude, 
  // so we don't necessarily need a separate details call in most cases.
  return null;
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const response = await axios.get(
      'https://us1.locationiq.com/v1/reverse.php',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          key: LOCATION_IQ_API_KEY,
        },
        timeout: 8000,
      },
    );

    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }

    return 'Unknown location';
  } catch (error) {
    console.error('Error reverse geocoding via LocationIQ:', error);
    return 'Unknown location';
  }
};

export const getNearbyPlaces = async (
  latitude: number,
  longitude: number,
  radius: number = 5000,
): Promise<PlaceResult[]> => {
  try {
    const response = await axios.get(
      'https://us1.locationiq.com/v1/nearby.php',
      {
        params: {
          lat: latitude,
          lon: longitude,
          radius,
          key: LOCATION_IQ_API_KEY,
          format: 'json',
        },
        timeout: 8000,
      },
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data.slice(0, 10).map((place: any) => ({
        id: place.place_id,
        name: place.name || place.display_name.split(',')[0],
        address: place.display_name,
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting nearby places via LocationIQ:', error);
    return [];
  }
};

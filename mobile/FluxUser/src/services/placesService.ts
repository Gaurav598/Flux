import axios from 'axios';
import {GOOGLE_PLACES_API_KEY} from '../config/env';

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
      input: query,
      key: GOOGLE_PLACES_API_KEY,
      components: 'country:in',
    };

    if (location) {
      params.location = `${location.latitude},${location.longitude}`;
      params.radius = 50000;
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/autocomplete/json',
      {params, timeout: 8000},
    );

    if (response.data.status === 'OK') {
      const detailedPlaces = await Promise.all(
        response.data.predictions.slice(0, 10).map(async (prediction: any) => {
          const details = await getPlaceDetails(prediction.place_id);
          return {
            id: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            address: prediction.description,
            latitude: details?.latitude || 0,
            longitude: details?.longitude || 0,
          };
        }),
      );
      return detailedPlaces.filter(p => p.latitude !== 0);
    }

    return [];
  } catch (error) {
    console.error('Error searching places:', error);
    return [];
  }
};

export const getPlaceDetails = async (
  placeId: string,
): Promise<{latitude: number; longitude: number} | null> => {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'geometry',
          key: GOOGLE_PLACES_API_KEY,
        },
        timeout: 8000,
      },
    );

    if (response.data.status === 'OK') {
      const location = response.data.result.geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: GOOGLE_PLACES_API_KEY,
        },
        timeout: 8000,
      },
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }

    return 'Unknown location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
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
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${latitude},${longitude}`,
          radius,
          type: 'point_of_interest',
          key: GOOGLE_PLACES_API_KEY,
        },
        timeout: 8000,
      },
    );

    if (response.data.status === 'OK') {
      return response.data.results.slice(0, 10).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting nearby places:', error);
    return [];
  }
};

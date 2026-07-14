import Geolocation from 'react-native-geolocation-service';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GOOGLE_PLACES_API_KEY} from '../config/env';
export interface Location {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface LocationWithAddress extends Location {
  address?: string;
}

const LAST_LOCATION_KEY = 'flux_last_known_location';
const GEO_TIMEOUT_MS = 10000;

type CachedLocation = Location & {timestamp: number};

const toLocation = (coords: {
  latitude: number;
  longitude: number;
  heading?: number | null;
}): Location => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  heading: coords.heading ?? undefined,
});

const cacheLocation = async (location: Location) => {
  try {
    const payload: CachedLocation = {
      ...location,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache failures.
  }
};

const getCachedLocation = async (): Promise<Location | null> => {
  try {
    const value = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (!value) {
      return null;
    }
    const parsed = JSON.parse(value) as CachedLocation;
    if (
      !parsed ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number'
    ) {
      return null;
    }
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      heading: parsed.heading,
    };
  } catch {
    return null;
  }
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Location timed out')),
      timeoutMs,
    );
    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const getPositionOnce = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<Location> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve(
          toLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
          }),
        );
      },
      error => reject(error),
      {
        ...options,
        showLocationDialog: true,
        forceRequestLocation: true,
      },
    );
  });

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }

  if (Platform.OS === 'android') {
    const [fineAlreadyGranted, coarseAlreadyGranted] = await Promise.all([
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ),
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ),
    ]);
    if (fineAlreadyGranted || coarseAlreadyGranted) {
      return true;
    }

    const permissionResult = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    const fine =
      permissionResult[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const coarse =
      permissionResult[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
    if (
      fine === PermissionsAndroid.RESULTS.GRANTED ||
      coarse === PermissionsAndroid.RESULTS.GRANTED
    ) {
      return true;
    }

    if (
      fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
      coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ) {
      Alert.alert(
        'Enable Location Access',
        'Flux needs location permission to show nearby places. Please enable it from Settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }

    return false;
  }

  return false;
};

export const getCurrentLocation = async (): Promise<Location> => {
  try {
    const highAccuracy = await withTimeout(
      getPositionOnce({
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 5000,
      }),
      GEO_TIMEOUT_MS + 1000,
    );
    await cacheLocation(highAccuracy);
    return highAccuracy;
  } catch {}

  try {
    const lowAccuracy = await withTimeout(
      getPositionOnce({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 120000,
      }),
      8000,
    );
    await cacheLocation(lowAccuracy);
    return lowAccuracy;
  } catch {}

  const cached = await getCachedLocation();
  if (cached) {
    return cached;
  }

  throw new Error('Unable to fetch current location');
};

export const watchLocation = (
  onLocationChange: (location: Location) => void,
  onError?: (error: any) => void,
): number => {
  return Geolocation.watchPosition(
    position => {
      const location = toLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
      });
      cacheLocation(location).catch(() => undefined);
      onLocationChange(location);
    },
    error => {
      if (onError) {
        onError(error);
      }
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 3000,
      showLocationDialog: true,
      forceRequestLocation: true,
    },
  );
};

export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => {
    controller?.abort();
  }, 8000);

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`,
      controller ? {signal: controller.signal} : undefined,
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const components = data.results[0].address_components as any[];
      const sub = components.find(
        (c: any) =>
          c.types.includes('sublocality_level_1') ||
          c.types.includes('neighborhood'),
      );
      const city = components.find((c: any) => c.types.includes('locality'));
      if (sub && city) {
        return `${sub.long_name}, ${city.long_name}`;
      }
      return data.results[0].formatted_address
        .split(',')
        .slice(0, 2)
        .join(',')
        .trim();
    }
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
  } finally {
    clearTimeout(timeout);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

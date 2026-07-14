import Geolocation from 'react-native-geolocation-service';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Location {
  latitude: number;
  longitude: number;
}

const LAST_LOCATION_KEY = 'flux_rider_last_known_location';

const cacheLocation = async (location: Location) => {
  try {
    await AsyncStorage.setItem(
      LAST_LOCATION_KEY,
      JSON.stringify({
        ...location,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore cache errors.
  }
};

const getCachedLocation = async (): Promise<Location | null> => {
  try {
    const value = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (!value) {
      return null;
    }
    const parsed = JSON.parse(value) as Location;
    if (
      !parsed ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const getPositionOnce = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<Location> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => reject(error),
      {
        ...options,
        showLocationDialog: false,
        forceRequestLocation: false,
      },
    );
  });

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }

  const [fineAlreadyGranted, coarseAlreadyGranted] = await Promise.all([
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION),
  ]);
  if (fineAlreadyGranted || coarseAlreadyGranted) {
    return true;
  }

  const permissionResult = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);
  const fine = permissionResult[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = permissionResult[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
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
      'Flux Rider needs location permission. Please enable it from Settings.',
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
};

export const getCurrentLocation = async (): Promise<Location> => {
  try {
    const highAccuracy = await Promise.race<Location>([
      getPositionOnce({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }),
      new Promise<Location>((_, reject) =>
        setTimeout(() => reject(new Error('Location timed out')), 11000),
      ),
    ]);
    await cacheLocation(highAccuracy);
    return highAccuracy;
  } catch {}

  try {
    const lowAccuracy = await Promise.race<Location>([
      getPositionOnce({
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 120000,
      }),
      new Promise<Location>((_, reject) =>
        setTimeout(() => reject(new Error('Location timed out')), 8000),
      ),
    ]);
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
): number =>
  Geolocation.watchPosition(
    position => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      void cacheLocation(location);
      onLocationChange(location);
    },
    error => {
      if (onError) {
        onError(error);
      }
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 50,
      interval: 30000,
      fastestInterval: 15000,
      showLocationDialog: false,
      forceRequestLocation: false,
    },
  );

export const clearLocationWatch = (watchId: number): void => {
  Geolocation.clearWatch(watchId);
};

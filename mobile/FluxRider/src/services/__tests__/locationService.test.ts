import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import {PermissionsAndroid, Platform} from 'react-native';
import {getCurrentLocation, requestLocationPermission} from '../locationService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  Linking: {openSettings: jest.fn()},
  Platform: {OS: 'android'},
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn(),
    requestMultiple: jest.fn(),
  },
}));

describe('rider locationService', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    Object.defineProperty(Platform, 'OS', {value: 'android'});
    (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.DENIED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {value: originalPlatform});
  });

  it('accepts coarse Android location permission when fine permission is unavailable', async () => {
    await expect(requestLocationPermission()).resolves.toBe(true);
  });

  it('prompts Android to enable location services during lookup', async () => {
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementationOnce(
      success => success({coords: {latitude: 12.34, longitude: 56.78}}),
    );

    await getCurrentLocation();

    expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        showLocationDialog: true,
        forceRequestLocation: true,
      }),
    );
  });

  it('falls back to low accuracy location when high accuracy lookup fails', async () => {
    (Geolocation.getCurrentPosition as jest.Mock)
      .mockImplementationOnce((_success, error) =>
        error(new Error('GPS timeout')),
      )
      .mockImplementationOnce(success =>
        success({coords: {latitude: 12.34, longitude: 56.78}}),
      );

    await expect(getCurrentLocation()).resolves.toEqual({
      latitude: 12.34,
      longitude: 56.78,
    });
  });

  it('uses cached location when live lookups fail', async () => {
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (_success, error) => error(new Error('Location unavailable')),
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        latitude: 11.11,
        longitude: 22.22,
        timestamp: Date.now(),
      }),
    );

    await expect(getCurrentLocation()).resolves.toEqual({
      latitude: 11.11,
      longitude: 22.22,
      timestamp: expect.any(Number),
    });
  });
});

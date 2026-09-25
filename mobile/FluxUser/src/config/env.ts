import {
  API_BASE_URL as API_URL_ENV,
  SOCKET_URL as SOCKET_URL_ENV,
  LOCATION_IQ_API_KEY as LOCATION_IQ_API_KEY_ENV,
  ROUTING_API_BASE_URL as ROUTING_API_BASE_URL_ENV,
} from '@env';

const DEVELOPMENT_API_BASE_URL = 'http://localhost:8080/api';

const requireSecureReleaseUrl = (value: string | undefined, name: string): string => {
  const resolved = value?.trim();
  if (!resolved) {
    if (__DEV__) {
      return name === 'API_BASE_URL'
        ? DEVELOPMENT_API_BASE_URL
        : DEVELOPMENT_API_BASE_URL.replace(/\/api$/, '');
    }
    throw new Error(`${name} must be configured for a release build`);
  }

  if (!__DEV__ && !resolved.startsWith('https://')) {
    throw new Error(`${name} must use HTTPS in a release build`);
  }
  return resolved.replace(/\/$/, '');
};

export const API_BASE_URL = requireSecureReleaseUrl(API_URL_ENV, 'API_BASE_URL');
export const SOCKET_URL = requireSecureReleaseUrl(
  SOCKET_URL_ENV || API_BASE_URL.replace(/\/api$/, ''),
  'SOCKET_URL',
);
export const LOCATION_IQ_API_KEY = LOCATION_IQ_API_KEY_ENV || '';
export const ROUTING_API_BASE_URL = requireSecureReleaseUrl(
  ROUTING_API_BASE_URL_ENV || 'https://us1.locationiq.com/v1',
  'ROUTING_API_BASE_URL',
);

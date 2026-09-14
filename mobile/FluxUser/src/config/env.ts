import {
  API_BASE_URL as API_URL_ENV,
  SOCKET_URL as SOCKET_URL_ENV,
  LOCATION_IQ_API_KEY as LOCATION_IQ_API_KEY_ENV,
} from '@env';

const PRODUCTION_API_BASE_URL = 'http://13.206.15.170:8080/api';
const PRODUCTION_SOCKET_URL = 'http://13.206.15.170:8080';

// Release builds ignore @env so a stale Metro/dotenv cache cannot ship a dead API host.
export const API_BASE_URL = __DEV__
  ? API_URL_ENV || PRODUCTION_API_BASE_URL
  : PRODUCTION_API_BASE_URL;
export const SOCKET_URL = __DEV__
  ? SOCKET_URL_ENV || PRODUCTION_SOCKET_URL
  : PRODUCTION_SOCKET_URL;
export const LOCATION_IQ_API_KEY = LOCATION_IQ_API_KEY_ENV || '';

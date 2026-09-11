import {
  API_BASE_URL as API_URL_ENV,
  SOCKET_URL as SOCKET_URL_ENV,
  LOCATION_IQ_API_KEY as LOCATION_IQ_API_KEY_ENV,
} from '@env';

export const API_BASE_URL = API_URL_ENV || 'http://10.0.2.2:8080/api';
export const SOCKET_URL = SOCKET_URL_ENV || 'http://10.0.2.2:8080';
export const LOCATION_IQ_API_KEY = LOCATION_IQ_API_KEY_ENV || '';

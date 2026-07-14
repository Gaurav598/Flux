import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/env';
import {TOKEN_KEY} from '../constants/storageKeys';
import {Alert} from 'react-native';

let isLoggingOut = false;
let isRefreshing = false;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async config => {
    let token = await AsyncStorage.getItem(TOKEN_KEY);
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const tokenExpiry = await AsyncStorage.getItem('tokenExpiry');

    if (token && refreshToken && tokenExpiry && !isRefreshing) {
      const expiryTime = parseInt(tokenExpiry, 10);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (expiryTime - now < sevenDays) {
        isRefreshing = true;
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (response.data.accessToken) {
            token = response.data.accessToken;
            await AsyncStorage.setItem(TOKEN_KEY, response.data.accessToken);
            await AsyncStorage.setItem('tokenExpiry', String(now + 7776000000));
            if (response.data.refreshToken) {
              await AsyncStorage.setItem(
                'refreshToken',
                response.data.refreshToken,
              );
            }
          }
        } catch (err) {
          console.log('Token refresh failed:', err);
        } finally {
          isRefreshing = false;
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isLoggingOut
    ) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken && !isRefreshing) {
        isRefreshing = true;
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (response.data.accessToken) {
            const newToken = response.data.accessToken;
            await AsyncStorage.setItem(TOKEN_KEY, newToken);
            await AsyncStorage.setItem(
              'tokenExpiry',
              String(Date.now() + 7776000000),
            );
            if (response.data.refreshToken) {
              await AsyncStorage.setItem(
                'refreshToken',
                response.data.refreshToken,
              );
            }

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            isRefreshing = false;
            return api(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
          if (!isLoggingOut) {
            isLoggingOut = true;
            await AsyncStorage.multiRemove([
              TOKEN_KEY,
              'refreshToken',
              'tokenExpiry',
              'riderId',
              'riderProfile',
            ]);
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please login again.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    isLoggingOut = false;
                  },
                },
              ],
              {cancelable: false},
            );
          }
        }
      } else if (!isLoggingOut) {
        isLoggingOut = true;
        await AsyncStorage.multiRemove([
          TOKEN_KEY,
          'refreshToken',
          'tokenExpiry',
          'riderId',
          'riderProfile',
        ]);
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                isLoggingOut = false;
              },
            },
          ],
          {cancelable: false},
        );
      }
    }
    return Promise.reject(error);
  },
);

export default api;

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppDispatch} from '..';
import {loginSuccess, logout, setInitialized} from '../slices/authSlice';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_PROFILE_KEY,
} from '../../constants/storageKeys';

export const bootstrapAuth = () => async (dispatch: AppDispatch) => {
  try {
    const entries = await AsyncStorage.multiGet([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_PROFILE_KEY,
    ]);
    const token = entries.find(([key]) => key === TOKEN_KEY)?.[1];
    const refreshToken = entries.find(
      ([key]) => key === REFRESH_TOKEN_KEY,
    )?.[1];
    const userJson = entries.find(([key]) => key === USER_PROFILE_KEY)?.[1];

    if (token && userJson) {
      const user = JSON.parse(userJson);
      dispatch(
        loginSuccess({
          user,
          token,
          refreshToken: refreshToken || undefined,
        }),
      );
    }
  } catch (error) {
    console.error('Failed to bootstrap auth state', error);
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_PROFILE_KEY,
    ]);
    dispatch(logout());
  } finally {
    dispatch(setInitialized(true));
  }
};

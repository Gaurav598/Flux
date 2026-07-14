import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_PROFILE_KEY,
} from '../../constants/storageKeys';

interface User {
  id: string;
  name: string;
  phone: string;
  profilePhoto?: string;
  role: 'rider';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true, // Start as true to check stored session
  error: null,
};

// Check for stored session on app start
export const checkStoredSession = createAsyncThunk(
  'auth/checkStoredSession',
  async (_, {rejectWithValue}) => {
    try {
      const [token, profile] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        USER_PROFILE_KEY,
      ]);
      const accessToken = token[1];
      const userProfile = profile[1];

      if (accessToken && userProfile) {
        return {
          accessToken,
          user: JSON.parse(userProfile),
        };
      }
      return null;
    } catch (error) {
      return rejectWithValue('Failed to restore session');
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_PROFILE_KEY,
  ]);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken?: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken || null;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearAuth: state => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(checkStoredSession.pending, state => {
        state.loading = true;
      })
      .addCase(checkStoredSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
        state.loading = false;
      })
      .addCase(checkStoredSession.rejected, state => {
        state.loading = false;
      })
      .addCase(logout.fulfilled, state => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const {loginSuccess, setLoading, setError, clearAuth} =
  authSlice.actions;
export default authSlice.reducer;

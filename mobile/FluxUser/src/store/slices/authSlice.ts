import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  phone: string;
  profilePhoto?: string;
  role?: 'user' | 'rider';
}

interface AuthState {
  isAuthenticated: boolean;
  needsRegistration: boolean; // true when backend says isNewUser = true
  pendingToken: string | null; // holds the JWT while user fills in their name
  pendingRefreshToken: string | null;
  pendingUserId: string | null;
  pendingPhone: string | null;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  needsRegistration: false,
  pendingToken: null,
  pendingRefreshToken: null,
  pendingUserId: null,
  pendingPhone: null,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{user: User; token: string; refreshToken?: string}>,
    ) => {
      state.isAuthenticated = true;
      state.needsRegistration = false;
      state.pendingToken = null;
      state.pendingRefreshToken = null;
      state.pendingUserId = null;
      state.pendingPhone = null;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || null;
      state.isLoading = false;
    },
    // Called when backend returns isNewUser = true
    registrationRequired: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken?: string;
        userId: string;
        phone: string;
      }>,
    ) => {
      state.needsRegistration = true;
      state.isAuthenticated = false;
      state.pendingToken = action.payload.token;
      state.pendingRefreshToken = action.payload.refreshToken || null;
      state.pendingUserId = action.payload.userId;
      state.pendingPhone = action.payload.phone;
      state.isLoading = false;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.needsRegistration = false;
      state.pendingToken = null;
      state.pendingRefreshToken = null;
      state.pendingUserId = null;
      state.pendingPhone = null;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isLoading = false;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {...state.user, ...action.payload};
      }
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  logout,
  updateProfile,
  setInitialized,
  registrationRequired,
} = authSlice.actions;
export default authSlice.reducer;

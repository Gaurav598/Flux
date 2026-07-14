import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface Booking {
  id: string;
  type: 'ride' | 'errand' | 'parcel';
  status:
    | 'pending'
    | 'bidding'
    | 'accepted'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  description?: string;
  estimatedFare: number;
  finalFare?: number;
  user?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

export interface Bid {
  id: string;
  bookingId: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface RiderState {
  isOnline: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  availableBookings: Booking[];
  myBids: Bid[];
  activeBooking: Booking | null;
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  isLoading: boolean;
}

const initialState: RiderState = {
  isOnline: false,
  currentLocation: null,
  availableBookings: [],
  myBids: [],
  activeBooking: null,
  earnings: {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  },
  isLoading: false,
};

const riderSlice = createSlice({
  name: 'rider',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    toggleOnlineStatus: state => {
      state.isOnline = !state.isOnline;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    updateLocation: (
      state,
      action: PayloadAction<{latitude: number; longitude: number}>,
    ) => {
      state.currentLocation = action.payload;
    },
    setAvailableBookings: (state, action: PayloadAction<Booking[]>) => {
      state.availableBookings = action.payload;
    },
    addAvailableBooking: (state, action: PayloadAction<Booking>) => {
      const exists = state.availableBookings.find(
        b => b.id === action.payload.id,
      );
      if (!exists) {
        state.availableBookings.unshift(action.payload);
      }
    },
    removeAvailableBooking: (state, action: PayloadAction<string>) => {
      state.availableBookings = state.availableBookings.filter(
        b => b.id !== action.payload,
      );
    },
    addBid: (state, action: PayloadAction<Bid>) => {
      const existingIndex = state.myBids.findIndex(
        b => b.bookingId === action.payload.bookingId,
      );
      if (existingIndex >= 0) {
        state.myBids[existingIndex] = action.payload;
      } else {
        state.myBids.push(action.payload);
      }
    },
    setActiveBooking: (state, action: PayloadAction<Booking | null>) => {
      state.activeBooking = action.payload;
    },
    updateBookingStatus: (
      state,
      action: PayloadAction<{bookingId: string; status: Booking['status']}>,
    ) => {
      if (
        state.activeBooking &&
        state.activeBooking.id === action.payload.bookingId
      ) {
        state.activeBooking.status = action.payload.status;
      }
    },
    setEarnings: (
      state,
      action: PayloadAction<{
        today: number;
        thisWeek: number;
        thisMonth: number;
      }>,
    ) => {
      state.earnings = action.payload;
    },
  },
});

export const {
  setLoading,
  toggleOnlineStatus,
  setOnlineStatus,
  updateLocation,
  setAvailableBookings,
  addAvailableBooking,
  removeAvailableBooking,
  addBid,
  setActiveBooking,
  updateBookingStatus,
  setEarnings,
} = riderSlice.actions;

export default riderSlice.reducer;

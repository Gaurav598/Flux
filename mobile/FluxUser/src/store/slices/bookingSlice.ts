import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface RiderUser {
  id: number;
  fullName: string;
  mobileNumber: string;
}

export interface Rider {
  id: number;
  user: RiderUser;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistrationNumber: string;
  vehicleColor: string;
  averageRating: number;
  totalRides: number;
  totalRatings: number;
  status: string;
}

export interface Bid {
  id: number;
  rider: Rider;
  bidAmount: number;
  previousBidAmount?: number;
  isEdited?: boolean;
  status: string;
  createdAt: string;
}

export interface Booking {
  id: number;
  serviceType: string;
  vehicleType: string;
  status: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  errandDescription?: string;
  estimatedFare: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  finalFare?: number;
  rider?: Rider;
  createdAt: string;
  completedAt?: string;
}

interface BookingState {
  currentBooking: Booking | null;
  bids: Bid[];
  bookingHistory: Booking[];
  isLoading: boolean;
  biddingTimeLeft: number;
}

const initialState: BookingState = {
  currentBooking: null,
  bids: [],
  bookingHistory: [],
  isLoading: false,
  biddingTimeLeft: 0,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    createBooking: (state, action: PayloadAction<Booking>) => {
      state.currentBooking = action.payload;
      state.bids = [];
      state.biddingTimeLeft = 60; // 60 seconds bidding window
    },
    addBid: (state, action: PayloadAction<Bid>) => {
      const existingBidIndex = state.bids.findIndex(
        bid => bid.rider?.id === action.payload.rider?.id,
      );
      if (existingBidIndex >= 0) {
        state.bids[existingBidIndex] = action.payload;
      } else {
        state.bids.push(action.payload);
      }
    },
    acceptBid: (
      state,
      action: PayloadAction<{bidId: number; rider: Rider}>,
    ) => {
      if (state.currentBooking) {
        state.currentBooking.status = 'ACCEPTED';
        state.currentBooking.rider = action.payload.rider;
        const acceptedBid = state.bids.find(
          bid => bid.id === action.payload.bidId,
        );
        if (acceptedBid) {
          state.currentBooking.finalFare = acceptedBid.bidAmount;
        }
      }
    },
    updateBookingStatus: (state, action: PayloadAction<Booking['status']>) => {
      if (state.currentBooking) {
        state.currentBooking.status = action.payload;
      }
    },
    completeBooking: (state, _action: PayloadAction<{rating?: number}>) => {
      if (state.currentBooking) {
        state.currentBooking.status = 'completed';
        state.currentBooking.completedAt = new Date().toISOString();
        state.bookingHistory.unshift(state.currentBooking);
        state.currentBooking = null;
        state.bids = [];
      }
    },
    cancelBooking: state => {
      if (state.currentBooking) {
        state.currentBooking.status = 'cancelled';
        state.bookingHistory.unshift(state.currentBooking);
        state.currentBooking = null;
        state.bids = [];
      }
    },
    setBiddingTimeLeft: (state, action: PayloadAction<number>) => {
      state.biddingTimeLeft = action.payload;
    },
    setBookingHistory: (state, action: PayloadAction<Booking[]>) => {
      state.bookingHistory = action.payload;
    },
  },
});

export const {
  setLoading,
  createBooking,
  addBid,
  acceptBid,
  updateBookingStatus,
  completeBooking,
  cancelBooking,
  setBiddingTimeLeft,
  setBookingHistory,
} = bookingSlice.actions;

export default bookingSlice.reducer;

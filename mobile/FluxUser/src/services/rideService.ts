import api from '../config/api';
import {safeErrorMessage} from '../utils/safeErrorMessage';

export interface RideRequest {
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleType: string;
  serviceType?: string;
  maxFare?: number;
  userEnteredAmount?: number;
  distanceKm: number;
}

export interface Bid {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  rating: number;
  totalRides: number;
  vehicleType: string;
  vehicleNumber: string;
  bidAmount: number;
  etaMinutes: number;
  isVerified: boolean;
  profilePhoto?: string;
}

export interface Ride {
  id: string;
  userId: string;
  riderId?: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  vehicleType: string;
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'RIDER_ARRIVED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED';
  fare?: number;
  maxFare: number;
  distanceKm: number;
  createdAt: string;
  updatedAt: string;
}

export const createRideRequest = async (
  request: RideRequest,
): Promise<{rideId: string}> => {
  try {
    // Backend expects BookingRequest at POST /api/bookings
    const response = await api.post('/bookings', {
      serviceType: request.serviceType || 'RIDE',
      vehicleType: request.vehicleType,
      pickupAddress: request.pickupLocation.address,
      pickupLatitude: request.pickupLocation.latitude,
      pickupLongitude: request.pickupLocation.longitude,
      dropAddress: request.dropLocation.address,
      dropLatitude: request.dropLocation.latitude,
      dropLongitude: request.dropLocation.longitude,
      description: '',
      estimatedBudget: request.userEnteredAmount ?? null,
      estimatedDistance: request.distanceKm,
      userEnteredAmount: request.userEnteredAmount,
    });

    // Validate response
    if (!response || !response.data) {
      console.error('Invalid response from booking API', response);
      throw new Error('Invalid response from server when creating booking');
    }

    const bookingId =
      response.data.id ?? response.data.bookingId ?? response.data.rideId;
    if (!bookingId) {
      console.error('Booking API did not return id:', response.data);
      throw new Error(
        response.data?.message || 'Booking created but no id returned',
      );
    }

    // BookingController returns created Booking object; return its id as rideId
    return {rideId: String(bookingId)};
  } catch (error: any) {
    console.error('Error creating ride request:', {
      status: error?.response?.status,
      code: error?.code,
      message: error?.message,
    });
    throw new Error(safeErrorMessage(error, 'Failed to create ride request'));
  }
};

export const getRideBids = async (rideId: string): Promise<Bid[]> => {
  try {
    // Backend endpoint is /api/bids/booking/{bookingId}
    const response = await api.get(`/bids/booking/${rideId}`);
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching bids:', error);
    // Return empty array instead of throwing - no bids is a valid state
    return [];
  }
};

export const acceptBid = async (
  rideId: string,
  bidId: string,
): Promise<Ride> => {
  try {
    // Backend endpoint is /api/bids/{bidId}/accept
    const response = await api.post(`/bids/${bidId}/accept`);
    return response.data;
  } catch (error: any) {
    console.error('Error accepting bid:', error);
    throw new Error(safeErrorMessage(error, 'Failed to accept bid'));
  }
};

export const getRideDetails = async (rideId: string): Promise<any> => {
  try {
    // Backend endpoint is /api/bookings/{id}
    const response = await api.get(`/bookings/${rideId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching ride details:', error);
    throw new Error(safeErrorMessage(error, 'Failed to fetch ride details'));
  }
};

export const cancelRide = async (
  rideId: string,
  reason?: string,
): Promise<void> => {
  try {
    // Backend endpoint is /api/bookings/{id}/cancel
    await api.post(`/bookings/${rideId}/cancel`, null, {
      params: {reason: reason || 'User cancelled', byUser: true},
    });
  } catch (error: any) {
    console.error('Error cancelling ride:', error);
    throw new Error(safeErrorMessage(error, 'Failed to cancel ride'));
  }
};

export const getRideHistory = async (): Promise<Ride[]> => {
  try {
    const response = await api.get('/bookings/user/my-bookings');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching ride history:', error);
    throw new Error(safeErrorMessage(error, 'Failed to fetch ride history'));
  }
};

export const rateRide = async (
  rideId: string,
  rating: number,
  feedback?: string,
): Promise<void> => {
  try {
    await api.post(`/bookings/${rideId}/rate`, null, {
      params: {
        userRating: rating,
        userReview: feedback || '',
      },
    });
  } catch (error: any) {
    console.error('Error rating ride:', error);
    throw new Error(safeErrorMessage(error, 'Failed to rate ride'));
  }
};

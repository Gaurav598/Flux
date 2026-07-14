import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {useRoute, useNavigation} from '@react-navigation/native';
import api from '../config/api';
import {colors, darkMapStyle, normalizeVehicleId} from '../theme';
import {
  ApproachingVehicleMarker,
  UserLocationMarker,
} from '../components/MapMarkers';
import {GOOGLE_PLACES_API_KEY} from '../config/env';
import CardGradient from '../components/CardGradient';
import {
  clearLocationWatch,
  watchLocation,
  requestLocationPermission,
  getCurrentLocation,
} from '../services/locationService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Navigation,
  Phone,
  MessageCircle,
  CheckCircle,
  MapPin,
  DollarSign,
  User,
  AlertCircle,
} from 'lucide-react-native';

interface Booking {
  id: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  user: {
    fullName: string;
    mobileNumber: string;
  };
  verificationOtp: string;
  status: string;
  finalFare?: number;
  estimatedFare: number;
}

const RideTrackingScreen = () => {
  const {height: windowHeight} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const params = (route.params || {}) as {bookingId?: number; booking?: Booking};
  const resolvedBookingId = params.bookingId ?? params.booking?.id;

  const mapRef = useRef<MapView>(null);
  const watchIdRef = useRef<number | null>(null);
  const [booking, setBooking] = useState<Booking | null>(
    params.booking || null,
  );
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 28.6139,
    longitude: 77.209,
  });
  const [otp, setOtp] = useState('');
  const [rideStatus, setRideStatus] = useState<
    'ACCEPTED' | 'RIDER_EN_ROUTE' | 'RIDER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
  >('ACCEPTED');
  const [loading, setLoading] = useState(false);

  const asCoordinate = (value: unknown, fallback: number) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  const hasValidCoordinate = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && Math.abs(num) <= 180;
  };

  const fetchBookingDetails = useCallback(async () => {
    if (!resolvedBookingId) {
      return;
    }
    try {
      const response = await api.get(`/bookings/${resolvedBookingId}`);
      setBooking(response.data);
      const nextStatus = String(response.data?.status || 'ACCEPTED') as
        | 'ACCEPTED'
        | 'RIDER_EN_ROUTE'
        | 'RIDER_ARRIVED'
        | 'IN_PROGRESS'
        | 'COMPLETED';
      setRideStatus(nextStatus);
    } catch (error) {
      console.log('Error fetching booking:', error);
    }
  }, [resolvedBookingId]);

  useEffect(() => {
    if (!resolvedBookingId && !params.booking) {
      Alert.alert('Ride not found', 'Unable to load ride details.', [
        {text: 'OK', onPress: () => (navigation as any).replace('Home')},
      ]);
      return;
    }
    fetchBookingDetails();
    startLocationTracking();
    const interval = setInterval(fetchBookingDetails, 5000);
    return () => {
      clearInterval(interval);
      if (watchIdRef.current !== null) {
        clearLocationWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [fetchBookingDetails]);

  const handleOpenNavigation = () => {
    const dest =
      rideStatus === 'IN_PROGRESS'
        ? {
            lat: booking?.dropLatitude,
            lng: booking?.dropLongitude,
            label: booking?.dropAddress,
          }
        : {
            lat: booking?.pickupLatitude,
            lng: booking?.pickupLongitude,
            label: booking?.pickupAddress,
          };
    if (!dest.lat || !dest.lng) {
      return;
    }
    const url =
      Platform.OS === 'ios'
        ? `maps://?daddr=${dest.lat},${dest.lng}&dirflg=d`
        : `google.navigation:q=${dest.lat},${dest.lng}&mode=d`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`,
      ),
    );
  };

  const handleCancelRide = () => {
    if (rideStatus === 'IN_PROGRESS') {
      Alert.alert(
        'Cannot Cancel',
        'Cannot cancel a ride that is already in progress.',
      );
      return;
    }
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/bookings/${resolvedBookingId}/cancel`, null, {
              params: {reason: 'Rider cancelled', byUser: false},
            });
            Alert.alert('Cancelled', 'Ride cancelled.', [
              {text: 'OK', onPress: () => (navigation as any).replace('Home')},
            ]);
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel ride.');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (booking && mapRef.current) {
      const coordinates = [
        currentLocation,
        rideStatus === 'ACCEPTED' || rideStatus === 'RIDER_ARRIVED'
          ? {
              latitude: asCoordinate(
                booking.pickupLatitude,
                currentLocation.latitude,
              ),
              longitude: asCoordinate(
                booking.pickupLongitude,
                currentLocation.longitude,
              ),
            }
          : {
              latitude: asCoordinate(
                booking.dropLatitude,
                currentLocation.latitude,
              ),
              longitude: asCoordinate(
                booking.dropLongitude,
                currentLocation.longitude,
              ),
            },
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: Math.round(windowHeight * 0.42),
          left: 50,
        },
        animated: true,
      });
    }
  }, [booking, currentLocation, rideStatus, windowHeight]);

  const startLocationTracking = async () => {
    if (watchIdRef.current !== null) {
      return;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const initial = await getCurrentLocation();
      setCurrentLocation(initial);
      await api.patch('/rider/location', null, {
        params: {latitude: initial.latitude, longitude: initial.longitude},
      });
    } catch (error) {
      console.log('Initial location error:', error);
    }

    watchIdRef.current = watchLocation(
      ({latitude, longitude}) => {
        setCurrentLocation({latitude, longitude});
        api
          .patch('/rider/location', null, {
            params: {latitude, longitude},
          })
          .catch(console.log);
      },
      error => console.log('Location error:', error),
    );
  };

  const handleArrived = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        `/bookings/${resolvedBookingId}/rider-reached`,
      );
      setRideStatus('RIDER_ARRIVED');
      setBooking(response.data);
      Alert.alert('Success', 'User has been notified. OTP generated.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to mark arrival',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        `/bookings/${resolvedBookingId}/verify-otp`,
        null,
        {
          params: {otp},
        },
      );
      setRideStatus('IN_PROGRESS');
      setBooking(response.data);
      setOtp('');
      Alert.alert('Ride Started', 'Navigate to drop location');
    } catch (error: any) {
      Alert.alert(
        'Invalid OTP',
        error.response?.data?.message || 'Please check the OTP and try again',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    Alert.alert('Complete Ride', 'Have you reached the drop location?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setLoading(true);
            await api.post(`/bookings/${resolvedBookingId}/complete`);
            Alert.alert('Success', 'Ride completed successfully!', [
              {text: 'OK', onPress: () => (navigation as any).replace('Home')},
            ]);
          } catch (error: any) {
            Alert.alert(
              'Error',
              error.response?.data?.message || 'Failed to complete ride',
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleCallUser = () => {
    if (booking?.user?.mobileNumber) {
      Linking.openURL(`tel:${booking.user.mobileNumber}`);
    }
  };

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {resolvedBookingId ? 'Loading booking details...' : 'Ride details unavailable'}
        </Text>
      </View>
    );
  }

  const destination =
    rideStatus === 'ACCEPTED' ||
    rideStatus === 'RIDER_EN_ROUTE' ||
    rideStatus === 'RIDER_ARRIVED'
      ? {
          latitude: asCoordinate(booking.pickupLatitude, currentLocation.latitude),
          longitude: asCoordinate(
            booking.pickupLongitude,
            currentLocation.longitude,
          ),
        }
      : {
          latitude: asCoordinate(booking.dropLatitude, currentLocation.latitude),
          longitude: asCoordinate(booking.dropLongitude, currentLocation.longitude),
        };
  const canRenderDirections =
    hasValidCoordinate(currentLocation.latitude) &&
    hasValidCoordinate(currentLocation.longitude) &&
    hasValidCoordinate(destination.latitude) &&
    hasValidCoordinate(destination.longitude) &&
    Boolean(GOOGLE_PLACES_API_KEY);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={{
          ...currentLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}>
        <ApproachingVehicleMarker
          coordinate={currentLocation}
          vehicleId={normalizeVehicleId(
            (booking as any).rider?.vehicleType || (booking as any).serviceType,
          )}
        />

        {(rideStatus === 'ACCEPTED' ||
          rideStatus === 'RIDER_EN_ROUTE' ||
          rideStatus === 'RIDER_ARRIVED') && (
          <UserLocationMarker
            coordinate={{
              latitude: asCoordinate(
                booking.pickupLatitude,
                currentLocation.latitude,
              ),
              longitude: asCoordinate(
                booking.pickupLongitude,
                currentLocation.longitude,
              ),
            }}
          />
        )}

        {rideStatus === 'IN_PROGRESS' && (
          <Marker
            coordinate={{
              latitude: asCoordinate(
                booking.dropLatitude,
                currentLocation.latitude,
              ),
              longitude: asCoordinate(
                booking.dropLongitude,
                currentLocation.longitude,
              ),
            }}
            title="Drop Location">
            <View style={styles.dropMarker}>
              <MapPin size={24} color="white" fill="#EF4444" />
            </View>
          </Marker>
        )}

        {canRenderDirections && (
          <MapViewDirections
            origin={currentLocation}
            destination={destination}
            apikey={GOOGLE_PLACES_API_KEY}
            strokeWidth={4}
            strokeColor={colors.accent}
            onError={error => console.log('Directions error:', error)}
          />
        )}
      </MapView>

      <ScrollView
        style={[styles.bottomSheet, {maxHeight: windowHeight * 0.64}]}
        contentContainerStyle={[
          styles.bottomSheetContent,
          {paddingBottom: Math.max(insets.bottom + 20, 28)},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.statusBadge}>
          <View
            style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <View style={styles.userCard}>
          <CardGradient radius={20} />
          <View style={styles.userAvatar}>
            <User size={24} color={colors.accent} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {booking.user?.fullName || 'User'}
            </Text>
            <Text style={styles.userPhone}>
              {booking.user?.mobileNumber || 'Phone not available'}
            </Text>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[
                styles.callBtn,
                !booking.user?.mobileNumber && styles.callBtnDisabled,
              ]}
              onPress={handleCallUser}
              disabled={!booking.user?.mobileNumber}>
              <Phone size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.callBtn, styles.secondaryActionBtn, {backgroundColor: colors.surfaceHigh}]}
              onPress={() =>
                (navigation as any).navigate('Chat', {
                  bookingId: String(booking.id),
                  userName: booking.user?.fullName || 'User',
                })
              }>
              <MessageCircle size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.locationCard}>
          <CardGradient radius={20} />
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>
                {booking.pickupAddress}
              </Text>
            </View>
          </View>
          {booking.dropAddress && (
            <View style={styles.locationRow}>
              <View
                style={[styles.locationDot, {backgroundColor: colors.danger}]}
              />
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Drop</Text>
                <Text style={styles.locationAddress}>
                  {booking.dropAddress}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 3D Navigation Button */}
        <TouchableOpacity style={styles.navBtn} onPress={handleOpenNavigation}>
          <Navigation size={18} color={colors.onAccent} />
          <Text style={styles.navBtnText}>Open Navigation</Text>
        </TouchableOpacity>

        {(rideStatus === 'ACCEPTED' || rideStatus === 'RIDER_EN_ROUTE') && (
          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: '#10B981'}]}
            onPress={handleArrived}
            disabled={loading}>
            <CheckCircle size={20} color="white" />
            <Text style={styles.actionBtnText}>I've Arrived</Text>
          </TouchableOpacity>
        )}

        {rideStatus === 'RIDER_ARRIVED' && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter OTP from User</Text>
            <View style={styles.otpInputRow}>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor={colors.textMute}
              />
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length !== 4}>
                <Text style={styles.verifyBtnText}>Verify & Start</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.otpHint}>
              <AlertCircle size={14} color={colors.textSub} />
              <Text style={styles.otpHintText}>
                Ask the user for the 4-digit OTP
              </Text>
            </View>
          </View>
        )}

        {rideStatus === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={[styles.actionBtn, {backgroundColor: '#EF4444'}]}
            onPress={handleCompleteRide}
            disabled={loading}>
            <CheckCircle size={20} color="white" />
            <Text style={styles.actionBtnText}>Complete Ride</Text>
          </TouchableOpacity>
        )}

        <View style={styles.fareCard}>
          <DollarSign size={18} color="#10B981" />
          <Text style={styles.fareLabel}>Fare Amount</Text>
          <Text style={styles.fareAmount}>
            ₹{booking.finalFare || booking.estimatedFare}
          </Text>
        </View>

        {rideStatus !== 'IN_PROGRESS' && rideStatus !== 'COMPLETED' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}>
            <Text style={styles.cancelBtnText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  function getStatusColor() {
    switch (rideStatus) {
      case 'ACCEPTED':
        return '#3B82F6';
      case 'RIDER_ARRIVED':
        return '#F59E0B';
      case 'IN_PROGRESS':
        return '#10B981';
      case 'COMPLETED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  }

  function getStatusText() {
    switch (rideStatus) {
      case 'ACCEPTED':
        return 'Navigate to Pickup';
      case 'RIDER_ARRIVED':
        return 'Waiting for User';
      case 'RIDER_EN_ROUTE':
        return 'Navigate to Pickup';
      case 'IN_PROGRESS':
        return 'Ride in Progress';
      case 'COMPLETED':
        return 'Ride Completed';
      default:
        return 'Unknown';
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSub,
  },
  map: {
    flex: 1,
  },
  riderMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomSheetContent: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryActionBtn: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnDisabled: {
    backgroundColor: colors.textMute,
    opacity: 0.6,
  },
  locationCard: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginTop: 4,
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  otpContainer: {
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  otpInput: {
    flex: 1,
    height: 56,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  verifyBtn: {
    paddingHorizontal: 24,
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  otpHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  otpHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  navBtnText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  fareLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.success,
  },
});

export default RideTrackingScreen;

import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE, Polyline, UrlTile} from 'react-native-maps';
import {useRoute, useNavigation} from '@react-navigation/native';
import api from '../config/api';
import {getDrivingRoute} from '../services/directionsService';
import {
  Phone,
  MapPin,
  User,
  Clock,
  Navigation,
  Star,
  CheckCircle,
} from 'lucide-react-native';
import {colors, darkMapStyle, getVehicleImage, normalizeVehicleId} from '../theme';
import {ApproachingVehicleMarker, UserLocationMarker} from '../components/MapMarkers';
import CardGradient from '../components/CardGradient';

interface Booking {
  id: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  rider: {
    id: number;
    user: {
      fullName: string;
      mobileNumber: string;
    };
    averageRating: number;
    vehicleType: string;
    vehicleModel: string;
    vehicleRegistrationNumber: string;
    currentLatitude: number;
    currentLongitude: number;
  };
  status: string;
  estimatedFare: number;
  finalFare?: number;
}

const ActiveBookingScreen = () => {
  const {height: windowHeight} = useWindowDimensions();
  const route = useRoute();
  const navigation = useNavigation();
  const bookingId = Number((route.params as any)?.bookingId);

  const mapRef = useRef<MapView>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [userOtp, setUserOtp] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const animatedLatitude = useRef(new Animated.Value(0)).current;
  const animatedLongitude = useRef(new Animated.Value(0)).current;
  const cancelledHandled = useRef(false);
  const completedHandled = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AnimatedMarker = useMemo(
    () => Animated.createAnimatedComponent(Marker),
    [],
  );

  const asCoordinate = (value: unknown, fallback: number) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const fetchBookingDetails = useCallback(async () => {
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/bookings/${bookingId}`);
      const payload = response.data || {};
      const fallbackPickupLat = booking?.pickupLatitude || 28.6139;
      const fallbackPickupLng = booking?.pickupLongitude || 77.209;
      const fallbackDropLat = booking?.dropLatitude || fallbackPickupLat;
      const fallbackDropLng = booking?.dropLongitude || fallbackPickupLng;

      const newBooking = {
        ...payload,
        pickupLatitude: asCoordinate(payload.pickupLatitude, fallbackPickupLat),
        pickupLongitude: asCoordinate(payload.pickupLongitude, fallbackPickupLng),
        dropLatitude: asCoordinate(payload.dropLatitude, fallbackDropLat),
        dropLongitude: asCoordinate(payload.dropLongitude, fallbackDropLng),
        rider: payload.rider
          ? {
              ...payload.rider,
              currentLatitude: asCoordinate(
                payload.rider.currentLatitude,
                asCoordinate(payload.pickupLatitude, fallbackPickupLat),
              ),
              currentLongitude: asCoordinate(
                payload.rider.currentLongitude,
                asCoordinate(payload.pickupLongitude, fallbackPickupLng),
              ),
            }
          : null,
      };

      if (booking && newBooking.rider) {
        const newLat =
          newBooking.rider.currentLatitude || newBooking.pickupLatitude;
        const newLng =
          newBooking.rider.currentLongitude || newBooking.pickupLongitude;
        const oldLat = booking.rider?.currentLatitude || booking.pickupLatitude;
        const oldLng =
          booking.rider?.currentLongitude || booking.pickupLongitude;

        if (
          Math.abs(newLat - oldLat) > 0.0001 ||
          Math.abs(newLng - oldLng) > 0.0001
        ) {
          Animated.parallel([
            Animated.timing(animatedLatitude, {
              toValue: newLat,
              duration: 2000,
              useNativeDriver: false,
            }),
            Animated.timing(animatedLongitude, {
              toValue: newLng,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]).start();
        }
      } else if (newBooking.rider) {
        animatedLatitude.setValue(
          newBooking.rider.currentLatitude || newBooking.pickupLatitude,
        );
        animatedLongitude.setValue(
          newBooking.rider.currentLongitude || newBooking.pickupLongitude,
        );
      }

      setBooking(newBooking);

      if (newBooking.status === 'COMPLETED' && !completedHandled.current) {
        completedHandled.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        Alert.alert('Ride Completed', 'Thank you for using FLUX!', [
          {text: 'OK', onPress: () => (navigation as any).replace('Home')},
        ]);
      } else if (
        newBooking.status === 'CANCELLED_BY_RIDER' &&
        !cancelledHandled.current
      ) {
        cancelledHandled.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        Alert.alert(
          'Rider Cancelled',
          'The rider has cancelled. Finding another rider for you...',
          [
            {
              text: 'OK',
              onPress: () =>
                (navigation as any).replace('BidSelection', {bookingId}),
            },
          ],
        );
      }
    } catch (error) {
      console.log('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  }, [animatedLatitude, animatedLongitude, booking, bookingId, navigation]);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      setLoading(false);
      return;
    }

    fetchBookingDetails();
    fetchUserOtp();
    intervalRef.current = setInterval(fetchBookingDetails, 7000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchBookingDetails]);

  const fetchUserOtp = async () => {
    try {
      const response = await api.get('/user/profile');
      setUserOtp(response.data.fixedOtp || '0000');
    } catch (error) {
      console.log('Error fetching user OTP:', error);
      setUserOtp('0000');
    }
  };

  useEffect(() => {
    if (booking && booking.rider && mapRef.current) {
      const riderLocation = {
        latitude: booking.rider.currentLatitude || booking.pickupLatitude,
        longitude: booking.rider.currentLongitude || booking.pickupLongitude,
      };

      const coordinates = [
        riderLocation,
        {latitude: booking.pickupLatitude, longitude: booking.pickupLongitude},
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 100,
          right: 50,
          bottom: Math.round(windowHeight * 0.45),
          left: 50,
        },
        animated: true,
      });
    }
  }, [booking, windowHeight]);

  useEffect(() => {
    if (booking && booking.rider) {
      const riderLocation = {
        latitude: booking.rider.currentLatitude || booking.pickupLatitude,
        longitude: booking.rider.currentLongitude || booking.pickupLongitude,
      };
      const destination =
        booking.status === 'IN_PROGRESS'
          ? {
              latitude: booking.dropLatitude,
              longitude: booking.dropLongitude,
            }
          : {
              latitude: booking.pickupLatitude,
              longitude: booking.pickupLongitude,
            };
            
      getDrivingRoute(riderLocation, destination).then(res => {
        if (res && res.coordinates) {
          setRouteCoords(res.coordinates);
        }
      });
    }
  }, [
    booking?.status,
    booking?.rider?.currentLatitude,
    booking?.rider?.currentLongitude,
    booking?.pickupLatitude,
    booking?.pickupLongitude,
    booking?.dropLatitude,
    booking?.dropLongitude,
  ]);

  const handleCallRider = () => {
    if (booking?.rider?.user?.mobileNumber) {
      Linking.openURL(`tel:${booking.rider.user.mobileNumber}`);
    }
  };

  const handleCancelRide = () => {
    if (booking?.status === 'IN_PROGRESS') {
      Alert.alert(
        'Cannot Cancel',
        'You cannot cancel a ride that is already in progress.',
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
            await api.post(`/bookings/${bookingId}/cancel`, null, {
              params: {reason: 'User cancelled', byUser: true},
            });
            Alert.alert('Ride Cancelled', 'Your ride has been cancelled.', [
              {text: 'OK', onPress: () => (navigation as any).replace('Home')},
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel. Please try again.');
          }
        },
      },
    ]);
  };

  const getStatusInfo = () => {
    switch (booking?.status) {
      case 'ACCEPTED':
        return {
          color: colors.info,
          bg: colors.surfaceAlt,
          text: 'Rider is on the way',
          icon: Navigation,
        };
      case 'RIDER_ARRIVED':
        return {
          color: colors.warning,
          bg: colors.surfaceAlt,
          text: 'Rider has arrived',
          icon: MapPin,
        };
      case 'IN_PROGRESS':
        return {
          color: colors.success,
          bg: colors.surfaceAlt,
          text: 'Ride in progress',
          icon: CheckCircle,
        };
      default:
        return {
          color: colors.textMute,
          bg: colors.surfaceAlt,
          text: 'Processing',
          icon: Clock,
        };
    }
  };

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Invalid booking. Please start a new ride request.
        </Text>
      </View>
    );
  }

  if (loading || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (!booking.rider) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Waiting for rider information...</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo();
  const riderLocation = {
    latitude: booking.rider.currentLatitude || booking.pickupLatitude,
    longitude: booking.rider.currentLongitude || booking.pickupLongitude,
  };
  const vehicleId = normalizeVehicleId(
    booking.rider?.vehicleType || (booking as any).serviceType,
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        userInterfaceStyle="dark"
        initialRegion={{
          latitude: booking.pickupLatitude,
          longitude: booking.pickupLongitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <ApproachingVehicleMarker
          coordinate={riderLocation}
          vehicleId={vehicleId}
        />

        <UserLocationMarker
          coordinate={{
            latitude: booking.pickupLatitude,
            longitude: booking.pickupLongitude,
          }}
        />

        {booking.status !== 'ACCEPTED' &&
          booking.status !== 'RIDER_ARRIVED' && (
            <Marker
              coordinate={{
                latitude: booking.dropLatitude,
                longitude: booking.dropLongitude,
              }}
              title="Drop Location">
              <View style={styles.dropMarker}>
                <MapPin size={24} color="white" fill="#EF4444" />
              </View>
            </Marker>
          )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor={colors.accent}
          />
        )}
      </MapView>

      <ScrollView
        style={[styles.bottomSheet, {maxHeight: windowHeight * 0.62}]}
        contentContainerStyle={styles.bottomSheetContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBadge, {backgroundColor: statusInfo.bg}]}>
          <statusInfo.icon size={16} color={statusInfo.color} />
          <Text style={[styles.statusText, {color: statusInfo.color}]}>
            {statusInfo.text}
          </Text>
        </View>

        {(booking.status === 'ACCEPTED' ||
          booking.status === 'RIDER_ARRIVED') && (
          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Share this OTP with rider</Text>
            <Text style={styles.otpValue}>{userOtp}</Text>
            <Text style={styles.otpHint}>
              Rider will verify this to start the ride
            </Text>
          </View>
        )}

        <View style={styles.riderCard}>
          <CardGradient radius={20} />
          <View style={styles.riderAvatar}>
            <User size={24} color={colors.info} />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>{booking.rider.user.fullName}</Text>
            <View style={styles.ratingRow}>
              <Star size={14} color={colors.accent} fill={colors.accent} />
              <Text style={styles.ratingText}>
                {booking.rider.averageRating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.vehicleText}>
              {booking.rider.vehicleType} • {booking.rider.vehicleModel}
            </Text>
            <Text style={styles.vehicleNumber}>
              {booking.rider.vehicleRegistrationNumber}
            </Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCallRider}>
            <Phone size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationCard}>
          <CardGradient radius={20} />
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, {backgroundColor: '#10B981'}]} />
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
                style={[styles.locationDot, {backgroundColor: '#EF4444'}]}
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

        <View style={styles.fareCard}>
          <CardGradient radius={16} />
          <Text style={styles.fareLabel}>Fare Amount</Text>
          <Text style={styles.fareAmount}>
            ₹{booking.finalFare || booking.estimatedFare}
          </Text>
        </View>

        {booking.status !== 'IN_PROGRESS' && booking.status !== 'COMPLETED' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRide}>
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
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
  vehicleMarkerWrap: {
    width: 70,
    height: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  vehicleMarkerImg: {
    width: 68,
    height: 68,
  },
  vehicleMarkerShadow: {
    position: 'absolute',
    bottom: 0,
    width: 26,
    height: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  riderMarkerEmoji: {
    fontSize: 22,
  },
  riderMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
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
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  otpCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  otpValue: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 8,
    marginBottom: 8,
  },
  otpHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    marginBottom: 2,
  },
  vehicleNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMute,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 4,
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
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
  cancelButton: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    padding: 16,
    borderRadius: 16,
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSub,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.success,
  },
});

export default ActiveBookingScreen;

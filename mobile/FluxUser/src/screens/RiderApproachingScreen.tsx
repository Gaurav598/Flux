import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {
  Phone,
  MessageCircle,
  Navigation,
  User,
  Star,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import api from '../config/api';
import {GOOGLE_PLACES_API_KEY} from '../config/env';
import {colors, darkMapStyle, normalizeVehicleId} from '../theme';
import {
  ApproachingVehicleMarker,
  UserLocationMarker,
} from '../components/MapMarkers';

const RiderApproachingScreen = ({route, navigation}: any) => {
  const {height: windowHeight} = useWindowDimensions();
  const {bookingId} = route.params;
  const mapRef = useRef<MapView>(null);
  const [booking, setBooking] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<any>(null);
  const [eta, setEta] = useState<string>('Calculating...');
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      const bookingData = response.data;
      setBooking(bookingData);
      setLoading(false);
      setError(null);

      const status = bookingData.status?.toUpperCase();

      if (status === 'RIDER_ARRIVED' && bookingData.verificationOtp) {
        setOtp(bookingData.verificationOtp);
      }

      if (status === 'IN_PROGRESS') {
        navigation.replace('ActiveBooking', {bookingId});
      }

      if (status === 'COMPLETED') {
        navigation.replace('RatingScreen', {bookingId});
      }

      if (
        bookingData.rider?.currentLatitude &&
        bookingData.rider?.currentLongitude
      ) {
        setRiderLocation({
          latitude: bookingData.rider.currentLatitude,
          longitude: bookingData.rider.currentLongitude,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details');
      setLoading(false);
    }
  }, [bookingId, navigation]);

  useEffect(() => {
    fetchBookingDetails();
    const interval = setInterval(fetchBookingDetails, 7000);
    return () => clearInterval(interval);
  }, [fetchBookingDetails]);

  useEffect(() => {
    if (!booking || !mapRef.current) {
      return;
    }

    const coordinates: any[] = [];
    if (riderLocation) {
      coordinates.push(riderLocation);
    }
    if (booking.pickupLatitude && booking.pickupLongitude) {
      coordinates.push({
        latitude: booking.pickupLatitude,
        longitude: booking.pickupLongitude,
      });
    }

    if (coordinates.length === 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: {
          top: 120,
          right: 55,
          bottom: Math.round(windowHeight * 0.48),
          left: 55,
        },
        animated: true,
      });
    }
  }, [booking, riderLocation, windowHeight]);

  const handleCall = () => {
    const phoneNumber =
      booking?.rider?.user?.mobileNumber || booking?.rider?.mobileNumber;
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleChat = () => {
    navigation.navigate('Chat', {
      rideId: String(bookingId),
      riderName,
    });
  };

  const handleCancelRide = () => {
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
            Alert.alert('Cancelled', 'Ride cancelled successfully.', [
              {text: 'OK', onPress: () => navigation.replace('Home')},
            ]);
          } catch (cancelError: any) {
            Alert.alert(
              'Error',
              cancelError.response?.data?.message || 'Failed to cancel ride',
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Finding your rider...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchBookingDetails}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color={colors.danger} />
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const status = booking.status?.toUpperCase();
  const isRiderArrived = status === 'RIDER_ARRIVED';

  const riderName =
    booking.rider?.user?.fullName || booking.rider?.fullName || 'Rider';
  const riderRating = booking.rider?.averageRating || booking.rider?.rating || 5.0;
  const vehicleModel = booking.rider?.vehicleModel || booking.rider?.vehicleType || 'Vehicle';
  const vehicleNumber =
    booking.rider?.vehicleRegistrationNumber ||
    booking.rider?.vehicleNumber ||
    'N/A';
  const totalRides = booking.rider?.totalRides || 0;

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
        {riderLocation && (
          <ApproachingVehicleMarker
            coordinate={riderLocation}
            vehicleId={normalizeVehicleId(
              booking.rider?.vehicleType ||
                booking.rider?.vehicleModel ||
                booking.serviceType,
            )}
          />
        )}

        <UserLocationMarker
          coordinate={{
            latitude: booking.pickupLatitude,
            longitude: booking.pickupLongitude,
          }}
        />

        {riderLocation && (
          <MapViewDirections
            origin={riderLocation}
            destination={{
              latitude: booking.pickupLatitude,
              longitude: booking.pickupLongitude,
            }}
            apikey={GOOGLE_PLACES_API_KEY}
            strokeWidth={4}
            strokeColor={colors.accent}
            onReady={result => {
              const minutes = Math.ceil(result.duration);
              setEta(`${minutes} min${minutes !== 1 ? 's' : ''}`);
            }}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.topBadgeWrap} pointerEvents="box-none">
        <View style={styles.topBadge}>
          <Clock size={14} color={colors.text} />
          <Text style={styles.topBadgeText}>
            {isRiderArrived ? 'Rider arrived' : `Arriving in ${eta}`}
          </Text>
        </View>
      </SafeAreaView>

      <View style={styles.bottomSheet}>
        <View style={styles.grab} />
        <View style={styles.rowTop}>
          <View>
            <Text style={styles.riderName}>{riderName}</Text>
            <Text style={styles.vehicleText}>{vehicleModel} • {vehicleNumber}</Text>
          </View>
          <View style={styles.ratingChip}>
            <Star size={12} color={colors.accent} fill={colors.accent} />
            <Text style={styles.ratingText}>{Number(riderRating).toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{totalRides} rides completed</Text>
        </View>

        {isRiderArrived && otp ? (
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Share this OTP with your rider</Text>
            <Text style={styles.otpValue}>{otp}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Phone size={18} color={colors.text} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleChat}>
            <MessageCircle size={18} color={colors.text} />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
        </View>

        {!isRiderArrived && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRide}>
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  map: {flex: 1},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.bg,
  },
  loadingText: {marginTop: 12, color: colors.textSub, fontWeight: '700'},
  errorText: {marginTop: 12, textAlign: 'center', color: colors.danger, fontWeight: '700'},
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {color: colors.onAccent, fontWeight: '800'},
  riderMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pickupMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  topBadgeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  topBadgeText: {marginLeft: 6, color: colors.text, fontWeight: '700', fontSize: 12},
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: -2},
    elevation: 20,
  },
  grab: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: 10,
  },
  rowTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  riderName: {fontSize: 20, fontWeight: '900', color: colors.text},
  vehicleText: {fontSize: 13, fontWeight: '700', color: colors.textSub, marginTop: 2},
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  ratingText: {marginLeft: 4, color: colors.accent, fontWeight: '800', fontSize: 12},
  metaRow: {marginTop: 8},
  metaText: {fontSize: 12, color: colors.textMute, fontWeight: '700'},
  otpCard: {
    marginTop: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpTitle: {color: colors.textSub, fontSize: 12, fontWeight: '700'},
  otpValue: {color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 2, letterSpacing: 3},
  actionsRow: {flexDirection: 'row', marginTop: 14},
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  actionText: {marginLeft: 8, color: colors.text, fontWeight: '800'},
  cancelBtn: {
    marginTop: 12,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {color: colors.danger, fontWeight: '900'},
});

export default RiderApproachingScreen;

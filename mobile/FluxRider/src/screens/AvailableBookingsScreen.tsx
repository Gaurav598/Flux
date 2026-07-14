import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE, Polyline} from 'react-native-maps';
import {
  colors,
  darkMapStyle,
  getVehicleImage,
  normalizeVehicleId,
} from '../theme';
import {useSelector, useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../store';
import {setAvailableBookings, addBid} from '../store/slices/riderSlice';
import api from '../config/api';
import {
  getCurrentLocation as fetchCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  MapPin,
  ChevronRight,
  ArrowLeft,
  X,
  User,
  Info,
} from 'lucide-react-native';
import {Image} from 'react-native';
import CardGradient from '../components/CardGradient';

const AvailableBookingsScreen = ({navigation}: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const {availableBookings} = useSelector(
    (state: RootState) => state.rider,
  ) as any;
  const mapRef = useRef<MapView>(null);

  const currentBooking = availableBookings[currentIndex] ?? null;

  const isValidCoordinate = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && Math.abs(num) <= 180;
  };

  const fetchAvailableBookings = useCallback(
    async (lat?: number, lng?: number) => {
      const latitude = lat || currentLocation?.latitude || 28.6139;
      const longitude = lng || currentLocation?.longitude || 77.209;

      setLoading(true);
      try {
        const response = await api.get('/bookings/available', {
          params: {
            latitude,
            longitude,
            radius: 10.0,
          },
        });

        const rawBookings = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        const bookings = rawBookings
          .map((booking: any) => {
            const pickupLatitude = Number(booking.pickupLatitude);
            const pickupLongitude = Number(booking.pickupLongitude);
            const dropLatitude = Number(booking.dropLatitude);
            const dropLongitude = Number(booking.dropLongitude);

            if (
              !isValidCoordinate(pickupLatitude) ||
              !isValidCoordinate(pickupLongitude) ||
              !isValidCoordinate(dropLatitude) ||
              !isValidCoordinate(dropLongitude)
            ) {
              return null;
            }

            return {
              id: String(booking.id),
              type: booking.serviceType?.toLowerCase() || 'ride',
              vehicleType: booking.vehicleType || booking.serviceType || 'Bike',
              status: booking.status?.toLowerCase() || 'bidding',
              pickupLocation: {
                address: booking.pickupAddress || 'Pickup location',
                latitude: pickupLatitude,
                longitude: pickupLongitude,
              },
              dropLocation: {
                address: booking.dropAddress || 'Drop location',
                latitude: dropLatitude,
                longitude: dropLongitude,
              },
              description:
                booking.errandDescription || booking.parcelDescription,
              estimatedFare: booking.estimatedFare || 100,
              userAmount:
                booking.userEnteredAmount || booking.estimatedFare || 100,
              user: {
                id: String(booking.user?.id || ''),
                name: booking.user?.fullName || 'User',
                phone: booking.user?.mobileNumber || '',
                rating: 4.8,
              },
              createdAt: booking.createdAt || new Date().toISOString(),
            };
          })
          .filter(Boolean);

        dispatch(setAvailableBookings(bookings));
        setCurrentIndex(0);
      } catch (error: any) {
        console.log('Error fetching bookings:', error);
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to fetch available bookings',
        );
      } finally {
        setLoading(false);
      }
    },
    [currentLocation?.latitude, currentLocation?.longitude, dispatch],
  );

  const getCurrentLocation = useCallback(async () => {
    try {
      const position = await fetchCurrentLocation();
      const {latitude, longitude} = position;
      setCurrentLocation({latitude, longitude});
      await fetchAvailableBookings(latitude, longitude);
    } catch (error) {
      console.log('Location Error:', error);
      await fetchAvailableBookings(28.6139, 77.209);
    }
  }, [fetchAvailableBookings]);

  useEffect(() => {
    const initialize = async () => {
      const granted = await requestLocationPermission();
      if (granted) {
        await getCurrentLocation();
      } else {
        await fetchAvailableBookings(28.6139, 77.209);
      }
    };
    void initialize();
  }, [fetchAvailableBookings, getCurrentLocation]);

  useEffect(() => {
    if (currentBooking && mapRef.current) {
      const coords = [
        {
          latitude: currentBooking.pickupLocation.latitude,
          longitude: currentBooking.pickupLocation.longitude,
        },
        {
          latitude: currentBooking.dropLocation.latitude,
          longitude: currentBooking.dropLocation.longitude,
        },
      ];
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: {top: 50, right: 50, bottom: 50, left: 50},
        animated: true,
      });
    }
  }, [currentBooking]);

  useEffect(() => {
    if (availableBookings.length === 0) {
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }
      setBidAmount('');
      return;
    }

    if (currentIndex > availableBookings.length - 1) {
      setCurrentIndex(availableBookings.length - 1);
      setBidAmount('');
    }
  }, [availableBookings.length, currentIndex]);

  const handlePlaceBid = async () => {
    if (!currentBooking) {
      Alert.alert('Wait', 'Refreshing booking details. Please try again.');
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    const maxAllowed = currentBooking.userAmount + 80;

    if (amount > maxAllowed) {
      Alert.alert(
        'Limit Exceeded',
        `You can bid at most ₹80 more than user's price (Max: ₹${maxAllowed})`,
      );
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/bids', null, {
        params: {
          bookingId: currentBooking.id,
          bidAmount: amount,
        },
      });

      dispatch(addBid(response.data));
      Alert.alert('Success', 'Bid placed successfully!');
      setBidAmount('');
      handleNext();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to place bid',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (availableBookings.length === 0) {
      return;
    }

    if (currentIndex < availableBookings.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setBidAmount('');
    } else {
      // No more bookings
      dispatch(setAvailableBookings([]));
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const getServiceInfo = (type: string, vehicleType?: string) => {
    const vehicleId = normalizeVehicleId(vehicleType || type);
    const vehicleLabel = vehicleType || type;
    const isParcel = vehicleId === 'parcel' || type === 'parcel';
    return {
      icon: getVehicleImage(vehicleId),
      color: isParcel ? colors.info : colors.accent,
      label: `${vehicleLabel} Request`,
    };
  };

  if (loading && availableBookings.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Searching for nearby rides...</Text>
      </View>
    );
  }

  if (availableBookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Requests</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Image
              source={require('../../assets/icons/bike.png')}
              style={{width: 64, height: 64, opacity: 0.5}}
            />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No new requests within 10km. Stay online to get notified of new
            orders.
          </Text>
          <TouchableOpacity
            onPress={() => fetchAvailableBookings()}
            style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Requests</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Refreshing request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const serviceInfo = getServiceInfo(
    currentBooking.type,
    currentBooking.vehicleType,
  );

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: currentBooking.pickupLocation.latitude,
          longitude: currentBooking.pickupLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        <Polyline
          coordinates={[
            {
              latitude: currentBooking.pickupLocation.latitude,
              longitude: currentBooking.pickupLocation.longitude,
            },
            {
              latitude: currentBooking.dropLocation.latitude,
              longitude: currentBooking.dropLocation.longitude,
            },
          ]}
          strokeColor={colors.accent}
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
        <Marker
          coordinate={{
            latitude: currentBooking.pickupLocation.latitude,
            longitude: currentBooking.pickupLocation.longitude,
          }}>
          <View style={[styles.marker, {backgroundColor: colors.surface}]}>
            <User size={20} color={colors.text} />
          </View>
        </Marker>
        <Marker
          coordinate={{
            latitude: currentBooking.dropLocation.latitude,
            longitude: currentBooking.dropLocation.longitude,
          }}>
          <View style={[styles.marker, {backgroundColor: colors.danger}]}>
            <MapPin size={20} color="white" />
          </View>
        </Marker>
      </MapView>

      {/* Header Overlay */}
      <View style={[styles.headerOverlay, {paddingTop: insets.top + 8}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtnOverlay}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {availableBookings.length}
          </Text>
        </View>
      </View>

      {/* Booking Card */}
      <View
        style={[
          styles.cardContainer,
          {paddingBottom: Math.max(insets.bottom + 84, 96)},
        ]}>
        <View style={styles.card}>
          <CardGradient radius={24} />
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.serviceTag,
                  {backgroundColor: serviceInfo.color},
                ]}>
                <Image
                  source={serviceInfo.icon}
                  style={{width: 16, height: 16, tintColor: colors.onAccent}}
                />
                <Text style={styles.serviceLabel}>{serviceInfo.label}</Text>
              </View>
              <View style={styles.userContainer}>
                <User size={16} color={colors.textSub} />
                <Text style={styles.userName}>{currentBooking.user.name}</Text>
                <Text style={styles.userRating}>
                  ⭐ {currentBooking.user.rating}
                </Text>
              </View>
            </View>

            <View style={styles.vehicleRequirementBox}>
              <Image
                source={serviceInfo.icon}
                style={styles.vehicleRequirementImage}
                resizeMode="contain"
              />
              <View style={styles.vehicleRequirementTextWrap}>
                <Text style={styles.vehicleRequirementLabel}>
                  Required vehicle
                </Text>
                <Text style={styles.vehicleRequirementTitle}>
                  {currentBooking.vehicleType}
                </Text>
              </View>
            </View>

            <View style={styles.locationContainer}>
              <View style={styles.locationRow}>
                <View style={[styles.dot, {backgroundColor: colors.success}]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {currentBooking.pickupLocation.address}
                </Text>
              </View>
              <View style={styles.line} />
              <View style={styles.locationRow}>
                <View style={[styles.dot, {backgroundColor: colors.danger}]} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {currentBooking.dropLocation.address}
                </Text>
              </View>
            </View>

            {currentBooking.description && (
              <View style={styles.descriptionBox}>
                <Info size={14} color={colors.textSub} />
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {currentBooking.description}
                </Text>
              </View>
            )}

            <View style={styles.fareContainer}>
              <View>
                <Text style={styles.fareLabel}>User's Price</Text>
                <Text style={styles.fareAmount}>
                  ₹{currentBooking.userAmount}
                </Text>
              </View>
              <View style={styles.bidInputContainer}>
                <Text style={styles.bidLabel}>
                  Your Bid (Max ₹{currentBooking.userAmount + 80})
                </Text>
                <View style={styles.bidInputWrapper}>
                  <Text style={styles.currency}>₹</Text>
                  <TextInput
                    style={styles.bidInput}
                    value={bidAmount}
                    onChangeText={setBidAmount}
                    placeholder={String(currentBooking.userAmount)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <X size={24} color={colors.textSub} />
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bidBtn}
                onPress={handlePlaceBid}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <>
                    <Text style={styles.bidBtnText}>Place Bid</Text>
                    <ChevronRight size={20} color={colors.onAccent} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSub,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 15,
    color: colors.text,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtnOverlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  counterBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: 'center',
  },
  counterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 96,
    paddingTop: 10,
    backgroundColor: 'transparent',
    zIndex: 999,
    elevation: 999,
  },
  card: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 18,
    maxHeight: 440,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cardScroll: {
    maxHeight: 404,
  },
  cardScrollContent: {
    paddingBottom: 6,
  },
  bidInputContainer: {
    flex: 1,
    marginLeft: 16,
  },
  bidInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  rupeeSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSub,
    marginRight: 8,
  },
  bidInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onAccent,
    textTransform: 'uppercase',
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
    color: colors.textSub,
  },
  userRating: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    color: colors.accent,
  },
  vehicleRequirementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleRequirementImage: {width: 58, height: 42, marginRight: 12},
  vehicleRequirementTextWrap: {flex: 1},
  vehicleRequirementLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  vehicleRequirementTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSub,
    flex: 1,
  },
  line: {
    width: 2,
    height: 20,
    backgroundColor: colors.border,
    marginLeft: 3,
    marginVertical: 4,
  },
  descriptionBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  fareContainer: {
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fareLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fareAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.accent,
  },
  bidLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currency: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textSub,
    marginRight: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    marginRight: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textSub,
    marginLeft: 4,
  },
  bidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bidBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.onAccent,
    marginRight: 8,
  },
  marker: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  refreshBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
  },
  refreshText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvailableBookingsScreen;

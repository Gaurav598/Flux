import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {GOOGLE_PLACES_API_KEY} from '../../../config/env';
import {getRideDetails, cancelRide} from '../../../services/rideService';
import api from '../../../config/api';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Shield,
  Navigation,
  Check,
  User,
  Star,
  CreditCard,
  Home,
  Bike,
  CheckCircle2,
} from 'lucide-react-native';
import {colors, darkMapStyle, normalizeVehicleId} from '../../../theme';
import {
  ApproachingVehicleMarker,
  UserLocationMarker,
} from '../../../components/MapMarkers';
import CardGradient from '../../../components/CardGradient';
import {safeErrorMessage} from '../../../utils/safeErrorMessage';

type RootStackParamList = {
  UserTracking: {
    rideId: string;
    rider?: any;
    from?: string;
    to?: string;
    maxFare?: number;
  };
  UserHome: undefined;
};

type TrackingScreenRouteProp = RouteProp<RootStackParamList, 'UserTracking'>;
type TrackingScreenNavigationProp = any;

export default function TrackingScreen() {
  const {height: windowHeight} = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const route = useRoute<TrackingScreenRouteProp>();
  const navigation = useNavigation<TrackingScreenNavigationProp>();
  const {rideId, rider, from, to, maxFare} = route.params || ({} as any);

  const [phase, setPhase] = useState<
    'pickup' | 'enroute' | 'arrived' | 'completed'
  >('pickup');
  const [booking, setBooking] = useState<any>(null);
  const [etaSeconds, setEtaSeconds] = useState(
    Number.isFinite(Number(rider?.etaMinutes))
      ? Number(rider.etaMinutes) * 60
      : 5 * 60,
  );
  const [rideSeconds, setRideSeconds] = useState(0);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const asCoordinate = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const hasValidCoordinate = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) && Math.abs(num) <= 180;
  };

  const loadRideDetails = useCallback(async () => {
    if (!rideId) {
      return;
    }

    try {
      const rideDetails = await getRideDetails(rideId);
      setBooking(rideDetails);

      if (rideDetails.status === 'RIDER_ARRIVED') {
        setPhase('arrived');
      } else if (rideDetails.status === 'IN_PROGRESS') {
        setPhase('enroute');
      } else if (rideDetails.status === 'COMPLETED') {
        setPhase('completed');
      } else {
        setPhase('pickup');
      }
      if (rideDetails.verificationOtp) {
        setOtp(rideDetails.verificationOtp);
      }

      const riderLat = asCoordinate(rideDetails?.rider?.currentLatitude);
      const riderLng = asCoordinate(rideDetails?.rider?.currentLongitude);
      if (riderLat !== null && riderLng !== null) {
        setRiderLocation({
          latitude: riderLat,
          longitude: riderLng,
        });
      } else {
        const pickupLat = asCoordinate(rideDetails?.pickupLatitude);
        const pickupLng = asCoordinate(rideDetails?.pickupLongitude);
        if (pickupLat !== null && pickupLng !== null) {
          setRiderLocation({
            latitude: pickupLat,
            longitude: pickupLng,
          });
        }
      }
    } catch (error) {
      console.error('Error loading ride details:', error);
    }
  }, [rideId]);

  useEffect(() => {
    loadRideDetails();
    const interval = setInterval(loadRideDetails, 7000);

    return () => {
      clearInterval(interval);
    };
  }, [loadRideDetails]);

  useEffect(() => {
    const riderId = booking?.rider?.id;
    if (!riderId || phase === 'completed') {
      return;
    }

    const pollRiderLocation = async () => {
      try {
        const response = await api.get(`/rider/${riderId}/location`);
        const lat = asCoordinate(response?.data?.latitude);
        const lng = asCoordinate(response?.data?.longitude);
        if (lat !== null && lng !== null) {
          setRiderLocation({latitude: lat, longitude: lng});
        }
      } catch {
        // Ignore transient polling failures.
      }
    };

    pollRiderLocation();
    const interval = setInterval(pollRiderLocation, 7000);
    return () => clearInterval(interval);
  }, [booking?.rider?.id, phase]);

  useEffect(() => {
    if (phase !== 'pickup' || etaSeconds <= 0) {
      return;
    }
    const interval = setInterval(() => setEtaSeconds(s => s - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, etaSeconds]);

  useEffect(() => {
    if (phase !== 'enroute') {
      return;
    }
    const interval = setInterval(() => setRideSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const formatTime = (secs: number) =>
    `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(
      secs % 60,
    ).padStart(2, '0')}`;
  const etaDisplay = `${Math.ceil(etaSeconds / 60)} min`;

  const riderProfile = {
    name:
      booking?.rider?.user?.fullName ||
      rider?.riderName ||
      rider?.name ||
      'Rider',
    phone:
      booking?.rider?.user?.mobileNumber ||
      rider?.riderPhone ||
      rider?.phone ||
      '',
    vehicleNumber:
      booking?.rider?.vehicleRegistrationNumber ||
      rider?.vehicleNumber ||
      'Vehicle details pending',
    vehicle:
      booking?.rider?.vehicleModel ||
      booking?.rider?.vehicleType ||
      rider?.vehicle ||
      'Vehicle',
    bidAmount:
      Number(booking?.finalFare) ||
      Number(booking?.estimatedFare) ||
      Number(rider?.bidAmount) ||
      0,
  };

  const pickupCoords = {
    latitude: asCoordinate(booking?.pickupLatitude) ?? 28.6139,
    longitude: asCoordinate(booking?.pickupLongitude) ?? 77.209,
  };
  const dropCoords = {
    latitude: asCoordinate(booking?.dropLatitude) ?? pickupCoords.latitude,
    longitude: asCoordinate(booking?.dropLongitude) ?? pickupCoords.longitude,
  };
  const mapCenter = riderLocation || pickupCoords;
  const vehicleId = normalizeVehicleId(
    booking?.rider?.vehicleType ||
      booking?.serviceType ||
      rider?.vehicle ||
      rider?.vehicleType,
  );
  const destination = phase === 'pickup' || phase === 'arrived' ? pickupCoords : dropCoords;
  const canRenderDirections =
    Boolean(GOOGLE_PLACES_API_KEY) &&
    hasValidCoordinate(mapCenter.latitude) &&
    hasValidCoordinate(mapCenter.longitude) &&
    hasValidCoordinate(destination.latitude) &&
    hasValidCoordinate(destination.longitude);
  const pickupAddress = booking?.pickupAddress || from || 'Pickup location';
  const dropAddress = booking?.dropAddress || to || 'Drop location';
  const maxFareValue = Number(maxFare) || riderProfile.bidAmount;

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }
    const points = [mapCenter, destination].filter(
      point =>
        hasValidCoordinate(point?.latitude) && hasValidCoordinate(point?.longitude),
    ) as Array<{latitude: number; longitude: number}>;

    if (points.length < 2) {
      return;
    }

    mapRef.current.fitToCoordinates(points, {
      edgePadding: {top: 120, right: 56, bottom: 340, left: 56},
      animated: true,
    });
  }, [mapCenter, destination]);

  const handleCall = () => {
    if (riderProfile.phone) {
      Linking.openURL(`tel:${riderProfile.phone}`);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      {text: 'No', style: 'cancel'},
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelling(true);
            await cancelRide(rideId, 'User cancelled');
            navigation.navigate('UserHome');
          } catch (error: any) {
            Alert.alert('Error', safeErrorMessage(error, 'Failed to cancel ride'));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (phase === 'completed') {
    return (
      <CompletedScreen
        rider={riderProfile}
        fare={riderProfile.bidAmount}
        from={pickupAddress}
        to={dropAddress}
        navigation={navigation}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: mapCenter.latitude,
            longitude: mapCenter.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          mapType="standard"
          userInterfaceStyle="dark"
          customMapStyle={darkMapStyle}
          loadingEnabled={true}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}>
          <ApproachingVehicleMarker
            coordinate={mapCenter}
            vehicleId={vehicleId}
          />

          {(phase === 'pickup' || phase === 'arrived') && (
            <UserLocationMarker coordinate={pickupCoords} />
          )}

          <Marker coordinate={dropCoords} anchor={{x: 0.5, y: 0.5}}>
            <View style={styles.dropPin} />
          </Marker>

          {canRenderDirections && (
            <MapViewDirections
              origin={mapCenter}
              destination={destination}
              apikey={GOOGLE_PLACES_API_KEY}
              strokeWidth={4}
              strokeColor={colors.accent}
              onError={error => console.log('Directions error:', error)}
            />
          )}
        </MapView>
      </View>

      {/* Header Overlay */}
      <SafeAreaView style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('UserHome')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              {backgroundColor: phase === 'arrived' ? colors.success : colors.accent},
            ]}
          />
          <Text style={styles.statusText}>
            {phase === 'pickup'
              ? 'Coming'
              : phase === 'enroute'
              ? 'En Route'
              : 'Arrived'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom Interface */}
      <View style={styles.bottomContainer}>
        <ScrollView
          style={[styles.sheet, {maxHeight: windowHeight * 0.62}]}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHandle} />

          <View style={styles.riderRow}>
            <CardGradient radius={20} />
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={40} color={colors.textMute} />
              </View>
              <View style={styles.starBadge}>
                <Star size={12} color={colors.onAccent} fill={colors.onAccent} />
              </View>
            </View>

            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>{riderProfile.name}</Text>
              <View style={styles.vehicleRow}>
                <View style={styles.vehicleBadge}>
                  <Text style={styles.vehicleNumber}>
                    {riderProfile.vehicleNumber}
                  </Text>
                </View>
                <Text style={styles.vehicleModel}>
                  {riderProfile.vehicle}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleCall} style={styles.iconButton}>
                <Phone size={24} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Chat', {riderName: riderProfile.name, rideId})
                }
                style={[
                  styles.iconButton,
                  {marginLeft: 12, backgroundColor: colors.surfaceHigh},
                ]}>
                <MessageSquare size={24} color={colors.info} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {phase === 'pickup' ? 'ETA' : 'Time'}
              </Text>
              <Text style={styles.statValue}>
                {phase === 'pickup' ? etaDisplay : formatTime(rideSeconds)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fare</Text>
              <Text style={[styles.statValue, {color: colors.success}]}>
                ₹{riderProfile.bidAmount}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Saved</Text>
              <Text style={[styles.statValue, {color: colors.info}]}>
                ₹{Math.max(0, maxFareValue - riderProfile.bidAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <CardGradient radius={16} />
            <View style={styles.locationRow}>
              <View style={[styles.routeDot, {backgroundColor: colors.success}]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.locationRow}>
              <View style={[styles.routeDot, {backgroundColor: colors.danger}]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {dropAddress}
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={cancelling}
              style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sosButton}>
              <Shield size={18} color={colors.white} strokeWidth={3} />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </View>

          {phase === 'arrived' && (
            <View style={styles.arrivalOverlay}>
              <Animated.View
                style={{transform: [{scale: pulseAnim}], marginBottom: 24}}>
                <View style={styles.arrivalIcon}>
                  <Check size={48} color={colors.white} strokeWidth={4} />
                </View>
              </Animated.View>
              <Text style={styles.arrivalTitle}>{riderProfile.name} is here!</Text>
              <Text style={styles.arrivalSubtitle}>
                Verify vehicle number and share OTP with rider
              </Text>

              {otp && (
                <View style={styles.otpContainer}>
                  <Text style={styles.otpLabel}>Your OTP</Text>
                  <View style={styles.otpBoxes}>
                    {otp.split('').map((digit, i) => (
                      <View key={i} style={styles.otpBox}>
                        <Text style={styles.otpDigit}>{digit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setPhase('enroute')}
                style={styles.boardedButton}>
                <Text style={styles.boardedText}>I have boarded</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const CompletedScreen = ({rider, fare, _from, _to, navigation}: any) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.completedContent}>
          <Animated.View style={{transform: [{scale: scaleAnim}]}}>
            <View style={styles.completedIcon}>
              <Check size={64} color={colors.white} strokeWidth={4} />
            </View>
          </Animated.View>

          <Text style={styles.completedTitle}>Ride Completed!</Text>
          <Text style={styles.completedSubtitle}>
            Hope you had a great journey
          </Text>

          <View style={styles.receiptCard}>
            <CardGradient radius={40} />
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptLabel}>Trip Receipt</Text>
              <View style={styles.receiptBadge}>
                <Text style={styles.receiptId}>
                  #BYK-{Math.floor(1000 + Math.random() * 9000)}
                </Text>
              </View>
            </View>

            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <View style={styles.receiptIconText}>
                  <User size={16} color={colors.textSub} />
                  <Text style={styles.receiptRowLabel}>Captain</Text>
                </View>
                <Text style={styles.receiptRowValue}>{rider.name}</Text>
              </View>

              <View style={styles.receiptRow}>
                <View style={styles.receiptIconText}>
                  <Bike size={16} color={colors.textSub} />
                  <Text style={styles.receiptRowLabel}>Vehicle</Text>
                </View>
                <Text style={styles.receiptRowValue}>
                  {rider.vehicleNumber}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <View style={styles.receiptIconText}>
                  <CreditCard size={16} color={colors.textSub} />
                  <Text style={styles.receiptRowLabel}>Payment</Text>
                </View>
                <Text style={styles.receiptRowValue}>UPI / Cash</Text>
              </View>

              <View style={styles.receiptDashedLine} />

              <View style={styles.receiptTotalRow}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalValue}>₹{fare}</Text>
              </View>
            </View>
          </View>

          <View style={styles.ratingSection}>
            {!submitted ? (
              <>
                <Text style={styles.ratingTitle}>How was your Captain?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setRating(s)}
                      style={{marginLeft: 8}}>
                      <Star
                        size={40}
                        color={s <= rating ? colors.accent : colors.border}
                        fill={s <= rating ? colors.accent : 'transparent'}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <TouchableOpacity
                    onPress={() => setSubmitted(true)}
                    style={styles.submitButton}>
                    <Text style={styles.submitText}>Submit Review</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.thanksCard}>
                <CheckCircle2 size={32} color={colors.accent} strokeWidth={3} />
                <Text style={styles.thanksText}>Thanks for the feedback!</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('UserHome')}
            style={styles.homeButton}>
            <Home size={20} color={colors.onAccent} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  loaderText: {
    color: colors.textMute,
    fontWeight: '900',
    marginTop: 16,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  statusBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
  },
  statusDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    elevation: 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -10},
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  sheetContent: {paddingBottom: 40},
  sheetHandle: {
    width: 48,
    height: 6,
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 32,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 20,
    padding: 14,
  },
  avatarContainer: {position: 'relative'},
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  starBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accent,
    padding: 6,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  riderInfo: {flex: 1, marginLeft: 20},
  riderName: {fontSize: 20, fontWeight: '800', color: colors.text},
  vehicleRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4},
  vehicleBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSub,
    textTransform: 'uppercase',
  },
  vehicleModel: {
    fontSize: 12,
    color: colors.textMute,
    fontWeight: '700',
    marginLeft: 12,
  },
  actionRow: {flexDirection: 'row'},
  iconButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  statItem: {alignItems: 'center', flex: 1},
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {fontSize: 20, fontWeight: '900', color: colors.text},
  statDivider: {width: 1, height: 40, backgroundColor: colors.border},
  locationContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 16,
  },
  locationRow: {flexDirection: 'row', alignItems: 'center'},
  routeDot: {width: 12, height: 12, borderRadius: 6, marginRight: 16},
  locationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  buttonRow: {flexDirection: 'row', gap: 12},
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textMute,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sosButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#EF4444',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  sosText: {
    color: colors.white,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  arrivalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    zIndex: 50,
  },
  arrivalIcon: {
    backgroundColor: '#22C55E',
    padding: 32,
    borderRadius: 100,
    elevation: 20,
    shadowColor: '#22C55E',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  arrivalTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  arrivalSubtitle: {
    fontSize: 14,
    color: colors.textMute,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpContainer: {alignItems: 'center', marginBottom: 32, width: '100%'},
  otpLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  otpBoxes: {flexDirection: 'row', justifyContent: 'center', gap: 12},
  otpBox: {
    width: 56,
    height: 72,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {fontSize: 32, fontWeight: '900', color: colors.text},
  boardedButton: {
    backgroundColor: colors.accent,
    width: '100%',
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  boardedText: {
    color: colors.onAccent,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  completedContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  completedIcon: {
    backgroundColor: '#22C55E',
    padding: 32,
    borderRadius: 100,
    elevation: 20,
    shadowColor: '#22C55E',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    marginBottom: 32,
  },
  completedTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 16,
    color: colors.textMute,
    fontWeight: '700',
    marginTop: 8,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 40,
    padding: 32,
    marginTop: 40,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  receiptBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptId: {fontSize: 10, fontWeight: '900', color: colors.text},
  receiptDetails: {gap: 24},
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptIconText: {flexDirection: 'row', alignItems: 'center'},
  receiptRowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSub,
    marginLeft: 12,
  },
  receiptRowValue: {fontSize: 14, fontWeight: '900', color: colors.text},
  receiptDashedLine: {height: 1, backgroundColor: colors.border, marginVertical: 8},
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {fontSize: 20, fontWeight: '900', color: colors.text},
  totalValue: {fontSize: 32, fontWeight: '900', color: colors.success},
  ratingSection: {width: '100%', marginTop: 40, alignItems: 'center'},
  ratingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 24,
  },
  starsRow: {flexDirection: 'row', marginBottom: 32},
  submitButton: {
    backgroundColor: colors.accent,
    width: '100%',
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: colors.onAccent,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  thanksCard: {
    backgroundColor: colors.accentSoft,
    width: '100%',
    padding: 32,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  thanksText: {color: colors.accent, fontWeight: '900', marginTop: 16},
  homeButton: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 24,
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.onAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 12,
  },
  riderMarker: {
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.white,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  pickupPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: 'white',
  },
  dropPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'white',
  },
});

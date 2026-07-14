import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Animated,
  PanResponder,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSelector, useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../store';
import {
  toggleOnlineStatus,
  setEarnings,
  updateLocation,
} from '../store/slices/riderSlice';
import api from '../config/api';
import {
  getCurrentLocation as fetchCurrentLocation,
  requestLocationPermission,
} from '../services/locationService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Bell,
  Wallet,
  TrendingUp,
  Navigation,
  Clock,
  Shield,
  List,
} from 'lucide-react-native';
import {
  colors,
  darkMapStyle,
  getVehicleImage,
  normalizeVehicleId,
} from '../theme';
import CardGradient from '../components/CardGradient';

const INITIAL_SHEET_VISIBLE_RATIO = 0.55;
const EXPANDED_SHEET_VISIBLE_RATIO = 0.75;
const COLLAPSED_SHEET_VISIBLE_RATIO = 0.28;

const HomeScreen = ({navigation}: any) => {
  const {height} = useWindowDimensions();
  const maxSheetHeight = height * EXPANDED_SHEET_VISIBLE_RATIO;
  const initialSheetOffset =
    maxSheetHeight - height * INITIAL_SHEET_VISIBLE_RATIO;
  const collapsedSheetOffset =
    maxSheetHeight - height * COLLAPSED_SHEET_VISIBLE_RATIO;
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const {isOnline, earnings} = useSelector(
    (state: RootState) => state.rider,
  ) as any;
  const mapRef = useRef<MapView>(null);
  const sheetTranslateY = useRef(
    new Animated.Value(initialSheetOffset),
  ).current;
  const sheetOffsetRef = useRef(initialSheetOffset);

  const [location, setLocation] = useState({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.0122,
    longitudeDelta: 0.0121,
  });
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const snapSheetTo = useCallback(
    (offset: number) => {
      const nextOffset = Math.max(0, Math.min(collapsedSheetOffset, offset));
      sheetOffsetRef.current = nextOffset;
      Animated.spring(sheetTranslateY, {
        toValue: nextOffset,
        useNativeDriver: true,
        damping: 24,
        stiffness: 180,
        mass: 0.8,
      }).start();
    },
    [collapsedSheetOffset, sheetTranslateY],
  );

  useEffect(() => {
    snapSheetTo(initialSheetOffset);
  }, [initialSheetOffset, snapSheetTo]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
        Math.abs(gestureState.dy) > 4,
      onPanResponderMove: (_, gestureState) => {
        const nextOffset = Math.max(
          0,
          Math.min(
            collapsedSheetOffset,
            sheetOffsetRef.current + gestureState.dy,
          ),
        );
        sheetTranslateY.setValue(nextOffset);
      },
      onPanResponderRelease: (_, gestureState) => {
        const projectedOffset = sheetOffsetRef.current + gestureState.dy;
        const snapPoints = [0, initialSheetOffset, collapsedSheetOffset];
        const target = snapPoints.reduce((closest, point) =>
          Math.abs(point - projectedOffset) <
          Math.abs(closest - projectedOffset)
            ? point
            : closest,
        );
        snapSheetTo(target);
      },
    }),
  ).current;

  const getCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const position = await fetchCurrentLocation();
      const newLocation = {
        latitude: position.latitude,
        longitude: position.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
      };
      setLocation(newLocation);
      mapRef.current?.animateToRegion(newLocation, 800);
    } catch (error) {
      console.log('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const requestAndLoadLocation = useCallback(async () => {
    const granted = await requestLocationPermission();
    setHasLocationPermission(granted);
    if (!granted) {
      Alert.alert(
        'Location Required',
        'Please enable location permission to receive nearby bookings.',
      );
      return;
    }

    await getCurrentLocation();
  }, [getCurrentLocation]);

  const fetchRiderProfile = useCallback(async () => {
    try {
      const response = await api.get('/rider/profile');
      setProfile(response.data || null);
    } catch (error) {
      console.log('Error fetching rider profile:', error);
    }
  }, []);

  const fetchRealEarnings = useCallback(async () => {
    try {
      const response = await api.get('/rider/stats');
      dispatch(
        setEarnings({
          today: response.data.earningsToday || 0,
          thisWeek: response.data.earningsWeek || 0,
          thisMonth: response.data.earningsMonth || 0,
        }),
      );
    } catch (error) {
      console.log('Error fetching earnings:', error);
    }
  }, [dispatch]);

  const checkActiveRide = useCallback(async () => {
    try {
      const response = await api.get('/bookings/rider/active');
      if (response.status === 200 && response.data) {
        const booking = response.data;
        navigation.replace('RideTracking', {booking});
      }
    } catch {
      // no active ride
    }
  }, [navigation]);

  const startLocationTracking = useCallback(async () => {
    try {
      const position = await fetchCurrentLocation();
      const {latitude, longitude} = position;
      dispatch(updateLocation({latitude, longitude}));
      setLocation(prev => ({...prev, latitude, longitude}));
      api
        .patch('/rider/location', null, {
          params: {latitude, longitude},
        })
        .catch(console.log);
    } catch (error) {
      console.log('Location tracking error:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    requestAndLoadLocation();
    fetchRealEarnings();
    fetchRiderProfile();
    checkActiveRide();

    const rideCheckInterval = setInterval(checkActiveRide, 5000);
    return () => {
      clearInterval(rideCheckInterval);
    };
  }, [
    checkActiveRide,
    fetchRealEarnings,
    fetchRiderProfile,
    requestAndLoadLocation,
  ]);

  useEffect(() => {
    if (isOnline && hasLocationPermission) {
      void startLocationTracking();
      const interval = setInterval(() => {
        void startLocationTracking();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [hasLocationPermission, isOnline, startLocationTracking]);

  const vehicleType = profile?.vehicleType || 'Vehicle not set';
  const vehicleId = normalizeVehicleId(vehicleType);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;

      await api.patch('/rider/status', null, {
        params: {status: newStatus ? 'AVAILABLE' : 'OFFLINE'},
      });

      dispatch(toggleOnlineStatus());

      if (newStatus) {
        await startLocationTracking();
        Alert.alert(
          'You are now online',
          'You will receive booking notifications',
        );
      } else {
        Alert.alert('You are now offline', 'You will not receive new bookings');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update status',
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          customMapStyle={darkMapStyle}
          region={location}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}>
          <Circle
            center={location}
            radius={40}
            fillColor="rgba(66,133,244,0.1)"
            strokeColor="rgba(66,133,244,0.25)"
            strokeWidth={1}
          />
          <Marker
            coordinate={location}
            anchor={{x: 0.5, y: 0.5}}
            flat
            tracksViewChanges={false}>
            <View style={styles.blueDotOuter}>
              <View style={styles.blueDotInner} />
            </View>
          </Marker>
        </MapView>

        <View style={[styles.headerOverlay, {top: insets.top + 8}]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isOnline
                    ? colors.success
                    : colors.surfaceAlt,
                },
              ]}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}>
            <Bell size={22} color={colors.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.recenterBtn,
            {bottom: height * INITIAL_SHEET_VISIBLE_RATIO + 20},
          ]}
          onPress={getCurrentLocation}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Navigation size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          {height: maxSheetHeight, transform: [{translateY: sheetTranslateY}]},
        ]}>
        <CardGradient radius={32} />
        <View {...sheetPanResponder.panHandlers} style={styles.sheetDragZone}>
          <View style={styles.sheetHandle} />
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.bottomSheetContent,
            {paddingBottom: Math.max(insets.bottom + 84, 92)},
          ]}
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.onlineCard,
              {
                backgroundColor: isOnline
                  ? colors.successSoft
                  : colors.surfaceAlt,
              },
            ]}>
            <View style={styles.onlineCardLeft}>
              <Text style={styles.onlineLabel}>
                Go {isOnline ? 'Offline' : 'Online'}
              </Text>
              <Text style={styles.onlineSubtext}>
                {isOnline ? 'Stop receiving orders' : 'Start accepting orders'}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{false: colors.borderStrong, true: colors.success}}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.vehicleIdentityCard}
            onPress={() => navigation.navigate('Profile')}>
            <CardGradient radius={24} />
            <View style={styles.vehicleIconWrap}>
              <Image
                source={getVehicleImage(vehicleId)}
                style={styles.vehicleIdentityImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.vehicleIdentityTextWrap}>
              <Text style={styles.vehicleIdentityEyebrow}>
                Your active vehicle
              </Text>
              <Text style={styles.vehicleIdentityTitle}>
                {vehicleType} Rider
              </Text>
              <Text style={styles.vehicleIdentitySubtext}>
                Only matching requests are shown for bidding.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.earningsCard}>
            <CardGradient radius={24} />
            <View style={styles.earningsHeader}>
              <View style={styles.earningsIcon}>
                <Wallet size={18} color={colors.accent} />
              </View>
              <Text style={styles.earningsTitle}>Today's Earnings</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsAmount}>₹{earnings.today}</Text>
              <View style={styles.earningsBadge}>
                <TrendingUp size={12} color={colors.success} />
                <Text style={styles.earningsBadgeText}>+12%</Text>
              </View>
            </View>
            <View style={styles.earningsFooter}>
              <Text style={styles.earningsWeekly}>
                Weekly: ₹{earnings.thisWeek}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
                <Text style={styles.earningsLink}>View Details →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: colors.accentSoft}]}
              onPress={() => navigation.navigate('AvailableBookings')}>
              <List size={22} color={colors.accent} strokeWidth={2.5} />
              <Text style={styles.actionText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {backgroundColor: 'rgba(59,130,246,0.16)'},
              ]}
              onPress={() => navigation.navigate('MyBids')}>
              <Clock size={22} color={colors.info} strokeWidth={2.5} />
              <Text style={styles.actionText}>My Bids</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: colors.successSoft}]}
              onPress={() => navigation.navigate('Documents')}>
              <Shield size={22} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.actionText}>Docs</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mapContainer: {...StyleSheet.absoluteFillObject, overflow: 'hidden'},
  blueDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  blueDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4285F4',
  },
  headerOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetDragZone: {
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
  },
  bottomSheetContent: {
    paddingBottom: 92,
  },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  onlineCardLeft: {
    flex: 1,
  },
  onlineLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  onlineSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSub,
  },
  vehicleIdentityCard: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  vehicleIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleIdentityImage: {width: 68, height: 58},
  vehicleIdentityTextWrap: {flex: 1},
  vehicleIdentityEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vehicleIdentityTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 4,
  },
  vehicleIdentitySubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: 4,
  },
  earningsCard: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  earningsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.accent,
    marginRight: 12,
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningsBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.success,
    marginLeft: 4,
  },
  earningsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsWeekly: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSub,
  },
  earningsLink: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.accent,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
    marginTop: 8,
  },
});

export default HomeScreen;

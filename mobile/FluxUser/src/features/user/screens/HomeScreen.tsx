import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import MapView, {
  Marker,
  Circle,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import {
  colors,
  darkMapStyle,
  getMapVehicle,
  getVehicleImage,
  normalizeVehicleId,
} from '../../../theme';
import CardGradient from '../../../components/CardGradient';
import {VEHICLE_TYPES} from '../../../data/mockData';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import api from '../../../config/api';
import {
  getCurrentLocation,
  reverseGeocode,
  requestLocationPermission,
  watchLocation,
  clearLocationWatch,
} from '../../../services/locationService';
import {
  searchPlaces,
  getNearbyPlaces,
  PlaceResult,
} from '../../../services/placesService';
import {
  User,
  MapPin,
  Search,
  Clock,
  X,
  Crosshair,
  LocateFixed,
  Route,
  ArrowRight,
} from 'lucide-react-native';

const FALLBACK_LOCATION = 'Getting your location...';
const INITIAL_SHEET_VISIBLE_RATIO = 0.4;
const EXPANDED_SHEET_VISIBLE_RATIO = 0.75;
const COLLAPSED_SHEET_VISIBLE_RATIO = 0.4;

const HOME_RIDE_VEHICLE_TYPES = VEHICLE_TYPES.filter(v =>
  ['bike', 'auto', 'cab'].includes(v.id),
);

const HOME_VEHICLE_TYPES = HOME_RIDE_VEHICLE_TYPES;

type NearbyRider = {
  id?: number | string;
  vehicleType?: string;
  currentLatitude?: number;
  currentLongitude?: number;
};

const HomeScreen = ({navigation}: any) => {
  const {width, height} = useWindowDimensions();
  const maxSheetHeight = height * EXPANDED_SHEET_VISIBLE_RATIO;
  const initialSheetOffset =
    maxSheetHeight - height * INITIAL_SHEET_VISIBLE_RATIO;
  const collapsedSheetOffset =
    maxSheetHeight - height * COLLAPSED_SHEET_VISIBLE_RATIO;
  const {user} = useSelector((s: RootState) => s.auth);
  const mapRef = useRef<MapView>(null);
  const watchIdRef = useRef<number | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTranslateY = useRef(
    new Animated.Value(initialSheetOffset),
  ).current;
  const sheetOffsetRef = useRef(initialSheetOffset);

  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(FALLBACK_LOCATION);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [nearbyRiders, setNearbyRiders] = useState<NearbyRider[]>([]);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Pickup mode: 'current' = use GPS location, 'pin' = user picks on map
  const [pickupMode, setPickupMode] = useState<'current' | 'pin'>('current');
  const [pinCoords, setPinCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pinAddress, setPinAddress] = useState('');
  const [pinGeocoding, setPinGeocoding] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('bike');
  const [quickPlace, setQuickPlace] = useState<PlaceResult | null>(null);

  const initializeLocation = useCallback(async () => {
    try {
      setLoading(true);
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to find nearby places',
        );
        setCurrentLocation('Location unavailable');
        setLoading(false);
        return;
      }
      const coords = await getCurrentLocation();
      setCurrentCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (coords.heading != null && !isNaN(coords.heading)) {
        setHeading(coords.heading);
      }
      animateToCoords(coords);
      setCurrentLocation(
        `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      );
      setLoading(false);

      // Resolve address + nearby suggestions in the background so UI never blocks.
      void (async () => {
        const [addressResult, nearbyResult] = await Promise.allSettled([
          reverseGeocode(coords.latitude, coords.longitude),
          getNearbyPlaces(coords.latitude, coords.longitude),
        ]);

        if (addressResult.status === 'fulfilled' && addressResult.value) {
          setCurrentLocation(addressResult.value);
        }
        if (nearbyResult.status === 'fulfilled') {
          setPopularPlaces(nearbyResult.value);
        }
      })();

      watchIdRef.current = watchLocation(
        loc => {
          setCurrentCoords({latitude: loc.latitude, longitude: loc.longitude});
          if (loc.heading != null && !isNaN(loc.heading) && loc.heading >= 0) {
            setHeading(loc.heading);
          }
        },
        () => {},
      );
    } catch (error) {
      console.log('Location init failed:', error);
      setCurrentLocation('Unable to fetch location. Tap recenter to retry');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPlacesDebounced = useCallback(async () => {
    try {
      setSearchLoading(true);
      const results = await searchPlaces(
        searchText,
        currentCoords || undefined,
      );
      setSearchResults(results);
    } catch (e) {
      console.error('Error searching places:', e);
    } finally {
      setSearchLoading(false);
    }
  }, [currentCoords, searchText]);

  useEffect(() => {
    initializeLocation();
    return () => {
      if (watchIdRef.current !== null) {
        clearLocationWatch(watchIdRef.current);
      }
    };
  }, [initializeLocation]);

  const loadActiveBooking = useCallback(async () => {
    try {
      const response = await api.get('/bookings/user/active');
      setActiveBooking(response.data || null);
    } catch {
      setActiveBooking(null);
    }
  }, []);

  useEffect(() => {
    loadActiveBooking();
    const interval = setInterval(loadActiveBooking, 7000);
    return () => clearInterval(interval);
  }, [loadActiveBooking]);

  const loadNearbyRiders = useCallback(async () => {
    if (!currentCoords) {
      setNearbyRiders([]);
      return;
    }

    try {
      const response = await api.get('/rider/nearby', {
        params: {
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          radius: 5,
        },
      });
      const riders = Array.isArray(response.data) ? response.data : [];
      setNearbyRiders(
        riders.filter(
          rider =>
            Number.isFinite(Number(rider.currentLatitude)) &&
            Number.isFinite(Number(rider.currentLongitude)) &&
            (selectedVehicleId === 'parcel' ||
              normalizeVehicleId(rider.vehicleType) === selectedVehicleId),
        ),
      );
    } catch (error) {
      console.log('Unable to load nearby riders:', error);
    }
  }, [currentCoords, selectedVehicleId]);

  useEffect(() => {
    void loadNearbyRiders();
    const interval = setInterval(loadNearbyRiders, 8000);
    return () => clearInterval(interval);
  }, [loadNearbyRiders]);

  useEffect(() => {
    if (searchText.trim().length >= 2) {
      const t = setTimeout(searchPlacesDebounced, 500);
      return () => clearTimeout(t);
    } else {
      setSearchResults([]);
    }
  }, [searchPlacesDebounced, searchText]);

  const snapSheetTo = useCallback(
    (offset: number) => {
      const nextOffset = Math.max(0, Math.min(collapsedSheetOffset, offset));
      sheetOffsetRef.current = nextOffset;
      setSheetExpanded(nextOffset <= collapsedSheetOffset * 0.5);
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
        const target =
          gestureState.dy < -40 || gestureState.vy < -0.25
            ? 0
            : projectedOffset < collapsedSheetOffset * 0.5
            ? 0
            : collapsedSheetOffset;
        snapSheetTo(target);
      },
    }),
  ).current;

  const animateToCoords = (coords: {latitude: number; longitude: number}) => {
    mapRef.current?.animateToRegion(
      {
        ...coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      800,
    );
  };

  const handleRecenter = async () => {
    if (pickupMode === 'pin' && currentCoords) {
      // Switch back to current location mode
      setPickupMode('current');
      animateToCoords(currentCoords);
    } else if (currentCoords) {
      animateToCoords(currentCoords);
    } else {
      await initializeLocation();
    }
  };

  const handleTogglePickupMode = () => {
    if (pickupMode === 'current') {
      setPickupMode('pin');
      if (currentCoords) {
        setPinCoords(currentCoords);
        setPinAddress(currentLocation);
      }
    } else {
      setPickupMode('current');
      if (currentCoords) {
        animateToCoords(currentCoords);
      }
    }
  };

  const handleMapRegionChangeComplete = useCallback(
    (region: Region) => {
      if (pickupMode !== 'pin') {
        return;
      }
      const newCoords = {
        latitude: region.latitude,
        longitude: region.longitude,
      };
      setPinCoords(newCoords);
      // Debounced reverse geocode
      if (geocodeTimer.current) {
        clearTimeout(geocodeTimer.current);
      }
      geocodeTimer.current = setTimeout(async () => {
        try {
          setPinGeocoding(true);
          const addr = await reverseGeocode(
            newCoords.latitude,
            newCoords.longitude,
          );
          setPinAddress(addr);
        } catch {
          setPinAddress(
            `${newCoords.latitude.toFixed(4)}, ${newCoords.longitude.toFixed(
              4,
            )}`,
          );
        } finally {
          setPinGeocoding(false);
        }
      }, 400);
    },
    [pickupMode],
  );

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371,
      dLat = ((lat2 - lat1) * Math.PI) / 180,
      dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Get effective pickup info based on mode
  const getPickupInfo = () => {
    if (pickupMode === 'pin' && pinCoords) {
      return {coords: pinCoords, address: pinAddress || 'Selected location'};
    }
    return {coords: currentCoords, address: currentLocation};
  };

  const handleVehicleScrollEnd = (event: any) => {
    const cardWidth = width - 40;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    const nextVehicle = HOME_VEHICLE_TYPES[nextIndex];
    if (nextVehicle) {
      setSelectedVehicleId(nextVehicle.id);
    }
  };

  const getNavigationPayload = (place: PlaceResult, vehicle: any) => {
    const pickup = getPickupInfo();
    if (!pickup.coords) {
      Alert.alert('Error', 'Unable to get your pickup location');
      return null;
    }
    const distance = calculateDistance(
      pickup.coords.latitude,
      pickup.coords.longitude,
      place.latitude,
      place.longitude,
    );
    const baseMin = Number(vehicle?.baseMin) || 100;
    const baseFare = Math.max(Math.round((baseMin / 18) * distance), 30);
    return {
      pickup: pickup.address,
      pickupCoords: pickup.coords,
      drop: place.address,
      dropCoords: {latitude: place.latitude, longitude: place.longitude},
      distanceKm: Math.round(distance * 10) / 10,
      vehicle,
      maxFare: baseFare + 80,
    };
  };

  const handleQuickVehicleSelect = (vehicle: any) => {
    if (!quickPlace) {
      return;
    }
    const payload = getNavigationPayload(quickPlace, vehicle);
    if (!payload) {
      return;
    }
    setQuickPlace(null);
    setSelectedVehicleId(vehicle.id);
    navigation.navigate('SetPrice', payload);
  };

  const handleSelectPlace = (place: PlaceResult) => {
    const selectedVehicle =
      HOME_VEHICLE_TYPES.find(v => v.id === selectedVehicleId) ||
      HOME_VEHICLE_TYPES[0];
    const payload = getNavigationPayload(place, selectedVehicle);
    if (!payload) {
      return;
    }
    navigation.navigate('SelectRide', payload);
  };

  const pickupInfo = getPickupInfo();
  const selectedVehicleIndex = Math.max(
    0,
    HOME_VEHICLE_TYPES.findIndex(v => v.id === selectedVehicleId),
  );
  const canSwipeToMoreVehicles =
    selectedVehicleIndex < HOME_VEHICLE_TYPES.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: currentCoords?.latitude ?? 28.6139,
            longitude: currentCoords?.longitude ?? 77.209,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          customMapStyle={darkMapStyle}
          onRegionChangeComplete={handleMapRegionChangeComplete}>
          {/* User location - Google Maps style blue dot with direction cone */}
          {nearbyRiders.map((rider, index) => {
            const mapVehicle = getMapVehicle(
              normalizeVehicleId(rider.vehicleType),
            );
            return (
              <Marker
                key={`${rider.id || 'nearby'}-${index}`}
                coordinate={{
                  latitude: Number(rider.currentLatitude),
                  longitude: Number(rider.currentLongitude),
                }}
                anchor={{x: 0.5, y: 0.5}}
                flat
                tracksViewChanges={false}>
                <Image
                  source={mapVehicle.source}
                  style={styles.nearbyVehicleMarker}
                  resizeMode="contain"
                />
              </Marker>
            );
          })}
          {currentCoords && (
            <>
              {/* Direction cone - light blue fan showing heading */}
              <Marker
                coordinate={currentCoords}
                anchor={{x: 0.5, y: 0.5}}
                flat
                rotation={heading}
                tracksViewChanges={true}>
                <View style={styles.directionContainer}>
                  <View style={styles.directionCone} />
                </View>
              </Marker>
              {/* Accuracy circle */}
              <Circle
                center={currentCoords}
                radius={40}
                fillColor="rgba(66,133,244,0.1)"
                strokeColor="rgba(66,133,244,0.25)"
                strokeWidth={1}
              />
              {/* Blue dot */}
              <Marker
                coordinate={currentCoords}
                anchor={{x: 0.5, y: 0.5}}
                flat
                tracksViewChanges={false}>
                <View style={styles.blueDotOuter}>
                  <View style={styles.blueDotInner} />
                </View>
              </Marker>
            </>
          )}
        </MapView>

        {/* Fixed center pin for pickup (Rapido style) - only in pin mode */}
        {pickupMode === 'pin' && (
          <View
            style={[
              styles.fixedPinContainer,
              {top: height / 2 - 48, left: width / 2 - 16},
            ]}
            pointerEvents="none">
            <View style={styles.fixedPinShadow} />
            <View style={styles.fixedPin}>
              <View style={styles.fixedPinHead} />
              <View style={styles.fixedPinStick} />
            </View>
          </View>
        )}

        {/* Pin address badge - shows when in pin mode */}
        {pickupMode === 'pin' && (
          <View style={[styles.pinAddressBadge, {top: height / 2 + 12}]}>
            <View style={styles.pinAddressDot} />
            <Text style={styles.pinAddressText} numberOfLines={1}>
              {pinGeocoding
                ? 'Getting address...'
                : pinAddress || 'Move map to set pickup'}
            </Text>
          </View>
        )}

        {/* Header overlay on map */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}>
            {user?.profilePhoto ? (
              <View style={styles.profilePhotoCircle} />
            ) : (
              <User size={22} color={colors.text} />
            )}
          </TouchableOpacity>
          <View style={styles.locationBadge}>
            <View
              style={[
                styles.locationDot,
                pickupMode === 'pin' && {backgroundColor: '#3B82F6'},
              ]}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {loading ? 'Locating...' : pickupInfo.address}
            </Text>
          </View>
        </View>

        {activeBooking?.id ? (
          <TouchableOpacity
            style={styles.ongoingRideBtn}
            onPress={() =>
              navigation.navigate('UserTracking', {
                rideId: String(activeBooking.id),
              })
            }>
            <Route size={16} color="white" strokeWidth={2.8} />
            <Text style={styles.ongoingRideText}>Ongoing Ride</Text>
          </TouchableOpacity>
        ) : null}

        {/* Map action buttons — bottom right */}
        <View style={styles.mapActions}>
          {/* Toggle pickup mode button */}
          <TouchableOpacity
            style={[
              styles.mapActionBtn,
              pickupMode === 'pin' && styles.mapActionBtnActive,
            ]}
            onPress={handleTogglePickupMode}>
            <MapPin
              size={20}
              color={pickupMode === 'pin' ? '#000' : colors.text}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          {/* Recenter button */}
          <TouchableOpacity
            style={[styles.mapActionBtn, {marginTop: 10}]}
            onPress={handleRecenter}>
            {pickupMode === 'pin' ? (
              <LocateFixed size={20} color="#3B82F6" strokeWidth={2.5} />
            ) : (
              <Crosshair size={20} color={colors.text} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>

      <Animated.View
        style={[
          styles.sheet,
          {height: maxSheetHeight, transform: [{translateY: sheetTranslateY}]},
        ]}>
        <CardGradient radius={32} />
        <View {...sheetPanResponder.panHandlers} style={styles.sheetDragZone}>
          <View style={styles.sheetHandle} />
        </View>
        <Text style={styles.sheetEyebrow}>Select service</Text>
        <Text style={styles.sheetTitle}>Choose your Flux</Text>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.vehicleCarouselScroll}
          contentContainerStyle={styles.vehicleCarousel}
          snapToInterval={width - 40}
          decelerationRate="fast"
          onMomentumScrollEnd={handleVehicleScrollEnd}>
          {HOME_VEHICLE_TYPES.map(vehicle => {
            const active = selectedVehicleId === vehicle.id;
            return (
              <TouchableOpacity
                key={vehicle.id}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedVehicleId(vehicle.id);
                  setShowSearch(true);
                }}
                style={[
                  styles.vehicleHeroCard,
                  {width: width - 40},
                  active && styles.vehicleHeroCardActive,
                ]}>
                <View style={styles.vehicleGlow} />
                <Image
                  source={getVehicleImage(vehicle.id)}
                  style={styles.vehicleHeroImage}
                  resizeMode="contain"
                />
                <View style={styles.vehicleHeroTextWrap}>
                  <Text style={styles.vehicleHeroTitle}>{vehicle.label}</Text>
                  <Text style={styles.vehicleHeroSubtitle}>
                    {vehicle.desc} · {vehicle.etaMin} min away
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {canSwipeToMoreVehicles && (
          <View style={styles.vehicleSwipeHint}>
            <Text style={styles.vehicleSwipeHintText}>
              Swipe right for more vehicles
            </Text>
            <ArrowRight size={16} color={colors.textMute} />
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.searchBar}
          onPress={() => setShowSearch(true)}>
          <Search size={20} color="#9CA3AF" strokeWidth={2.5} />
          <Text style={styles.searchPlaceholder}>Where to go?</Text>
        </TouchableOpacity>
        {sheetExpanded && popularPlaces.length > 0 && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeader}>
              <Text style={styles.nearbyTitle}>Popular nearby</Text>
              <Text style={styles.nearbyHint}>
                Tap place, then choose vehicle
              </Text>
            </View>
            <ScrollView
              style={styles.nearbyList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              {popularPlaces.slice(0, 5).map(place => (
                <TouchableOpacity
                  key={place.id}
                  activeOpacity={0.85}
                  style={styles.nearbyItem}
                  onPress={() => setQuickPlace(place)}>
                  <View style={styles.nearbyIcon}>
                    <MapPin size={16} color={colors.onAccent} />
                  </View>
                  <View style={styles.nearbyTextWrap}>
                    <Text style={styles.nearbyName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.nearbyAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                  <ArrowRight size={16} color={colors.textMute} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      <Modal
        visible={!!quickPlace}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickPlace(null)}>
        <View style={styles.quickModalBackdrop}>
          <View style={styles.quickModalCard}>
            <Text style={styles.quickModalTitle}>Choose vehicle</Text>
            <Text style={styles.quickModalSubtitle} numberOfLines={2}>
              {quickPlace?.name}
            </Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickVehicleCarousel}
              snapToInterval={width - 40}
              decelerationRate="fast">
              {HOME_RIDE_VEHICLE_TYPES.map(vehicle => (
                <TouchableOpacity
                  key={vehicle.id}
                  activeOpacity={0.9}
                  style={[styles.vehicleHeroCard, {width: width - 40}]}
                  onPress={() => handleQuickVehicleSelect(vehicle)}>
                  <View style={styles.vehicleGlow} />
                  <Image
                    source={getVehicleImage(vehicle.id)}
                    style={styles.vehicleHeroImage}
                    resizeMode="contain"
                  />
                  <View style={styles.vehicleHeroTextWrap}>
                    <Text style={styles.vehicleHeroTitle}>{vehicle.label}</Text>
                    <Text style={styles.vehicleHeroSubtitle}>
                      {vehicle.desc} · {vehicle.etaMin} min away
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.quickCancelBtn}
              onPress={() => setQuickPlace(null)}>
              <Text style={styles.quickCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen search overlay */}
      {showSearch && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchText('');
              }}
              style={styles.closeBtn}>
              <X size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.searchTitle}>Search</Text>
          </View>
          <View style={styles.searchInputs}>
            <View style={styles.inputRow}>
              <View style={[styles.dot, {backgroundColor: '#22C55E'}]} />
              <Text style={styles.inputFixed} numberOfLines={1}>
                {pickupInfo.address}
              </Text>
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.dot, {backgroundColor: '#EF4444'}]} />
              <TextInput
                style={styles.textIn}
                placeholder="Where to?"
                placeholderTextColor="#9CA3AF"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
            </View>
          </View>
          <ScrollView
            style={styles.results}
            showsVerticalScrollIndicator={false}>
            {searchLoading ? (
              <ActivityIndicator
                color={colors.accent}
                style={{marginTop: 40}}
              />
            ) : (
              searchResults.map(place => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.resultItem}
                  onPress={() => {
                    setShowSearch(false);
                    handleSelectPlace(place);
                  }}>
                  <View style={styles.resultIcon}>
                    <MapPin size={18} color="#6B7280" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.resultName}>{place.name}</Text>
                    <Text style={styles.resultAddr} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            {!searchLoading &&
              searchText.trim().length < 2 &&
              popularPlaces.map(place => (
                <TouchableOpacity
                  key={place.id}
                  style={styles.resultItem}
                  onPress={() => {
                    setShowSearch(false);
                    handleSelectPlace(place);
                  }}>
                  <View style={styles.resultIcon}>
                    <Clock size={18} color={colors.textMute} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.resultName}>{place.name}</Text>
                    <Text style={styles.resultAddr} numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  mapContainer: {...StyleSheet.absoluteFillObject, overflow: 'hidden'},

  // Google Maps style blue dot
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
  nearbyVehicleMarker: {
    width: 42,
    height: 42,
    backgroundColor: 'transparent',
  },

  // Direction cone
  directionContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionCone: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(66,133,244,0.28)',
    borderRadius: 4,
    marginBottom: 16,
  },

  // Fixed center pin (Rapido style)
  fixedPinContainer: {position: 'absolute', alignItems: 'center', zIndex: 20},
  fixedPin: {alignItems: 'center'},
  fixedPinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fixedPinStick: {
    width: 3,
    height: 16,
    backgroundColor: '#374151',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: -2,
  },
  fixedPinShadow: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },

  // Pin address badge
  pinAddressBadge: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  pinAddressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  pinAddressText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },

  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  profileBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePhotoCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  locationBadge: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 10,
  },
  locationText: {fontSize: 13, fontWeight: '700', color: colors.text, flex: 1},
  ongoingRideBtn: {
    position: 'absolute',
    top: 118,
    right: 16,
    zIndex: 11,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ongoingRideText: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 7,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Map action buttons
  mapActions: {position: 'absolute', bottom: 16, right: 16},
  mapActionBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  mapActionBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  mapLoader: {position: 'absolute', bottom: 16, left: 16},
  sheet: {
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
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetDragZone: {
    paddingTop: 4,
    paddingBottom: 2,
    alignItems: 'center',
  },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 6,
  },
  vehicleCarouselScroll: {
    height: 134,
    maxHeight: 134,
  },
  vehicleCarousel: {
    paddingVertical: 2,
  },
  vehicleHeroCard: {
    height: 128,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  vehicleHeroCardActive: {
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  vehicleGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.14)',
    left: -38,
    top: -26,
  },
  vehicleHeroImage: {
    width: 128,
    height: 96,
    marginRight: 12,
  },
  vehicleHeroTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  vehicleHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  vehicleHeroSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: 6,
  },
  vehicleSwipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    marginBottom: 2,
  },
  vehicleSwipeHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMute,
    marginRight: 6,
  },
  nearbySection: {
    marginTop: 2,
    paddingBottom: 16,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nearbyTitle: {fontSize: 16, fontWeight: '900', color: colors.text},
  nearbyHint: {fontSize: 11, fontWeight: '700', color: colors.textMute},
  nearbyList: {maxHeight: 180},
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  nearbyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  nearbyTextWrap: {flex: 1, minWidth: 0},
  nearbyName: {fontSize: 13, fontWeight: '900', color: colors.text},
  nearbyAddress: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMute,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchPlaceholder: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.textMute,
    fontWeight: '600',
  },
  serviceGrid: {flexDirection: 'row', justifyContent: 'space-between'},
  serviceItem: {alignItems: 'center'},
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  serviceImg: {width: 46, height: 46},
  serviceLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  quickModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickModalTitle: {fontSize: 24, fontWeight: '900', color: colors.text},
  quickModalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: 6,
    marginBottom: 16,
  },
  quickVehicleCarousel: {
    paddingVertical: 2,
  },
  quickCancelBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  quickCancelText: {fontSize: 14, fontWeight: '900', color: colors.textSub},
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    zIndex: 100,
    paddingTop: 52,
  },
  searchHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {padding: 8, marginLeft: -8, marginRight: 8},
  searchTitle: {fontSize: 22, fontWeight: '900', color: colors.text},
  searchInputs: {paddingHorizontal: 20, marginBottom: 8},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  dot: {width: 8, height: 8, borderRadius: 4, marginRight: 12},
  inputFixed: {
    flex: 1,
    height: 46,
    lineHeight: 46,
    color: colors.textSub,
    fontWeight: '700',
    fontSize: 15,
  },
  textIn: {
    flex: 1,
    height: 46,
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  results: {paddingHorizontal: 20},
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultIcon: {
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 12,
    marginRight: 14,
  },
  resultName: {fontSize: 15, fontWeight: '800', color: colors.text},
  resultAddr: {
    fontSize: 13,
    color: colors.textMute,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default HomeScreen;

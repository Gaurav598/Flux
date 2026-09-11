import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE, Polyline, UrlTile} from 'react-native-maps';
import {getDrivingRoute} from '../../../services/directionsService';
import {VEHICLE_TYPES} from '../../../data/mockData';
import {ArrowLeft, Navigation, Clock} from 'lucide-react-native';
import {colors, darkMapStyle, getVehicleImage} from '../../../theme';
import CardGradient from '../../../components/CardGradient';

const {height} = Dimensions.get('window');

const PARCEL_VEHICLE = {
  id: 'parcel',
  label: 'Parcel',
  icon: '📦',
  baseMin: 80,
  baseMax: 160,
  etaMin: 18,
  desc: 'Delivery',
};

const SelectRideScreen = ({navigation, route}: any) => {
  const {pickup, drop, distanceKm, pickupCoords, dropCoords, vehicle} =
    route.params;

  const [routeCoords, setRouteCoords] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (pickupCoords && dropCoords) {
      getDrivingRoute(pickupCoords, dropCoords).then(res => {
        if (res && res.coordinates) {
          setRouteCoords(res.coordinates);
        }
      });
    }
  }, [pickupCoords, dropCoords]);

  const selectedVehicle = useMemo(() => {
    if (vehicle?.id) {
      return vehicle;
    }
    return VEHICLE_TYPES[0] || PARCEL_VEHICLE;
  }, [vehicle]);

  const getBaseFareForVehicle = (selected: any) => {
    const perKm = Number(selected?.baseMin || 100) / 18;
    return Math.max(Math.round(perKm * distanceKm), 30);
  };

  const baseFare = getBaseFareForVehicle(selectedVehicle);

  const handleConfirmVehicle = () => {
    navigation.navigate('SetPrice', {
      pickup,
      drop,
      distanceKm,
      pickupCoords,
      dropCoords,
      vehicle: selectedVehicle,
      maxFare: baseFare + 80,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {pickupCoords && dropCoords ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: (pickupCoords.latitude + dropCoords.latitude) / 2,
              longitude: (pickupCoords.longitude + dropCoords.longitude) / 2,
              latitudeDelta:
                Math.abs(pickupCoords.latitude - dropCoords.latitude) * 1.8,
              longitudeDelta:
                Math.abs(pickupCoords.longitude - dropCoords.longitude) * 1.8,
            }}
            customMapStyle={darkMapStyle}>
            <UrlTile
              urlTemplate="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            <Marker coordinate={pickupCoords} title="Pickup">
              <View style={styles.pickupMarker}>
                <View style={styles.pickupMarkerDot} />
              </View>
            </Marker>
            <Marker coordinate={dropCoords} title="Drop">
              <View style={styles.dropMarker}>
                <View style={styles.dropMarkerDot} />
              </View>
            </Marker>
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor={colors.accent}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </View>

      <SafeAreaView style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.overlayContainer}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetEyebrow}>Selected vehicle</Text>
          <Text style={styles.sheetTitle}>Confirm your FLUX</Text>

          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.pickupDot]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {pickup}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.dropDot]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {drop}
              </Text>
            </View>
            <View style={styles.routeStats}>
              <Navigation size={14} color={colors.textSub} />
              <Text style={styles.statText}>{distanceKm} km</Text>
              <View style={styles.statDivider} />
              <Clock size={14} color={colors.textSub} />
              <Text style={styles.statText}>
                ~{Math.round(distanceKm * 1.4)} min
              </Text>
            </View>
          </View>

          <View style={styles.vehicleCard}>
            <CardGradient radius={28} />
            <View style={styles.vehicleGlow} />
            <Image
              source={getVehicleImage(selectedVehicle.id)}
              style={styles.vehicleImage}
              resizeMode="contain"
            />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleLabel}>{selectedVehicle.label}</Text>
              <Text style={styles.vehicleDesc} numberOfLines={2}>
                {selectedVehicle.desc} · {selectedVehicle.etaMin} min away
              </Text>
              <Text style={styles.vehiclePrice}>
                Estimated from ₹{baseFare}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.confirmBtn}
              onPress={handleConfirmVehicle}>
              <Text style={styles.confirmBtnText}>
                Continue with {selectedVehicle.label}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, position: 'relative'},
  mapContainer: {...StyleSheet.absoluteFillObject},
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  headerOverlay: {position: 'absolute', top: 0, left: 20, zIndex: 10},
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
    marginTop: 20,
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.58,
    zIndex: 5,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -10},
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    backgroundColor: colors.borderStrong,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textMute,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 18,
  },
  routeCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  routeRow: {flexDirection: 'row', alignItems: 'center'},
  routeDot: {width: 10, height: 10, borderRadius: 5, marginRight: 14},
  pickupDot: {backgroundColor: colors.success},
  dropDot: {backgroundColor: colors.danger},
  routeText: {flex: 1, fontSize: 15, fontWeight: '700', color: colors.text},
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.borderStrong,
    marginLeft: 4,
    marginVertical: 4,
  },
  routeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  statText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '900',
    color: colors.textSub,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.borderStrong,
    marginHorizontal: 12,
  },
  vehicleCard: {
    minHeight: 150,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: 'transparent',
  },
  vehicleGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.16)',
    left: -26,
    top: -28,
  },
  vehicleImage: {width: 128, height: 100, marginRight: 10},
  vehicleInfo: {flex: 1},
  vehicleLabel: {fontSize: 24, fontWeight: '900', color: colors.text},
  vehicleDesc: {
    fontSize: 13,
    color: colors.textMute,
    fontWeight: '700',
    marginTop: 6,
  },
  vehiclePrice: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '900',
    marginTop: 12,
  },
  footer: {paddingTop: 18, paddingBottom: 28},
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.onAccent,
    letterSpacing: 0.3,
  },
  pickupMarker: {
    backgroundColor: '#22C55E',
    padding: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  pickupMarkerDot: {
    width: 6,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 3,
  },
  dropMarker: {
    backgroundColor: '#EF4444',
    padding: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  dropMarkerDot: {
    width: 6,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 3,
  },
});

export default SelectRideScreen;

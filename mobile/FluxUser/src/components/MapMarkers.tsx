import React, {useEffect, useRef, useState} from 'react';
import {Animated, Image, StyleSheet, View} from 'react-native';
import {Marker, MarkerAnimated, AnimatedRegion} from 'react-native-maps';
import {colors, getMapVehicle, userMarkerImage} from '../theme';

type Coord = {latitude: number; longitude: number};

/**
 * Compass bearing (0-360°) from point A to point B — same maths Uber/Zomato
 * use to make the moving vehicle face its direction of travel.
 */
export function getBearing(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * The moving vehicle marker (Rapido / Uber / Zomato style).
 *
 * - Uses the top/bottom-view vehicle art from the theme (getMapVehicle).
 * - Glides smoothly between GPS pings via AnimatedRegion (continuous motion).
 * - Rotates with `rotation = travelBearing - baseAngle` so the FRONT of the
 *   vehicle always points the way it's driving (handles both top-view art with
 *   front-up and bottom-view art with front-down).
 * - Drawn with resizeMode="contain" inside a fixed square box, so it is always
 *   scaled down and can NEVER overflow / cover the map.
 */
export function ApproachingVehicleMarker({
  coordinate,
  vehicleId,
  size = 58,
  zIndex = 9,
  duration = 4500,
}: {
  coordinate: Coord;
  vehicleId?: string;
  size?: number;
  zIndex?: number;
  duration?: number;
}) {
  const {source, baseAngle} = getMapVehicle(vehicleId);
  const region = useRef(
    new AnimatedRegion({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const prev = useRef<Coord>(coordinate);
  const [rotation, setRotation] = useState(0);
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const next = {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };

    const moved =
      Math.abs(next.latitude - prev.current.latitude) > 1e-7 ||
      Math.abs(next.longitude - prev.current.longitude) > 1e-7;

    if (moved) {
      const bearing = getBearing(prev.current, next);
      setRotation((bearing - baseAngle + 360) % 360);
    }
    prev.current = next;

    region
      .timing({
        latitude: next.latitude,
        longitude: next.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration,
        useNativeDriver: false,
      } as any)
      .start();

    setTracks(true);
    const t = setTimeout(() => setTracks(false), duration + 400);
    return () => clearTimeout(t);
  }, [coordinate.latitude, coordinate.longitude, region, baseAngle, duration]);

  return (
    <MarkerAnimated
      coordinate={region as any}
      anchor={{x: 0.5, y: 0.5}}
      flat
      rotation={rotation}
      tracksViewChanges={tracks}
      zIndex={zIndex}>
      <View
        collapsable={false}
        pointerEvents="none"
        renderToHardwareTextureAndroid
        style={[styles.vehicleWrap, {width: size, height: size}]}>
        <Image
          source={source}
          resizeMode="contain"
          fadeDuration={0}
          style={[styles.vehicleImage, {width: size, height: size}]}
        />
      </View>
    </MarkerAnimated>
  );
}

/**
 * The user's own location marker — a 3D badge (assets/icons/user.png) sitting
 * on a soft pulsing halo. Drop in your own user.png to rebrand; no code change.
 */
export function UserLocationMarker({
  coordinate,
  size = 46,
  zIndex = 8,
}: {
  coordinate: Coord;
  size?: number;
  zIndex?: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.2],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  return (
    <Marker
      coordinate={coordinate}
      anchor={{x: 0.5, y: 0.5}}
      flat
      tracksViewChanges={false}
      zIndex={zIndex}>
      <View style={[styles.userWrap, {width: size * 2.4, height: size * 2.4}]}>
        <Animated.View
          style={[
            styles.userHalo,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: haloOpacity,
              transform: [{scale: haloScale}],
            },
          ]}
        />
        <Image
          source={userMarkerImage}
          resizeMode="contain"
          style={{width: size, height: size}}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  vehicleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  vehicleImage: {backgroundColor: 'transparent'},
  userWrap: {alignItems: 'center', justifyContent: 'center'},
  userHalo: {
    position: 'absolute',
    backgroundColor: colors.white,
  },
});

export default ApproachingVehicleMarker;

import React, {forwardRef, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import MapView, {MapViewProps, PROVIDER_DEFAULT} from 'react-native-maps';
import {colors, darkMapStyle} from '../theme';
import {normalizeMapRegion} from '../utils/mapCoordinates';

type Props = MapViewProps & {unavailableMessage?: string};

const ReliableMapView = forwardRef<MapView, Props>(
  ({style, initialRegion, region, onMapReady, onMapLoaded, children, unavailableMessage, ...props}, ref) => {
    const [ready, setReady] = useState(false);
    const [slow, setSlow] = useState(false);

    useEffect(() => {
      const timer = setTimeout(() => setSlow(true), 8000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <View style={[styles.container, style]}>
        <MapView
          {...props}
          ref={ref}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={normalizeMapRegion(initialRegion)}
          region={region ? normalizeMapRegion(region) : undefined}
          customMapStyle={darkMapStyle}
          loadingEnabled
          onMapReady={() => {
            onMapReady?.();
          }}
          onMapLoaded={event => {
            setReady(true);
            setSlow(false);
            onMapLoaded?.(event);
          }}>
          {children}
        </MapView>
        {!ready && (
          <View pointerEvents="none" style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>
              {slow
                ? unavailableMessage || 'Map is taking longer than expected. Check the map key and network.'
                : 'Loading map…'}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

ReliableMapView.displayName = 'ReliableMapView';

const styles = StyleSheet.create({
  container: {overflow: 'hidden', backgroundColor: colors.surfaceAlt},
  status: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surfaceAlt,
  },
  statusText: {color: colors.textSub, textAlign: 'center', marginTop: 10},
});

export default ReliableMapView;

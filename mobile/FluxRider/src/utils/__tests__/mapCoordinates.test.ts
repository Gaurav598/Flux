import {
  isPlausibleLocationUpdate,
  normalizeMapRegion,
  sanitizeRouteCoordinates,
  toMapCoordinate,
} from '../mapCoordinates';

describe('map coordinate safety', () => {
  it('accepts numeric strings and rejects impossible coordinates', () => {
    expect(toMapCoordinate('28.6', '77.2')).toEqual({latitude: 28.6, longitude: 77.2});
    expect(toMapCoordinate(91, 77)).toBeNull();
    expect(toMapCoordinate(28, 181)).toBeNull();
    expect(toMapCoordinate(undefined, 77)).toBeNull();
  });

  it('always produces a usable region and removes malformed route points', () => {
    expect(normalizeMapRegion({latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: -1}))
      .toEqual({latitude: 0, longitude: 0, latitudeDelta: 0.025, longitudeDelta: 0.025});
    expect(sanitizeRouteCoordinates([
      {latitude: 28.6, longitude: 77.2},
      {latitude: 100, longitude: 77.3},
    ])).toEqual([{latitude: 28.6, longitude: 77.2}]);
  });

  it('filters physically impossible GPS jumps', () => {
    expect(isPlausibleLocationUpdate(
      {coordinate: {latitude: 28.6, longitude: 77.2}, timestamp: 1_000},
      {latitude: 29.6, longitude: 78.2},
      2_000,
    )).toBe(false);
  });
});

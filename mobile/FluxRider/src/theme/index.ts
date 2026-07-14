/**
 * Flux Rider — shared dark "black Uber" theme.
 * Use these tokens across all screens so the look stays consistent.
 */
export const colors = {
  // Surfaces
  bg: '#000000',
  surface: '#1A1A1B',
  surfaceAlt: '#242426',
  surfaceHigh: '#2E2E31',
  border: '#2A2A2C',
  borderStrong: '#3A3A3D',

  // Text (Uber content tokens)
  text: '#FFFFFF',
  textSub: '#B0B0B0',
  textMute: '#8A8A8A',
  textFaint: '#5A5A5A',

  // Primary accent — Uber monochrome: white surface, black content.
  accent: '#FFFFFF',
  accentDark: '#E6E6E6',
  accentSoft: 'rgba(255,255,255,0.10)',
  onAccent: '#000000',

  // Semantic (used sparingly, Uber-style)
  success: '#36C271',
  successSoft: 'rgba(54,194,113,0.16)',
  danger: '#E5484D',
  dangerSoft: 'rgba(229,72,77,0.16)',
  info: '#3B82F6',
  warning: '#F5A623',

  routeGreen: '#22C55E',
  routeRed: '#EF4444',

  white: '#FFFFFF',
  black: '#000000',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const vehicleImages: Record<string, any> = {
  bike: require('../../assets/icons/bike.png'),
  auto: require('../../assets/icons/auto.png'),
  cab: require('../../assets/icons/cab.png'),
  share: require('../../assets/icons/share.png'),
  parcel: require('../../assets/icons/parcel.png'),
};

export const getVehicleImage = (id?: string) =>
  (id && vehicleImages[id]) || vehicleImages.cab;

/** 3D map marker for the user's own location. Replace user.png to rebrand. */
export const userMarkerImage = require('../../assets/icons/user.png');

/**
 * Top-down / bottom-view vehicle art used for the MOVING marker on the map.
 * `baseAngle` = the compass direction the vehicle's FRONT points in the source
 * image (0 = front faces up/north, 180 = front faces down/south). The marker
 * rotates by (travelBearing - baseAngle) so the front always faces the road.
 */
export const mapVehicleIcons: Record<string, {source: any; baseAngle: number}> = {
  bike: {source: require('../../assets/mapicons/BikeTopView.png'), baseAngle: 0},
  cab: {source: require('../../assets/mapicons/cabTopView.png'), baseAngle: 0},
  share: {source: require('../../assets/mapicons/cabTopView.png'), baseAngle: 0},
  auto: {source: require('../../assets/mapicons/taxiBottomView.png'), baseAngle: 180},
  parcel: {source: require('../../assets/mapicons/BikeWithParcelTopView.png'), baseAngle: 0},
};

export const getMapVehicle = (id?: string) =>
  (id && mapVehicleIcons[id]) || mapVehicleIcons.bike;

/**
 * Normalize any backend vehicle/service string (e.g. "BIKE", "Auto",
 * "CAR", "PARCEL") into one of our vehicle image ids.
 */
export const normalizeVehicleId = (raw?: string): string => {
  const v = String(raw || '').toLowerCase();
  if (v.includes('bike') || v.includes('moto') || v.includes('scoot')) {
    return 'bike';
  }
  if (v.includes('auto') || v.includes('rick') || v.includes('tuk')) {
    return 'auto';
  }
  if (v.includes('parcel') || v.includes('courier') || v.includes('delivery')) {
    return 'parcel';
  }
  if (v.includes('share') || v.includes('pool')) {
    return 'share';
  }
  if (v.includes('car') || v.includes('cab') || v.includes('sedan') || v.includes('taxi')) {
    return 'cab';
  }
  return 'bike';
};

/**
 * Balanced "graphite" map for react-native-maps `customMapStyle`.
 * Mid-gray land with clearly lighter roads + distinguishable water, so the map
 * stays on-brand dark yet remains readable in BRIGHT DAYLIGHT and at night
 * (not pitch black, not blinding white).
 */
export const darkMapStyle = [
  {elementType: 'geometry', stylers: [{color: '#33363b'}]},
  {elementType: 'labels.icon', stylers: [{visibility: 'off'}]},
  {elementType: 'labels.text.fill', stylers: [{color: '#d4d6da'}]},
  {elementType: 'labels.text.stroke', stylers: [{color: '#2a2c30'}]},
  {featureType: 'administrative', elementType: 'geometry', stylers: [{color: '#52555c'}]},
  {featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{color: '#b6b9bf'}]},
  {featureType: 'poi', elementType: 'labels.text.fill', stylers: [{color: '#aeb1b7'}]},
  {featureType: 'poi.park', elementType: 'geometry', stylers: [{color: '#33503b'}]},
  {featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{color: '#8fb796'}]},
  {featureType: 'road', elementType: 'geometry', stylers: [{color: '#5a5e65'}]},
  {featureType: 'road', elementType: 'geometry.stroke', stylers: [{color: '#43464c'}]},
  {featureType: 'road', elementType: 'labels.text.fill', stylers: [{color: '#e6e7ea'}]},
  {featureType: 'road.arterial', elementType: 'geometry', stylers: [{color: '#62666d'}]},
  {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#74787f'}]},
  {featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{color: '#54585e'}]},
  {featureType: 'transit', elementType: 'geometry', stylers: [{color: '#4a4d53'}]},
  {featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{color: '#c2c4c9'}]},
  {featureType: 'water', elementType: 'geometry', stylers: [{color: '#2c4a5c'}]},
  {featureType: 'water', elementType: 'labels.text.fill', stylers: [{color: '#9bc1d4'}]},
];

export default colors;

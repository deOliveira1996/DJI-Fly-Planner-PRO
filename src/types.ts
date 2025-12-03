export interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  curveSize: number;
  rotationDir: number;
  gimbalMode: number;
  gimbalPitch: number;
  actionType1: number; // -1=None, 0=Stay, 2=StartRec, 3=StopRec, 5=Rotate
  actionParam1: number;
  actionType2: number;
  actionParam2: number;
  altitudeMode: number;
  speed: number;
  poiLat: number;
  poiLon: number;
  poiAlt: number;
  poiAltMode: number;
  photoTimeInterval: number;
  photoDistInterval: number;
}

export interface HomePoint {
    lat: number;
    lng: number;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  color: string;
  locked: boolean;
  homePoint: HomePoint; // Per-route Home Point
}

export interface FlightSettings {
  altitude: number;
  speedKmh: number;
  headingMode: 'auto_path' | 'auto_bearing' | 'manual';
  headingManual: number;
  gimbalPitch: number;
  gimbalMode: number; // 0=Disabled, 1=Focus POI, 2=Interpolate
  action1: number; // -1=None, 0=Stay, 2=Start Rec, 3=Stop Rec, 5=Rotate
  altitudeMode: number; // 0=AGL, 1=MSL (WGS84)
  curveSize: number;
  finishAction: number; // 0=None, 1=RTH, 2=Land, 3=Back to Start, 4=Reverse
}

export const DEFAULT_SETTINGS: FlightSettings = {
  altitude: 30,
  speedKmh: 15,
  headingMode: 'auto_path',
  headingManual: 0,
  gimbalPitch: -15,
  gimbalMode: 2,
  action1: -1,
  altitudeMode: 1,
  curveSize: 0.2,
  finishAction: 1 // RTH
};

// Calculator Types
export interface CalculatorResult {
  altitude: number;
  gimbalAngle: number;
  baseMin: number;
  baseMax: number;
  speed: string;
  distFrontal: number;
  timeFrontal: number;
  distTotal: number | null;
  timeTotal: number | null;
  dNear: number;
  dFar: number;
}

export interface DronePreset {
  model: string;
  fovH: number;
  fovV: number;
  notes: string;
}

export interface RouteStats {
    totalDistance: number;
    totalTimeMinutes: number;
}
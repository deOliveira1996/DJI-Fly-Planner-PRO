
export type SpeedUnit = 'kmh' | 'ms';

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
  actionType1: number; // -1=None, 0=Stay, 1=Photo, 2=StartRec, 3=StopRec, 5=Rotate
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
  homePoint: HomePoint;
  gridRotation?: number; // Store rotation angle for mapping grids
  originalPolygon?: { lat: number; lng: number }[]; // Persist original shape for re-gridding
}

export interface FlightSettings {
  altitude: number;
  speedKmh: number;
  headingMode: 'auto_path' | 'auto_bearing' | 'manual';
  headingManual: number;
  gimbalPitch: number;
  gimbalMode: number; // 0=Disabled, 1=Focus POI, 2=Interpolate
  action1: number; // -1=None, 0=Stay, 1=Photo, 2=Start Rec, 3=Stop Rec, 5=Rotate
  altitudeMode: number; // 0=AGL, 1=MSL (WGS84)
  curveSize: number;
  finishAction: number; // 0=None, 1=RTH, 2=Land, 3=Back to Start, 4=Reverse
  
  // Mapping / Intervals
  flightMode: 'standard' | 'mapping';
  photoTimeInterval: number; // For Litchi photo_timeinterval column
  mappingOverlap: number; // % (Vertical/Forward) - Used for Interval Calc
  mappingOverlapH: number; // % (Lateral/Side) - Stored for reference
  selectedDroneModel: string; // For FOV calc
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
  finishAction: 1, // RTH
  
  flightMode: 'standard',
  photoTimeInterval: -1,
  mappingOverlap: 0,
  mappingOverlapH: 0,
  selectedDroneModel: 'Default'
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

export const DRONE_PRESETS: DronePreset[] = [
    { model: "DJI Mini 4 Pro (Wide)", fovH: 82.1, fovV: 49.4, notes: "Default" },
    { model: "DJI Mini 3 / 3 Pro", fovH: 82.1, fovV: 49.4, notes: "Default" },
    { model: "DJI Mini 2 / SE", fovH: 83.0, fovV: 48.0, notes: "Approx" },
    { model: "DJI Air 3 (Wide)", fovH: 82.0, fovV: 49.0, notes: "24mm eq" },
    { model: "DJI Air 3 (Medium Tele)", fovH: 35.0, fovV: 20.0, notes: "70mm eq" },
    { model: "DJI Air 2S", fovH: 88.0, fovV: 56.5, notes: "22mm eq" },
    { model: "DJI Mavic 3 Pro (Hasselblad)", fovH: 84.0, fovV: 70.2, notes: "24mm eq" },
    { model: "DJI Mavic 3 Pro (Med Tele)", fovH: 35.0, fovV: 20.0, notes: "70mm eq" },
    { model: "DJI Mavic 3 Enterprise (Wide)", fovH: 84.0, fovV: 70.0, notes: "4:3 Sensor" },
    { model: "DJI Mavic 2 Pro", fovH: 77.0, fovV: 44.0, notes: "HQ Video" },
    { model: "DJI Phantom 4 Pro", fovH: 84.0, fovV: 56.0, notes: "3:2 Photo" },
    { model: "DJI Matrice 350 RTK (P1 35mm)", fovH: 63.5, fovV: 42.3, notes: "Full Frame" },
    { model: "DJI Matrice 30T (Wide)", fovH: 71.5, fovV: 53.7, notes: "Wide spec" },
    { model: "DJI Inspire 3 (X9 24mm)", fovH: 84.0, fovV: 48.0, notes: "Full Frame" },
];

export interface RouteStats {
    totalDistance: number;
    totalTimeMinutes: number;
    photoCount: number;
    videoCount: number;
}

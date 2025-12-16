

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
  mappingPattern: 'parallel' | 'crosshatch'; // New Grid Option
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
  mappingPattern: 'parallel',
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
  // Sensor Physics for GSD/Blur Calculation
  sensorWidthMm: number; 
  sensorHeightMm: number;
  imageWidthPx: number;
  imageHeightPx: number;
  realFocalLengthMm: number;
}

// Data Sources: DJI Specs + Photogrammetry DB
export const DRONE_PRESETS: DronePreset[] = [
    { 
        model: "DJI Mini 4 Pro / Mini 3 Pro", 
        fovH: 82.1, fovV: 49.4, notes: "1/1.3\" CMOS",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048, // 48MP
        realFocalLengthMm: 6.72 // 24mm eq
    },
    { 
        model: "DJI Mini 2 / SE", 
        fovH: 83.0, fovV: 48.0, notes: "1/2.3\" CMOS",
        sensorWidthMm: 6.17, sensorHeightMm: 4.55,
        imageWidthPx: 4000, imageHeightPx: 3000,
        realFocalLengthMm: 4.49 // 24mm eq
    },
    { 
        model: "DJI Air 3 (Wide)", 
        fovH: 82.0, fovV: 49.0, notes: "1/1.3\" CMOS",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048,
        realFocalLengthMm: 6.72
    },
    { 
        model: "DJI Air 3 (Medium Tele)", 
        fovH: 35.0, fovV: 20.0, notes: "1/1.3\" CMOS",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048,
        realFocalLengthMm: 19.6 // 70mm eq
    },
    { 
        model: "DJI Air 2S", 
        fovH: 88.0, fovV: 56.5, notes: "1\" CMOS",
        sensorWidthMm: 13.2, sensorHeightMm: 8.8,
        imageWidthPx: 5472, imageHeightPx: 3648,
        realFocalLengthMm: 8.8 // 22mm eq
    },
    { 
        model: "DJI Mavic 3 (Hasselblad)", 
        fovH: 84.0, fovV: 70.2, notes: "4/3 CMOS",
        sensorWidthMm: 17.3, sensorHeightMm: 13.0,
        imageWidthPx: 5280, imageHeightPx: 3956,
        realFocalLengthMm: 12.29 // 24mm eq
    },
    { 
        model: "DJI Mavic 3 Enterprise (Wide)", 
        fovH: 84.0, fovV: 64.0, notes: "4/3 CMOS",
        sensorWidthMm: 17.3, sensorHeightMm: 13.0,
        imageWidthPx: 5280, imageHeightPx: 3956,
        realFocalLengthMm: 12.29
    },
    { 
        model: "DJI Phantom 4 Pro", 
        fovH: 84.0, fovV: 56.0, notes: "1\" CMOS",
        sensorWidthMm: 13.2, sensorHeightMm: 8.8,
        imageWidthPx: 5472, imageHeightPx: 3648,
        realFocalLengthMm: 8.8
    },
    { 
        model: "DJI Matrice 30T (Wide)", 
        fovH: 71.5, fovV: 53.7, notes: "1/2\" CMOS",
        sensorWidthMm: 6.4, sensorHeightMm: 4.8,
        imageWidthPx: 4000, imageHeightPx: 3000,
        realFocalLengthMm: 4.5
    },
    { 
        model: "DJI Matrice 350 (P1 35mm)", 
        fovH: 63.5, fovV: 42.3, notes: "Full Frame",
        sensorWidthMm: 35.9, sensorHeightMm: 24.0,
        imageWidthPx: 8192, imageHeightPx: 5460,
        realFocalLengthMm: 35.0
    },
];

export interface RouteStats {
    totalDistance: number;
    totalTimeMinutes: number;
    photoCount: number;
    videoCount: number;
}

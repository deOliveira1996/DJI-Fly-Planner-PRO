
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
  isEffort?: boolean; 
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
  gridRotation?: number; 
  originalPolygon?: { lat: number; lng: number }[]; 
}

export interface FlightSettings {
  altitude: number;
  speedKmh: number;
  globalSpeedKmh: number;
  headingMode: 'auto_path' | 'auto_bearing' | 'manual';
  headingManual: number;
  gimbalPitch: number;
  gimbalMode: number; 
  action1: number; 
  altitudeMode: number; 
  curveSize: number;
  finishAction: number; 
  signalLostAction: 'rth' | 'hover' | 'continue';
  
  flightMode: 'standard' | 'mapping';
  mappingPattern: 'parallel' | 'crosshatch'; 
  photoTimeInterval: number; 
  mappingOverlap: number; 
  mappingOverlapH: number; 
  selectedDroneModel: string; 
  aspectRatio: '4:3' | '16:9';

  maxFlightTimeMinutes: number;
  batterySafetyMargin: number; 
}

export const DEFAULT_SETTINGS: FlightSettings = {
  altitude: 30,
  speedKmh: 15,
  globalSpeedKmh: 15,
  headingMode: 'auto_path',
  headingManual: 0,
  gimbalPitch: -15,
  gimbalMode: 2,
  action1: -1,
  altitudeMode: 1,
  curveSize: 0.2,
  finishAction: 1, 
  signalLostAction: 'rth',
  
  flightMode: 'standard',
  mappingPattern: 'parallel',
  photoTimeInterval: -1,
  mappingOverlap: 70, // Recomendações PDF p.20
  mappingOverlapH: 60, // Recomendações PDF p.20
  selectedDroneModel: 'DJI Phantom 4 Pro',
  aspectRatio: '4:3',
  
  maxFlightTimeMinutes: 25,
  batterySafetyMargin: 20
};

export interface DronePreset {
  model: string;
  fovDiagonal: number;
  fovH: number;
  fovV: number;
  notes: string;
  sensorWidthMm: number; 
  sensorHeightMm: number;
  imageWidthPx: number;
  imageHeightPx: number;
  realFocalLengthMm: number;
}

export const DRONE_PRESETS: DronePreset[] = [
    { 
        model: "DJI Mini 4 Pro / Mini 3 Pro", 
        fovDiagonal: 86.2, fovH: 73.7, fovV: 58.6, notes: "1/1.3\" CMOS (24mm equiv.)",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048, 
        realFocalLengthMm: 6.72 
    },
    { 
        model: "DJI Mini 3", 
        fovDiagonal: 86.2, fovH: 73.7, fovV: 58.6, notes: "1/1.3\" CMOS",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 4000, imageHeightPx: 3000, 
        realFocalLengthMm: 6.72 
    },
    { 
        model: "DJI Mini 2 SE / Mini 2 / SE", 
        fovDiagonal: 83.0, fovH: 70.6, fovV: 55.9, notes: "1/2.3\" CMOS",
        sensorWidthMm: 6.17, sensorHeightMm: 4.55,
        imageWidthPx: 4000, imageHeightPx: 3000,
        realFocalLengthMm: 4.49 
    },
    { 
        model: "DJI Air 3 (Wide)", 
        fovDiagonal: 86.2, fovH: 73.7, fovV: 58.6, notes: "1/1.3\" CMOS",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048,
        realFocalLengthMm: 6.72
    },
    { 
        model: "DJI Air 3 (Tele)", 
        fovDiagonal: 35.0, fovH: 28.3, fovV: 21.4, notes: "1/1.3\" CMOS (70mm equiv.)",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 8064, imageHeightPx: 6048,
        realFocalLengthMm: 19.6
    },
    { 
        model: "DJI Air 2S", 
        fovDiagonal: 88.0, fovH: 77.3, fovV: 56.1, notes: "1\" CMOS (22mm equiv.)",
        sensorWidthMm: 13.2, sensorHeightMm: 8.8,
        imageWidthPx: 5472, imageHeightPx: 3648,
        realFocalLengthMm: 8.38
    },
    { 
        model: "DJI Mavic 3 Pro (Wide)", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "4/3 CMOS (24mm equiv.)",
        sensorWidthMm: 17.3, sensorHeightMm: 13.0,
        imageWidthPx: 5280, imageHeightPx: 3956,
        realFocalLengthMm: 12.29 
    },
    { 
        model: "DJI Mavic 3 Classic / Mavic 3", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "4/3 CMOS (24mm equiv.)",
        sensorWidthMm: 17.3, sensorHeightMm: 13.0,
        imageWidthPx: 5280, imageHeightPx: 3956,
        realFocalLengthMm: 12.29 
    },
    { 
        model: "DJI Mavic 3 Enterprise (M3E)", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "4/3 CMOS (Mechanical Shutter)",
        sensorWidthMm: 17.3, sensorHeightMm: 13.0,
        imageWidthPx: 5280, imageHeightPx: 3956,
        realFocalLengthMm: 12.29 
    },
    { 
        model: "DJI Phantom 4 Pro V2.0", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "1\" CMOS (Mechanical Shutter)",
        sensorWidthMm: 13.2, sensorHeightMm: 8.8,
        imageWidthPx: 5472, imageHeightPx: 3648,
        realFocalLengthMm: 8.8
    },
    { 
        model: "DJI Inspire 3 (X9-8K Air)", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "Full Frame (24mm lens)",
        sensorWidthMm: 36.0, sensorHeightMm: 24.0,
        imageWidthPx: 8192, imageHeightPx: 5456,
        realFocalLengthMm: 24.0
    },
    { 
        model: "DJI Matrice 350 RTK (Zenmuse P1)", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "Full Frame (35mm lens)",
        sensorWidthMm: 35.9, sensorHeightMm: 24.0,
        imageWidthPx: 8192, imageHeightPx: 5460,
        realFocalLengthMm: 35.0
    },
    { 
        model: "DJI Matrice 30 / 30T (Wide)", 
        fovDiagonal: 84.0, fovH: 73.7, fovV: 53.1, notes: "1/2\" CMOS (24mm equiv.)",
        sensorWidthMm: 6.4, sensorHeightMm: 4.8,
        imageWidthPx: 4000, imageHeightPx: 3000,
        realFocalLengthMm: 4.5
    },
    { 
        model: "DJI Matrice 30 / 30T (Zoom)", 
        fovDiagonal: 21.6, fovH: 17.3, fovV: 13.0, notes: "1/2\" CMOS (113mm eq. at wide zoom)",
        sensorWidthMm: 6.4, sensorHeightMm: 4.8,
        imageWidthPx: 8000, imageHeightPx: 6000,
        realFocalLengthMm: 21.0
    },
    { 
        model: "DJI Avata 2", 
        fovDiagonal: 155.0, fovH: 120.0, fovV: 90.0, notes: "1/1.3\" CMOS (Ultrawide)",
        sensorWidthMm: 9.84, sensorHeightMm: 7.38,
        imageWidthPx: 4000, imageHeightPx: 3000,
        realFocalLengthMm: 2.1
    }
];

export interface RouteStats {
    totalDistance: number;
    totalTimeMinutes: number;
    photoCount: number;
    videoCount: number;
    batteryCount: number;
    swapPoints: { lat: number, lng: number, wpId: number, wpIndex: number }[]; 
}

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
    rollingShutterDelta?: number;
}

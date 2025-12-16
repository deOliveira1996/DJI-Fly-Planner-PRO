

import { Waypoint, Route, FlightSettings, DRONE_PRESETS, RouteStats } from '../types';
import * as turf from '@turf/turf';
import { polygon as createPolygon, lineString as createLineString, point as createPoint, points as createPoints } from '@turf/helpers';

/**
 * Converts degrees to radians
 */
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Converts radians to degrees
 */
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Calculates the bearing (azimuth) between two points
 * Returns 0-360 degrees
 */
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

/**
 * Calculates distance between two points in meters (Haversine)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Calculates a destination point given a start point, distance (meters), and bearing (degrees)
 */
export const computeDestinationPoint = (lat: number, lon: number, distanceMeters: number, bearing: number) => {
    const R = 6371e3; // Earth radius in meters
    const angularDist = distanceMeters / R;
    const bearingRad = toRad(bearing);
    const latRad = toRad(lat);
    const lonRad = toRad(lon);

    const destLatRad = Math.asin(Math.sin(latRad) * Math.cos(angularDist) +
        Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearingRad));
    
    const destLonRad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * Math.sin(destLatRad));

    return {
        lat: toDeg(destLatRad),
        lng: toDeg(destLonRad)
    };
};

/**
 * Updates waypoints with calculated bearings based on the path
 */
export const updateWaypointsWithBearings = (waypoints: Waypoint[]): Waypoint[] => {
  if (waypoints.length <= 1) return waypoints;

  return waypoints.map((wp, index) => {
    let bearing = 0;
    if (index < waypoints.length - 1) {
      const nextWp = waypoints[index + 1];
      bearing = calculateBearing(wp.latitude, wp.longitude, nextWp.latitude, nextWp.longitude);
    } else if (index > 0) {
      const prevWp = waypoints[index - 1];
      bearing = calculateBearing(prevWp.latitude, prevWp.longitude, wp.latitude, wp.longitude);
    }
    return { ...wp, heading: parseFloat(bearing.toFixed(2)) };
  });
};

/**
 * Calculates Photo Interval (seconds) based on Drone, Altitude, Speed, and Overlap
 */
export const calculatePhotoInterval = (
    altitude: number, 
    speedKmh: number, 
    droneModel: string, 
    overlapPercent: number
): number => {
    const drone = DRONE_PRESETS.find(d => d.model === droneModel) || DRONE_PRESETS[0];
    const speedMs = speedKmh / 3.6;
    if (speedMs <= 0 || altitude <= 0) return -1;

    // Vertical FOV calculation for ground footprint height
    const fovVRad = (drone.fovV * Math.PI) / 180;
    const groundHeight = 2 * altitude * Math.tan(fovVRad / 2);

    // Distance between photos
    const distBetweenPhotos = groundHeight * (1 - (overlapPercent / 100));
    
    // Time interval
    const interval = distBetweenPhotos / speedMs;
    return parseFloat(interval.toFixed(1));
};

/**
 * Calculate Ground Sampling Distance (cm/px)
 */
export const calculateGSD = (
    altitude: number, 
    sensorWidthMm: number, 
    imageWidthPx: number,
    focalLengthMm: number
): number => {
    // Standard Photogrammetry Formula:
    // GSD (cm/px) = (Sensor Width (mm) * Altitude (m) * 100) / (Focal Length (mm) * Image Width (px))
    
    if (focalLengthMm <= 0 || imageWidthPx <= 0) return 0;
    
    const gsd = (sensorWidthMm * altitude * 100) / (focalLengthMm * imageWidthPx);
    return gsd;
}

// Helper to project lat/lon to local cartesian (meters) relative to a center point
const projectToLocalCartesian = (lat: number, lng: number, centerLat: number, centerLng: number) => {
    const R = 6371e3;
    const x = toRad(lng - centerLng) * Math.cos(toRad(centerLat)) * R;
    const y = toRad(lat - centerLat) * R;
    return { x, y };
};

// Helper to project local cartesian back to lat/lon
const projectFromLocalCartesian = (x: number, y: number, centerLat: number, centerLng: number) => {
    const R = 6371e3;
    const lat = centerLat + toDeg(y / R);
    const lng = centerLng + toDeg(x / (R * Math.cos(toRad(centerLat))));
    return { lat, lng };
};

/**
 * Robust Grid Generation for Mapping
 */
export const generateGridWaypoints = (
  polygonCoords: { lat: number; lng: number }[],
  settings: FlightSettings,
  rotationAngle: number
): { lat: number; lng: number }[] => {
    if (polygonCoords.length < 3) return polygonCoords;
    
    // 1. Calculate Centroid
    const turfPolyCoords = polygonCoords.map(p => [p.lng, p.lat]);
    if (turfPolyCoords[0][0] !== turfPolyCoords[turfPolyCoords.length-1][0]) {
        turfPolyCoords.push(turfPolyCoords[0]);
    }
    const turfPoly = createPolygon([turfPolyCoords]);
    const centroid = turf.centroid(turfPoly);
    const centerLng = centroid.geometry.coordinates[0];
    const centerLat = centroid.geometry.coordinates[1];

    // 2. Project Polygon to Local Cartesian
    const projectedCoords = polygonCoords.map(p => projectToLocalCartesian(p.lat, p.lng, centerLat, centerLng));
    
    const drone = DRONE_PRESETS.find(d => d.model === settings.selectedDroneModel) || DRONE_PRESETS[0];
    const altitude = settings.altitude;
    const fovHRad = (drone.fovH * Math.PI) / 180;
    const footprintWidth = 2 * altitude * Math.tan(fovHRad / 2); // Lateral coverage
    const fovVRad = (drone.fovV * Math.PI) / 180;
    const footprintHeight = 2 * altitude * Math.tan(fovVRad / 2); // Forward coverage
    const overlapHDecimal = settings.mappingOverlapH / 100;
    const laneSpacing = footprintWidth * (1 - overlapHDecimal);
    const overlapVDecimal = settings.mappingOverlap / 100;
    const photoSpacing = footprintHeight * (1 - overlapVDecimal);

    if (laneSpacing <= 0.1) return polygonCoords.map(p => ({lat: p.lat, lng: p.lng}));

    // Function to generate a single pass of lines
    const generatePass = (angle: number): { lat: number, lng: number }[] => {
        // Rotate Polygon by -Angle
        const rad = toRad(-angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotatedCoords = projectedCoords.map(p => ({
            x: p.x * cos - p.y * sin,
            y: p.x * sin + p.y * cos
        }));

        // Bounding Box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        rotatedCoords.forEach(p => {
            if(p.x < minX) minX = p.x;
            if(p.x > maxX) maxX = p.x;
            if(p.y < minY) minY = p.y;
            if(p.y > maxY) maxY = p.y;
        });

        const gridPointsMetric: {x: number, y: number}[] = [];
        
        // Helper intersection
        const getIntersection = (y: number, p1: {x:number, y:number}, p2: {x:number, y:number}) => {
            if ((p1.y > y && p2.y > y) || (p1.y < y && p2.y < y)) return null;
            if (p1.y === p2.y) return null; 
            const t = (y - p1.y) / (p2.y - p1.y);
            const x = p1.x + t * (p2.x - p1.x);
            return { x, y };
        };

        let lineIndex = 0;
        let currentY = minY + (laneSpacing / 2);

        while (currentY < maxY) {
            const intersections = [];
            for (let i = 0; i < rotatedCoords.length; i++) {
                const p1 = rotatedCoords[i];
                const p2 = rotatedCoords[(i + 1) % rotatedCoords.length];
                const inter = getIntersection(currentY, p1, p2);
                if (inter) intersections.push(inter);
            }

            intersections.sort((a, b) => a.x - b.x);

            for (let i = 0; i < intersections.length - 1; i += 2) {
                const pStart = intersections[i];
                const pEnd = intersections[i+1];
                const lineLen = pEnd.x - pStart.x;
                const segmentPoints = [pStart];

                if (photoSpacing > 0 && lineLen > photoSpacing) {
                    const numPhotos = Math.floor(lineLen / photoSpacing);
                    for (let k = 1; k <= numPhotos; k++) {
                         const ratio = k * photoSpacing / lineLen;
                         const x = pStart.x + (pEnd.x - pStart.x) * ratio;
                         segmentPoints.push({ x, y: currentY });
                    }
                }
                
                segmentPoints.push(pEnd);
                if (lineIndex % 2 !== 0) segmentPoints.reverse();
                gridPointsMetric.push(...segmentPoints);
            }
            currentY += laneSpacing;
            lineIndex++;
        }

        // Un-Rotate and Project Back
        const revRad = toRad(angle);
        const revCos = Math.cos(revRad);
        const revSin = Math.sin(revRad);

        return gridPointsMetric.map(p => {
            const xRot = p.x * revCos - p.y * revSin;
            const yRot = p.x * revSin + p.y * revCos;
            return projectFromLocalCartesian(xRot, yRot, centerLat, centerLng);
        });
    };

    // Main Logic for Parallel or Cross Hatch
    let finalPoints = generatePass(rotationAngle);

    if (settings.mappingPattern === 'crosshatch') {
        const pass2 = generatePass(rotationAngle + 90);
        finalPoints = [...finalPoints, ...pass2];
    }

    if (finalPoints.length === 0) return polygonCoords.map(p => ({lat: p.lat, lng: p.lng}));

    return finalPoints;
};

/**
 * Calculates Flight Statistics
 */
export const estimateRouteStats = (routes: Route[], settings: FlightSettings, filterId: string | 'all'): RouteStats => {
    let totalDist = 0;
    let totalTime = 0;
    let photoCount = 0;
    let videoCount = 0;

    const routesToCalc = filterId === 'all' ? routes : routes.filter(r => r.id === filterId);

    routesToCalc.forEach(route => {
        if (route.waypoints.length === 0) return;

        // 1. Commute (Home -> WP1)
        const home = route.homePoint;
        const wp1 = route.waypoints[0];
        const commuteDist = calculateDistance(home.lat, home.lng, wp1.latitude, wp1.longitude);
        totalDist += commuteDist;

        // 2. Route Path
        for (let i = 0; i < route.waypoints.length - 1; i++) {
            const w1 = route.waypoints[i];
            const w2 = route.waypoints[i+1];
            const segDist = calculateDistance(w1.latitude, w1.longitude, w2.latitude, w2.longitude);
            totalDist += segDist;

            // Action Delays
            if (w1.actionType1 === 0) totalTime += (w1.actionParam1 / 1000); // ms -> s ? Litchi param is usually ms
            // Simple assumption: Action param 1 is seconds for STAY
            if (w1.actionType1 === 0) totalTime += (w1.actionParam1); 
            
            // Photo Count (Action 1)
            if (w1.actionType1 === 1) photoCount++;
            // Video Count (Action 2)
            if (w1.actionType1 === 2) videoCount++;
        }
        
        // Last point action
        const lastWp = route.waypoints[route.waypoints.length - 1];
        if (lastWp.actionType1 === 1) photoCount++;

        // 3. Return (Last WP -> Home) if RTH
        if (settings.finishAction === 1) { // RTH
            const returnDist = calculateDistance(lastWp.latitude, lastWp.longitude, home.lat, home.lng);
            totalDist += returnDist;
        }

        // 4. Mapping Interval Photos Estimation (Litchi Interval)
        const interval = route.waypoints[0].photoTimeInterval;
        if (interval > 0) {
            // Estimate based on time
            let routePathLen = 0;
             for (let i = 0; i < route.waypoints.length - 1; i++) {
                const w1 = route.waypoints[i];
                const w2 = route.waypoints[i+1];
                routePathLen += calculateDistance(w1.latitude, w1.longitude, w2.latitude, w2.longitude);
             }
             const speedMs = route.waypoints[0].speed > 0 ? route.waypoints[0].speed : (settings.speedKmh/3.6);
             const pathTime = routePathLen / speedMs;
             photoCount += Math.floor(pathTime / interval);
        }
    });

    // Total Time = Distance / Speed
    // Average speed from settings
    const speedMs = settings.speedKmh / 3.6;
    if (speedMs > 0) {
        totalTime += (totalDist / speedMs);
    }

    return {
        totalDistance: totalDist,
        totalTimeMinutes: totalTime / 60,
        photoCount,
        videoCount
    };
};

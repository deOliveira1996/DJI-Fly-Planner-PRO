
import { Waypoint, Route, FlightSettings, DRONE_PRESETS, RouteStats } from '../types';
import * as turf from '@turf/turf';

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
 * Robust Grid Generation for Mapping
 */
export const generateGridWaypoints = (
  polygonCoords: { lat: number; lng: number }[],
  settings: FlightSettings,
  rotationAngle: number
): { lat: number; lng: number }[] => {
    // 1. Convert inputs to Turf Polygon
    if (polygonCoords.length < 3) return polygonCoords;
    
    // Ensure closed loop
    const coords = polygonCoords.map(p => [p.lng, p.lat]);
    if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
        coords.push(coords[0]);
    }
    const polygon = turf.polygon([coords]);

    // 2. Calculate Centroid for Rotation pivot
    const centroid = turf.centroid(polygon);
    
    // 3. Rotate Polygon to align with X-axis (0 deg) temporarily
    // We rotate by -rotationAngle so we can generate horizontal scanlines easily
    const rotatedPoly = turf.transformRotate(polygon, -rotationAngle, { pivot: centroid });

    // 4. Get Bounding Box of aligned polygon
    const bbox = turf.bbox(rotatedPoly); // [minX, minY, maxX, maxY]

    // 5. Calculate Spacing based on Settings
    const drone = DRONE_PRESETS.find(d => d.model === settings.selectedDroneModel) || DRONE_PRESETS[0];
    const altitude = settings.altitude;
    
    // Footprint Dimensions on Ground (meters)
    const fovHRad = (drone.fovH * Math.PI) / 180;
    const footprintWidth = 2 * altitude * Math.tan(fovHRad / 2); // Lateral coverage
    
    const fovVRad = (drone.fovV * Math.PI) / 180;
    const footprintHeight = 2 * altitude * Math.tan(fovVRad / 2); // Forward coverage

    // Lateral Spacing (Distance between lines)
    const overlapHDecimal = settings.mappingOverlapH / 100;
    const laneSpacingMeters = footprintWidth * (1 - overlapHDecimal);

    // Longitudinal Spacing (Distance between photos for densification)
    const overlapVDecimal = settings.mappingOverlap / 100;
    const photoSpacingMeters = footprintHeight * (1 - overlapVDecimal);

    // 6. Convert Spacing to Degrees (Approximate)
    // We assume spherical approximation locally which is fine for drone fields
    // At equator 1 deg lat = 111km. 
    const metersPerDegLat = 111320;
    const laneSpacingDeg = laneSpacingMeters / metersPerDegLat;

    // 7. Generate Scanlines
    const gridPoints: any[] = [];
    let currentY = bbox[1] + (laneSpacingDeg / 2); // Start with half spacing offset
    
    if (laneSpacingDeg <= 0.000001) return polygonCoords; // Prevent infinite loop on 0 spacing

    let lineIndex = 0;
    
    // Safety break
    const maxLines = 500;
    
    while (currentY < bbox[3] && lineIndex < maxLines) {
        // Create a horizontal line across the bounding box
        const lineString = turf.lineString([
            [bbox[0] - 0.05, currentY], // Extend slightly beyond bbox to ensure intersection
            [bbox[2] + 0.05, currentY]
        ]);

        // Find intersection with polygon
        const intersects = turf.lineIntersect(lineString, rotatedPoly);
        
        if (intersects.features.length >= 2) {
             const points = intersects.features.map(f => f.geometry.coordinates);
             // Sort by X (Longitude)
             points.sort((a, b) => a[0] - b[0]);

             // Pair intersections (Entry/Exit)
             for(let i=0; i<points.length - 1; i+=2) {
                 const pStart = points[i];
                 const pEnd = points[i+1];
                 
                 // Generate intermediate points along the line for photos
                 const lineDistMeters = turf.distance(turf.point(pStart), turf.point(pEnd), {units: 'meters'});
                 
                 const segmentPoints = [];
                 segmentPoints.push(pStart);
                 
                 // Densification logic: Add points if spacing allows
                 if (photoSpacingMeters > 0 && lineDistMeters > photoSpacingMeters) {
                     const numPhotos = Math.floor(lineDistMeters / photoSpacingMeters);
                     for (let k = 1; k <= numPhotos; k++) {
                         const ratio = k * photoSpacingMeters / lineDistMeters;
                         const lng = pStart[0] + (pEnd[0] - pStart[0]) * ratio;
                         segmentPoints.push([lng, currentY]);
                     }
                 }

                 segmentPoints.push(pEnd);

                 // Snake pattern: Reverse odd lines
                 if (lineIndex % 2 !== 0) {
                     segmentPoints.reverse();
                 }
                 
                 gridPoints.push(...segmentPoints);
             }
        }
        
        currentY += laneSpacingDeg;
        lineIndex++;
    }
    
    if (gridPoints.length === 0) return polygonCoords.map(p => ({lat: p.lat, lng: p.lng}));

    // 8. Rotate Grid back by +Angle
    const finalPoints = turf.points(gridPoints);
    const rotatedGrid = turf.transformRotate(finalPoints, rotationAngle, { pivot: centroid });

    return rotatedGrid.features.map(f => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0]
    }));
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
            
            // Photo Count
            if (w1.actionType1 === 1) photoCount++;
            // Video Count
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

        // 4. Mapping Interval Photos Estimation
        // If route has interval set and is mapping mode (or just has interval)
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

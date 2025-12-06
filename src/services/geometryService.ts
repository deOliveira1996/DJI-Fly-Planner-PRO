
import { Waypoint, Route, FlightSettings, DRONE_PRESETS } from '../types';
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
    } else {
      // Last point keeps previous bearing or 0
      const prevWp = waypoints[index - 1];
      bearing = calculateBearing(prevWp.latitude, prevWp.longitude, wp.latitude, wp.longitude);
    }
    return { ...wp, heading: Number(bearing.toFixed(2)) };
  });
};

/**
 * Haversine formula to calculate distance between two points in meters
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
 * Calculates Camera Footprint on ground (Width and Height in meters)
 */
export const calculateFootprintDimensions = (
    altitude: number,
    modelName: string
) => {
    const preset = DRONE_PRESETS.find(p => p.model === modelName) || DRONE_PRESETS[0];
    
    // Width (Lateral coverage) depends on Horizontal FOV
    const fovHRad = toRad(preset.fovH);
    const width = 2 * altitude * Math.tan(fovHRad / 2);

    // Height (Forward coverage) depends on Vertical FOV
    const fovVRad = toRad(preset.fovV);
    const height = 2 * altitude * Math.tan(fovVRad / 2);

    return { width, height };
};

/**
 * Calculates Photo Interval based on Overlap
 */
export const calculatePhotoInterval = (
    altitude: number, 
    speedKmh: number, 
    modelName: string, 
    overlapPercent: number
): number => {
    if (speedKmh <= 0 || altitude <= 0) return -1;
    
    const dims = calculateFootprintDimensions(altitude, modelName);
    const footprintHeight = dims.height;

    // Distance = Footprint * (1 - overlap)
    const distanceBetweenPhotos = footprintHeight * (1 - (overlapPercent / 100));

    // Time = Distance / Speed(m/s)
    const speedMs = speedKmh / 3.6;
    const interval = distanceBetweenPhotos / speedMs;

    return parseFloat(interval.toFixed(1));
};

/**
 * Generates a grid pattern (zig-zag) inside a polygon with rotation
 */
export const generateGridWaypoints = (
    polygonCoords: { lat: number, lng: number }[], 
    settings: FlightSettings,
    rotationAngle: number = 0
): { lat: number, lng: number }[] => {
    
    // 1. Calculate Lane Spacing based on Lateral Overlap
    const dims = calculateFootprintDimensions(settings.altitude, settings.selectedDroneModel);
    
    // Spacing = FootprintWidth * (1 - SideOverlap)
    // IMPORTANT: If overlap is 0, we cover width. If overlap is 20%, we step 80% of width.
    const laneSpacingMeters = dims.width * (1 - (settings.mappingOverlapH / 100));
    
    if (laneSpacingMeters <= 0) return polygonCoords; 

    // 2. Convert to Turf Polygon
    const turfCoords = polygonCoords.map(p => [p.lng, p.lat]);
    if (turfCoords.length > 0 && 
        (turfCoords[0][0] !== turfCoords[turfCoords.length-1][0] || 
         turfCoords[0][1] !== turfCoords[turfCoords.length-1][1])) {
        turfCoords.push(turfCoords[0]);
    }
    const poly = turf.polygon([turfCoords]);

    // 3. Rotate Polygon "Flat" (Reverse Rotation) to calculate simple horizontal scan lines
    const rotatedPoly = turf.transformRotate(poly, -rotationAngle, { pivot: turf.centroid(poly) });
    const bbox = turf.bbox(rotatedPoly); // [minX, minY, maxX, maxY]

    const resultPoints: number[][] = [];
    
    // 4. Scan-line algorithm on rotated bbox
    let currentLat = bbox[3]; // North
    const minLat = bbox[1];   // South
    
    // Approx degrees per meter. 
    const latStep = laneSpacingMeters / 111132; // ~111km per degree

    // Inset slightly
    currentLat -= (latStep / 2);

    let direction = 1;

    while (currentLat > minLat) {
        // Horizontal line
        const line = turf.lineString([
            [bbox[0] - 1.0, currentLat], 
            [bbox[2] + 1.0, currentLat]
        ]);

        const intersects = turf.lineIntersect(line, rotatedPoly);
        
        if (intersects.features.length >= 2) {
            const points = intersects.features.map(f => f.geometry.coordinates);
            points.sort((a, b) => a[0] - b[0]);

            if (direction === 1) {
                for (let i = 0; i < points.length; i++) resultPoints.push(points[i]);
            } else {
                for (let i = points.length - 1; i >= 0; i--) resultPoints.push(points[i]);
            }
            direction *= -1;
        }
        currentLat -= latStep;
    }

    if (resultPoints.length === 0) return polygonCoords;

    // 5. Convert points back to GeoJSON FeatureCollection
    const pointFeatures = turf.featureCollection(
        resultPoints.map(p => turf.point(p))
    );

    // 6. Rotate points back to original angle
    const rotatedBackPoints = turf.transformRotate(pointFeatures, rotationAngle, { pivot: turf.centroid(poly) });

    // 7. Extract coords
    return rotatedBackPoints.features.map(f => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0]
    }));
};

/**
 * Estimates total distance and flight time
 */
export const estimateRouteStats = (
    routes: Route[], 
    settings: FlightSettings,
    targetRouteId: string | 'all' = 'all'
) => {
    let totalDistance = 0;
    let totalTimeSeconds = 0;
    let photoCount = 0;
    let videoCount = 0;

    const routesToCalc = targetRouteId === 'all' 
        ? routes 
        : routes.filter(r => r.id === targetRouteId);

    routesToCalc.forEach(route => {
        if (route.waypoints.length === 0) return;

        // 1. Commute
        const distToStart = calculateDistance(
            route.homePoint.lat, route.homePoint.lng, 
            route.waypoints[0].latitude, route.waypoints[0].longitude
        );
        totalDistance += distToStart;
        const speedMs = settings.speedKmh / 3.6; 
        totalTimeSeconds += (distToStart / (speedMs || 5)); 


        // 2. Path
        for (let i = 0; i < route.waypoints.length - 1; i++) {
            const wp = route.waypoints[i];
            const nextWp = route.waypoints[i+1];
            const dist = calculateDistance(wp.latitude, wp.longitude, nextWp.latitude, nextWp.longitude);
            
            totalDistance += dist;
            
            const speed = wp.speed > 0 ? wp.speed : (settings.speedKmh / 3.6);
            const segmentTime = dist / (speed || 1);
            totalTimeSeconds += segmentTime;

            if (wp.actionType1 === 1) photoCount++; 
            if (wp.actionType1 === 2) videoCount++; 

            // Interval Photo Calculation
            if (wp.photoTimeInterval > 0 && wp.actionType1 !== 2 && wp.actionType1 !== 3) {
                photoCount += Math.floor(segmentTime / wp.photoTimeInterval);
            }

            if (wp.actionType1 === 0) totalTimeSeconds += 5; 
            if (wp.actionType1 === 1) totalTimeSeconds += 2; 
        }

        if (route.waypoints.length > 0) {
             const lastWp = route.waypoints[route.waypoints.length-1];
             if (lastWp.actionType1 === 1) photoCount++;
             if (lastWp.actionType1 === 2) videoCount++;
        }

        // 3. Return
        if (settings.finishAction === 1) { 
             const lastWp = route.waypoints[route.waypoints.length - 1];
             const distHome = calculateDistance(
                 lastWp.latitude, lastWp.longitude,
                 route.homePoint.lat, route.homePoint.lng
             );
             totalDistance += distHome;
             const rthSpeed = 10; 
             totalTimeSeconds += (distHome / rthSpeed);
        }
    });

    return {
        totalDistance, 
        totalTimeMinutes: totalTimeSeconds / 60,
        photoCount,
        videoCount
    };
};

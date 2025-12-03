import { Waypoint, Route, FlightSettings } from '../types';

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
 * Estimates total distance and flight time
 * Can filter by specific route ID or calculate all
 */
export const estimateRouteStats = (
    routes: Route[], 
    settings: FlightSettings,
    targetRouteId: string | 'all' = 'all'
) => {
    let totalDistance = 0;
    let totalTimeSeconds = 0;

    const routesToCalc = targetRouteId === 'all' 
        ? routes 
        : routes.filter(r => r.id === targetRouteId);

    routesToCalc.forEach(route => {
        if (route.waypoints.length === 0) return;

        // 1. Commute: Route Home Point -> WP 1
        // We use route.homePoint now
        const distToStart = calculateDistance(
            route.homePoint.lat, route.homePoint.lng, 
            route.waypoints[0].latitude, route.waypoints[0].longitude
        );
        totalDistance += distToStart;
        const speedMs = settings.speedKmh / 3.6; 
        totalTimeSeconds += (distToStart / (speedMs || 5)); 


        // 2. Route Path
        for (let i = 0; i < route.waypoints.length - 1; i++) {
            const wp = route.waypoints[i];
            const nextWp = route.waypoints[i+1];
            const dist = calculateDistance(wp.latitude, wp.longitude, nextWp.latitude, nextWp.longitude);
            
            totalDistance += dist;
            
            const speed = wp.speed > 0 ? wp.speed : (settings.speedKmh / 3.6);
            totalTimeSeconds += (dist / (speed || 1));

            if (wp.actionType1 === 0) { // Stay
                totalTimeSeconds += 5; 
            }
        }

        // 3. Return: Last WP -> Route Home (If RTH)
        if (settings.finishAction === 1) { // 1 = RTH
             const lastWp = route.waypoints[route.waypoints.length - 1];
             const distHome = calculateDistance(
                 lastWp.latitude, lastWp.longitude,
                 route.homePoint.lat, route.homePoint.lng
             );
             totalDistance += distHome;
             const rthSpeed = 10; // RTH is usually 10m/s
             totalTimeSeconds += (distHome / rthSpeed);
        }
    });

    return {
        totalDistance, // meters
        totalTimeMinutes: totalTimeSeconds / 60
    };
};
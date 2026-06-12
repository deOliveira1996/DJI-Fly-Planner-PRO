
import { Waypoint, Route, FlightSettings, DRONE_PRESETS, RouteStats } from '../types';
import * as turf from '@turf/turf';
import { polygon as createPolygon, lineString as createLineString, point as createPoint, points as createPoints } from '@turf/helpers';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

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

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; 
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

export const computeDestinationPoint = (lat: number, lon: number, distanceMeters: number, bearing: number) => {
    const R = 6371e3; 
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

export const calculatePhotoInterval = (
    altitude: number, 
    speedKmh: number, 
    droneModel: string, 
    overlapPercent: number,
    aspectRatio: '4:3' | '16:9' = '4:3'
): number => {
    const drone = DRONE_PRESETS.find(d => d.model === droneModel) || DRONE_PRESETS[0];
    const speedMs = speedKmh / 3.6;
    if (speedMs <= 0 || altitude <= 0) return -1;

    const diagRad = (drone.fovDiagonal * Math.PI) / 180;
    const aspectHoriz = aspectRatio === '4:3' ? 4 : 16;
    const aspectVert = aspectRatio === '4:3' ? 3 : 9;
    const aspectDiag = Math.sqrt(aspectHoriz * aspectHoriz + aspectVert * aspectVert);
    
    // HFOV = 2 * atan( (aspect_horiz / aspect_diag) * tan(fov_diag / 2) )
    const fovHRad = 2 * Math.atan((aspectHoriz / aspectDiag) * Math.tan(diagRad / 2));
    // VFOV = 2 * atan( (aspect_vert / aspect_diag) * tan(fov_diag / 2) )
    const fovVRad = 2 * Math.atan((aspectVert / aspectDiag) * Math.tan(diagRad / 2));

    const groundHeight = 2 * altitude * Math.tan(fovVRad / 2);
    // Use sin for width as per user's latest example
    const groundWidth = 2 * altitude * Math.sin(fovHRad / 2);

    const distBetweenPhotos = groundHeight * (1 - (overlapPercent / 100));
    const interval = distBetweenPhotos / speedMs;
    return parseFloat(interval.toFixed(1));
};

export const calculateGSD = (
    distance: number, 
    sensorWidthMm: number, 
    imageWidthPx: number,
    focalLengthMm: number
): number => {
    if (focalLengthMm <= 0 || imageWidthPx <= 0) return 0;
    const gsd = (sensorWidthMm * distance * 100) / (focalLengthMm * imageWidthPx);
    return gsd;
}

/**
 * Formula do efeito Rolling Shutter (Delta) - PDF p.18
 * Delta = (V / h) * (FR * (ImH / SH)) * T
 */
export const calculateRollingShutterDelta = (
    velocityMs: number,
    height: number,
    trueFocalMm: number,
    imageHeightPx: number,
    sensorHeightMm: number,
    shutterTimeS: number
): number => {
    if (height <= 0 || sensorHeightMm <= 0) return 0;
    const delta = (velocityMs / height) * (trueFocalMm * (imageHeightPx / sensorHeightMm)) * shutterTimeS;
    return delta;
};

const projectToLocalCartesian = (lat: number, lng: number, centerLat: number, centerLng: number) => {
    const R = 6371e3;
    const x = toRad(lng - centerLng) * Math.cos(toRad(centerLat)) * R;
    const y = toRad(lat - centerLat) * R;
    return { x, y };
};

const projectFromLocalCartesian = (x: number, y: number, centerLat: number, centerLng: number) => {
    const R = 6371e3;
    const lat = centerLat + toDeg(y / R);
    const lng = centerLng + toDeg(x / (R * Math.cos(toRad(centerLat))));
    return { lat, lng };
};

export const generateGridWaypoints = (
  polygonCoords: { lat: number; lng: number }[],
  settings: FlightSettings,
  rotationAngle: number
): ( { lat: number, lng: number, isEffort: boolean } )[] => {
    if (polygonCoords.length < 3) return polygonCoords.map(p => ({...p, isEffort: true}));
    
    const turfPolyCoords = polygonCoords.map(p => [p.lng, p.lat]);
    if (turfPolyCoords[0][0] !== turfPolyCoords[turfPolyCoords.length-1][0]) {
        turfPolyCoords.push(turfPolyCoords[0]);
    }
    const turfPoly = createPolygon([turfPolyCoords]);
    const centroid = turf.centroid(turfPoly);
    const centerLng = centroid.geometry.coordinates[0];
    const centerLat = centroid.geometry.coordinates[1];

    const projectedCoords = polygonCoords.map(p => projectToLocalCartesian(p.lat, p.lng, centerLat, centerLng));
    
    const drone = DRONE_PRESETS.find(d => d.model === settings.selectedDroneModel) || DRONE_PRESETS[0];
    const altitude = settings.altitude;
    
    const aspectHoriz = settings.aspectRatio === '4:3' ? 4 : 16;
    const aspectVert = settings.aspectRatio === '4:3' ? 3 : 9;
    const aspectDiag = Math.sqrt(aspectHoriz * aspectHoriz + aspectVert * aspectVert);

    const diagRad = (drone.fovDiagonal * Math.PI) / 180;
    // HFOV = 2 * atan( (aspect_horiz / aspect_diag) * tan(fov_diag / 2) )
    const fovHRad = 2 * Math.atan((aspectHoriz / aspectDiag) * Math.tan(diagRad / 2));
    // VFOV = 2 * atan( (aspect_vert / aspect_diag) * tan(fov_diag / 2) )
    const fovVRad = 2 * Math.atan((aspectVert / aspectDiag) * Math.tan(diagRad / 2));

    const footprintWidth = 2 * altitude * Math.sin(fovHRad / 2); 
    const footprintHeight = 2 * altitude * Math.tan(fovVRad / 2); 
    const overlapHDecimal = settings.mappingOverlapH / 100;
    const laneSpacing = footprintWidth * (1 - overlapHDecimal);
    const overlapVDecimal = settings.mappingOverlap / 100;
    const photoSpacing = footprintHeight * (1 - overlapVDecimal);

    if (laneSpacing <= 0.1) return polygonCoords.map(p => ({lat: p.lat, lng: p.lng, isEffort: true}));

    const generatePass = (angle: number): { lat: number, lng: number, isEffort: boolean }[] => {
        const rad = toRad(-angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotatedCoords = projectedCoords.map(p => ({
            x: p.x * cos - p.y * sin,
            y: p.x * sin + p.y * cos
        }));

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        rotatedCoords.forEach(p => {
            if(p.x < minX) minX = p.x;
            if(p.x > maxX) maxX = p.x;
            if(p.y < minY) minY = p.y;
            if(p.y > maxY) maxY = p.y;
        });

        const getIntersection = (y: number, p1: {x:number, y:number}, p2: {x:number, y:number}) => {
            if ((p1.y > y && p2.y > y) || (p1.y < y && p2.y < y)) return null;
            if (p1.y === p2.y) return null; 
            const t = (y - p1.y) / (p2.y - p1.y);
            const x = p1.x + t * (p2.x - p1.x);
            return { x, y };
        };

        const finalMetric: {x: number, y: number, isEffort: boolean}[] = [];
        let curY = minY + (laneSpacing / 2);
        let lIdx = 0;
        while (curY < maxY) {
            const intersections = [];
            for (let i = 0; i < rotatedCoords.length; i++) {
                const p1 = rotatedCoords[i];
                const p2 = rotatedCoords[(i + 1) % rotatedCoords.length];
                const inter = getIntersection(curY, p1, p2);
                if (inter) intersections.push(inter);
            }
            intersections.sort((a, b) => a.x - b.x);
            for (let i = 0; i < intersections.length - 1; i += 2) {
                const pS = intersections[i];
                const pE = intersections[i+1];
                let lineWps = [{...pS, isEffort: true}, {...pE, isEffort: true}];
                if (lIdx % 2 !== 0) lineWps.reverse();
                
                if (finalMetric.length > 0) {
                    const connector = {...lineWps[0], isEffort: false};
                    finalMetric.push(connector);
                    finalMetric.push({...lineWps[0], isEffort: true});
                    finalMetric.push({...lineWps[1], isEffort: true});
                } else {
                    finalMetric.push(lineWps[0]);
                    finalMetric.push(lineWps[1]);
                }
            }
            curY += laneSpacing;
            lIdx++;
        }

        return finalMetric.map(p => {
            const revRadVal = toRad(angle);
            const xRot = p.x * Math.cos(revRadVal) - p.y * Math.sin(revRadVal);
            const yRot = p.x * Math.sin(revRadVal) + p.y * Math.cos(revRadVal);
            const ll = projectFromLocalCartesian(xRot, yRot, centerLat, centerLng);
            return { ...ll, isEffort: p.isEffort };
        });
    };

    let finalPoints = generatePass(rotationAngle);
    if (settings.mappingPattern === 'crosshatch') {
        const pass2 = generatePass(rotationAngle + 90);
        if (finalPoints.length > 0 && pass2.length > 0) {
            const connector = { ...pass2[0], isEffort: false };
            finalPoints = [...finalPoints, connector, ...pass2];
        } else {
            finalPoints = [...finalPoints, ...pass2];
        }
    }

    if (finalPoints.length === 0) return polygonCoords.map(p => ({lat: p.lat, lng: p.lng, isEffort: true}));
    return finalPoints;
};

export const estimateRouteStats = (routes: Route[], settings: FlightSettings, filterId: string | 'all'): RouteStats => {
    let totalDist = 0;
    let totalTime = 0; 
    let photoCount = 0;
    let videoCount = 0;
    let batteryCount = 0;
    const swapPoints: { lat: number, lng: number, wpId: number, wpIndex: number }[] = [];

    const routesToCalc = filterId === 'all' ? routes : routes.filter(r => r.id === filterId);

    const speedMs = settings.speedKmh / 3.6;
    const maxTimeSec = settings.maxFlightTimeMinutes * 60;
    const safetyMarginDecimal = settings.batterySafetyMargin / 100;
    const effectiveTimeSec = maxTimeSec * (1 - safetyMarginDecimal);

    routesToCalc.forEach(route => {
        if (route.waypoints.length === 0) return;

        const home = route.homePoint;
        let currentBatteryTime = 0;
        let routeBatteryCount = 1;

        const wp1 = route.waypoints[0];
        const initialCommuteDist = calculateDistance(home.lat, home.lng, wp1.latitude, wp1.longitude);
        const initialCommuteTime = initialCommuteDist / speedMs;
        
        currentBatteryTime += initialCommuteTime;
        totalDist += initialCommuteDist;

        for (let i = 0; i < route.waypoints.length - 1; i++) {
            const w1 = route.waypoints[i];
            const w2 = route.waypoints[i+1];
            const segDist = calculateDistance(w1.latitude, w1.longitude, w2.latitude, w2.longitude);
            const segTime = segDist / speedMs;
            
            let actionDelay = 0;
            if (w1.actionType1 === 0) actionDelay += (w1.actionParam1); 
            if (w1.actionType1 === 1) photoCount++;
            if (w1.actionType1 === 2) videoCount++;

            const distToHomeFromNext = calculateDistance(w2.latitude, w2.longitude, home.lat, home.lng);
            const timeToHomeFromNext = distToHomeFromNext / speedMs;

            // Se o tempo atual + este trecho + delay de ação + tempo de voltar ao home exceder o limite
            if (currentBatteryTime + segTime + actionDelay + timeToHomeFromNext > effectiveTimeSec) {
                const distToHome = calculateDistance(w1.latitude, w1.longitude, home.lat, home.lng);
                const timeToHome = distToHome / speedMs;
                
                totalDist += distToHome; 
                totalTime += timeToHome;
                
                routeBatteryCount++;
                
                // Registra o ID do waypoint atual como o ponto de swap
                // (O drone finaliza a ação no WP atual e volta pro Home)
                swapPoints.push({ 
                    lat: w1.latitude, 
                    lng: w1.longitude, 
                    wpId: w1.id,
                    wpIndex: i
                });

                const distFromHomeToResume = calculateDistance(home.lat, home.lng, w1.latitude, w1.longitude);
                currentBatteryTime = distFromHomeToResume / speedMs;
                totalDist += distFromHomeToResume;
            }

            currentBatteryTime += (segTime + actionDelay);
            totalDist += segDist;
            totalTime += (segTime + actionDelay);
        }

        const lastWp = route.waypoints[route.waypoints.length - 1];
        if (lastWp.actionType1 === 1) photoCount++;
        
        const finalReturnDist = calculateDistance(lastWp.latitude, lastWp.longitude, home.lat, home.lng);
        const finalReturnTime = finalReturnDist / speedMs;
        totalDist += finalReturnDist;
        totalTime += finalReturnTime;
        
        batteryCount += routeBatteryCount;
        
        const interval = route.waypoints[0].photoTimeInterval;
        if (interval > 0) {
            let routePathLen = 0;
            for (let i = 0; i < route.waypoints.length - 1; i++) {
                const w1 = route.waypoints[i];
                const w2 = route.waypoints[i+1];
                routePathLen += calculateDistance(w1.latitude, w1.longitude, w2.latitude, w2.longitude);
            }
            const pathTime = routePathLen / speedMs;
            photoCount += Math.floor(pathTime / interval);
        }
    });

    return {
        totalDistance: totalDist,
        totalTimeMinutes: totalTime / 60,
        photoCount,
        videoCount,
        batteryCount,
        swapPoints
    };
};

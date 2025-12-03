import Papa from 'papaparse';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { Route, Waypoint, FlightSettings } from '../types';
import * as turf from '@turf/turf';

// Handle FileSaver import for both ESM and UMD environments
// The saveAs function is sometimes the default export itself, or a property of the default export
const saveAs = (FileSaver as any).saveAs || FileSaver;

// Helper for unique ID - Exported for use in App.tsx
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Litchi CSV Columns Header
const LITCHI_HEADER = [
  "latitude", "longitude", "altitude(m)", "heading(deg)", "curvesize(m)",
  "rotationdir", "gimbalmode", "gimbalpitchangle", "actiontype1", "actionparam1",
  "actiontype2", "actionparam2", "altitudemode", "speed(m/s)", "poi_latitude",
  "poi_longitude", "poi_altitude(m)", "poi_altitudemode",
  "photo_timeinterval", "photo_distinterval"
];

export const parseCSV = (file: File): Promise<Waypoint[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const waypoints: Waypoint[] = [];
        results.data.forEach((row: any, index: number) => {
          // Flexible parsing for latitude/longitude keys
          const latKey = Object.keys(row).find(k => k.toLowerCase().includes('latitude'));
          const lonKey = Object.keys(row).find(k => k.toLowerCase().includes('longitude'));

          if (latKey && lonKey && row[latKey] && row[lonKey]) {
            waypoints.push({
              id: index + 1,
              latitude: parseFloat(row[latKey]),
              longitude: parseFloat(row[lonKey]),
              altitude: 30, // Default, will be overwritten by settings
              heading: 0,
              curveSize: 0,
              rotationDir: 0,
              gimbalMode: 0,
              gimbalPitch: 0,
              actionType1: -1,
              actionParam1: 0,
              actionType2: -1,
              actionParam2: 0,
              altitudeMode: 1,
              speed: 0,
              poiLat: 0,
              poiLon: 0,
              poiAlt: 0,
              poiAltMode: 0,
              photoTimeInterval: -1,
              photoDistInterval: -1
            });
          }
        });
        resolve(waypoints);
      },
      error: (err: any) => reject(err)
    });
  });
};

export const parseKML = async (file: File): Promise<Route[]> => {
  const text = await file.text();
  const parser = new DOMParser();
  const kml = parser.parseFromString(text, 'text/xml');
  const routes: Route[] = [];

  // Very basic KML parsing for LineStrings and Points
  const placemarks = kml.getElementsByTagName('Placemark');
  
  // Group points into a single route if they are just points
  const pointWaypoints: Waypoint[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const name = pm.getElementsByTagName('name')[0]?.textContent || `Route ${i}`;
    
    // Check for Point
    const point = pm.getElementsByTagName('Point')[0];
    if (point) {
      const coords = point.getElementsByTagName('coordinates')[0]?.textContent?.trim();
      if (coords) {
        const [lon, lat] = coords.split(',').map(Number);
        pointWaypoints.push({
          id: pointWaypoints.length + 1,
          latitude: lat,
          longitude: lon,
          altitude: 30,
          heading: 0,
          curveSize: 0,
          rotationDir: 0,
          gimbalMode: 0,
          gimbalPitch: 0,
          actionType1: -1,
          actionParam1: 0,
          actionType2: -1,
          actionParam2: 0,
          altitudeMode: 1,
          speed: 0,
          poiLat: 0,
          poiLon: 0,
          poiAlt: 0,
          poiAltMode: 0,
          photoTimeInterval: -1,
          photoDistInterval: -1
        });
      }
    }

    // Check for LineString
    const lineString = pm.getElementsByTagName('LineString')[0];
    if (lineString) {
      const coordStr = lineString.getElementsByTagName('coordinates')[0]?.textContent?.trim();
      if (coordStr) {
        const parts = coordStr.split(/\s+/);
        const lineWps: Waypoint[] = parts.map((part, idx) => {
          const [lon, lat] = part.split(',').map(Number);
          return {
             id: idx + 1,
             latitude: lat,
             longitude: lon,
             altitude: 30,
             heading: 0,
             curveSize: 0,
             rotationDir: 0,
             gimbalMode: 0,
             gimbalPitch: 0,
             actionType1: -1,
             actionParam1: 0,
             actionType2: -1,
             actionParam2: 0,
             altitudeMode: 1,
             speed: 0,
             poiLat: 0,
             poiLon: 0,
             poiAlt: 0,
             poiAltMode: 0,
             photoTimeInterval: -1,
             photoDistInterval: -1
          };
        }).filter(w => !isNaN(w.latitude));

        if(lineWps.length > 0) {
            routes.push({
                id: generateId(),
                name: name,
                waypoints: lineWps,
                color: '#3388ff',
                locked: false,
                homePoint: { lat: lineWps[0].latitude, lng: lineWps[0].longitude }
            });
        }
      }
    }
  }

  if (pointWaypoints.length > 0) {
    routes.push({
      id: generateId(),
      name: file.name.replace('.kml', ''),
      waypoints: pointWaypoints,
      color: '#ff3388',
      locked: false,
      homePoint: { lat: pointWaypoints[0].latitude, lng: pointWaypoints[0].longitude }
    });
  }

  return routes;
};

export const exportLitchiZip = (routes: Route[]) => {
  const zip = new JSZip();

  routes.forEach(route => {
    // Convert waypoints to CSV row array
    const csvData = route.waypoints.map(wp => ({
      "latitude": wp.latitude,
      "longitude": wp.longitude,
      "altitude(m)": wp.altitude,
      "heading(deg)": wp.heading,
      "curvesize(m)": wp.curveSize,
      "rotationdir": wp.rotationDir,
      "gimbalmode": wp.gimbalMode,
      "gimbalpitchangle": wp.gimbalPitch,
      "actiontype1": wp.actionType1,
      "actionparam1": wp.actionParam1,
      "actiontype2": wp.actionType2,
      "actionparam2": wp.actionParam2,
      "altitudemode": wp.altitudeMode,
      "speed(m/s)": wp.speed,
      "poi_latitude": wp.poiLat,
      "poi_longitude": wp.poiLon,
      "poi_altitude(m)": wp.poiAlt,
      "poi_altitudemode": wp.poiAltMode,
      "photo_timeinterval": wp.photoTimeInterval,
      "photo_distinterval": wp.photoDistInterval
    }));

    const csvString = Papa.unparse({
      fields: LITCHI_HEADER,
      data: csvData
    });

    zip.file(`${route.name}_litchi.csv`, csvString);
  });

  zip.generateAsync({ type: "blob" }).then(content => {
    saveAs(content, "litchi_flight_plans.zip");
  });
};


// DJI Fly KML (Standard KML 2.2 that works in most viewers and DJI Import)
export const exportDJIKMLZip = (routes: Route[]) => {
  const zip = new JSZip();

  routes.forEach(route => {
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${route.name}</name>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>2</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>${route.name} Path</name>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>
`;

    // Coordinates loop
    route.waypoints.forEach(wp => {
        kmlContent += `          ${wp.longitude},${wp.latitude},${wp.altitude}\n`;
    });

    kmlContent += `        </coordinates>
      </LineString>
    </Placemark>
`;
    // Add Individual Waypoints as placemarks
    route.waypoints.forEach((wp, idx) => {
        kmlContent += `    <Placemark>
      <name>${idx + 1}</name>
      <Point>
        <coordinates>${wp.longitude},${wp.latitude},${wp.altitude}</coordinates>
      </Point>
    </Placemark>\n`;
    });

    kmlContent += `  </Document>
</kml>`;

    zip.file(`${route.name}_dji.kml`, kmlContent);
  });

  zip.generateAsync({ type: "blob" }).then(content => {
    saveAs(content, "dji_flight_plans_kml.zip");
  });
};

// --- DJI WPML / KMZ Export Logic ---

/**
 * Maps Litchi Finish Action to DJI WPML Finish Action
 * Litchi: 0=None, 1=RTH, 2=Land, 3=Back to 1st, 4=Reverse
 * DJI: goHome, autoLand, goFirstWaypoint, noAction, gotoStart
 */
const mapFinishAction = (action: number): string => {
  switch(action) {
    case 1: return 'goHome';
    case 2: return 'autoLand';
    case 3: return 'goFirstWaypoint';
    default: return 'noAction';
  }
};

const generateTemplateKml = (routeName: string, waypoints: Waypoint[]) => {
  // Safe defaults based on first waypoint or global settings logic from app
  const firstWp = waypoints[0];
  // Convert 1 (RTH) etc to DJI string. Accessing a property on WP if it exists, otherwise defaulting.
  // Since action info is not fully on Route object but embedded in WPs, we take from first WP or default to goHome
  const finishAction = mapFinishAction(1); // Defaulting to RTH for safety or need to pass Settings object

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
  <Document>
    <wpml:createTime>${Date.now()}</wpml:createTime>
    <wpml:updateTime>${Date.now()}</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>${finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>goHome</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goHome</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>20</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${firstWp.speed || 5}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateType>waypoint</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:autoFlightSpeed>${firstWp.speed || 5}</wpml:autoFlightSpeed>
      <wpml:executeHeightMode>WGS84</wpml:executeHeightMode>
    </Folder>
  </Document>
</kml>`;
};

const generateWaylinesWpml = (routeName: string, waypoints: Waypoint[]) => {
  let placemarks = '';
  
  waypoints.forEach((wp, index) => {
    // Heading Mode Map
    // Litchi 0 (Auto) -> followWayline
    // Litchi 1 (Manual) -> fixed
    // Litchi 2 (Bearing) -> smoothTransition (best approximation for pre-calc bearing)
    let headingMode = 'followWayline';
    let headingParam = 0;

    // Use a heuristic: if all headings are 0, it's auto. If they vary, it's likely bearing/manual.
    if (wp.heading !== 0) {
        headingMode = 'smoothTransition'; // Using smooth allows the drone to interp to the heading
        headingParam = wp.heading;
    }

    // Actions
    // Simple implementation: If Start Recording (2) is found
    let actionGroup = '';
    if (wp.actionType1 === 2) { // Start Record
        actionGroup = `
        <wpml:actionGroup>
            <wpml:actionGroupId>${index}</wpml:actionGroupId>
            <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
            <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
            <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
            <wpml:actionTrigger>
                <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
            </wpml:actionTrigger>
            <wpml:action>
                <wpml:actionId>0</wpml:actionId>
                <wpml:actionActuatorFunc>startRecord</wpml:actionActuatorFunc>
                <wpml:actionActuatorFuncParam>
                   <wpml:fileSuffix>video</wpml:fileSuffix>
                   <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
                </wpml:actionActuatorFuncParam>
            </wpml:action>
        </wpml:actionGroup>`;
    } else if (wp.actionType1 === 3) { // Stop Record
         actionGroup = `
        <wpml:actionGroup>
            <wpml:actionGroupId>${index}</wpml:actionGroupId>
            <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
            <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
            <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
            <wpml:actionTrigger>
                <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
            </wpml:actionTrigger>
            <wpml:action>
                <wpml:actionId>0</wpml:actionId>
                <wpml:actionActuatorFunc>stopRecord</wpml:actionActuatorFunc>
                <wpml:actionActuatorFuncParam>
                   <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
                </wpml:actionActuatorFuncParam>
            </wpml:action>
        </wpml:actionGroup>`;
    }


    placemarks += `
      <Placemark>
        <Point>
          <coordinates>${wp.longitude},${wp.latitude}</coordinates>
        </Point>
        <wpml:index>${index}</wpml:index>
        <wpml:executeHeight>${wp.altitude}</wpml:executeHeight>
        <wpml:waypointSpeed>${wp.speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>${headingParam}</wpml:waypointHeadingParam>
        <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
        <wpml:waypointTurnMode>toPointAndStopWithDiscontinuity</wpml:waypointTurnMode>
        <wpml:useGlobalHeight>0</wpml:useGlobalHeight>
        <wpml:useGlobalSpeed>1</wpml:useGlobalSpeed>
        <wpml:useGlobalTurnParam>0</wpml:useGlobalTurnParam>
        <wpml:useGlobalHeadingParam>0</wpml:useGlobalHeadingParam>
        <wpml:gimbalPitchAngle>${wp.gimbalPitch}</wpml:gimbalPitchAngle>
        ${actionGroup}
      </Placemark>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>goHome</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goHome</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>20</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>10</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateType>waypoint</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:autoFlightSpeed>5</wpml:autoFlightSpeed>
      <wpml:executeHeightMode>WGS84</wpml:executeHeightMode>
      ${placemarks}
    </Folder>
  </Document>
</kml>`;
};

export const exportDJIWPML = (routes: Route[]) => {
    // If multiple routes, we zip them individually into a parent zip
    // DJI Fly expects ONE kmz per mission.
    const masterZip = new JSZip();

    routes.forEach((route, i) => {
        const kmzZip = new JSZip();
        const wpmzFolder = kmzZip.folder("wpmz");
        
        if (wpmzFolder) {
            const template = generateTemplateKml(route.name, route.waypoints);
            const waylines = generateWaylinesWpml(route.name, route.waypoints);
            
            wpmzFolder.file("template.kml", template);
            wpmzFolder.file("waylines.wpml", waylines);
        }

        // Generate the KMZ blob
        kmzZip.generateAsync({type:"blob"}).then(blob => {
             masterZip.file(`${route.name}_DJI_Fly.kmz`, blob);
             
             // If this is the last one, trigger save
             if (i === routes.length - 1) {
                 masterZip.generateAsync({type:"blob"}).then(content => {
                     saveAs(content, "DJI_WPML_Missions.zip");
                 })
             }
        });
    });
};
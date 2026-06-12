
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polyline, Marker, Popup, useMapEvents, LayersControl, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet-draw';
import { Route, FlightSettings, SpeedUnit, Waypoint, RouteStats } from '../types';
import { calculateDistance, calculateBearing, generateGridWaypoints, computeDestinationPoint } from '../services/geometryService';
import { Language, t } from '../translations';
import * as turf from '@turf/turf';
import { point as createPoint, points as createPoints } from '@turf/helpers';

const HomeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [30, 48],
    iconAnchor: [15, 48],
    popupAnchor: [1, -34]
});

// Large Orange Battery/RTH Icon for swap points
const BatterySwapIcon = L.divIcon({
    className: 'battery-swap-icon',
    html: `
    <div style="background-color: #f97316; color: white; border: 3px solid white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
    </div>
    <style>
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.15); box-shadow: 0 0 15px #f97316; }
            100% { transform: scale(1); }
        }
    </style>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
});

const RotateDivIcon = L.divIcon({
    className: 'rotate-handle-icon',
    html: '<div style="background-color: white; border: 2px solid #8b5cf6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 18px; cursor: crosshair;">🔄</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const PivotIcon = L.divIcon({
    className: 'pivot-icon',
    html: '<div style="background-color: #8b5cf6; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 2px black;"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
});

const RulerIcon = L.divIcon({
    className: 'ruler-handle',
    html: '<div style="background-color: white; border: 2px solid #3b82f6; width: 12px; height: 12px; border-radius: 50%;"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const createArrowIcon = (heading: number, color: string, isLocked: boolean) => {
    const fillColor = isLocked ? '#888888' : color;
    const svg = `
    <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${heading}deg); transform-origin: center;">
        <path d="M12 2L4.5 20.5L12 17L19.5 20.5L12 2Z" fill="${fillColor}" stroke="white" stroke-width="1.5"/>
    </svg>
    `;
    
    return L.divIcon({
        className: 'custom-arrow-icon',
        html: svg,
        iconSize: [30, 30],
        iconAnchor: [15, 15] 
    });
};

L.Marker.prototype.options.icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

interface MapProps {
  routes: Route[];
  measureMode: boolean;
  headingMode: FlightSettings['headingMode']; 
  flightMode: FlightSettings['flightMode'];
  currentSettings: FlightSettings;
  onRouteCreated: (latlngs: { lat: number, lng: number }[]) => void;
  onWaypointUpdate: (routeId: string, wpId: number, lat: number, lng: number) => void;
  onHomePointUpdate: (routeId: string, lat: number, lng: number) => void;
  onRotationUpdate: (routeId: string, angle: number) => void;
  speedUnit: SpeedUnit;
  language: Language;
  stats: RouteStats; // Receive stats to render swap points
}

interface DraggableArrowProps {
  position: L.LatLngExpression;
  routeId: string;
  wpId: number;
  heading: number;
  displayHeading: number; 
  color: string;
  isLocked: boolean;
  onUpdate: (rid: string, wid: number, lat: number, lng: number) => void;
  altitude: number;
  speed: number;
  gimbalPitch: number;
  actionType: number;
  headingMode: string;
  speedUnit: SpeedUnit;
}

const DraggableArrow: React.FC<DraggableArrowProps> = ({ 
  position, routeId, wpId, heading, displayHeading, color, isLocked, onUpdate,
  altitude, speed, gimbalPitch, actionType, headingMode, speedUnit
}) => {
  const [dragPos, setDragPos] = useState(position);

  useEffect(() => {
    setDragPos(position);
  }, [position]);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null) {
          const newLatLng = marker.getLatLng();
          setDragPos(newLatLng);
          onUpdate(routeId, wpId, newLatLng.lat, newLatLng.lng);
        }
      },
    }),
    [routeId, wpId, onUpdate],
  );

  const displaySpeed = speedUnit === 'kmh' ? (speed * 3.6).toFixed(1) + ' km/h' : speed.toFixed(1) + ' m/s';

  const actionMap: Record<number, string> = {
      [-1]: "None", 0: "Stay", 1: "Photo", 2: "Start Rec", 3: "Stop Rec", 5: "Rotate"
  };

  return (
    <Marker 
      draggable={!isLocked}
      eventHandlers={eventHandlers}
      position={dragPos}
      icon={createArrowIcon(displayHeading, color, isLocked)}
    >
       <Popup>
          <div className="text-xs space-y-1 min-w-[120px]">
            <strong className="text-sm block border-b pb-1 mb-1">WP {wpId}</strong>
            <div><strong>Heading:</strong> {headingMode === 'auto_path' ? 'Auto (Path)' : heading + '°'}</div>
            <div><strong>Alt:</strong> {altitude}m</div>
            <div><strong>Speed:</strong> {displaySpeed}</div>
            <div><strong>Gimbal:</strong> {gimbalPitch}°</div>
            <div><strong>Action:</strong> {actionMap[actionType] || 'Unknown'}</div>
            {isLocked && <div className="text-amber-600 font-bold mt-1">LOCKED</div>}
          </div>
        </Popup>
    </Marker>
  )
};

const DraggableHomeMarker: React.FC<{ position: L.LatLngExpression, routeName: string, onChange: (lat: number, lng: number) => void }> = ({ position, routeName, onChange }) => {
    const eventHandlers = useMemo(() => ({
        dragend(e: any) {
            const marker = e.target;
            if (marker != null) {
                const ll = marker.getLatLng();
                onChange(ll.lat, ll.lng);
            }
        }
    }), [onChange]);

    return (
        <Marker 
            position={position} 
            icon={HomeIcon}
            draggable={true}
            eventHandlers={eventHandlers}
            zIndexOffset={1000} 
        >
            <Popup>
                <strong>Home Point (Takeoff)</strong><br/>
                <span className="text-xs">For route: {routeName}</span>
            </Popup>
        </Marker>
    );
};

const GridRotationHandle: React.FC<{ route: Route, onRotate: (id: string, angle: number) => void }> = ({ route, onRotate }) => {
    const map = useMap();
    const polyData = route.originalPolygon || route.waypoints;
    if (polyData.length < 3) return null;

    const points = createPoints(polyData.map(wp => [
        (wp as any).longitude || (wp as any).lng, 
        (wp as any).latitude || (wp as any).lat
    ]));
    const center = turf.center(points);
    const centerCoords = center.geometry.coordinates; 
    const centerLatLng = L.latLng(centerCoords[1], centerCoords[0]);

    const bbox = turf.bbox(points);
    const d1 = createPoint([bbox[0], bbox[1]]);
    const d2 = createPoint([bbox[2], bbox[3]]);
    const distKm = turf.distance(d1, d2);
    const leverDistMeters = Math.max(50, (distKm * 1000) * 0.6);

    const currentAngle = route.gridRotation || 0;
    const handlePosObj = computeDestinationPoint(centerLatLng.lat, centerLatLng.lng, leverDistMeters, currentAngle);
    const handleLatLng = L.latLng(handlePosObj.lat, handlePosObj.lng);

    const eventHandlers = useMemo(() => ({
        drag(e: any) {
             const markerPt = map.latLngToContainerPoint(e.target.getLatLng());
             const centerPt = map.latLngToContainerPoint(centerLatLng);
             const radians = Math.atan2(markerPt.y - centerPt.y, markerPt.x - centerPt.x);
             let deg = radians * (180 / Math.PI);
             deg = (deg + 90) % 360;
             if (deg < 0) deg += 360;
             onRotate(route.id, deg);
        },
        dragend(e: any) {}
    }), [route.id, centerLatLng, map, onRotate]);

    return (
         <>
            <Marker position={centerLatLng} icon={PivotIcon} interactive={false} />
            <Polyline 
                positions={[centerLatLng, handleLatLng]} 
                pathOptions={{ color: '#8b5cf6', weight: 2, dashArray: '5, 5', opacity: 0.8 }} 
            />
            <Marker
                position={handleLatLng}
                icon={RotateDivIcon}
                draggable={true}
                eventHandlers={eventHandlers}
                zIndexOffset={2000}
            >
             <Marker 
                 position={handleLatLng} 
                 icon={L.divIcon({
                     className: 'angle-label',
                     html: `<div style="font-weight:900; font-size:16px; color:#ffffff; text-shadow: 2px 2px 0 #8b5cf6, -1px -1px 0 #8b5cf6, 1px -1px 0 #8b5cf6, -1px 1px 0 #8b5cf6; white-space:nowrap; transform: translate(24px, -24px); font-family: sans-serif;">${currentAngle.toFixed(0)}°</div>`,
                     iconSize: [0,0]
                 })}
             />
            </Marker>
         </>
    );
};

const SegmentDistanceLabels: React.FC<{ route: Route }> = ({ route }) => {
    if (route.waypoints.length < 2) return null;

    const segments = [];
    for (let i = 0; i < route.waypoints.length - 1; i++) {
        const wp1 = route.waypoints[i];
        const wp2 = route.waypoints[i+1];
        
        const dist = calculateDistance(wp1.latitude, wp1.longitude, wp2.latitude, wp2.longitude);
        const distText = dist > 1000 ? `${(dist/1000).toFixed(2)} km` : `${dist.toFixed(0)} m`;

        const midLat = (wp1.latitude + wp2.latitude) / 2;
        const midLng = (wp1.longitude + wp2.longitude) / 2;
        
        segments.push({
            pos: [midLat, midLng] as L.LatLngExpression,
            text: distText
        });
    }

    return (
        <>
            {segments.map((seg, idx) => (
                <Marker 
                    key={idx}
                    position={seg.pos}
                    icon={L.divIcon({
                        className: 'segment-label',
                        html: `<div style="font-size: 10px; font-weight: bold; color: ${route.color}; text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;">${seg.text}</div>`,
                        iconSize: [40, 12],
                        iconAnchor: [20, 6]
                    })}
                />
            ))}
        </>
    );
};

const ColoredPath: React.FC<{ route: Route }> = ({ route }) => {
    if (route.waypoints.length < 2) return null;

    const segments: { positions: L.LatLngExpression[], isEffort: boolean }[] = [];
    
    segments.push({
        positions: [
            [route.homePoint.lat, route.homePoint.lng],
            [route.waypoints[0].latitude, route.waypoints[0].longitude]
        ],
        isEffort: false
    });

    for (let i = 0; i < route.waypoints.length - 1; i++) {
        const wp1 = route.waypoints[i];
        const wp2 = route.waypoints[i+1];
        const isEffortLine = wp1.isEffort && wp2.isEffort;

        segments.push({
            positions: [
                [wp1.latitude, wp1.longitude],
                [wp2.latitude, wp2.longitude]
            ],
            isEffort: isEffortLine
        });
    }

    const effortColor = route.locked ? '#888888' : route.color;
    const offEffortColor = '#94a3b8'; 

    return (
        <>
            {segments.map((seg, idx) => (
                <Polyline 
                    key={idx}
                    positions={seg.positions}
                    pathOptions={{
                        color: seg.isEffort ? effortColor : offEffortColor,
                        weight: seg.isEffort ? 4 : 2,
                        opacity: 0.8,
                        dashArray: seg.isEffort ? undefined : '5, 5'
                    }}
                />
            ))}
        </>
    );
};

const RulerComponent: React.FC<{ active: boolean }> = ({ active }) => {
    const [points, setPoints] = useState<L.LatLng[]>([]);

    useMapEvents({
        click(e) {
            if (!active) return;
            if (points.length < 2) {
                setPoints(prev => [...prev, e.latlng]);
            } else {
                setPoints([e.latlng]); 
            }
        }
    });

    useEffect(() => {
        if (!active) setPoints([]);
    }, [active]);

    const updatePoint = (index: number, latlng: L.LatLng) => {
        setPoints(prev => {
            const newPoints = [...prev];
            newPoints[index] = latlng;
            return newPoints;
        });
    };

    if (!active || points.length === 0) return null;

    let labelPos: L.LatLngExpression | null = null;
    let distanceText = "";
    let rotationDeg = 0;

    if (points.length === 2) {
        const p1 = points[0];
        const p2 = points[1];
        const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        distanceText = dist > 1000 ? `${(dist/1000).toFixed(2)} km` : `${dist.toFixed(1)} m`;
        labelPos = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
        const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        rotationDeg = bearing;
        if (bearing > 90 && bearing <= 270) rotationDeg = bearing - 180;
    }

    return (
        <>
            {points.map((p, i) => (
                <Marker 
                    key={i} 
                    position={p} 
                    icon={RulerIcon} 
                    draggable={true}
                    eventHandlers={{
                        drag: (e) => updatePoint(i, e.target.getLatLng())
                    }}
                />
            ))}
            {points.length === 2 && (
                <>
                    <Polyline positions={points} color="#3b82f6" weight={2} dashArray="5, 5" />
                    {labelPos && (
                        <Marker 
                            position={labelPos}
                            icon={L.divIcon({
                                className: 'ruler-label-container',
                                html: `<div style="transform: rotate(${rotationDeg}deg); font-size: 14px; font-weight: 800; color: #1d4ed8; white-space: nowrap; text-shadow: 2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;">${distanceText}</div>`,
                                iconSize: [0, 0], 
                                iconAnchor: [0, 0] 
                            })}
                        />
                    )}
                </>
            )}
        </>
    );
}

export const MapEditor: React.FC<MapProps> = ({ 
    routes, measureMode, headingMode, flightMode, currentSettings,
    onRouteCreated, onWaypointUpdate, onHomePointUpdate, onRotationUpdate,
    speedUnit, language, stats
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const _onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polyline' || layerType === 'polygon') {
      const latlngs = layer.getLatLngs();
      let flatLatLngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      
      if (layerType === 'polygon' && flatLatLngs.length > 2) {
          flatLatLngs = [...flatLatLngs, flatLatLngs[0]];
      }

      let simpleCoords = flatLatLngs.map((ll: any) => ({
        lat: ll.lat,
        lng: ll.lng
      }));

      if (flightMode === 'mapping' && layerType === 'polygon') {
          simpleCoords = generateGridWaypoints(simpleCoords, currentSettings, 0);
      } else {
        simpleCoords = simpleCoords.map(p => ({...p, isEffort: true}));
      }

      onRouteCreated(simpleCoords);
      layer.remove();
    }
  };

  if (!ready) return <div className="h-full w-full bg-slate-100 flex items-center justify-center">Loading Map...</div>;

  return (
    <div id="map-container" className="h-full w-full relative">
        <MapContainer 
            center={[-26.3, -48.6]} 
            zoom={10} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            <LayersControl position="topright">
                <LayersControl.BaseLayer name={t("map_layer_street", language)}>
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer checked name={t("map_layer_sat", language)}>
                    <TileLayer
                        attribution='Tiles &copy; Esri'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>
            </LayersControl>
            
            <FeatureGroup>
                <EditControl
                    position="topleft"
                    onCreated={_onCreated}
                    draw={{
                        rectangle: false,
                        circle: false,
                        circlemarker: false,
                        marker: false,
                        polyline: true,
                        polygon: true,
                    }}
                    edit={{ edit: false, remove: false }}
                />
            </FeatureGroup>

            {routes.map(route => (
                <DraggableHomeMarker 
                    key={`home-${route.id}`}
                    routeName={route.name}
                    position={[route.homePoint.lat, route.homePoint.lng]} 
                    onChange={(lat, lng) => onHomePointUpdate(route.id, lat, lng)} 
                />
            ))}

            {routes.map((route) => (
                <React.Fragment key={route.id}>
                    <ColoredPath route={route} />
                    
                    <SegmentDistanceLabels route={route} />
                    
                    {flightMode === 'mapping' && route.gridRotation !== undefined && (
                        <GridRotationHandle route={route} onRotate={onRotationUpdate} />
                    )}

                    {route.waypoints.map((wp, idx) => {
                        let displayHeading = Number(wp.heading);
                        if (headingMode === 'auto_path') {
                            if (idx < route.waypoints.length - 1) {
                                const nextWp = route.waypoints[idx + 1];
                                displayHeading = calculateBearing(wp.latitude, wp.longitude, nextWp.latitude, nextWp.longitude);
                            } else if (idx > 0) {
                                const prevWp = route.waypoints[idx - 1];
                                displayHeading = calculateBearing(prevWp.latitude, prevWp.longitude, wp.latitude, wp.longitude);
                            }
                        }

                        return (
                            <React.Fragment key={`${route.id}-${wp.id}`}>
                                <DraggableArrow 
                                    position={[wp.latitude, wp.longitude]}
                                    routeId={route.id}
                                    wpId={wp.id}
                                    heading={wp.heading} 
                                    displayHeading={displayHeading} 
                                    color={route.color}
                                    isLocked={route.locked}
                                    onUpdate={onWaypointUpdate}
                                    altitude={wp.altitude}
                                    speed={wp.speed}
                                    gimbalPitch={wp.gimbalPitch}
                                    actionType={wp.actionType1}
                                    headingMode={headingMode}
                                    speedUnit={speedUnit}
                                />
                            </React.Fragment>
                        );
                    })}
                </React.Fragment>
            ))}

            {/* Render Battery Swap Points from Stats */}
            {stats.swapPoints.map((pt, i) => (
                <Marker 
                    key={`swap-${i}`} 
                    position={[pt.lat, pt.lng]} 
                    icon={BatterySwapIcon}
                    zIndexOffset={5000}
                >
                    <Popup>
                        <div className="text-center font-bold text-orange-700">
                            <div className="mb-1">{t("battery_swap_at", language)} #{pt.wpId}</div>
                            <div className="text-xs text-slate-500 font-normal">{t("swap_note", language)}</div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            <RulerComponent active={measureMode} />

        </MapContainer>
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet-draw';
import { Route, FlightSettings } from '../types';
import { calculateDistance, calculateBearing } from '../services/geometryService';
import { SpeedUnit } from '../App';
import { Language } from '../translations';

// Custom Green Home Icon (Scaled to 30x30 to match Arrow)
const HomeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], // Default Leaflet marker aspect ratio
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Ruler Endpoint Icon
const RulerIcon = L.divIcon({
    className: 'ruler-handle',
    html: '<div style="background-color: white; border: 2px solid #3b82f6; width: 12px; height: 12px; border-radius: 50%;"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Create a custom DivIcon with an SVG Arrow - RESIZED TO 30px
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
        iconAnchor: [15, 15] // Center anchor
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
  onRouteCreated: (latlngs: { lat: number, lng: number }[]) => void;
  onWaypointUpdate: (routeId: string, wpId: number, lat: number, lng: number) => void;
  onHomePointUpdate: (routeId: string, lat: number, lng: number) => void;
  speedUnit: SpeedUnit;
  language: Language;
}

// Draggable Marker Component for Waypoints (Arrow)
interface DraggableArrowProps {
  position: L.LatLngExpression;
  routeId: string;
  wpId: number;
  heading: number;
  displayHeading: number; 
  color: string;
  isLocked: boolean;
  onUpdate: (rid: string, wid: number, lat: number, lng: number) => void;
  // Metadata for Popup
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
      [-1]: "None", 0: "Stay", 2: "Start Rec", 3: "Stop Rec", 5: "Rotate"
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

// Home Marker
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

// Advanced Ruler Component
const RulerComponent: React.FC<{ active: boolean }> = ({ active }) => {
    const [points, setPoints] = useState<L.LatLng[]>([]);

    // Map Click Listener
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

    // Reset when tool disabled
    useEffect(() => {
        if (!active) setPoints([]);
    }, [active]);

    // Handle Drag of Endpoints
    const updatePoint = (index: number, latlng: L.LatLng) => {
        setPoints(prev => {
            const newPoints = [...prev];
            newPoints[index] = latlng;
            return newPoints;
        });
    };

    if (!active || points.length === 0) return null;

    // Calculate details for the label
    let labelPos: L.LatLngExpression | null = null;
    let distanceText = "";
    let rotationDeg = 0;

    if (points.length === 2) {
        const p1 = points[0];
        const p2 = points[1];
        const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        distanceText = dist > 1000 ? `${(dist/1000).toFixed(2)} km` : `${dist.toFixed(1)} m`;
        
        // Midpoint
        labelPos = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
        
        // Calculate bearing for rotation
        const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
        
        // Keep text right-side up
        rotationDeg = bearing;
        if (bearing > 90 && bearing <= 270) {
            rotationDeg = bearing - 180;
        }
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
                                html: `<div style="transform: rotate(${rotationDeg}deg); background: white; padding: 2px 6px; border-radius: 4px; border: 1px solid #3b82f6; font-size: 10px; font-weight: bold; color: #1d4ed8; white-space: nowrap;">${distanceText}</div>`,
                                iconSize: [0, 0], // Hidden icon, just HTML
                                iconAnchor: [0, 0] // Center? We rely on transform
                            })}
                        />
                    )}
                </>
            )}
        </>
    );
}

export const MapEditor: React.FC<MapProps> = ({ 
    routes, measureMode, headingMode,
    onRouteCreated, onWaypointUpdate, onHomePointUpdate,
    speedUnit, language
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
      
      // FIX POLYGON CLOSING
      // If polygon, Leaflet draw provides points [A, B, C]. 
      // We must visually and data-wise close it: [A, B, C, A].
      if (layerType === 'polygon' && flatLatLngs.length > 2) {
          flatLatLngs = [...flatLatLngs, flatLatLngs[0]];
      }

      const simpleCoords = flatLatLngs.map((ll: any) => ({
        lat: ll.lat,
        lng: ll.lng
      }));

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
            <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <FeatureGroup>
                <EditControl
                    position="topright"
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
                    <Polyline 
                        positions={route.waypoints.map(wp => [wp.latitude, wp.longitude])}
                        pathOptions={{ 
                            color: route.locked ? '#888888' : route.color, 
                            weight: 3,
                            opacity: 0.8,
                            dashArray: route.locked ? '5, 10' : undefined 
                        }}
                    >
                        <Popup><strong>{route.name}</strong></Popup>
                    </Polyline>
                    
                    {route.waypoints.map((wp, idx) => {
                        // Calculate Visual Heading
                        let displayHeading = Number(wp.heading);
                        
                        // If Mode is Auto Path, point arrow to next point
                        if (headingMode === 'auto_path') {
                            if (idx < route.waypoints.length - 1) {
                                const nextWp = route.waypoints[idx + 1];
                                displayHeading = calculateBearing(wp.latitude, wp.longitude, nextWp.latitude, nextWp.longitude);
                            } else if (idx > 0) {
                                // Last point aligns with previous segment
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
                                    // Info for popup
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

            <RulerComponent active={measureMode} />

        </MapContainer>
    </div>
  );
};
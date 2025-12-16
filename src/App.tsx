
import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapEditor } from './components/Map';
import { RouteManager } from './components/RouteManager';
import { Calculator } from './components/Calculator';
import { Instructions } from './components/Instructions';
import { Route, FlightSettings, DEFAULT_SETTINGS, Waypoint, HomePoint, RouteStats, SpeedUnit } from './types';
import { parseCSV, parseKML, exportLitchiZip, exportDJIKMLZip, exportDJIWPML, generateId } from './services/fileService';
import { updateWaypointsWithBearings, estimateRouteStats, generateGridWaypoints } from './services/geometryService';
import { X, HelpCircle, Map as MapIcon, Table, Calculator as CalcIcon, Camera, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import html2canvas from 'html2canvas';
import { t, Language } from './translations';
import * as turf from '@turf/turf';

const PROJECT_PREFIX = 'litchi_project_';

type ActiveTab = 'map' | 'manager' | 'calculator' | 'instructions';

// Toast Notification Interface
interface Notification {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [settings, setSettings] = useState<FlightSettings>(DEFAULT_SETTINGS);
  
  // Stats
  const [stats, setStats] = useState<RouteStats>({ totalDistance: 0, totalTimeMinutes: 0, photoCount: 0, videoCount: 0 });
  const [selectedStatsRouteId, setSelectedStatsRouteId] = useState<string | 'all'>('all');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Visual Tool States
  const [measureMode, setMeasureMode] = useState(false);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>('kmh');
  
  // Language
  const [language, setLanguage] = useState<Language>('en');

  // Rename Modal State
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; routeId: string | null; currentName: string; }>({
      isOpen: false,
      routeId: null,
      currentName: ''
  });

  // Helper: Show Notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setNotification({ id: Date.now(), message, type });
      setTimeout(() => setNotification(null), 3000);
  };

  // --- Logic 0: Persistence (Project Management) ---
  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PROJECT_PREFIX));
    const names = keys.map(k => k.replace(PROJECT_PREFIX, ''));
    setSavedProjects(names);
  }, []);

  // Update Stats whenever Routes or HomePoint changes
  useEffect(() => {
    const newStats = estimateRouteStats(routes, settings, selectedStatsRouteId);
    setStats(newStats);
  }, [routes, settings.speedKmh, settings.finishAction, selectedStatsRouteId]);

  const saveProject = (name: string) => {
    try {
      const data = JSON.stringify({ routes, settings });
      localStorage.setItem(`${PROJECT_PREFIX}${name}`, data);
      
      if (!savedProjects.includes(name)) {
        setSavedProjects(prev => [...prev, name]);
      }
      showToast(`Project "${name}" saved successfully!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save. Storage might be full.', 'error');
    }
  };

  const loadProject = (name: string) => {
    const dataStr = localStorage.getItem(`${PROJECT_PREFIX}${name}`);
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        if (data.routes) setRoutes(data.routes);
        if (data.settings) setSettings(data.settings);
        showToast(`Project "${name}" loaded.`, 'success');
      } catch (e) {
        console.error(e);
        showToast('Error loading project data.', 'error');
      }
    }
  };

  const deleteProject = (name: string) => {
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      localStorage.removeItem(`${PROJECT_PREFIX}${name}`);
      setSavedProjects(prev => prev.filter(p => p !== name));
      showToast('Project deleted.', 'info');
    }
  };

  // --- Logic 1: Lock Mechanism ---
  const toggleRouteLock = (id: string) => {
    setRoutes(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, locked: !r.locked };
      }
      return r;
    }));
  };

  // --- Logic 2: Apply Settings to Routes ---
  const applySettingsToRoutes = useCallback(() => {
    let updatedCount = 0;
    let lockedCount = 0;

    setRoutes(currentRoutes => {
      const newRoutes = currentRoutes.map(route => {
        // Skip locked routes
        if (route.locked) {
            lockedCount++;
            return route;
        }

        updatedCount++;

        // Regenerate grid if it's a mapping route
        let currentWaypoints = route.waypoints;

        // CRITICAL FIX: Use originalPolygon to regenerate grid so shape doesn't collapse
        if (settings.flightMode === 'mapping' && route.gridRotation !== undefined && route.originalPolygon) {
             const newGridCoords = generateGridWaypoints(route.originalPolygon, settings, route.gridRotation);
             
             // Rebuild waypoints
             currentWaypoints = newGridCoords.map((c, idx) => ({
                ...route.waypoints[0], // Inherit base properties
                id: idx + 1,
                latitude: c.lat,
                longitude: c.lng,
                actionType1: 1, // Force Photo
                gimbalPitch: -90, // Force Nadir
                heading: 0,
                altitude: settings.altitude // Enforce altitude
             }));
        }

        // 1. Basic settings application
        let updatedWaypoints = currentWaypoints.map(wp => ({
          ...wp,
          altitude: settings.altitude,
          speed: parseFloat((settings.speedKmh / 3.6).toFixed(2)),
          curveSize: settings.curveSize,
          gimbalMode: settings.gimbalMode,
          // Only overwrite gimbal/action if not mapping mode, or explicit overwrite desired
          // For mapping, we usually want -90 and Photo
          gimbalPitch: settings.flightMode === 'mapping' ? -90 : settings.gimbalPitch,
          altitudeMode: settings.altitudeMode,
          actionType1: settings.flightMode === 'mapping' ? 1 : settings.action1,
        }));

        // 2. Heading Logic
        if (settings.headingMode === 'auto_bearing') {
           updatedWaypoints = updateWaypointsWithBearings(updatedWaypoints);
        } else if (settings.headingMode === 'manual') {
           updatedWaypoints = updatedWaypoints.map(wp => ({ ...wp, heading: settings.headingManual }));
        } else {
           // Auto Path usually implies heading 0 (Litchi standard)
           updatedWaypoints = updatedWaypoints.map(wp => ({ ...wp, heading: 0 }));
        }

        return { ...route, waypoints: updatedWaypoints };
      });
      return newRoutes;
    });

    // Notify user
    if (lockedCount > 0) {
        showToast(`Settings applied to ${updatedCount} routes. (${lockedCount} locked skipped)`, 'info');
    } else {
        showToast(`Settings applied to all ${updatedCount} routes!`, 'success');
    }

  }, [settings]);


  // --- Logic 3: Optimized Multi-file Import ---
  const handleImport = async (files: FileList) => {
    setIsLoading(true);
    
    // Create an array of promises for parallel processing
    const fileArray = Array.from(files);
    
    const importPromises = fileArray.map(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      try {
        if (ext === 'csv') {
          const wps = await parseCSV(file);
          if (wps.length > 0) {
             return [{
              id: generateId(),
              name: file.name.replace('.csv', ''),
              waypoints: wps,
              color: '#' + Math.floor(Math.random()*16777215).toString(16),
              locked: false,
              homePoint: { lat: wps[0].latitude - 0.0001, lng: wps[0].longitude }
            } as Route];
          }
        } else if (ext === 'kml') {
          const kmlRoutes = await parseKML(file);
          // ensure home point is set
          return kmlRoutes.map(r => ({
              ...r, 
              locked: false,
              homePoint: { lat: r.waypoints[0].latitude - 0.0001, lng: r.waypoints[0].longitude }
          } as Route));
        }
      } catch (err) {
        console.error(`Error parsing ${file.name}`, err);
        return null;
      }
      return null;
    });

    try {
        const results = await Promise.all(importPromises);
        
        // Flatten array and filter out nulls
        const validNewRoutes = results.flat().filter((r): r is Route => r !== null);

        if (validNewRoutes.length > 0) {
             setRoutes(prev => [...prev, ...validNewRoutes]);
             showToast(`Successfully imported ${validNewRoutes.length} routes from ${files.length} files.`, 'success');
        } else {
             showToast('No valid routes found in files.', 'error');
        }

    } catch (e) {
        console.error("Batch import failed", e);
        showToast('Error during batch import.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Logic 4: Handle Drawing ---
  const handleRouteCreated = (coords: { lat: number, lng: number }[]) => {
    // If in Mapping Mode, default action is Take Photo (1)
    const defaultAction = settings.flightMode === 'mapping' ? 1 : settings.action1;
    // If in Mapping Mode, default Gimbal Pitch is -90
    const defaultGimbal = settings.flightMode === 'mapping' ? -90 : settings.gimbalPitch;

    const newWaypoints: Waypoint[] = coords.map((c, idx) => ({
      id: idx + 1,
      latitude: c.lat,
      longitude: c.lng,
      altitude: settings.altitude,
      heading: 0,
      curveSize: settings.curveSize,
      rotationDir: 0,
      gimbalMode: settings.gimbalMode,
      gimbalPitch: defaultGimbal,
      actionType1: defaultAction,
      actionParam1: 0,
      actionType2: -1,
      actionParam2: 0,
      altitudeMode: settings.altitudeMode,
      speed: parseFloat((settings.speedKmh / 3.6).toFixed(2)),
      poiLat: 0,
      poiLon: 0,
      poiAlt: 0,
      poiAltMode: 0,
      photoTimeInterval: -1,
      photoDistInterval: -1
    }));
    
    let finalWps = newWaypoints;
    if (settings.headingMode === 'auto_bearing') {
       finalWps = updateWaypointsWithBearings(newWaypoints);
    } else if (settings.headingMode === 'manual') {
       finalWps = newWaypoints.map(wp => ({ ...wp, heading: settings.headingManual }));
    }

    const newRoute: Route = {
      id: generateId(),
      name: `Drawn Route ${routes.length + 1}`,
      waypoints: finalWps,
      color: '#ff5722',
      locked: false,
      homePoint: { lat: finalWps[0].latitude - 0.0001, lng: finalWps[0].longitude },
      gridRotation: settings.flightMode === 'mapping' ? 0 : undefined,
      // Persist original polygon if it's a mapping grid
      originalPolygon: settings.flightMode === 'mapping' ? coords : undefined
    };

    setRoutes(prev => [...prev, newRoute]);
    showToast('New route created from drawing.', 'success');
  };

  // --- Logic 5: Editing Logic ---
  
  const handleOpenRenameModal = (id: string, currentName: string) => {
      setRenameModal({ isOpen: true, routeId: id, currentName });
  };

  const handleConfirmRename = () => {
      const { routeId, currentName } = renameModal;
      if (routeId && currentName.trim()) {
          setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, name: currentName } : r));
          showToast('Route renamed.', 'success');
      }
      setRenameModal({ isOpen: false, routeId: null, currentName: '' });
  };

  const handleDeleteRoute = (id: string) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    showToast('Route deleted.', 'info');
  };

  const handleUndo = () => {
    setRoutes(prev => {
      if (prev.length === 0) return prev;
      showToast('Last action undone.', 'info');
      return prev.slice(0, -1);
    });
  };

  const handleWaypointUpdate = (routeId: string, wpId: number, lat: number, lng: number) => {
    setRoutes(prev => prev.map(route => {
      if (route.id !== routeId) return route;
      if (route.locked) return route; 

      const updatedWps = route.waypoints.map(wp => {
        if (wp.id === wpId) {
          return { ...wp, latitude: lat, longitude: lng };
        }
        return wp;
      });

      let finalWps = updatedWps;
      if (settings.headingMode === 'auto_bearing') {
         finalWps = updateWaypointsWithBearings(updatedWps);
      }

      return { ...route, waypoints: finalWps };
    }));
  };

  const handleHomePointUpdate = (routeId: string, lat: number, lng: number) => {
      setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, homePoint: { lat, lng } } : r));
  };
  
  // Handle Grid Rotation
  const handleRotationUpdate = (routeId: string, angle: number) => {
      setRoutes(prev => prev.map(route => {
          if (route.id !== routeId || route.locked) return route;
          
          // Use ORIGINAL POLYGON for rotation to avoid shape collapse
          const basePolygon = route.originalPolygon;
          
          if (!basePolygon) return { ...route, gridRotation: angle };

          const newGridCoords = generateGridWaypoints(basePolygon, settings, angle);
          
          const newWps: Waypoint[] = newGridCoords.map((c, idx) => ({
             ...route.waypoints[0], // Copy props from first
             id: idx + 1,
             latitude: c.lat,
             longitude: c.lng,
             actionType1: 1, // Force Photo for grid points
             gimbalPitch: -90,
             altitude: settings.altitude
          }));

          return { ...route, waypoints: newWps, gridRotation: angle };
      }));
  };

  const handleDetailedUpdate = (routeId: string, wpId: number, field: string, value: any) => {
      setRoutes(prev => prev.map(route => {
          if (route.id !== routeId) return route;
          if (route.locked) return route;

          const updatedWps = route.waypoints.map(wp => {
              if (wp.id === wpId) {
                  return { ...wp, [field]: value };
              }
              return wp;
          });
          return { ...route, waypoints: updatedWps };
      }));
  };

  const handleDeleteWaypoint = (routeId: string, wpId: number) => {
      setRoutes(prev => prev.map(route => {
          if (route.id !== routeId || route.locked) return route;
          
          const filtered = route.waypoints.filter(wp => wp.id !== wpId);
          
          let finalWps = filtered;
          if (settings.headingMode === 'auto_bearing') {
             finalWps = updateWaypointsWithBearings(filtered);
          }
          return { ...route, waypoints: finalWps };
      }));
  };

  const handleReorderWaypoint = (routeId: string, wpId: number, direction: 'up' | 'down') => {
      setRoutes(prev => prev.map(route => {
          if (route.id !== routeId || route.locked) return route;
          
          const index = route.waypoints.findIndex(wp => wp.id === wpId);
          if (index === -1) return route;
          
          const newWps = [...route.waypoints];
          if (direction === 'up' && index > 0) {
              [newWps[index], newWps[index - 1]] = [newWps[index - 1], newWps[index]];
          } else if (direction === 'down' && index < newWps.length - 1) {
              [newWps[index], newWps[index + 1]] = [newWps[index + 1], newWps[index]];
          } else {
              return route;
          }
          
          let finalWps = newWps;
          if (settings.headingMode === 'auto_bearing') {
             finalWps = updateWaypointsWithBearings(newWps);
          }

          return { ...route, waypoints: finalWps };
      }));
  };

  const takeScreenshot = async () => {
    const mapEl = document.getElementById('map-container');
    if (mapEl) {
        try {
            const canvas = await html2canvas(mapEl, { useCORS: true });
            const link = document.createElement('a');
            link.download = 'flight_plan_map.png';
            link.href = canvas.toDataURL();
            link.click();
            showToast('Screenshot saved.', 'success');
        } catch(e) {
            console.error("Screenshot failed", e);
            showToast('Screenshot failed.', 'error');
        }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-900">
      <Sidebar 
        settings={settings}
        setSettings={setSettings}
        routes={routes}
        stats={stats}
        selectedStatsRouteId={selectedStatsRouteId}
        setSelectedStatsRouteId={setSelectedStatsRouteId}
        onImport={handleImport}
        onExportLitchi={() => exportLitchiZip(routes)}
        onExportKML={() => exportDJIKMLZip(routes)}
        onExportWPML={() => exportDJIWPML(routes)}
        onClearRoutes={() => { setRoutes([]); showToast('All routes cleared.', 'info'); }}
        onApplySettings={applySettingsToRoutes}
        onPromptRename={handleOpenRenameModal}
        onRenameRoute={() => {}} 
        onDeleteRoute={handleDeleteRoute}
        onToggleLock={toggleRouteLock}
        onUndo={handleUndo}
        savedProjects={savedProjects}
        onSaveProject={saveProject}
        onLoadProject={loadProject}
        onDeleteProject={deleteProject}
        measureMode={measureMode}
        setMeasureMode={setMeasureMode}
        speedUnit={speedUnit}
        setSpeedUnit={setSpeedUnit}
        language={language}
        setLanguage={setLanguage}
      />
      
      <main className="flex-1 flex flex-col relative bg-slate-50">
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-30 h-12">
            <div className="flex space-x-1">
                <button 
                    onClick={() => setActiveTab('map')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <MapIcon size={16} /> {t("tab_map", language)}
                </button>
                <button 
                    onClick={() => setActiveTab('manager')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manager' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Table size={16} /> {t("tab_manager", language)}
                </button>
                <button 
                    onClick={() => setActiveTab('calculator')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calculator' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <CalcIcon size={16} /> {t("tab_calc", language)}
                </button>
                <button 
                    onClick={() => setActiveTab('instructions')}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'instructions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <BookOpen size={16} /> {t("tab_instr", language)}
                </button>
            </div>
            
            {activeTab === 'map' && (
                <button onClick={takeScreenshot} className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm mr-2" title="Screenshot Map">
                    <Camera size={18} /> <span className="hidden sm:inline">{t("screenshot", language)}</span>
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden">
            {isLoading && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center text-white">
                <div className="bg-white text-black p-4 rounded shadow-lg">Processing files...</div>
            </div>
            )}
            
            {activeTab === 'map' && (
                <>
                    <MapEditor 
                        routes={routes}
                        measureMode={measureMode}
                        headingMode={settings.headingMode}
                        flightMode={settings.flightMode}
                        currentSettings={settings}
                        onRouteCreated={handleRouteCreated} 
                        onWaypointUpdate={handleWaypointUpdate}
                        onHomePointUpdate={handleHomePointUpdate}
                        onRotationUpdate={handleRotationUpdate}
                        speedUnit={speedUnit}
                        language={language}
                    />
                    {/* Quick Guide Overlay - Only show if user hasn't closed it */}
                    {showInstructions && (
                        <div className="absolute top-4 right-4 z-[1000] bg-white/95 p-3 rounded shadow-md text-xs max-w-xs border border-slate-200 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-100">
                                <h3 className="font-bold text-slate-700">{t("guide_title", language)}</h3>
                                <button onClick={() => setShowInstructions(false)} className="text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded p-0.5"><X size={16} /></button>
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                <li>{t("guide_draw", language)}</li>
                                <li>{t("guide_takeoff", language)}</li>
                                <li>{t("guide_edit", language)}</li>
                                <li>{t("guide_lock", language)}</li>
                            </ul>
                            <div className="mt-2 text-center text-[10px] text-blue-500 cursor-pointer hover:underline" onClick={() => setActiveTab('instructions')}>
                                View Full Guide &rarr;
                            </div>
                        </div>
                    )}
                    {!showInstructions && (
                        <button onClick={() => setShowInstructions(true)} className="absolute bottom-6 right-6 z-[1000] bg-white p-2 rounded-full shadow-lg hover:bg-slate-50 text-blue-600 border border-blue-200 w-10 h-10 flex items-center justify-center">
                            <HelpCircle size={24} />
                        </button>
                    )}
                </>
            )}

            {activeTab === 'manager' && (
                <RouteManager 
                    routes={routes} 
                    onUpdateWaypoint={handleDetailedUpdate} 
                    onDeleteWaypoint={handleDeleteWaypoint}
                    onReorderWaypoint={handleReorderWaypoint}
                    onRenameRoute={() => {}} // Handled by PromptRename
                    onPromptRename={handleOpenRenameModal}
                    speedUnit={speedUnit}
                    language={language}
                />
            )}

            {activeTab === 'calculator' && (
                <Calculator language={language} />
            )}

            {activeTab === 'instructions' && (
                <Instructions language={language} />
            )}
        </div>

        {/* Global Toast Notification */}
        {notification && (
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 border ${
                notification.type === 'error' ? 'bg-red-600 border-red-700 text-white' : 
                notification.type === 'success' ? 'bg-emerald-600 border-emerald-700 text-white' : 
                'bg-slate-800 border-slate-900 text-white'
            }`}>
                {notification.type === 'success' && <CheckCircle size={20} />}
                {notification.type === 'error' && <AlertCircle size={20} />}
                <span className="font-medium text-sm">{notification.message}</span>
            </div>
        )}

        {/* Rename Modal */}
        {renameModal.isOpen && (
             <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                     <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                         <h3 className="font-bold text-slate-800">{t("rename_route", language)}</h3>
                         <button onClick={() => setRenameModal({isOpen: false, routeId: null, currentName: ''})}><X size={20} className="text-slate-400 hover:text-slate-700"/></button>
                     </div>
                     <div className="p-6">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t("new_name", language)}</label>
                         <input 
                            type="text" 
                            autoFocus
                            className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={renameModal.currentName}
                            onChange={(e) => setRenameModal(prev => ({...prev, currentName: e.target.value}))}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleConfirmRename(); }}
                         />
                     </div>
                     <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                         <button 
                            onClick={() => setRenameModal({isOpen: false, routeId: null, currentName: ''})}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded"
                         >
                            {t("cancel", language)}
                         </button>
                         <button 
                            onClick={handleConfirmRename}
                            disabled={!renameModal.currentName.trim()}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                         >
                            {t("confirm", language)}
                         </button>
                     </div>
                 </div>
             </div>
        )}

      </main>
    </div>
  );
};

export default App;

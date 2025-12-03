import React, { useRef, useState, useEffect } from 'react';
import { FlightSettings, Route, RouteStats } from '../types';
import { Upload, Download, Settings, Trash2, PenTool, Undo2, XCircle, Plane, FolderOpen, Save, Trash, Lock, Unlock, Clock, MapPin, Ruler, Edit2, Globe } from 'lucide-react';
import { SpeedUnit } from '../App';
import { t, Language } from '../translations';
import icon from '../../assets/icon.png';

interface SidebarProps {
  settings: FlightSettings;
  setSettings: React.Dispatch<React.SetStateAction<FlightSettings>>;
  routes: Route[];
  stats: RouteStats;
  selectedStatsRouteId: string | 'all';
  setSelectedStatsRouteId: (id: string | 'all') => void;
  onImport: (files: FileList) => void;
  onExportLitchi: () => void;
  onExportKML: () => void;
  onExportWPML: () => void;
  onClearRoutes: () => void;
  onApplySettings: () => void;
  onPromptRename: (id: string, currentName: string) => void;
  onDeleteRoute: (id: string) => void;
  onToggleLock: (id: string) => void;
  onUndo: () => void;
  // Persistence Props
  savedProjects: string[];
  onSaveProject: (name: string) => void;
  onLoadProject: (name: string) => void;
  onDeleteProject: (name: string) => void;
  // Visual Tools
  measureMode: boolean;
  setMeasureMode: (v: boolean) => void;
  // Units
  speedUnit: SpeedUnit;
  setSpeedUnit: (u: SpeedUnit) => void;
  // Lang
  language: Language;
  setLanguage: (l: Language) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  setSettings,
  routes,
  stats,
  selectedStatsRouteId,
  setSelectedStatsRouteId,
  onImport,
  onExportLitchi,
  onExportKML,
  onExportWPML,
  onClearRoutes,
  onApplySettings,
  onPromptRename,
  onDeleteRoute,
  onToggleLock,
  onUndo,
  savedProjects,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  measureMode,
  setMeasureMode,
  speedUnit,
  setSpeedUnit,
  language,
  setLanguage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState('');
  
  // Local state for numeric inputs to allow typing "-", "." etc
  const [localAltitude, setLocalAltitude] = useState(String(settings.altitude));
  const [localSpeed, setLocalSpeed] = useState('');
  const [localHeading, setLocalHeading] = useState(String(settings.headingManual));
  const [localGimbal, setLocalGimbal] = useState(String(settings.gimbalPitch));
  const [localCurve, setLocalCurve] = useState(String(settings.curveSize));

  // Sync props to local state when props change externally
  useEffect(() => { setLocalAltitude(String(settings.altitude)); }, [settings.altitude]);
  useEffect(() => { setLocalHeading(String(settings.headingManual)); }, [settings.headingManual]);
  useEffect(() => { setLocalGimbal(String(settings.gimbalPitch)); }, [settings.gimbalPitch]);
  useEffect(() => { setLocalCurve(String(settings.curveSize)); }, [settings.curveSize]);
  
  // Speed sync
  useEffect(() => {
     const val = speedUnit === 'kmh' ? settings.speedKmh : (settings.speedKmh / 3.6);
     setLocalSpeed(val.toFixed(2));
  }, [settings.speedKmh, speedUnit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImport(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveClick = () => {
    if (projectName.trim()) {
      onSaveProject(projectName.trim());
      setProjectName('');
    }
  };

  const handleRawChange = (
      setter: React.Dispatch<React.SetStateAction<string>>, 
      key: keyof FlightSettings, 
      val: string
  ) => {
      setter(val);
      if (val !== '' && val !== '-') {
          setSettings(prev => ({ ...prev, [key]: Number(val) }));
      }
  };

  const handleSpeedRawChange = (val: string) => {
      setLocalSpeed(val);
      if (val !== '' && val !== '-') {
          const num = Number(val);
          if (speedUnit === 'kmh') {
              setSettings(prev => ({ ...prev, speedKmh: num }));
          } else {
              setSettings(prev => ({ ...prev, speedKmh: num * 3.6 }));
          }
      }
  };

  // High contrast white input
  // Changed border to slate-300 for clearer visibility
  const inputClass = "w-full bg-white text-gray-900 border border-slate-300 rounded text-sm p-2 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400";

  return (
    <div className="w-full md:w-96 bg-slate-50 border-r border-slate-200 h-full overflow-y-auto flex flex-col shadow-lg z-20">
      <div className="p-4 bg-blue-600 text-white shadow-md">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <img src={icon} alt="DFP" className="w-10 h-10 rounded-full bg-white object-contain" />
                <div>
                    <h1 className="text-xl font-bold leading-tight">{t("app_title", language)}</h1>
                    <p className="text-xs text-blue-100 font-medium">{t("by_author", language)}</p>
                </div>
            </div>
            {/* Lang Switch */}
            <button 
                onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
                className="bg-blue-700 hover:bg-blue-800 text-xs px-2 py-1 rounded border border-blue-500 font-bold"
            >
                {language === 'en' ? '🇺🇸 EN' : '🇧🇷 PT'}
            </button>
        </div>
      </div>

      <div className="p-4 space-y-6 flex-1">
        
        {/* Section: Visual Tools */}
        <section className="bg-white p-2 rounded border border-slate-200 flex gap-2 justify-center shadow-sm">
            <button 
                onClick={() => setMeasureMode(!measureMode)}
                className={`flex-1 flex flex-col items-center justify-center p-2 rounded text-xs font-bold transition ${measureMode ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
                <Ruler size={20} className="mb-1"/>
                {measureMode ? t("ruler_on", language) : t("ruler_tool", language)}
            </button>
        </section>

        {/* Section: Workspace / Folders */}
        <section className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
             <FolderOpen size={18} />
             <h2 className="text-sm font-bold uppercase tracking-wider">{t("workspaces", language)}</h2>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={t("project_name", language)}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={inputClass}
            />
            <button 
              onClick={handleSaveClick}
              disabled={!projectName.trim()}
              className="bg-green-600 disabled:bg-slate-300 text-white p-2 rounded hover:bg-green-700 transition"
              title={t("save", language)}
            >
              <Save size={18} />
            </button>
          </div>

          {savedProjects.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto mt-2">
              <p className="text-xs text-slate-500 font-semibold mb-1">{t("saved_projects", language)}</p>
              {savedProjects.map(name => (
                <div key={name} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100 text-xs">
                  <span className="font-medium text-slate-700 truncate max-w-[150px]">{name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onLoadProject(name)} className="text-blue-600 hover:underline px-1">{t("load", language)}</button>
                    <button onClick={() => onDeleteProject(name)} className="text-red-500 hover:text-red-700 px-1"><Trash size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Stats */}
        {routes.length > 0 && (
             <section className="bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm">
                <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Plane size={12}/> {t("flight_estimates", language)}
                </h2>
                
                {/* Route Selector */}
                <div className="mb-3">
                    <label className="text-[10px] uppercase font-bold text-blue-500 mb-1 block">{t("view_stats_for", language)}</label>
                    <select 
                        className="w-full text-xs p-1 rounded border border-blue-200 text-slate-700 bg-white"
                        value={selectedStatsRouteId}
                        onChange={(e) => setSelectedStatsRouteId(e.target.value)}
                    >
                        <option value="all">{t("all_routes", language)}</option>
                        {routes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <span className="block text-[10px] text-blue-500 font-bold uppercase">{t("total_dist", language)}</span>
                        <div className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                            {stats.totalDistance > 1000 
                                ? `${(stats.totalDistance / 1000).toFixed(2)} km` 
                                : `${stats.totalDistance.toFixed(0)} m`}
                        </div>
                    </div>
                    <div className="text-center border-l border-blue-200">
                        <span className="block text-[10px] text-blue-500 font-bold uppercase">{t("est_time", language)}</span>
                        <div className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                             <Clock size={14} className="text-blue-500"/>
                            {stats.totalTimeMinutes.toFixed(1)} min
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-blue-400 mt-2 text-center">{t("stats_note", language)}</p>
            </section>
        )}

        <hr className="border-slate-200" />

        {/* Section 1: Data Management */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("route_actions", language)}</h2>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 p-2 rounded hover:bg-slate-100 text-sm font-medium transition"
            >
              <Upload size={16} /> {t("import", language)}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept=".csv,.kml" 
              onChange={handleFileChange} 
            />
             <button 
               onClick={onUndo}
               disabled={routes.length === 0}
               className="flex items-center justify-center gap-2 bg-white border border-slate-300 disabled:opacity-50 text-slate-700 p-2 rounded hover:bg-slate-100 text-sm font-medium transition"
            >
              <Undo2 size={16} /> {t("undo_last", language)}
            </button>
          </div>
          
           <button 
               onClick={onClearRoutes}
               className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 p-2 rounded hover:bg-red-100 text-sm font-medium transition"
            >
              <Trash2 size={16} /> {t("delete_all", language)}
            </button>
        </section>

        {/* Route List with Locks */}
        {routes.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("active_routes", language)}</h2>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded p-1 bg-white">
              {routes.map(route => (
                <div key={route.id} className="flex items-center justify-between p-2 hover:bg-slate-50 text-xs border-b last:border-0 border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: route.color }}></span>
                    <span className="font-medium text-slate-800 truncate max-w-[120px]" title={route.name}>{route.name}</span>
                    {route.locked && <Lock size={12} className="text-amber-500" />}
                  </div>
                  <div className="flex gap-2">
                     <button
                        onClick={() => onPromptRename(route.id, route.name)}
                        className="text-slate-400 hover:text-blue-600"
                        title={t("rename_route", language)}
                     >
                        <Edit2 size={16} />
                     </button>
                    <button
                       onClick={() => onToggleLock(route.id)}
                       className={`${route.locked ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'}`}
                       title={route.locked ? "Unlock Route" : "Lock Route"}
                    >
                        {route.locked ? <Lock size={16}/> : <Unlock size={16}/>}
                    </button>
                    <button 
                        onClick={() => onDeleteRoute(route.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete this route"
                    >
                        <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <hr className="border-slate-200" />

        {/* Section 2: Configuration */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-700"/>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("flight_settings", language)}</h2>
             </div>
             {/* Speed Unit Toggle */}
             <div className="flex text-[10px] font-bold border border-blue-200 rounded overflow-hidden">
                <button 
                    onClick={() => setSpeedUnit('kmh')}
                    className={`px-2 py-1 ${speedUnit === 'kmh' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
                >KM/H</button>
                <button 
                    onClick={() => setSpeedUnit('ms')}
                    className={`px-2 py-1 ${speedUnit === 'ms' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
                >M/S</button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("altitude", language)}</label>
              <input 
                type="text" 
                value={localAltitude}
                onChange={(e) => handleRawChange(setLocalAltitude, 'altitude', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("speed", language)} ({speedUnit === 'kmh' ? 'km/h' : 'm/s'})</label>
              <input 
                type="text" 
                value={localSpeed}
                onChange={(e) => handleSpeedRawChange(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          
          <div>
               <label className="block text-xs font-bold text-slate-700 mb-1">{t("altitude_mode", language)}</label>
               <select 
                  value={settings.altitudeMode}
                  onChange={(e) => setSettings(prev => ({...prev, altitudeMode: Number(e.target.value)}))}
                  className={inputClass}
               >
                 <option value="0">{t("alt_mode_rel", language)}</option>
                 <option value="1">{t("alt_mode_abs", language)}</option>
               </select>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-700 mb-1">{t("heading_mode", language)}</label>
             <select 
                value={settings.headingMode}
                onChange={(e) => setSettings(prev => ({...prev, headingMode: e.target.value as any}))}
                className={inputClass}
               >
               <option value="auto_path">{t("head_auto_path", language)}</option>
               <option value="auto_bearing">{t("head_auto_bear", language)}</option>
               <option value="manual">{t("head_manual", language)}</option>
             </select>
          </div>

          {settings.headingMode === 'manual' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("manual_heading", language)}</label>
              <input 
                type="text"
                value={localHeading}
                onChange={(e) => handleRawChange(setLocalHeading, 'headingManual', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

           <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("gimbal_pitch", language)}</label>
              <input 
                type="text"
                value={localGimbal}
                onChange={(e) => handleRawChange(setLocalGimbal, 'gimbalPitch', e.target.value)}
                className={inputClass}
              />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t("curve_size", language)}</label>
              <input 
                type="text"
                value={localCurve}
                onChange={(e) => handleRawChange(setLocalCurve, 'curveSize', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-700 mb-1">{t("wp_action", language)}</label>
               <select 
                  value={settings.action1}
                  onChange={(e) => setSettings(prev => ({...prev, action1: Number(e.target.value)}))}
                  className={inputClass}
               >
                 <option value="-1">{t("act_none", language)}</option>
                 <option value="0">{t("act_stay", language)}</option>
                 <option value="2">{t("act_start_rec", language)}</option>
                 <option value="3">{t("act_stop_rec", language)}</option>
                 <option value="5">{t("act_rotate", language)}</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-700 mb-1">{t("finish_action", language)}</label>
               <select 
                  value={settings.finishAction}
                  onChange={(e) => setSettings(prev => ({...prev, finishAction: Number(e.target.value)}))}
                  className={inputClass}
               >
                 <option value="0">{t("act_none", language)}</option>
                 <option value="1">{t("fin_rth", language)}</option>
                 <option value="2">{t("fin_land", language)}</option>
                 <option value="3">{t("fin_first", language)}</option>
                 <option value="4">{t("fin_reverse", language)}</option>
               </select>
            </div>
          </div>

          <button 
            onClick={onApplySettings}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-4 rounded transition shadow-sm border border-slate-900 active:transform active:scale-95"
          >
            {t("apply_settings", language)}
          </button>
        </section>

        <hr className="border-slate-200" />

        {/* Section 3: Export */}
        <section className="space-y-3 pb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t("export", language)}</h2>
           <button 
              onClick={onExportLitchi}
              disabled={routes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 disabled:bg-slate-300 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
            >
              <Download size={18} /> Litchi CSV
            </button>
             <button 
              onClick={onExportKML}
               disabled={routes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-slate-600 disabled:bg-slate-300 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded transition"
            >
              <Download size={18} /> Standard KML
            </button>
             <button 
              onClick={onExportWPML}
               disabled={routes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 disabled:bg-slate-300 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded transition shadow-md"
            >
              <Plane size={18} /> DJI Fly (KMZ/WPML)
            </button>
        </section>
      </div>
      
      <div className="p-4 bg-slate-100 text-xs text-slate-500 text-center border-t border-slate-200">
        <strong>{t("dji_fly_note", language)}</strong>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Route, Waypoint, SpeedUnit } from '../types';
import { ArrowUp, ArrowDown, Trash2, Edit, ChevronDown, ChevronUp, X, Edit2 } from 'lucide-react';
import { t, Language } from '../translations';

interface RouteManagerProps {
    routes: Route[];
    onUpdateWaypoint: (routeId: string, wpId: number, field: string, value: any) => void;
    onDeleteWaypoint: (routeId: string, wpId: number) => void;
    onReorderWaypoint: (routeId: string, wpId: number, direction: 'up' | 'down') => void;
    onRenameRoute: (id: string, newName: string) => void;
    onPromptRename: (id: string, currentName: string) => void;
    speedUnit: SpeedUnit;
    language: Language;
}

// Memoized Input Component to prevent re-rendering entire table on typing
const TableInput = React.memo<{
    value: number,
    onChange: (val: number) => void
}>(({ value, onChange }) => {
    const [localVal, setLocalVal] = useState(String(value));

    // When external value changes (e.g. from Batch Edit), update local
    React.useEffect(() => {
        // Only update if not currently editing (to avoid cursor jumps)
        // But strict equality check helps
        if (Number(localVal) !== value && localVal !== '' && localVal !== '-' && localVal !== '.') {
            setLocalVal(String(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setLocalVal(raw);
        if (raw !== '' && raw !== '-' && raw !== '.' && !isNaN(Number(raw))) {
            onChange(Number(raw));
        }
    };
    
    const handleBlur = () => {
         // On blur, format nicelly
         if (localVal !== '' && localVal !== '-') {
             const num = Number(localVal);
             if (!isNaN(num)) {
                 setLocalVal(num.toFixed(1).replace(/\.0$/, '')); // Format to max 1 decimal
                 onChange(num);
             }
         }
    };

    return <input 
        type="text" 
        className="bg-white text-gray-900 border border-slate-300 rounded p-1 w-full focus:ring-1 focus:ring-blue-500 outline-none" 
        value={localVal} 
        onChange={handleChange} 
        onBlur={handleBlur}
    />;
});

export const RouteManager: React.FC<RouteManagerProps> = ({ 
    routes, 
    onUpdateWaypoint, 
    onDeleteWaypoint,
    onReorderWaypoint,
    onRenameRoute,
    onPromptRename,
    speedUnit,
    language
}) => {
    
    const [editingWp, setEditingWp] = useState<{routeId: string, wp: Waypoint} | null>(null);
    
    // Shared input style - High Contrast - Bright White
    const inputClass = "bg-white text-gray-900 border border-slate-300 rounded p-1 w-full focus:ring-1 focus:ring-blue-500 outline-none";

    const toDisplaySpeed = (ms: number) => {
        if (speedUnit === 'kmh') return parseFloat((ms * 3.6).toFixed(2));
        return ms;
    };

    const fromDisplaySpeed = (val: number) => {
        if (speedUnit === 'kmh') return parseFloat((val / 3.6).toFixed(2));
        return val;
    };

    const renderModal = () => {
        if (!editingWp) return null;
        const { routeId, wp } = editingWp;

        const handleChange = (field: keyof Waypoint, val: any) => {
            onUpdateWaypoint(routeId, wp.id, field as string, val);
            setEditingWp({ routeId, wp: { ...wp, [field]: val } });
        };

        const handleSpeedChange = (val: number) => {
            const ms = fromDisplaySpeed(val);
            onUpdateWaypoint(routeId, wp.id, 'speed', ms);
            setEditingWp({ routeId, wp: { ...wp, speed: ms } });
        };

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-900">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                        <h3 className="font-bold text-lg">{t("edit_wp", language)} #{wp.id}</h3>
                        <button onClick={() => setEditingWp(null)}><X size={24} className="text-slate-400 hover:text-red-500"/></button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-4">
                        <div className="col-span-2 font-bold text-slate-500 border-b pb-1 mb-2">{t("basic", language)}</div>
                        <div><label className="text-xs font-bold">Latitude</label><input type="number" className={inputClass} value={wp.latitude} onChange={e => handleChange('latitude', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">Longitude</label><input type="number" className={inputClass} value={wp.longitude} onChange={e => handleChange('longitude', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">{t("altitude", language)}</label><input type="number" className={inputClass} value={wp.altitude} onChange={e => handleChange('altitude', Number(e.target.value))} /></div>
                        <div>
                            <label className="text-xs font-bold">{t("speed", language)} ({speedUnit === 'kmh' ? 'km/h' : 'm/s'})</label>
                            <input type="number" className={inputClass} value={toDisplaySpeed(wp.speed)} onChange={e => handleSpeedChange(Number(e.target.value))} />
                        </div>
                        
                        <div className="col-span-2 font-bold text-slate-500 border-b pb-1 mb-2 mt-4">{t("orientation", language)}</div>
                        <div><label className="text-xs font-bold">{t("manual_heading", language)}</label><input type="number" className={inputClass} value={wp.heading} onChange={e => handleChange('heading', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">{t("gimbal_pitch", language)}</label><input type="number" className={inputClass} value={wp.gimbalPitch} onChange={e => handleChange('gimbalPitch', Number(e.target.value))} /></div>
                        
                        <div className="col-span-2 font-bold text-slate-500 border-b pb-1 mb-2 mt-4">{t("route_actions", language)}</div>
                        <div>
                            <label className="text-xs font-bold">Action Type 1</label>
                            <select className={inputClass} value={wp.actionType1} onChange={e => handleChange('actionType1', Number(e.target.value))}>
                                <option value="-1">{t("act_none", language)}</option>
                                <option value="0">{t("act_stay", language)}</option>
                                <option value="1">{t("act_photo", language)}</option>
                                <option value="2">{t("act_start_rec", language)}</option>
                                <option value="3">{t("act_stop_rec", language)}</option>
                                <option value="5">{t("act_rotate", language)}</option>
                            </select>
                        </div>
                        <div><label className="text-xs font-bold">Action Param 1</label><input type="number" className={inputClass} value={wp.actionParam1} onChange={e => handleChange('actionParam1', Number(e.target.value))} /></div>
                        
                        <div className="col-span-2 font-bold text-slate-500 border-b pb-1 mb-2 mt-4">{t("advanced", language)}</div>
                        <div><label className="text-xs font-bold">{t("curve_size", language)}</label><input type="number" className={inputClass} value={wp.curveSize} onChange={e => handleChange('curveSize', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">POI Latitude</label><input type="number" className={inputClass} value={wp.poiLat} onChange={e => handleChange('poiLat', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">POI Longitude</label><input type="number" className={inputClass} value={wp.poiLon} onChange={e => handleChange('poiLon', Number(e.target.value))} /></div>
                        <div><label className="text-xs font-bold">POI Altitude</label><input type="number" className={inputClass} value={wp.poiAlt} onChange={e => handleChange('poiAlt', Number(e.target.value))} /></div>
                    </div>
                    <div className="p-4 border-t flex justify-end">
                        <button onClick={() => setEditingWp(null)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{t("close", language)}</button>
                    </div>
                </div>
            </div>
        );
    };

    if (routes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50">
                <div className="text-center">
                    <p className="text-xl font-bold">{t("rm_no_routes", language)}</p>
                    <p className="text-sm">{t("rm_subtitle", language)}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="flex-1 overflow-y-auto p-6 pb-32">
                {routes.map(route => (
                    <div key={route.id} className="mb-8 bg-white rounded shadow border border-slate-200 overflow-hidden text-slate-900">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: route.color}}></span>
                                        {route.name}
                                        <button 
                                            onClick={() => onPromptRename(route.id, route.name)}
                                            className="text-slate-400 hover:text-blue-600"
                                            title={t("rename_route", language)}
                                        >
                                            <Edit2 size={14}/>
                                        </button>
                                    </h3>
                                    <p className="text-xs text-slate-500">{route.waypoints.length} Waypoints</p>
                                </div>
                            </div>
                            {route.locked && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold border border-amber-200">LOCKED</span>}
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                                    <tr>
                                        {/* Added Order Column */}
                                        <th className="px-4 py-3 w-12">{t("col_order", language)}</th>
                                        <th className="px-4 py-3 w-12">{t("col_wp", language)}</th>
                                        <th className="px-4 py-3">{t("col_latlon", language)}</th>
                                        <th className="px-4 py-3">{t("col_alt", language)}</th>
                                        <th className="px-4 py-3">{t("col_speed", language)} ({speedUnit})</th>
                                        <th className="px-4 py-3">{t("col_gimbal", language)} (°)</th>
                                        <th className="px-4 py-3">{t("col_action", language)}</th>
                                        <th className="px-4 py-3 text-right">{t("col_tools", language)}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {route.waypoints.map((wp, idx) => (
                                        <tr key={wp.id} className="border-b hover:bg-blue-50 transition-colors">
                                            {/* Order is simply Index + 1 */}
                                            <td className="px-4 py-2 text-slate-500 font-mono">
                                                {idx + 1}
                                            </td>
                                            {/* ID is the data ID - This is now "STICKY" and won't change on reorder */}
                                            <td className="px-4 py-2 font-bold text-slate-800">
                                                {wp.id}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500 text-xs">
                                                {wp.latitude.toFixed(5)}<br/>{wp.longitude.toFixed(5)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <TableInput 
                                                    value={wp.altitude} 
                                                    onChange={(val) => onUpdateWaypoint(route.id, wp.id, 'altitude', val)} 
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <TableInput
                                                    value={toDisplaySpeed(wp.speed)} 
                                                    onChange={(val) => onUpdateWaypoint(route.id, wp.id, 'speed', fromDisplaySpeed(val))} 
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                 <TableInput 
                                                    value={wp.gimbalPitch} 
                                                    onChange={(val) => onUpdateWaypoint(route.id, wp.id, 'gimbalPitch', val)} 
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select 
                                                    value={wp.actionType1} 
                                                    disabled={route.locked}
                                                    onChange={(e) => onUpdateWaypoint(route.id, wp.id, 'actionType1', Number(e.target.value))}
                                                    className={`${inputClass} w-24`}
                                                >
                                                    <option value="-1">{t("act_none", language)}</option>
                                                    <option value="0">{t("act_stay", language)}</option>
                                                    <option value="1">{t("act_photo", language)}</option>
                                                    <option value="2">{t("act_start_rec", language)}</option>
                                                    <option value="3">{t("act_stop_rec", language)}</option>
                                                    <option value="5">{t("act_rotate", language)}</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => setEditingWp({routeId: route.id, wp})} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 rounded"><Edit size={14}/></button>
                                                    {!route.locked && (
                                                        <>
                                                            <button onClick={() => onReorderWaypoint(route.id, wp.id, 'up')} disabled={idx === 0} className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowUp size={14}/></button>
                                                            <button onClick={() => onReorderWaypoint(route.id, wp.id, 'down')} disabled={idx === route.waypoints.length - 1} className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowDown size={14}/></button>
                                                            <button onClick={() => onDeleteWaypoint(route.id, wp.id)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {renderModal()}
        </div>
    );
};


import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CalculatorResult, DronePreset, DRONE_PRESETS } from '../types';
import html2canvas from 'html2canvas';
import { Download, Calculator as CalcIcon, Check, Camera, Zap, Ruler } from 'lucide-react';
import { t, Language } from '../translations';
import { calculateGSD } from '../services/geometryService';

interface CalculatorProps {
    language: Language;
}

const SHUTTER_SPEEDS = [
    { label: "1/30", val: 1/30 },
    { label: "1/60", val: 1/60 },
    { label: "1/100", val: 1/100 },
    { label: "1/120", val: 1/120 },
    { label: "1/240", val: 1/240 },
    { label: "1/500", val: 1/500 },
    { label: "1/800", val: 1/800 },
    { label: "1/1000", val: 1/1000 },
    { label: "1/1250", val: 1/1250 },
    { label: "1/1600", val: 1/1600 },
    { label: "1/2000", val: 1/2000 },
    { label: "1/8000", val: 1/8000 },
];

export const Calculator: React.FC<CalculatorProps> = ({ language }) => {
    // Logic state
    const [altitude, setAltitude] = useState(80);
    const [velocity, setVelocity] = useState(25);
    const [fovH, setFovH] = useState(82.1);
    const [fovV, setFovV] = useState(49.4);
    
    // Photogrammetry Extras
    const [sensorW, setSensorW] = useState(9.84);
    const [sensorH, setSensorH] = useState(7.38);
    const [imageW, setImageW] = useState(8064);
    const [imageH, setImageH] = useState(6048);
    const [realFocal, setRealFocal] = useState(6.72);
    
    const [calcMode, setCalcMode] = useState<'angle' | 'base'>('angle');
    const [gimbalAngle, setGimbalAngle] = useState(-90);
    const [baseMajor, setBaseMajor] = useState(100);
    const [distFrontal, setDistFrontal] = useState<number | ''>('');
    const [distTotal, setDistTotal] = useState<number | ''>('');
    
    // Mapping specific
    const [overlapH, setOverlapH] = useState(70); // Side
    const [overlapV, setOverlapV] = useState(80); // Front
    const [shutterSpeed, setShutterSpeed] = useState(1/1000);

    const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);

    // Raw input state
    const [localAlt, setLocalAlt] = useState('80');
    const [localVel, setLocalVel] = useState('25');
    
    // Sync external presets to raw input
    useEffect(() => { setLocalAlt(String(altitude)); }, [altitude]);

    const handleRaw = (setter: any, numSetter: any, val: string) => {
        setter(val);
        if(val !== '' && val !== '-') numSetter(Number(val));
    };
    
    const [result, setResult] = useState<CalculatorResult | null>(null);
    const [mappingResult, setMappingResult] = useState<any | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    // High Contrast Input Style - Bright White
    const inputClass = "w-full bg-white text-gray-900 border-gray-300 rounded p-2 border focus:ring-2 focus:ring-blue-500 outline-none text-xs";
    const labelClass = "block text-[10px] uppercase font-bold text-slate-600 mb-1";

    const handleCalculate = () => {
        // --- 1. Sweep Area Calculation (Existing) ---
        const fovVRad = (fovV * Math.PI) / 180;
        const fovHRad = (fovH * Math.PI) / 180;
        
        let calculatedGimbal = gimbalAngle;
        let calculatedBaseMajor = baseMajor;
        let calculatedBaseMinor = 0;
        let dNear = 0;
        let dFar = 0;

        if (calcMode === 'angle') {
            const theta = Math.abs(gimbalAngle);
            dNear = altitude * Math.tan((90 - theta) * Math.PI / 180 - fovVRad / 2);
            dFar = altitude * Math.tan((90 - theta) * Math.PI / 180 + fovVRad / 2);
            calculatedBaseMinor = 2 * dNear * Math.tan(fovHRad / 2);
            calculatedBaseMajor = 2 * dFar * Math.tan(fovHRad / 2);
        } else {
            // Calculate via Base Major
            dFar = baseMajor / (2 * Math.tan(fovHRad / 2));
            const thetaRad = Math.PI / 2 - ((Math.atan(dFar / altitude) - fovVRad / 2));
            const theta = thetaRad * 180 / Math.PI;
            
            dNear = altitude * Math.tan((90 - theta) * Math.PI / 180 - fovVRad / 2);
            calculatedBaseMinor = 2 * dNear * Math.tan(fovHRad / 2);
            calculatedGimbal = parseFloat((theta * -1).toFixed(2));
            calculatedBaseMajor = baseMajor;
        }

        const geometricLen = dFar - dNear;
        const lenForTime = distFrontal !== '' ? Number(distFrontal) : geometricLen;
        const velMs = velocity / 3.6;
        
        const timeFrontal = lenForTime / velMs;
        const timeTotal = distTotal !== '' ? Number(distTotal) / velMs : null;

        setResult({
            altitude,
            gimbalAngle: calculatedGimbal,
            baseMin: Math.abs(calculatedBaseMinor),
            baseMax: Math.abs(calculatedBaseMajor),
            speed: `${velocity} km/h`,
            distFrontal: lenForTime,
            timeFrontal: timeFrontal / 60,
            distTotal: distTotal !== '' ? Number(distTotal) : null,
            timeTotal: timeTotal ? timeTotal / 60 : null,
            dNear,
            dFar
        });

        // --- 2. Detailed Mapping Metrics (New) ---
        
        // Footprint (Ground Coverage of one photo at Nadir)
        const footprintW = 2 * altitude * Math.tan(fovHRad / 2);
        const footprintH = 2 * altitude * Math.tan(fovVRad / 2);

        // GSD (cm/px) - Using Fixed Formula from Service
        const gsdW = calculateGSD(altitude, sensorW, imageW, realFocal);
        const gsdH = calculateGSD(altitude, sensorH, imageH, realFocal);
        const gsd = Math.max(gsdW, gsdH); 

        // Motion Blur
        // Distance traveled during exposure
        // Blur (cm) = Speed (m/s) * Shutter (s) * 100
        const blurCm = velMs * shutterSpeed * 100;

        // Intervals
        const distBetweenPhotos = footprintH * (1 - (overlapV / 100)); // Front spacing
        const distBetweenLines = footprintW * (1 - (overlapH / 100)); // Side spacing
        const timeBetweenPhotos = distBetweenPhotos / velMs;

        setMappingResult({
            footprintW,
            footprintH,
            gsd,
            blurCm,
            distBetweenPhotos,
            distBetweenLines,
            timeBetweenPhotos
        });
    };

    const handlePreset = (p: DronePreset) => {
        setFovH(p.fovH);
        setFovV(p.fovV);
        setSensorW(p.sensorWidthMm);
        setSensorH(p.sensorHeightMm);
        setImageW(p.imageWidthPx);
        setImageH(p.imageHeightPx);
        setRealFocal(p.realFocalLengthMm);

        setSelectedPresetName(p.model);
        // Clear message after 3 seconds
        setTimeout(() => setSelectedPresetName(null), 3000);
    };

    const exportImage = async () => {
        if (chartRef.current) {
            const canvas = await html2canvas(chartRef.current);
            const link = document.createElement('a');
            link.download = 'sweep_area_calculation.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const svgConfig = useMemo(() => {
        if (!result) return { viewBox: "0 0 100 100", path: "" };
        const maxDim = Math.max(result.baseMax, result.distFrontal);
        const margin = maxDim * 0.3;
        const minX = -(result.baseMax / 2) - margin;
        const maxX = (result.baseMax / 2) + margin;
        // Inverted Coordinates: 
        // Base Major at 0 (Top)
        // Base Minor at Distance (Bottom)
        // So Y spans from 0 to distFrontal
        const minY = -margin;
        const maxY = result.distFrontal + margin;
        const width = maxX - minX;
        const height = maxY - minY;

        return {
            viewBox: `${minX} ${minY} ${width} ${height}`,
            // Inverted shape: Wide at 0, Narrow at distFrontal
            points: `-${result.baseMax/2},0 ${result.baseMax/2},0 ${result.baseMin/2},${result.distFrontal} -${result.baseMin/2},${result.distFrontal}`
        };

    }, [result]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
                
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 shrink-0 border-b pb-2">
                    <CalcIcon className="text-blue-600" /> {t("calc_title", language)}
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
                    
                    {/* LEFT COL: Inputs */}
                    <div className="lg:col-span-4 space-y-4">
                        
                        {/* 1. Drone Params */}
                        <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                            <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 px-2 rounded">1</span> {t("drone_params", language)}
                            </h3>
                            
                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-slate-500 block mb-1">{t("load_preset", language)}</span>
                                {selectedPresetName && (
                                    <div className="bg-emerald-100 text-emerald-800 p-2 rounded text-xs font-bold mb-2 flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                                        <Check size={12} /> {t("preset_loaded", language)} {selectedPresetName}
                                    </div>
                                )}
                                <div className="h-24 overflow-y-auto border border-slate-200 rounded p-1 bg-slate-50">
                                    <div className="grid grid-cols-1 gap-1">
                                        {DRONE_PRESETS.map(p => (
                                            <button 
                                                key={p.model} 
                                                onClick={() => handlePreset(p)} 
                                                className={`text-[10px] text-left px-2 py-1 rounded hover:bg-blue-100 transition truncate ${selectedPresetName === p.model ? 'bg-blue-200 font-bold' : ''}`}
                                            >
                                                {p.model}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>{t("altitude", language)}</label>
                                    <input type="text" className={inputClass} value={localAlt} onChange={e => handleRaw(setLocalAlt, setAltitude, e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("speed", language)} (km/h)</label>
                                    <input type="text" className={inputClass} value={localVel} onChange={e => handleRaw(setLocalVel, setVelocity, e.target.value)} />
                                </div>
                            </div>

                            {/* Detailed Sensor Info (Auto populated) */}
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                                <div>
                                    <label className={labelClass}>{t("fov_h", language)}</label>
                                    <input type="number" className={inputClass} value={fovH} onChange={e => setFovH(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("fov_v", language)}</label>
                                    <input type="number" className={inputClass} value={fovV} onChange={e => setFovV(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("sensor_dim", language)} W (mm)</label>
                                    <input type="number" className={inputClass} value={sensorW} onChange={e => setSensorW(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("sensor_dim", language)} H (mm)</label>
                                    <input type="number" className={inputClass} value={sensorH} onChange={e => setSensorH(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("focal_len", language)} (mm)</label>
                                    <input type="number" className={inputClass} value={realFocal} onChange={e => setRealFocal(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        {/* 2. Mapping Settings */}
                        <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
                             <h3 className="font-bold text-orange-800 text-sm mb-3 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 px-2 rounded">2</span> {t("calc_mode", language)}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>{t("overlap_v", language)}</label>
                                    <input type="number" className={inputClass} value={overlapV} onChange={e => setOverlapV(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("overlap_h", language)}</label>
                                    <input type="number" className={inputClass} value={overlapH} onChange={e => setOverlapH(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("shutter_speed", language)}</label>
                                    <select className={inputClass} value={shutterSpeed} onChange={e => setShutterSpeed(Number(e.target.value))}>
                                        {SHUTTER_SPEEDS.map(s => <option key={s.label} value={s.val}>{s.label}</option>)}
                                    </select>
                                </div>
                                
                                <div className="col-span-2 pt-2 border-t mt-2">
                                     <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="radio" checked={calcMode === 'angle'} onChange={() => setCalcMode('angle')} className="text-blue-600"/>
                                            {t("by_gimbal", language)}
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="radio" checked={calcMode === 'base'} onChange={() => setCalcMode('base')} className="text-blue-600"/>
                                            {t("by_base", language)}
                                        </label>
                                    </div>
                                    <div className="mt-2">
                                        {calcMode === 'angle' ? (
                                            <input type="number" className={inputClass} value={gimbalAngle} onChange={e => setGimbalAngle(Number(e.target.value))} placeholder="Gimbal Angle (-90)" />
                                        ) : (
                                            <input type="number" className={inputClass} value={baseMajor} onChange={e => setBaseMajor(Number(e.target.value))} placeholder="Base (m)" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                         <button onClick={handleCalculate} className="w-full bg-blue-600 text-white py-4 rounded font-bold hover:bg-blue-700 transition shadow-lg text-sm uppercase tracking-wider">
                            {t("calc_results", language)}
                        </button>
                    </div>

                    {/* RIGHT COL: Results */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        
                        {/* MAPPING RESULTS CARD */}
                        {mappingResult && (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-800 text-white p-3 px-4 flex justify-between items-center">
                                    <h3 className="font-bold flex items-center gap-2"><Camera size={18}/> {t("photogrammetry_res", language)}</h3>
                                    <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded">Alt: {altitude}m | Speed: {velocity}km/h</span>
                                </div>
                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("gsd", language)}</div>
                                        <div className="text-2xl font-black text-blue-600">{mappingResult.gsd.toFixed(2)}</div>
                                        <div className="text-xs text-slate-500 font-bold">cm/px</div>
                                    </div>

                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("motion_blur", language)}</div>
                                        <div className={`text-2xl font-black ${mappingResult.blurCm > mappingResult.gsd ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {mappingResult.blurCm.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold">cm</div>
                                        {mappingResult.blurCm > mappingResult.gsd && <div className="text-[9px] text-red-500 font-bold mt-1">⚠️ High Blur</div>}
                                    </div>

                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("footprint", language)}</div>
                                        <div className="text-lg font-bold text-slate-700">{mappingResult.footprintW.toFixed(0)}x{mappingResult.footprintH.toFixed(0)}</div>
                                        <div className="text-xs text-slate-500 font-bold">meters</div>
                                    </div>

                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("photo_interval_time", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.timeBetweenPhotos.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">seconds</div>
                                    </div>
                                    
                                    <div className="col-span-2 md:col-span-4 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100 mt-2">
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-xs font-bold text-slate-600">{t("photo_interval_dist", language)}:</span>
                                            <span className="font-mono font-bold text-blue-600">{mappingResult.distBetweenPhotos.toFixed(1)} m</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-xs font-bold text-slate-600">{t("lane_spacing", language)}:</span>
                                            <span className="font-mono font-bold text-blue-600">{mappingResult.distBetweenLines.toFixed(1)} m</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* VISUAL CHART */}
                        <div className="flex-1 min-h-[400px] flex flex-col" ref={chartRef}>
                            {result ? (
                                <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col">
                                    <div className="flex justify-between items-center p-3 border-b bg-slate-50 rounded-t-lg">
                                        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Ruler size={16}/> {t("visual_result", language)}</h3>
                                        <div className="text-right text-xs text-slate-600 space-x-3">
                                            <span>Gimbal: <strong>{result.gimbalAngle}°</strong></span>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white relative p-4 flex items-center justify-center overflow-hidden">
                                        <svg viewBox={svgConfig.viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                            <defs>
                                                <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
                                                    <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                                </marker>
                                            </defs>
                                            <polygon 
                                                points={svgConfig.points}
                                                fill="rgba(59, 130, 246, 0.1)"
                                                stroke="#2563eb"
                                                strokeWidth={result.baseMax / 150}
                                            />
                                            {/* Center line */}
                                            <line 
                                                x1="0" y1="0" 
                                                x2="0" y2={result.distFrontal} 
                                                stroke="#94a3b8" 
                                                strokeWidth={result.baseMax / 250}
                                                strokeDasharray={`${result.baseMax/20}, ${result.baseMax/20}`}
                                            />
                                            
                                            {/* Height Label */}
                                            <text 
                                                x={(result.baseMax / 2) * 1.15} 
                                                y={result.distFrontal / 2} 
                                                textAnchor="start" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.04} 
                                                fontWeight="bold"
                                                fill="#0f172a"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                H: {result.distFrontal.toFixed(1)}m
                                            </text>
                                            
                                            {/* Base Minor Label (Now at Bottom) */}
                                            <text 
                                                x="0" 
                                                y={result.distFrontal * 1.08} 
                                                textAnchor="middle" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.035} 
                                                fill="#475569"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                b: {result.baseMin.toFixed(1)}m
                                            </text>
                                            
                                            {/* Base Major Label (Now at Top) */}
                                            <text 
                                                x="0" 
                                                y={-result.distFrontal * 0.05} 
                                                textAnchor="middle" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.04} 
                                                fontWeight="bold"
                                                fill="#1e293b"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                B: {result.baseMax.toFixed(1)}m
                                            </text>
                                        </svg>
                                    </div>

                                    <div className="p-3 bg-slate-50 border-t rounded-b-lg flex justify-between items-center">
                                        <div className="flex gap-4 text-xs font-mono text-slate-600">
                                           <span>Near: {result.dNear.toFixed(0)}m</span>
                                           <span>Far: {result.dFar.toFixed(0)}m</span>
                                        </div>
                                        <button onClick={exportImage} className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider">
                                            <Download size={14} /> {t("save_image", language)}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-400">
                                    <CalcIcon size={48} className="mb-4 opacity-20"/>
                                    <p className="text-lg font-medium">Enter parameters to calculate</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

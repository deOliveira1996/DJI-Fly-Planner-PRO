import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CalculatorResult, DronePreset, DRONE_PRESETS } from '../types';
import html2canvas from 'html2canvas';
import { Download, Calculator as CalcIcon, Check } from 'lucide-react';
import { t, Language } from '../translations';

interface CalculatorProps {
    language: Language;
}

export const Calculator: React.FC<CalculatorProps> = ({ language }) => {
    // Logic state
    const [altitude, setAltitude] = useState(80);
    const [fovH, setFovH] = useState(82.1);
    const [fovV, setFovV] = useState(49.4);
    const [velocity, setVelocity] = useState(25);
    const [calcMode, setCalcMode] = useState<'angle' | 'base'>('angle');
    const [gimbalAngle, setGimbalAngle] = useState(-90);
    const [baseMajor, setBaseMajor] = useState(100);
    const [distFrontal, setDistFrontal] = useState<number | ''>('');
    const [distTotal, setDistTotal] = useState<number | ''>('');
    const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);

    // Raw input state
    const [localAlt, setLocalAlt] = useState('80');
    const [localVel, setLocalVel] = useState('25');
    const [localFovH, setLocalFovH] = useState('82.1');
    const [localFovV, setLocalFovV] = useState('49.4');
    const [localGimbal, setLocalGimbal] = useState('-90');
    const [localBase, setLocalBase] = useState('100');

    // Sync external presets to raw input
    useEffect(() => { setLocalFovH(String(fovH)); }, [fovH]);
    useEffect(() => { setLocalFovV(String(fovV)); }, [fovV]);

    const handleRaw = (setter: any, numSetter: any, val: string) => {
        setter(val);
        if(val !== '' && val !== '-') numSetter(Number(val));
    };
    
    const [result, setResult] = useState<CalculatorResult | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    // High Contrast Input Style - Bright White
    const inputClass = "w-full bg-white text-gray-900 border-gray-300 rounded p-2 border focus:ring-2 focus:ring-blue-500 outline-none";

    const handleCalculate = () => {
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
    };

    const handlePreset = (p: DronePreset) => {
        setFovH(p.fovH);
        setFovV(p.fovV);
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
        const minY = -margin;
        const maxY = result.distFrontal + margin;
        const width = maxX - minX;
        const height = maxY - minY;

        return {
            viewBox: `${minX} ${minY} ${width} ${height}`,
            points: `-${result.baseMax/2},${result.distFrontal} ${result.baseMax/2},${result.distFrontal} ${result.baseMin/2},0 -${result.baseMin/2},0`
        };

    }, [result]);

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 flex flex-col">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-6">
                
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 shrink-0">
                    <CalcIcon /> {t("calc_title", language)}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                    
                    <div className="space-y-4 bg-white p-4 rounded shadow-sm border border-slate-200 h-full">
                        <div className="p-3 bg-blue-50 rounded border border-blue-100 mb-2">
                            <h3 className="font-bold text-blue-800 text-sm mb-2">{t("drone_params", language)}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("altitude", language)}</label>
                                    <input type="text" className={inputClass} value={localAlt} onChange={e => handleRaw(setLocalAlt, setAltitude, e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("speed", language)} (km/h)</label>
                                    <input type="text" className={inputClass} value={localVel} onChange={e => handleRaw(setLocalVel, setVelocity, e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("fov_h", language)}</label>
                                    <input type="text" className={inputClass} value={localFovH} onChange={e => handleRaw(setLocalFovH, setFovH, e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("fov_v", language)}</label>
                                    <input type="text" className={inputClass} value={localFovV} onChange={e => handleRaw(setLocalFovV, setFovV, e.target.value)} />
                                </div>
                            </div>
                            <div className="mt-3">
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
                        </div>
                    </div>

                    <div className="space-y-4 bg-white p-4 rounded shadow-sm border border-slate-200 h-full">
                        <div className="p-3 bg-orange-50 rounded border border-orange-100 h-full">
                            <h3 className="font-bold text-orange-800 text-sm mb-2">{t("calc_mode", language)}</h3>
                            <div className="flex flex-col gap-2 mb-4">
                                <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer p-2 rounded hover:bg-white/50">
                                    <input type="radio" checked={calcMode === 'angle'} onChange={() => setCalcMode('angle')} className="text-orange-600 focus:ring-orange-500"/>
                                    <span className="font-medium">{t("by_gimbal", language)}</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer p-2 rounded hover:bg-white/50">
                                    <input type="radio" checked={calcMode === 'base'} onChange={() => setCalcMode('base')} className="text-orange-600 focus:ring-orange-500"/>
                                    <span className="font-medium">{t("by_base", language)}</span>
                                </label>
                            </div>

                            {calcMode === 'angle' ? (
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("gimbal_angle", language)}</label>
                                    <input type="text" className={inputClass} value={localGimbal} onChange={e => handleRaw(setLocalGimbal, setGimbalAngle, e.target.value)} />
                                    <span className="text-[10px] text-slate-500 mt-1 block">-90 = Nadir (Down)</span>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("max_base", language)}</label>
                                    <input type="text" className={inputClass} value={localBase} onChange={e => handleRaw(setLocalBase, setBaseMajor, e.target.value)} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 bg-white p-4 rounded shadow-sm border border-slate-200 h-full flex flex-col justify-between">
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                            <h3 className="font-bold text-slate-700 text-sm mb-2">{t("optional_dist", language)}</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("frontal_dist", language)}</label>
                                    <input type="number" className={inputClass} value={distFrontal} onChange={e => setDistFrontal(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">{t("total_flight_dist", language)}</label>
                                    <input type="number" className={inputClass} value={distTotal} onChange={e => setDistTotal(e.target.value === '' ? '' : Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <button onClick={handleCalculate} className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 transition shadow mt-4">
                            {t("calc_results", language)}
                        </button>
                    </div>

                </div>

                <div className="flex-1 min-h-[500px] flex flex-col" ref={chartRef}>
                    {result ? (
                         <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-lg">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{t("visual_result", language)}</h3>
                                    <p className="text-xs text-slate-500">{t("top_down", language)}</p>
                                </div>
                                <div className="text-right text-xs text-slate-600 space-y-1">
                                    <div>Gimbal: <strong>{result.gimbalAngle}°</strong></div>
                                    <div>Speed: <strong>{result.speed}</strong></div>
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
                                    <line 
                                        x1="0" y1="0" 
                                        x2="0" y2={result.distFrontal} 
                                        stroke="#94a3b8" 
                                        strokeWidth={result.baseMax / 250}
                                        strokeDasharray={`${result.baseMax/20}, ${result.baseMax/20}`}
                                    />
                                    <text 
                                        x={(result.baseMax / 2) * 1.15} 
                                        y={result.distFrontal / 2} 
                                        textAnchor="start" 
                                        fontSize={Math.max(result.baseMax, result.distFrontal) * 0.04} 
                                        fontWeight="bold"
                                        fill="#0f172a"
                                    >
                                        H: {result.distFrontal.toFixed(1)}m
                                    </text>
                                    <text 
                                        x="0" 
                                        y={-result.distFrontal * 0.05} 
                                        textAnchor="middle" 
                                        fontSize={Math.max(result.baseMax, result.distFrontal) * 0.035} 
                                        fill="#475569"
                                    >
                                        b: {result.baseMin.toFixed(1)}m
                                    </text>
                                    <text 
                                        x="0" 
                                        y={result.distFrontal * 1.08} 
                                        textAnchor="middle" 
                                        fontSize={Math.max(result.baseMax, result.distFrontal) * 0.04} 
                                        fontWeight="bold"
                                        fill="#1e293b"
                                    >
                                        B: {result.baseMax.toFixed(1)}m
                                    </text>
                                </svg>
                            </div>

                            <div className="p-4 bg-slate-50 border-t rounded-b-lg">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-white p-2 rounded border text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold">{t("time_frontal", language)}</div>
                                        <div className="font-bold text-blue-600 text-lg">{result.timeFrontal.toFixed(1)} min</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold">{t("dist_near_far", language)}</div>
                                        <div className="font-bold text-slate-700">{result.dNear.toFixed(0)} / {result.dFar.toFixed(0)} m</div>
                                    </div>
                                    {result.timeTotal && (
                                        <div className="bg-yellow-50 p-2 rounded border border-yellow-200 text-center col-span-2 md:col-span-1">
                                            <div className="text-[10px] uppercase text-yellow-700 font-bold">{t("total_time", language)}</div>
                                            <div className="font-bold text-yellow-800 text-lg">{result.timeTotal.toFixed(1)} min</div>
                                        </div>
                                    )}
                                     <div className="flex items-center justify-center">
                                        <button onClick={exportImage} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-medium">
                                            <Download size={16} /> {t("save_image", language)}
                                        </button>
                                     </div>
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-400">
                             <CalcIcon size={48} className="mb-4 opacity-20"/>
                             <p className="text-lg font-medium">Enter parameters and calculate to view visualization</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
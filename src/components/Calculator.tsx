
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CalculatorResult, DronePreset, DRONE_PRESETS } from '../types';
import html2canvas from 'html2canvas';
import { Download, Calculator as CalcIcon, Check, Camera, Ruler, Clock, Layers, Gauge, AlertTriangle } from 'lucide-react';
import { t, Language } from '../translations';
import { calculateGSD, calculateRollingShutterDelta } from '../services/geometryService';

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
    { label: "1/4000", val: 1/4000 },
    { label: "1/8000", val: 1/8000 },
];

// Helper Component for Natural Number Input with Validation
const NumericInput = ({ 
    value, 
    onChange, 
    className, 
    placeholder,
    min,
    max
}: { 
    value: number, 
    onChange: (val: number) => void, 
    className?: string, 
    placeholder?: string,
    min?: number,
    max?: number
}) => {
    const [localVal, setLocalVal] = useState(String(value));

    useEffect(() => {
        // Sync with external updates only if significantly different
        if (Number(localVal) !== value && localVal !== '' && localVal !== '-' && localVal !== '.') {
            setLocalVal(String(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalVal(e.target.value);
    };

    const handleBlur = () => {
        let parsed = parseFloat(localVal);
        if (!isNaN(parsed)) {
            // Validation
            if (min !== undefined && parsed < min) parsed = min;
            if (max !== undefined && parsed > max) parsed = max;

            onChange(parsed);
            setLocalVal(String(parsed));
        } else {
            setLocalVal(String(value));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input 
            type="text" 
            className={`${className} ${Number(localVal) < (min ?? -Infinity) || Number(localVal) > (max ?? Infinity) ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={localVal} 
            onChange={handleChange} 
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
        />
    );
};

export const Calculator: React.FC<CalculatorProps> = ({ language }) => {
    // Logic state
    const [altitude, setAltitude] = useState(80);
    const [velocity, setVelocity] = useState(25);
    const [fovH, setFovH] = useState(69.7);
    const [fovV, setFovV] = useState(55.1);
    const [fovDiagonal, setFovDiagonal] = useState(82.1);
    const [aspectRatio, setAspectRatio] = useState<'4:3' | '16:9'>('4:3');
    
    // Photogrammetry Extras
    const [sensorW, setSensorW] = useState(13.2);
    const [sensorH, setSensorH] = useState(8.8);
    const [imageW, setImageW] = useState(5472);
    const [imageH, setImageH] = useState(3648);
    const [realFocal, setRealFocal] = useState(9.1561);
    
    const [calcMode, setCalcMode] = useState<'angle' | 'base'>('angle');
    const [gimbalAngle, setGimbalAngle] = useState(-90);
    const [baseMajor, setBaseMajor] = useState(100);
    const [distFrontal, setDistFrontal] = useState<number>(0); 
    const [distTotal, setDistTotal] = useState<number>(0);
    
    // Mapping specific
    const [overlapH, setOverlapH] = useState(60); 
    const [overlapV, setOverlapV] = useState(70); 
    const [shutterSpeed, setShutterSpeed] = useState(1/1000);

    const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
    const [eisCropActive, setEisCropActive] = useState(false);
    const [keystoneK, setKeystoneK] = useState(1.0);
    
    const [result, setResult] = useState<CalculatorResult | null>(null);
    const [mappingResult, setMappingResult] = useState<any | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    // High Contrast Input Style
    const inputClass = "w-full bg-white text-gray-900 border-gray-300 rounded p-2 border focus:ring-2 focus:ring-blue-500 outline-none text-xs";
    const labelClass = "block text-[10px] uppercase font-bold text-slate-600 mb-1";

    const handleCalculate = () => {
        // FOV Calculation based on user example
        const aspectHoriz = aspectRatio === '4:3' ? 4 : 16;
        const aspectVert = aspectRatio === '4:3' ? 3 : 9;
        const aspectDiag = Math.sqrt(aspectHoriz * aspectHoriz + aspectVert * aspectVert);

        const diagRad = (fovDiagonal * Math.PI) / 180;
        
        // HFOV = 2 * atan( (aspect_horiz / aspect_diag) * tan(fov_diag / 2) )
        let hfovRad = 2 * Math.atan((aspectHoriz / aspectDiag) * Math.tan(diagRad / 2));
        
        // VFOV = 2 * atan( (aspect_vert / aspect_diag) * tan(fov_diag / 2) )
        let vfovRad = 2 * Math.atan((aspectVert / aspectDiag) * Math.tan(diagRad / 2));

        if (eisCropActive) {
            // Apply crop for electronic stabilization (EIS / RockSteady)
            // User example: DJI Mini 4 Pro VFOV 43.1 -> 35 (~18.8% reduction)
            const cropMultiplier = 35 / 43.1;
            hfovRad *= cropMultiplier;
            vfovRad *= cropMultiplier;
        }

        // Geometric Projection (Trapezoid)
        // User example: gimbal -33 deg (rel to horizontal) -> alpha = 57 deg (rel to nadir)
        // Our gimbalAngle is -90 for Nadir. So 0 relative to horizontal is 0. 
        // Angle relative to nadir alpha = 90 - abs(gimbalAngle)
        const alphaRad = (90 - Math.abs(gimbalAngle)) * (Math.PI / 180);
        
        const halfVfovRad = vfovRad / 2;
        const halfHfovRad = hfovRad / 2;

        const theta1Rad = alphaRad - halfVfovRad;
        const theta2Rad = alphaRad + halfVfovRad;

        // Limite próximo e distante no solo (Distância do Projeção Nadir até o ponto)
        const dNear = altitude * Math.tan(theta1Rad);
        const dFar = altitude * Math.tan(theta2Rad);
        
        // Altura do trapézio (Extensão Longitudinal) - Aplicando Fator de Correção Keystone K
        const gh_pure = Math.abs(dFar - dNear);
        const gh = gh_pure * keystoneK;

        // Distâncias hipotenusa (Slant Ranges)
        const sNear = altitude / Math.cos(theta1Rad);
        const sFar = altitude / Math.cos(theta2Rad);

        // Larguras Transversais (Widths) baseadas na fórmula do usuário: W = 2 * h_hypot * sin(FOV_h / 2)
        // O usuário solicitou que o erro se propaga em toda a imagem, então aplicamos K a todas as dimensões.
        const wNear = 2 * sNear * Math.sin(halfHfovRad) * keystoneK;
        const wFar = 2 * sFar * Math.sin(halfHfovRad) * keystoneK;

        // Centro da imagem - Ajustado proporcionalmente
        const dCenter_pure = altitude / Math.cos(alphaRad);
        const dCenter = dCenter_pure * Math.sqrt(keystoneK); // Média geométrica para ajuste de distância
        const wCenter = 2 * dCenter_pure * Math.sin(halfHfovRad) * keystoneK;

        const area = gh === Infinity ? Infinity : ((wNear + wFar) / 2) * gh;
        const velMs = velocity / 3.6;
        
        const timeFrontal = gh === Infinity ? Infinity : gh / velMs;
        const timeTotal = distTotal > 0 ? distTotal / velMs : null;

        const delta = calculateRollingShutterDelta(
            velMs,
            altitude,
            realFocal,
            imageH,
            sensorH,
            shutterSpeed
        );

        setResult({
            altitude,
            gimbalAngle: gimbalAngle,
            baseMin: wNear,
            baseMax: wFar,
            speed: `${velocity} km/h`,
            distFrontal: gh,
            timeFrontal: timeFrontal,
            distTotal: distTotal > 0 ? distTotal : null,
            timeTotal: timeTotal ? timeTotal / 60 : null,
            dNear,
            dFar,
            dCenter,
            wCenter,
            rollingShutterDelta: delta
        });

        // O GSD deve refletir as dimensões corrigidas. 
        // GSD = Dimensão Real / Dimensão em Pixels.
        const gsdWCenter = (wCenter / imageW) * 100; // cm/px
        const gsdHCenter = (gh / imageH) * 100; // cm/px
        const gsdCenter = Math.max(gsdWCenter, gsdHCenter); 

        const gsdWNear = (wNear / imageW) * 100; 
        const gsdHNear = (gh / imageH) * (sNear/dCenter_pure) * 100; // Aproximação vertical
        const gsdNear = Math.max(gsdWNear, gsdHNear); 

        const gsdWFar = sFar === Infinity ? Infinity : (wFar / imageW) * 100;
        const gsdHFar = sFar === Infinity ? Infinity : (gh / imageH) * (sFar/dCenter_pure) * 100;
        const gsdFar = sFar === Infinity ? Infinity : Math.max(gsdWFar, gsdHFar); 

        const blurCm = velMs * shutterSpeed * 100;

        const distBetweenPhotos = gh === Infinity ? 0 : gh * (1 - (overlapV / 100)); 
        const distBetweenLines = wNear * (1 - (overlapH / 100)); 
        const timeBetweenPhotos = distBetweenPhotos / velMs;

        setMappingResult({
            footprintW: gh === Infinity ? Infinity : (wNear + wFar) / 2,
            footprintH: gh,
            area: area,
            gsdCenter,
            gsdNear,
            gsdFar,
            blurCm,
            distBetweenPhotos,
            distBetweenLines,
            timeBetweenPhotos,
            delta
        });
    };

    const handlePreset = (p: DronePreset) => {
        setFovDiagonal(p.fovDiagonal);
        setFovH(p.fovH);
        setFovV(p.fovV);
        setSensorW(p.sensorWidthMm);
        setSensorH(p.sensorHeightMm);
        setImageW(p.imageWidthPx);
        setImageH(p.imageHeightPx);
        setRealFocal(p.realFocalLengthMm);

        setSelectedPresetName(p.model);
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
        if (!result) return { viewBox: "0 0 100 100", points: "" };
        
        // We want to show the footprint with Far edge at the TOP and Near edge at the BOTTOM
        // This simulates a forward-looking perspective.
        const h = result.distFrontal;
        const b = result.baseMin;
        const B = result.baseMax;

        // Points (Y increases downwards in SVG):
        // Far edge (Top): (-B/2, 0), (B/2, 0)
        // Near edge (Bottom): (b/2, h), (-b/2, h)
        const points = `-${B/2},0 ${B/2},0 ${b/2},${h} -${b/2},${h}`;

        const maxDim = Math.max(B, h);
        const marginX = B * 0.6; // Large margin for X to fit labels and rotation
        const marginY = h * 0.4; // Margin for Y
        
        const minX = -(B / 2) - marginX;
        const maxX = (B / 2) + marginX;
        const minY = -marginY;
        const maxY = h + marginY;
        
        const width = maxX - minX;
        const height = maxY - minY;

        return {
            viewBox: `${minX} ${minY} ${width} ${height}`,
            points
        };

    }, [result]);

    const getDeltaColor = (val: number) => {
        if (val < 1.2) return 'text-emerald-500';
        if (val < 2.0) return 'text-amber-500';
        return 'text-red-500';
    };

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
                                    <NumericInput className={inputClass} value={altitude} onChange={setAltitude} min={1} max={500} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("speed", language)} (km/h)</label>
                                    <NumericInput className={inputClass} value={velocity} onChange={setVelocity} min={0.1} max={100} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                                <div className="col-span-2">
                                    <label className={labelClass}>{t("aspect_ratio", language)}</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setAspectRatio('4:3')}
                                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition ${aspectRatio === '4:3' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {t("mode_photo", language)}
                                        </button>
                                        <button 
                                            onClick={() => setAspectRatio('16:9')}
                                            className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition ${aspectRatio === '16:9' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {t("mode_video", language)}
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>{t("fov_diagonal", language)}</label>
                                    <NumericInput className={inputClass} value={fovDiagonal} onChange={setFovDiagonal} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("fov_h", language)}</label>
                                    <NumericInput className={inputClass} value={fovH} onChange={setFovH} />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={labelClass}>{t("fov_v", language)}</label>
                                        <button 
                                            onClick={() => {
                                                const hfovRad = (fovH * Math.PI) / 180;
                                                const R = aspectRatio === '4:3' ? (4/3) : (16/9);
                                                const calculatedFovV = (2 * Math.atan(Math.tan(hfovRad / 2) / R) * 180) / Math.PI;
                                                setFovV(parseFloat(calculatedFovV.toFixed(2)));
                                            }}
                                            className="text-[9px] text-blue-600 hover:underline font-bold"
                                        >
                                            Auto-calc from HFOV
                                        </button>
                                    </div>
                                    <NumericInput className={inputClass} value={fovV} onChange={setFovV} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("sensor_dim", language)} W (mm)</label>
                                    <NumericInput className={inputClass} value={sensorW} onChange={setSensorW} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("sensor_dim", language)} H (mm)</label>
                                    <NumericInput className={inputClass} value={sensorH} onChange={setSensorH} />
                                </div>
                                <div>
                                    <label className={labelClass}>{t("focal_len", language)} (mm)</label>
                                    <NumericInput className={inputClass} value={realFocal} onChange={setRealFocal} />
                                </div>
                                <div className="col-span-2 pt-3 border-t border-slate-100">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${eisCropActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${eisCropActive ? 'left-6' : 'left-1'}`} />
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={eisCropActive} 
                                            onChange={() => setEisCropActive(!eisCropActive)} 
                                        />
                                        <span className="text-[10px] font-bold text-slate-700 uppercase">{t("eis_crop", language)}</span>
                                    </label>
                                    <p className="text-[9px] text-slate-400 mt-1 italic">
                                        Reduz o FOV efetivo para estabilização RockSteady/EIS (~-19%).
                                    </p>
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
                                    <NumericInput className={inputClass} value={overlapV} onChange={setOverlapV} min={0} max={99}/>
                                </div>
                                <div>
                                    <label className={labelClass}>{t("overlap_h", language)}</label>
                                    <NumericInput className={inputClass} value={overlapH} onChange={setOverlapH} min={0} max={99}/>
                                </div>
                                <div>
                                    <label className={labelClass}>{t("shutter_speed", language)}</label>
                                    <select className={inputClass} value={shutterSpeed} onChange={e => setShutterSpeed(Number(e.target.value))}>
                                        {SHUTTER_SPEEDS.map(s => <option key={s.label} value={s.val}>{s.label}</option>)}
                                    </select>
                                </div>
                                
                                <div className="col-span-2 pt-2 border-t mt-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={labelClass}>{t("keystone_adj", language)}</label>
                                        <button 
                                            onClick={() => setKeystoneK(1.19)}
                                            className="text-[9px] text-orange-600 hover:underline font-bold"
                                        >
                                            Set Recommended (1.19)
                                        </button>
                                    </div>
                                    <NumericInput className={inputClass} value={keystoneK} onChange={setKeystoneK} min={0.5} max={3.0} />
                                    <p className="text-[9px] text-slate-400 mt-1 italic">
                                        {t("keystone_desc", language)}
                                    </p>
                                </div>

                                <div className="col-span-2 pt-2 border-t mt-2">
                                     <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="radio" checked={calcMode === 'angle'} onChange={() => setCalcMode('angle')} className="text-blue-600"/>
                                            {t("by_gimbal", language)}
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                            <input type="radio" checked={calcMode === 'base'} onChange={() => setCalcMode('base')} className="text-blue-600"/>
                                            {t("by_base", language)}
                                        </label>
                                    </div>
                                    <div>
                                        {calcMode === 'angle' ? (
                                            <NumericInput className={inputClass} value={gimbalAngle} onChange={setGimbalAngle} placeholder="Gimbal Angle (-90)" min={-90} max={30} />
                                        ) : (
                                            <NumericInput className={inputClass} value={baseMajor} onChange={setBaseMajor} placeholder="Base (m)" />
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
                        
                        {/* RESULT CARD 1: PHOTOGRAMMETRY */}
                        {mappingResult && (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-800 text-white p-3 px-4 flex justify-between items-center">
                                    <h3 className="font-bold flex items-center gap-2"><Camera size={18}/> {t("photo_quality", language)}</h3>
                                    <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded">Alt: {altitude}m | Speed: {velocity}km/h</span>
                                </div>
                                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("gsd", language)}</div>
                                        <div className="text-3xl font-black text-blue-600">{mappingResult.gsdCenter.toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 font-bold mt-1">
                                            Near: {mappingResult.gsdNear.toFixed(1)} | Far: {mappingResult.gsdFar === Infinity ? '∞' : mappingResult.gsdFar.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("area_m2", language)}</div>
                                        <div className="text-3xl font-black text-slate-800">
                                            {mappingResult.area === Infinity ? '∞' : mappingResult.area.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold">m²</div>
                                        {mappingResult.area === Infinity && <div className="text-[10px] text-amber-600 font-bold mt-1">Horizon Visible</div>}
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("motion_blur", language)}</div>
                                        <div className={`text-3xl font-black ${mappingResult.blurCm > mappingResult.gsdCenter ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {mappingResult.blurCm.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold">cm</div>
                                        {mappingResult.blurCm > mappingResult.gsdCenter && <div className="text-[10px] text-red-600 font-bold mt-1 bg-red-100 px-1 rounded inline-block">⚠️ BLUR &gt; GSD</div>}
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("rolling_shutter_delta", language)}</div>
                                        <div className={`text-3xl font-black ${getDeltaColor(mappingResult.delta)}`}>
                                            {mappingResult.delta.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold">Δ (Pixels)</div>
                                        <div className="text-[9px] text-slate-400 mt-1">{t("delta_desc", language)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RESULT CARD 2: MAPPING GUIDELINES */}
                        {mappingResult && (
                             <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="bg-orange-50 border-b border-orange-100 p-3 px-4">
                                    <h3 className="font-bold flex items-center gap-2 text-orange-800"><Layers size={18}/> {t("mapping_guide", language)}</h3>
                                </div>
                                <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-6">
                                     <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("photo_interval_time", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.timeBetweenPhotos.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">seconds</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("photo_interval_dist", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.distBetweenPhotos.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">meters</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("lane_spacing", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.distBetweenLines.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">meters</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("width_m", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.footprintW.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">meters</div>
                                    </div>
                                    <div className="text-center border-l border-slate-100">
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{t("height_m", language)}</div>
                                        <div className="text-2xl font-black text-slate-700">{mappingResult.footprintH.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 font-bold">meters</div>
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
                                        <div className="flex gap-4">
                                            <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-2 shadow-sm">
                                                <Clock size={14} /> {t("est_scan_time", language)}: {result.timeFrontal?.toFixed(1)}s
                                            </div>
                                            <div className="text-right text-xs text-slate-600 self-center">
                                                Gimbal: <strong>{result.gimbalAngle}°</strong>
                                            </div>
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
                                                strokeWidth={Math.max(result.baseMax, result.distFrontal) / 150}
                                            />
                                            <line 
                                                x1="0" y1="0" 
                                                x2="0" y2={result.distFrontal} 
                                                stroke="#94a3b8" 
                                                strokeWidth={Math.max(result.baseMax, result.distFrontal) / 250}
                                                strokeDasharray={`${Math.max(result.baseMax, result.distFrontal)/20}, ${Math.max(result.baseMax, result.distFrontal)/20}`}
                                            />
                                            
                                            <text 
                                                x={(result.baseMax / 2) * 1.1} 
                                                y={result.distFrontal / 2} 
                                                textAnchor="start" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.05} 
                                                fontWeight="bold"
                                                fill="#0f172a"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                Y: {result.distFrontal.toFixed(1)}m
                                            </text>
                                            
                                            <text 
                                                x="0" 
                                                y={result.distFrontal * 1.15} 
                                                textAnchor="middle" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.045} 
                                                fill="#475569"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                X (Near): {result.baseMin.toFixed(1)}m
                                            </text>
                                            
                                            <text 
                                                x="0" 
                                                y={-result.distFrontal * 0.1} 
                                                textAnchor="middle" 
                                                fontSize={Math.max(result.baseMax, result.distFrontal) * 0.05} 
                                                fontWeight="bold"
                                                fill="#1e293b"
                                                style={{ textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff' }}
                                            >
                                                X (Far): {result.baseMax.toFixed(1)}m
                                            </text>
                                        </svg>
                                    </div>

                                    <div className="p-3 bg-slate-50 border-t rounded-b-lg flex justify-between items-center">
                                        <div className="flex gap-4 text-xs font-mono text-slate-600">
                                           <span>Near Edge: {result.dNear?.toFixed(0)}m</span>
                                           <span>Center: {result.dCenter?.toFixed(0)}m</span>
                                           <span>Far Edge: {result.dFar === Infinity ? '∞' : result.dFar?.toFixed(0)}m</span>
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

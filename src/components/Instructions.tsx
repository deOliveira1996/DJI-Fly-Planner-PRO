
import React from 'react';
import { t, Language } from '../translations';
import { Map as MapIcon, Calculator, Plane, Smartphone, MousePointer2, Info } from 'lucide-react';

interface InstructionsProps {
    language: Language;
}

export const Instructions: React.FC<InstructionsProps> = ({ language }) => {
    
    const Section: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
        <div className="mb-8 border-b border-slate-200 pb-6 last:border-0">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">{icon}</span>
                {title}
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed">
                {children}
            </div>
        </div>
    );

    return (
        <div className="h-full overflow-y-auto bg-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-xl p-8 border border-slate-200">
                
                <div className="text-center mb-10 border-b pb-6">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">{t("app_title", language)}</h1>
                    <p className="text-lg text-slate-500">{t("instr_intro_text", language)}</p>
                </div>

                {/* 1. MAP USAGE */}
                <Section title={t("instr_map_title", language)} icon={<MapIcon />}>
                    <p>{t("instr_map_desc", language)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                            <strong className="block text-slate-800 mb-1 flex items-center gap-2"><MousePointer2 size={14}/> Creating Routes</strong>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Polyline Tool:</strong> Use this for standard waypoint missions (video/inspection). Click points to draw, double-click to finish.</li>
                                <li><strong>Polygon Tool:</strong> Use this for <strong>Mapping Mode</strong>. Draw an area, and the app generates a grid automatically.</li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                            <strong className="block text-slate-800 mb-1 flex items-center gap-2"><Plane size={14}/> Adjusting</strong>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Drag any waypoint arrow to move it.</li>
                                <li>Drag the <strong>Green 'H' Marker</strong> to set the Takeoff/Home point. This is crucial for accurate RTH estimates.</li>
                                <li>In Mapping Mode, drag the white <strong>Rotate Handle (🔄)</strong> to change grid angle.</li>
                            </ul>
                        </div>
                    </div>
                </Section>

                {/* 2. CALCULATOR EXPLANATION */}
                <Section title={t("instr_calc_title", language)} icon={<Calculator />}>
                    <p>{t("instr_calc_desc", language)}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* GSD Explanation */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                            <h3 className="font-bold text-blue-800 mb-2">1. {t("gsd", language)}</h3>
                            <p className="text-sm text-blue-900 mb-2">{t("instr_calc_gsd_explain", language)}</p>
                            <div className="text-xs text-blue-700 bg-white p-2 rounded border border-blue-100">
                                <strong>Formula:</strong> (SensorWidth * Altitude * 100) / (FocalLength * ImageWidth)
                            </div>
                        </div>

                        {/* Blur Explanation */}
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                            <h3 className="font-bold text-amber-800 mb-2">2. {t("motion_blur", language)}</h3>
                            <p className="text-sm text-amber-900 mb-2">{t("instr_calc_blur_explain", language)}</p>
                            <ul className="text-xs text-amber-800 list-disc pl-4">
                                <li><strong>Green:</strong> Blur &lt; GSD (Excellent - Sharp)</li>
                                <li><strong>Red:</strong> Blur &gt; GSD (Bad - Blurry)</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-slate-100 rounded text-sm text-slate-700 flex items-start gap-2">
                        <Info size={16} className="mt-0.5 shrink-0 text-slate-500"/>
                        <span>
                            <strong>Visual Result & Scan Time:</strong> The calculator also shows a "V-Shape" visual. This represents the camera's field of view on the ground. The <strong>Est. Scan Time</strong> tells you how long it takes to fly the visual distance shown (H) at your selected speed.
                        </span>
                    </div>
                </Section>

                {/* 3. DJI IMPORT GUIDE */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-black text-orange-700 mb-4 flex items-center gap-2">
                        <Smartphone size={24}/> {t("dji_import_guide", language)}
                    </h2>
                    <div className="space-y-4">
                        <p className="font-bold text-slate-800 text-sm bg-orange-100 inline-block px-2 py-1 rounded">
                            {t("dji_compat_drones", language)}
                        </p>
                        <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-700 font-medium">
                            <li>{t("dji_step_1", language)}</li>
                            <li>{t("dji_step_2", language)}</li>
                            <li>
                                {t("dji_step_3", language)}
                                <div className="mt-2 bg-white p-3 border border-orange-200 rounded font-mono text-xs text-orange-800 select-all shadow-inner break-all">
                                    Android/data/dji.go.v5/files/waypoint
                                </div>
                            </li>
                            <li>{t("dji_step_4", language)}</li>
                            <li>{t("dji_step_5", language)}</li>
                        </ol>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs text-slate-400">
                    {t("by_author", language)}
                </div>

            </div>
        </div>
    );
};

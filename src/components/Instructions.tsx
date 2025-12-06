
import React from 'react';
import { t, Language } from '../translations';
import { Map as MapIcon, Table, Calculator, Plane, MousePointer2, Ruler, Lock, Download, Layers, Smartphone, Folder } from 'lucide-react';

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
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-8 border border-slate-200">
                
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">{t("app_title", language)}</h1>
                    <p className="text-lg text-slate-500">{t("instr_intro_text", language)}</p>
                </div>

                {/* DJI NATIVE IMPORT GUIDE - High Priority */}
                <div className="mb-10 bg-orange-50 border border-orange-200 rounded-xl p-6">
                    <h2 className="text-xl font-black text-orange-700 mb-4 flex items-center gap-2">
                        <Smartphone size={24}/> {t("dji_import_guide", language)}
                    </h2>
                    <div className="space-y-4">
                        <p className="font-bold text-slate-800 text-sm">{t("dji_compat_drones", language)}</p>
                        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 font-medium">
                            <li>{t("dji_step_1", language)}</li>
                            <li>{t("dji_step_2", language)}</li>
                            <li>{t("dji_step_3", language)}
                                <div className="mt-1 bg-white p-2 border border-orange-200 rounded font-mono text-xs text-orange-800 select-all">
                                    Android/data/dji.go.v5/files/waypoint
                                </div>
                            </li>
                            <li>{t("dji_step_4", language)}</li>
                            <li>{t("dji_step_5", language)}</li>
                        </ol>
                    </div>
                </div>

                <Section title={t("instr_map_tools", language)} icon={<MapIcon />}>
                    <p>{t("instr_intro_text", language)}</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li><strong>Standard Route:</strong> {t("instr_map_line", language)}</li>
                        <li><strong>Mapping Grid:</strong> {t("instr_map_poly", language)}</li>
                        <li><strong>Editing:</strong> {t("instr_map_edit", language)}</li>
                        <li><strong>Rotation:</strong> {t("instr_map_rotate", language)}</li>
                    </ul>
                </Section>

                <Section title={t("flight_settings", language)} icon={<Plane />}>
                    <p>{t("instr_settings_text", language)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-slate-50 p-4 rounded border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-2">{t("mode_standard", language)}</h3>
                            <p className="text-sm">Best for video, cinema paths, and manual inspections. You define points, actions, and curves manually.</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded border border-orange-200">
                            <h3 className="font-bold text-orange-800 mb-2">{t("mode_mapping", language)}</h3>
                            <p className="text-sm">Best for photogrammetry. Automatically calculates overlaps, intervals, and grid paths based on camera specs.</p>
                        </div>
                    </div>
                </Section>

                <Section title={t("instr_calc_gsd", language)} icon={<Calculator />}>
                    <p>{t("instr_calc_text", language)}</p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                        <strong>Tip:</strong> Always ensure your shutter speed is fast enough to prevent motion blur. The calculator will warn you if <em>Motion Blur {'>'} GSD</em>.
                    </div>
                </Section>

                <Section title={t("export", language)} icon={<Download />}>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Litchi</div>
                            <p className="text-sm">{t("instr_export_litchi", language)}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">DJI Fly</div>
                            <p className="text-sm">{t("instr_export_dji", language)}</p>
                        </div>
                    </div>
                </Section>

                <div className="mt-8 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
                    {t("by_author", language)}
                </div>

            </div>
        </div>
    );
};

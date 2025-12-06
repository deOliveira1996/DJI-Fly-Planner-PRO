
export type Language = 'en' | 'pt';

export const t = (key: string, lang: Language): string => {
  const dict: Record<string, { en: string; pt: string }> = {
    // Header
    "app_title": { en: "DJI Fly Planner PRO", pt: "DJI Fly Planner PRO" },
    "by_author": { en: "By de Oliveira", pt: "Por de Oliveira" },
    
    // Tools
    "ruler_tool": { en: "Ruler Tool", pt: "Ferramenta Régua" },
    "ruler_on": { en: "Ruler ON", pt: "Régua ATIVA" },
    "map_layer_street": { en: "Street Map", pt: "Mapa de Rua" },
    "map_layer_sat": { en: "Satellite", pt: "Satélite" },
    
    // Workspace
    "workspaces": { en: "Workspaces", pt: "Áreas de Trabalho" },
    "project_name": { en: "Project Name...", pt: "Nome do Projeto..." },
    "save": { en: "Save", pt: "Salvar" },
    "saved_projects": { en: "Saved Projects:", pt: "Projetos Salvos:" },
    "load": { en: "Load", pt: "Carregar" },
    
    // Stats
    "flight_estimates": { en: "Flight Estimates", pt: "Estimativas de Voo" },
    "total_dist": { en: "Total Dist", pt: "Distância Total" },
    "est_time": { en: "Est. Time", pt: "Tempo Est." },
    "est_photos": { en: "Est. Photos", pt: "Fotos Est." },
    "est_videos": { en: "Est. Videos", pt: "Vídeos Est." },
    "stats_note": { en: "Includes commute & action delays.", pt: "Inclui deslocamento e atrasos de ação." },
    "view_stats_for": { en: "View Stats For:", pt: "Ver Stats Para:" },
    "all_routes": { en: "All Routes (Sum)", pt: "Todas as Rotas (Soma)" },

    // Route Actions
    "route_actions": { en: "Route Actions", pt: "Ações de Rota" },
    "import": { en: "Import", pt: "Importar" },
    "undo_last": { en: "Undo Last", pt: "Desfazer" },
    "delete_all": { en: "Delete All Routes", pt: "Excluir Todas as Rotas" },
    "active_routes": { en: "Active Routes", pt: "Rotas Ativas" },
    "rename_prompt": { en: "Rename route:", pt: "Renomear rota:" },
    "rename_route": { en: "Rename Route", pt: "Renomear Rota" },
    "new_name": { en: "New Name", pt: "Novo Nome" },
    "confirm": { en: "Confirm", pt: "Confirmar" },
    "cancel": { en: "Cancel", pt: "Cancelar" },
    
    // Settings
    "flight_settings": { en: "Flight Settings", pt: "Configurações de Voo" },
    "mode_standard": { en: "Standard Mode", pt: "Modo Padrão" },
    "mode_mapping": { en: "Mapping Mode", pt: "Modo Mapeamento" },
    "select_drone": { en: "Select Drone", pt: "Selecionar Drone" },
    "overlap_v": { en: "Forward Overlap (%)", pt: "Sobreposição Frontal (%)" },
    "overlap_h": { en: "Side Overlap (%)", pt: "Sobreposição Lateral (%)" },
    "calc_interval": { en: "Calc. Interval (s)", pt: "Intervalo Calc. (s)" },

    "altitude": { en: "Altitude (m)", pt: "Altitude (m)" },
    "speed": { en: "Speed", pt: "Velocidade" },
    "altitude_mode": { en: "Altitude Mode", pt: "Modo de Altitude" },
    "alt_mode_rel": { en: "Relative to Takeoff (Default)", pt: "Relativo à Decolagem (Padrão)" },
    "alt_mode_abs": { en: "Absolute (MSL/WGS84)", pt: "Absoluto (MSL/WGS84)" },
    "heading_mode": { en: "Heading Mode", pt: "Modo de Direção (Heading)" },
    "head_auto_path": { en: "Auto (Follow Path)", pt: "Auto (Seguir Caminho)" },
    "head_auto_bear": { en: "Auto (Calculate Bearing)", pt: "Auto (Calcular Bearing)" },
    "head_manual": { en: "Manual (Fixed)", pt: "Manual (Fixo)" },
    "manual_heading": { en: "Manual Heading (°)", pt: "Heading Manual (°)" },
    "gimbal_pitch": { en: "Gimbal Pitch (°)", pt: "Pitch do Gimbal (°)" },
    "curve_size": { en: "Curve Size (m)", pt: "Tamanho da Curva (m)" },
    "wp_action": { en: "WP Action", pt: "Ação do WP" },
    "finish_action": { en: "Finish Action", pt: "Ação de Finalização" },
    "apply_settings": { en: "Apply Settings (Unlocked Only)", pt: "Aplicar Configurações (Desbloqueados)" },
    
    // Actions Options
    "act_none": { en: "None", pt: "Nenhuma" },
    "act_stay": { en: "Stay (Hover)", pt: "Pairar (Stay)" },
    "act_photo": { en: "Take Photo", pt: "Tirar Foto" },
    "act_start_rec": { en: "Start Rec", pt: "Iniciar Gravação" },
    "act_stop_rec": { en: "Stop Rec", pt: "Parar Gravação" },
    "act_rotate": { en: "Rotate Aircraft", pt: "Girar Aeronave" },
    
    // Finish Options
    "fin_rth": { en: "RTH", pt: "RTH (Voltar)" },
    "fin_land": { en: "Land", pt: "Pousar" },
    "fin_first": { en: "Back to 1st", pt: "Voltar ao 1º" },
    "fin_reverse": { en: "Reverse", pt: "Reverso" },
    
    // Export
    "export": { en: "Export", pt: "Exportar" },
    "dji_fly_note": { en: "DJI Fly Note: Use the Orange button for Mini 4 Pro / Air 3.", pt: "Nota DJI Fly: Use o botão Laranja para Mini 4 Pro / Air 3." },
    
    // Route Manager
    "rm_title": { en: "Route Manager", pt: "Gerenciador de Rotas" },
    "rm_no_routes": { en: "No Routes Active", pt: "Nenhuma Rota Ativa" },
    "rm_subtitle": { en: "Import or Draw a route to manage waypoints.", pt: "Importe ou desenhe uma rota para gerenciar." },
    "col_order": { en: "Order", pt: "Ordem" },
    "col_wp": { en: "WP ID", pt: "ID WP" },
    "col_latlon": { en: "Lat/Lon", pt: "Lat/Lon" },
    "col_alt": { en: "Alt", pt: "Alt" },
    "col_speed": { en: "Speed", pt: "Vel" },
    "col_gimbal": { en: "Gimbal", pt: "Gimbal" },
    "col_action": { en: "Action", pt: "Ação" },
    "col_tools": { en: "Tools", pt: "Ferr." },
    
    // Modal
    "edit_wp": { en: "Edit Waypoint", pt: "Editar Waypoint" },
    "basic": { en: "Basic", pt: "Básico" },
    "orientation": { en: "Orientation", pt: "Orientação" },
    "advanced": { en: "Advanced (Litchi)", pt: "Avançado (Litchi)" },
    "close": { en: "Close", pt: "Fechar" },

    // Calculator & Photogrammetry
    "calc_title": { en: "Mapping & Photogrammetry Calculator", pt: "Calculadora de Mapeamento e Fotogrametria" },
    "drone_params": { en: "1. Drone & Camera", pt: "1. Drone e Câmera" },
    "calc_mode": { en: "2. Mode & Sweep", pt: "2. Modo e Varredura" },
    "optional_dist": { en: "3. Distances", pt: "3. Distâncias" },
    "photogrammetry_res": { en: "Photogrammetry Results", pt: "Resultados de Fotogrametria" },
    
    "fov_h": { en: "FOV H (°)", pt: "FOV H (°)" },
    "fov_v": { en: "FOV V (°)", pt: "FOV V (°)" },
    "load_preset": { en: "LOAD PRESET:", pt: "CARREGAR PRESET:" },
    "preset_loaded": { en: "Preset Loaded:", pt: "Preset Carregado:" },
    "by_gimbal": { en: "By Gimbal Angle", pt: "Por Ângulo do Gimbal" },
    "by_base": { en: "By Max Base (B)", pt: "Por Base Maior (B)" },
    "gimbal_angle": { en: "Gimbal Angle (°)", pt: "Ângulo Gimbal (°)" },
    "max_base": { en: "Max Base B (m)", pt: "Base Maior B (m)" },
    "frontal_dist": { en: "Frontal Dist (m)", pt: "Dist. Frontal (m)" },
    "total_flight_dist": { en: "Total Flight Dist (m)", pt: "Dist. Total de Voo (m)" },
    "calc_results": { en: "CALCULATE RESULTS", pt: "CALCULAR RESULTADOS" },
    "visual_result": { en: "Visual Result", pt: "Resultado Visual" },
    "top_down": { en: "Top Down View (Auto-Scaled)", pt: "Vista Superior (Auto-Escala)" },
    "time_frontal": { en: "Time (Frontal)", pt: "Tempo (Frontal)" },
    "dist_near_far": { en: "Dist (Near/Far)", pt: "Dist (Perto/Longe)" },
    "total_time": { en: "Total Flight Time", pt: "Tempo Total de Voo" },
    "save_image": { en: "Save Image", pt: "Salvar Imagem" },

    // New GSD/Blur Terms
    "shutter_speed": { en: "Shutter Speed", pt: "Velocidade do Obturador" },
    "motion_blur": { en: "Motion Blur", pt: "Desfoque de Movimento" },
    "gsd": { en: "GSD (Resolution)", pt: "GSD (Resolução)" },
    "footprint": { en: "Footprint (WxH)", pt: "Cobertura de Foto (LxA)" },
    "photo_interval_dist": { en: "Shot Interval (Dist)", pt: "Intervalo Disparo (Dist)" },
    "photo_interval_time": { en: "Shot Interval (Time)", pt: "Intervalo Disparo (Tempo)" },
    "lane_spacing": { en: "Lane Spacing", pt: "Espaçamento entre Linhas" },
    "sensor_dim": { en: "Sensor Size", pt: "Tam. do Sensor" },
    "focal_len": { en: "Real Focal Len.", pt: "Dist. Focal Real" },

    // Tabs
    "tab_map": { en: "Map Planner", pt: "Mapa Planejador" },
    "tab_manager": { en: "Route Manager", pt: "Gerenciador Rotas" },
    "tab_calc": { en: "Calculator", pt: "Calculadora" },
    "tab_instr": { en: "Instructions", pt: "Instruções" },
    "screenshot": { en: "Screenshot", pt: "Captura de Tela" },

    // Instructions
    "guide_title": { en: "Quick Guide", pt: "Guia Rápido" },
    "guide_draw": { en: "Draw: Use polygon/line tool.", pt: "Desenhar: Use ferramenta polígono/linha." },
    "guide_takeoff": { en: "Takeoff: Drag Green 'H' per route.", pt: "Decolagem: Arraste o 'H' Verde por rota." },
    "guide_edit": { en: "Edit: Drag arrows.", pt: "Editar: Arraste as setas." },
    "guide_lock": { en: "Lock: Use padlock.", pt: "Travar: Use o cadeado." },
    
    // Instructions Tab Content
    "instr_intro_title": { en: "Welcome to DJI Fly Planner PRO", pt: "Bem-vindo ao DJI Fly Planner PRO" },
    "instr_intro_text": { en: "A comprehensive tool for planning drone missions for Litchi and DJI Fly (Mini 4 Pro, Air 3, Mavic 3).", pt: "Uma ferramenta completa para planejar missões de drone para Litchi e DJI Fly (Mini 4 Pro, Air 3, Mavic 3)." },
    "instr_map_tools": { en: "Map Tools", pt: "Ferramentas de Mapa" },
    "instr_map_poly": { en: "Use the Polygon tool to draw areas. In 'Mapping Mode', this automatically generates a grid.", pt: "Use a ferramenta Polígono para desenhar áreas. No 'Modo Mapeamento', isso gera automaticamente uma grade." },
    "instr_map_line": { en: "Use the Polyline tool to draw standard waypoint routes.", pt: "Use a ferramenta Polilinha para desenhar rotas de waypoints padrão." },
    "instr_map_edit": { en: "Drag any marker to move it. Drag the Green 'H' to set the Takeoff point.", pt: "Arraste qualquer marcador para movê-lo. Arraste o 'H' Verde para definir o ponto de Decolagem." },
    "instr_map_rotate": { en: "In Mapping Mode, use the '🔄' handle to rotate the grid path.", pt: "No Modo Mapeamento, use a alça '🔄' para girar o caminho da grade." },
    "instr_settings": { en: "Flight Settings", pt: "Configurações de Voo" },
    "instr_settings_text": { en: "Settings in the sidebar apply to ALL unlocked routes when you click 'Apply Settings'.", pt: "As configurações na barra lateral se aplicam a TODAS as rotas desbloqueadas quando você clica em 'Aplicar Configurações'." },
    "instr_calc_gsd": { en: "GSD & Photogrammetry", pt: "GSD e Fotogrametria" },
    "instr_calc_text": { en: "Use the Calculator tab to plan camera parameters. Ensure Motion Blur is lower than GSD for sharp images.", pt: "Use a aba Calculadora para planejar parâmetros da câmera. Garanta que o Desfoque de Movimento seja menor que o GSD para imagens nítidas." },
    "instr_export": { en: "Exporting", pt: "Exportando" },
    "instr_export_litchi": { en: "Use Litchi CSV for Litchi Hub/App.", pt: "Use Litchi CSV para Litchi Hub/App." },
    "instr_export_dji": { en: "Use DJI Fly (KMZ) for DJI Mini 4 Pro, Air 3, Mavic 3. Import via 'Waypoints' folder on controller.", pt: "Use DJI Fly (KMZ) para DJI Mini 4 Pro, Air 3, Mavic 3. Importe via pasta 'Waypoints' no controle." },
    
    // New Import Guide
    "dji_import_guide": { en: "Native DJI Fly Import Guide", pt: "Guia de Importação Nativa DJI Fly" },
    "dji_compat_drones": { en: "Compatible Drones: Mini 4 Pro, Air 3, Mavic 3 (Pro/Classic/Enterprise)", pt: "Drones Compatíveis: Mini 4 Pro, Air 3, Mavic 3 (Pro/Classic/Enterprise)" },
    "dji_step_1": { en: "Export your route using the Orange 'DJI Fly (KMZ)' button.", pt: "Exporte sua rota usando o botão Laranja 'DJI Fly (KMZ)'." },
    "dji_step_2": { en: "Connect your DJI RC 2 / RC Pro to your computer via USB-C.", pt: "Conecte seu DJI RC 2 / RC Pro ao computador via USB-C." },
    "dji_step_3": { en: "Navigate to this specific folder path:", pt: "Navegue para esta pasta específica:" },
    "dji_step_4": { en: "Copy the .kmz file into the 'waypoint' folder.", pt: "Copie o arquivo .kmz para a pasta 'waypoint'." },
    "dji_step_5": { en: "Open DJI Fly, go to Waypoints, and tap the Folder icon to load.", pt: "Abra o DJI Fly, vá para Waypoints e toque no ícone de Pasta para carregar." }
  };

  return dict[key]?.[lang] || key;
};

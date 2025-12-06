

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

    // Calculator
    "calc_title": { en: "Sweep Area Calculator", pt: "Calculadora de Área de Varredura" },
    "drone_params": { en: "1. Drone Parameters", pt: "1. Parâmetros do Drone" },
    "calc_mode": { en: "2. Calculation Mode", pt: "2. Modo de Cálculo" },
    "optional_dist": { en: "3. Optional Distances", pt: "3. Distâncias Opcionais" },
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

    // Tabs
    "tab_map": { en: "Map Planner", pt: "Mapa Planejador" },
    "tab_manager": { en: "Route Manager", pt: "Gerenciador Rotas" },
    "tab_calc": { en: "Calculator", pt: "Calculadora" },
    "screenshot": { en: "Screenshot", pt: "Captura de Tela" },

    // Instructions
    "guide_title": { en: "Quick Guide", pt: "Guia Rápido" },
    "guide_draw": { en: "Draw: Use polygon/line tool.", pt: "Desenhar: Use ferramenta polígono/linha." },
    "guide_takeoff": { en: "Takeoff: Drag Green 'H' per route.", pt: "Decolagem: Arraste o 'H' Verde por rota." },
    "guide_edit": { en: "Edit: Drag arrows.", pt: "Editar: Arraste as setas." },
    "guide_lock": { en: "Lock: Use padlock.", pt: "Travar: Use o cadeado." }
  };

  return dict[key]?.[lang] || key;
};

# src/ui.py

import html
import math

DARK_STYLE = """
<style>
    .stApp { background-color: #121212; color: #f1f1f1; }
    .stTextInput>div>div>input { background-color: #1e1e1e; color: #f1f1f1; border: 1px solid #3b4cca; border-radius: 8px; }
    .stButton>button { background-color: #ffcb05; color: #000; border: none; border-radius: 10px; font-weight: bold; transition: 0.2s; margin-top: 5px; }
    .stButton>button:hover { background-color: #f5b700; color: #1e1e1e; transform: scale(1.02); }
    .green-button > button { background-color: #4CAF50; color: #fff; border-radius: 10px; border: none; font-weight: bold; transition: 0.2s; margin-top: 5px; height: 38px; }
    .green-button > button:hover { background-color: #45a049; transform: scale(1.02); }
    h1,h2,h3,h4 { color: #ffcb05; }
    footer { text-align: center; font-size: 0.9em; margin-top: 50px; color: #888; }
    
    /* Pokemon Type Badges - DS Game Style */
    .type-badge {
        display: inline-block;
        padding: 4px 12px;
        margin: 2px 3px;
        border-radius: 2px;
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        color: #f0f0f0;
        font-family: 'Courier New', 'Courier', 'Lucida Console', monospace;
        letter-spacing: 1.4px;
        border: 2px solid #1a1a1a;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: none;
        -moz-osx-font-smoothing: unset;
        font-smooth: never;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 0 rgba(0,0,0,0.6);
        text-shadow: 0 1px 0 rgba(0,0,0,0.7);
    }
    .type-normal { background: linear-gradient(#d4d4b6, #a8a878); }
    .type-fire { background: linear-gradient(#ffa264, #f08030); }
    .type-water { background: linear-gradient(#87a9f2, #5b80e0); }
    .type-electric { background: linear-gradient(#f6dd6a, #eac126); }
    .type-grass { background: linear-gradient(#8bcf6a, #63b041); }
    .type-ice { background: linear-gradient(#a7d8d8, #7bb7b5); }
    .type-fighting { background: linear-gradient(#e35a52, #c03028); }
    .type-poison { background: linear-gradient(#c876c8, #a040a0); }
    .type-ground { background: linear-gradient(#e4c782, #cfae52); }
    .type-flying { background: linear-gradient(#cbb9ff, #a890f0); }
    .type-psychic { background: linear-gradient(#ff86ad, #f85888); }
    .type-bug { background: linear-gradient(#c9dd55, #a8b820); }
    .type-rock { background: linear-gradient(#d8c175, #b8a038); }
    .type-ghost { background: linear-gradient(#957dc0, #705898); }
    .type-dragon { background: linear-gradient(#9b74ff, #7038f8); }
    .type-dark { background: linear-gradient(#8f715f, #705848); }
    .type-steel { background: linear-gradient(#b2b5c8, #878aa6); }
    .type-fairy { background: linear-gradient(#f0aac3, #e387a2); }
    
    /* Stats Bar Chart Styles */
    .stats-container {
        background-color: #1e1e1e;
        padding: 20px;
        border-radius: 10px;
        margin-top: 10px;
        width: 100%;
    }
    .stat-row {
        display: flex;
        align-items: center;
        margin: 10px 0;
        padding: 6px 0;
        border-bottom: 1px solid #2a2a2a;
        min-height: 30px;
    }
    .stat-row:last-child {
        border-bottom: 2px solid #ffcb05;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 2px solid #ffcb05;
    }
    .stat-label {
        min-width: 90px;
        width: 90px;
        text-align: right;
        padding-right: 15px;
        font-size: 14px;
        color: #999;
        font-weight: 500;
        flex-shrink: 0;
    }
    .stat-value {
        min-width: 50px;
        width: 50px;
        text-align: right;
        padding-right: 15px;
        font-size: 16px;
        font-weight: bold;
        color: #f1f1f1;
        flex-shrink: 0;
    }
    .stat-bar-container {
        flex: 1;
        height: 22px;
        background-color: #2a2a2a;
        border-radius: 11px;
        overflow: hidden;
        position: relative;
        min-width: 100px;
    }
    .stat-bar {
        height: 100%;
        border-radius: 11px;
        transition: width 0.5s ease-out;
    }
    .stat-total .stat-label {
        color: #ffcb05;
        font-weight: bold;
        font-size: 15px;
    }
    .stat-total .stat-value {
        color: #ffcb05;
        font-size: 18px;
    }
    /* Color coding based on stat value */
    .stat-bar-low { background: linear-gradient(90deg, #ff4444 0%, #ff6b6b 100%); }
    .stat-bar-below-avg { background: linear-gradient(90deg, #ff8c00 0%, #ffa500 100%); }
    .stat-bar-average { background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%); }
    .stat-bar-good { background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%); }
    .stat-bar-excellent { background: linear-gradient(90deg, #00bcd4 0%, #26c6da 100%); }
    .stat-bar-legendary { background: linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%); }

    /* Evolution chain */
    .evo-chain-box {
        background: linear-gradient(145deg, #1a1a1e 0%, #16161a 100%);
        border: 1px solid #3b4cca;
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        box-shadow: 0 2px 8px rgba(59, 76, 202, 0.15);
        box-sizing: border-box;
        width: 100%;
    }
    .evo-chain-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 4px 8px;
    }
    .evo-node {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        padding: 6px 4px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        min-width: 72px;
    }
    .evo-node img { border-radius: 8px; }
    .evo-node span { font-size: 12px; color: #ccc; margin-top: 4px; font-weight: 500; }
    .evo-arrow {
        color: #ffcb05;
        font-size: 14px;
        margin: 0 2px;
    }
    .evo-method-pill {
        display: inline-block;
        background: rgba(255, 203, 5, 0.18);
        color: #ffcb05;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        margin: 0 2px;
        border: 1px solid rgba(255, 203, 5, 0.35);
    }
    [data-testid="stExpander"] div[style*="overflow"] {
        background: #121212 !important;
        border-radius: 0 0 12px 12px;
    }

    /* Abilities section */
    .abilities-box {
        background: linear-gradient(145deg, #1a1a1e 0%, #16161a 100%);
        border: 1px solid #3b4cca;
        border-radius: 12px;
        padding: 14px 16px;
        margin: 10px 0;
        box-shadow: 0 2px 8px rgba(59, 76, 202, 0.12);
        box-sizing: border-box;
        width: 100%;
    }
    .abilities-box .ability-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #ffcb05;
        margin-bottom: 8px;
    }
    .abilities-box .ability-label.hidden {
        color: #b8a078;
        margin-top: 12px;
    }
    .ability-pill {
        display: inline-block;
        background: rgba(255, 255, 255, 0.08);
        color: #e8e8e8;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        margin: 4px 6px 4px 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .ability-pill.hidden {
        background: rgba(184, 160, 120, 0.2);
        color: #d4c4a0;
        border-color: rgba(184, 160, 120, 0.4);
    }
</style>
"""

# Função para criar badges de tipos no estilo Pokemon
def get_type_badges(types_list):
    """Cria badges HTML com as cores oficiais dos tipos Pokemon"""
    badges_html = ""
    for type_info in types_list:
        type_name = type_info["type"]["name"].capitalize()
        badges_html += f'<span class="type-badge type-{type_info["type"]["name"]}">{type_name}</span> '
    return badges_html

def generate_single_weakness_badge(type_name, multiplier_string):
    """Gera um unico badge HTML para uma fraqueza com um multiplicador."""
    return f'<span class="type-badge type-{type_name}">{type_name.capitalize()} ({multiplier_string})</span> '


def format_pokemon_display_name(name):
    """Formata nome de Pokemon para exibicao sem hifen."""
    return str(name or "").replace("-", " ").title()

def create_abilities_html(habilidades_normais, habilidades_ocultas):
    """Monta o HTML da seção de habilidades (card + pills)."""
    parts = ['<div class="abilities-box">']
    if habilidades_normais:
        parts.append('<div class="ability-label">Habilidades</div>')
        for nome in habilidades_normais:
            parts.append(f'<span class="ability-pill">{html.escape(nome)}</span>')
    if habilidades_ocultas:
        parts.append('<div class="ability-label hidden">Habilidades ocultas</div>')
        for nome in habilidades_ocultas:
            parts.append(f'<span class="ability-pill hidden">{html.escape(nome)}</span>')
    parts.append('</div>')
    return "".join(parts)


def create_evolution_chain_html(path, sprites_map):
    """Monta o HTML da cadeia de evolução (nós + setas + pills de método)."""
    parts = ['<div class="evo-chain-box"><div class="evo-chain-inner">']
    for i, (name, method) in enumerate(path):
        sprite_url = sprites_map.get(name)
        label = html.escape(format_pokemon_display_name(name))
        parts.append('<div class="evo-node">')
        if sprite_url:
            parts.append(f'<img src="{html.escape(sprite_url)}" alt="{label}" width="64" height="64">')
        parts.append(f'<span>{label}</span></div>')
        if i < len(path) - 1:
            next_method = html.escape(path[i + 1][1] or "—")
            parts.append('<span class="evo-arrow">→</span>')
            parts.append(f'<span class="evo-method-pill">{next_method}</span>')
            parts.append('<span class="evo-arrow">→</span>')
    parts.append("</div></div>")
    return "".join(parts)

# Função para criar gráfico de radar (hexágono) inspirado nos jogos
def create_stats_radar(stats_data, max_stat=180):
    """Cria um gráfico radar/hexágono (SVG) para os stats do Pokémon."""

    stat_order = ["HP", "Attack", "Defense", "Speed", "Sp. Atk", "Sp. Def"]
    label_map = {
        "HP": "HP",
        "Attack": "Attack",
        "Defense": "Defense",
        "Speed": "Speed",
        "Sp. Atk": "SpA",
        "Sp. Def": "SpD",
        
    }

    values = [int(stats_data.get(s, 0) or 0) for s in stat_order]
    cap = float(max_stat or 180)
    if cap <= 0:
        cap = 180.0

    # Geometry
    size = 480
    cx = cy = size / 2
    R = 170.0
    angles = [(-math.pi / 2) + i * (2 * math.pi / 6) for i in range(6)]

    def pt(r, a):
        return (cx + r * math.cos(a), cy + r * math.sin(a))

    def points_str(radii):
        return " ".join(f"{x:.1f},{y:.1f}" for (x, y) in (pt(r, a) for r, a in zip(radii, angles)))

    # Grid rings (subtle)
    grid_levels = [0.25, 0.5, 0.75, 1.0]
    grid_polys = []
    for lvl in grid_levels:
        rr = [R * lvl] * 6
        grid_polys.append(points_str(rr))

    # Axis lines
    axis_lines = []
    for a in angles:
        x2, y2 = pt(R, a)
        axis_lines.append((x2, y2))

    # Stat polygon
    radii = [min(v / cap, 1.0) * R for v in values]
    stat_poly = points_str(radii)

    # Labels
    labels = []
    label_r = R + 30
    for s, a in zip(stat_order, angles):
        x, y = pt(label_r, a)
        ca = math.cos(a)
        if abs(ca) < 0.2:
            anchor = "middle"
        elif ca > 0:
            anchor = "start"
        else:
            anchor = "end"
        labels.append((x, y, anchor, label_map[s]))

    svg = f"""
<div style="background:#121212; padding: 8px 0; display:flex; justify-content:center;">
  <div style="width:100%; max-width:520px;">
    <svg viewBox="0 0 {size} {size}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="{size}" height="{size}" rx="14" fill="#121212" />

      <!-- grid rings -->
      {''.join(f'<polygon points="{p}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>' for p in grid_polys[:-1])}
      <polygon points="{grid_polys[-1]}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.2"/>

      <!-- axis lines -->
      {''.join(f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>' for (x2,y2) in axis_lines)}

      <!-- stats area -->
      <polygon points="{stat_poly}" fill="rgba(255,203,5,0.28)" stroke="#ffcb05" stroke-width="2"/>
      {''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" fill="#ffcb05"/>' for (x,y) in (pt(r, a) for r,a in zip(radii, angles)))}

      <!-- labels -->
      {''.join(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="12" font-weight="700" fill="#ffcb05" font-family="Source Sans Pro, sans-serif">{html.escape(lbl)}</text>' for (x,y,anchor,lbl) in labels)}
    </svg>
  </div>
</div>
"""
    return svg

# Função para criar gráfico de barras horizontal de stats
def create_stats_bars(stats_data):
    """Cria barras horizontais HTML para os stats do Pokemon"""
    
    # Ordem dos stats
    stat_order = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed']
    
    # Calcular total
    total = sum(stats_data.values())
    
    # Função para determinar a classe de cor baseada no valor
    def get_stat_color(value):
        if value < 50:
            return 'background: linear-gradient(90deg, #ff4444 0%, #ff6b6b 100%);'
        elif value < 70:
            return 'background: linear-gradient(90deg, #ff8c00 0%, #ffa500 100%);'
        elif value < 90:
            return 'background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);'
        elif value < 120:
            return 'background: linear-gradient(90deg, #4caf50 0%, #66bb6a 100%);'
        elif value < 150:
            return 'background: linear-gradient(90deg, #00bcd4 0%, #26c6da 100%);'
        else:
            return 'background: linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%);'
    
    # Container com fundo igual ao Streamlit (#121212)
    html = '''
    <div style="background-color: #121212; padding: 20px; border-radius: 10px; margin-top: 10px; width: 100%; font-family: 'Source Sans Pro', sans-serif;">
    '''
    
    # Criar barra para cada stat
    for stat in stat_order:
        value = stats_data.get(stat, 0)
        # Calcular porcentagem (máximo de 180 para visualização)
        percentage = min((value / 180) * 100, 100)
        color_style = get_stat_color(value)
        
        html += f'''
        <div style="display: flex; align-items: center; margin: 10px 0; padding: 6px 0; border-bottom: 1px solid #2a2a2a; min-height: 30px;">
            <div style="min-width: 90px; width: 90px; text-align: right; padding-right: 15px; font-size: 14px; color: #999; font-weight: 400;">{stat}</div>
            <div style="min-width: 50px; width: 50px; text-align: right; padding-right: 15px; font-size: 16px; font-weight: 600; color: #f1f1f1;">{value}</div>
            <div style="flex: 1; min-width: 100px;">
                <div style="height: 22px; border-radius: 11px; transition: width 0.5s ease-out; width: {percentage}%; {color_style}"></div>
            </div>
        </div>
        '''
    
    # Adicionar linha do total com barra
    total_percentage = min((total / 720) * 100, 100)
    html += f'''
    <div style="display: flex; align-items: center; margin: 10px 0; padding: 6px 0; border-bottom: 1px solid #2a2a2a; min-height: 30px;">
        <div style="min-width: 90px; width: 90px; text-align: right; padding-right: 15px; font-size: 14px; color: #ffcb05; font-weight: 700;">Total</div>
        <div style="min-width: 50px; width: 50px; text-align: right; padding-right: 15px; font-size: 16px; font-weight: 700; color: #ffcb05;">{total}</div>
        <div style="flex: 1; min-width: 100px;">
            <div style="height: 22px; border-radius: 11px; transition: width 0.5s ease-out; width: {total_percentage}%; background: linear-gradient(90deg, #ffcb05 0%, #ffe066 100%);"></div>
        </div>
    </div>
    '''
    
    html += '</div>'
    return html


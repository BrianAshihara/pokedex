# src/ui.py

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
    
    /* Pokemon Type Badges - DS Game Style with Pixel Font */
    .type-badge {
        display: inline-block;
        padding: 4px 12px;
        margin: 2px 3px;
        border-radius: 3px;
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        color: white;
        font-family: 'Courier New', 'Courier', 'Lucida Console', monospace;
        letter-spacing: 1.5px;
        border: 2px solid rgba(0,0,0,0.2);
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: none;
        -moz-osx-font-smoothing: unset;
        font-smooth: never;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
    }
    .type-normal { background-color: #A8A878; }
    .type-fire { background-color: #F08030; }
    .type-water { background-color: #6890F0; }
    .type-electric { background-color: #F8D030; color: #212121; }
    .type-grass { background-color: #78C850; }
    .type-ice { background-color: #98D8D8; color: #212121; }
    .type-fighting { background-color: #C03028; }
    .type-poison { background-color: #A040A0; }
    .type-ground { background-color: #E0C068; color: #212121; }
    .type-flying { background-color: #A890F0; }
    .type-psychic { background-color: #F85888; }
    .type-bug { background-color: #A8B820; }
    .type-rock { background-color: #B8A038; }
    .type-ghost { background-color: #705898; }
    .type-dragon { background-color: #7038F8; }
    .type-dark { background-color: #705848; }
    .type-steel { background-color: #B8B8D0; color: #212121; }
    .type-fairy { background-color: #EE99AC; color: #212121; }
    
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
    """Gera um único badge HTML para uma fraqueza com um multiplicador."""
    return f'<span class="type-badge type-{type_name}">{type_name.capitalize()} ({multiplier_string})</span> '

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
    
    # Adicionar linha do total (sem barra)
    html += f'''
    <div style="display: flex; align-items: center; margin: 10px 0; padding: 12px 0 6px 0; border-top: 1px solid #2a2a2a; min-height: 30px;">
        <div style="min-width: 90px; width: 90px; text-align: right; padding-right: 15px; font-size: 14px; color: #999; font-weight: 700;">Total</div>
        <div style="min-width: 50px; width: 50px; text-align: right; padding-right: 15px; font-size: 16px; font-weight: 700; color: #f1f1f1;">{total}</div>
    </div>
    '''
    
    html += '</div>'
    return html

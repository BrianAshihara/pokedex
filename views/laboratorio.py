# views/laboratorio.py

import requests
import streamlit as st

from src import pokeapi, stats, ui

DEFAULT_CALC = "garchomp"
DEFAULT_COMPARE = ["charizard", "blastoise", None]
COMPARE_MODES = {"base": "Atributos base", "50": "Nível 50", "100": "Nível 100"}
EV_PRESETS = {
    "Atacante físico (252 Atk / 252 Spe / 4 HP)": {"Attack": 252, "Speed": 252, "HP": 4},
    "Atacante especial (252 SpA / 252 Spe / 4 HP)": {"Sp. Atk": 252, "Speed": 252, "HP": 4},
    "Tanque físico (252 HP / 252 Def / 4 SpD)": {"HP": 252, "Defense": 252, "Sp. Def": 4},
    "Tanque especial (252 HP / 252 SpD / 4 Def)": {"HP": 252, "Sp. Def": 252, "Defense": 4},
}

CALC_KEYS = ["calc_pokemon", "calc_level", "calc_nature"] + [f"iv_{s}" for s in stats.STATS] + [f"ev_{s}" for s in stats.STATS]
COMPARE_KEYS = ["cmp_mode", "cmp_0", "cmp_1", "cmp_2"]


def resolve_name(ref):
    try:
        data = pokeapi.fetch_pokemon_data(ref)
    except requests.RequestException:
        return None
    return data["name"] if data else None


def load(name):
    try:
        dados = pokeapi.fetch_pokemon_data(name)
        species = pokeapi.fetch_species_data(dados["species"]["name"]) if dados else None
    except requests.RequestException:
        return None, None
    return dados, (species or {}).get("id")


def restore_state():
    # O Streamlit descarta o estado dos widgets ao trocar de página; guardamos uma cópia para restaurar.
    for key in CALC_KEYS + COMPARE_KEYS:
        if key not in st.session_state and f"_saved_{key}" in st.session_state:
            st.session_state[key] = st.session_state[f"_saved_{key}"]


def save_state():
    for key in CALC_KEYS + COMPARE_KEYS:
        if key in st.session_state:
            st.session_state[f"_saved_{key}"] = st.session_state[key]


def set_ivs(value):
    for s in stats.STATS:
        st.session_state[f"iv_{s}"] = value


def clamp_iv(stat):
    key = f"iv_{stat}"
    st.session_state[key] = max(0, min(stats.MAX_IV, int(st.session_state.get(key) or 0)))


def clamp_ev(stat):
    key = f"ev_{stat}"
    others = sum(st.session_state[f"ev_{s}"] for s in stats.STATS if s != stat)
    available = (stats.MAX_TOTAL_EV - others) // 2 * 2
    if st.session_state[key] > available:
        st.session_state[key] = available
        st.toast(f"Limite de {stats.MAX_TOTAL_EV} EVs atingido.", icon=":material/block:")


def reset_evs():
    for s in stats.STATS:
        st.session_state[f"ev_{s}"] = 0


def apply_ev_preset():
    preset = EV_PRESETS.get(st.session_state.get("ev_preset"))
    if preset:
        for s in stats.STATS:
            st.session_state[f"ev_{s}"] = preset.get(s, 0)
    st.session_state.ev_preset = None


def sync_calc_query():
    st.query_params["p"] = st.session_state.calc_pokemon
    st.session_state._linked = st.session_state.calc_pokemon


names = pokeapi.fetch_all_pokemon_names()
display = ui.format_pokemon_display_name

restore_state()
linked = st.query_params.get("p")
if linked:
    linked_name = resolve_name(linked)
    if linked_name and linked_name != st.session_state.get("_linked"):
        st.session_state.calc_pokemon = linked_name
        st.session_state.cmp_0 = linked_name
        st.session_state._linked = linked_name

st.session_state.setdefault("calc_pokemon", DEFAULT_CALC)
st.session_state.setdefault("calc_level", 50)
st.session_state.setdefault("calc_nature", "Hardy")
st.session_state.setdefault("cmp_mode", "base")
st.session_state.setdefault("ev_preset", None)
for i, default in enumerate(DEFAULT_COMPARE):
    st.session_state.setdefault(f"cmp_{i}", default)
for s in stats.STATS:
    st.session_state.setdefault(f"iv_{s}", stats.MAX_IV)
    st.session_state.setdefault(f"ev_{s}", 0)

col_brand, col_title = st.columns([1.1, 3.5], vertical_alignment="center")
with col_brand:
    ui.render(ui.brand_html())
with col_title:
    ui.render(ui.page_header_html("Laboratório", "Calcule os atributos reais do seu Pokémon e compare Pokémon lado a lado."))

tab_calc, tab_compare = st.tabs(["Calculadora de atributos", "Comparador"])

with tab_calc:
    c_mon, c_level, c_nature = st.columns([2.2, 0.8, 2])
    with c_mon:
        st.selectbox("Pokémon", names, key="calc_pokemon", format_func=display, on_change=sync_calc_query)
    with c_level:
        st.number_input("Nível", min_value=1, max_value=100, step=1, key="calc_level")
    with c_nature:
        st.selectbox("Natureza", list(stats.NATURES), key="calc_nature", format_func=stats.nature_label)

    dados, species_id = load(st.session_state.calc_pokemon)
    if not dados:
        st.error("Não foi possível carregar este Pokémon agora. Tente novamente em instantes.")
    else:
        base = stats.base_stats(dados)
        nature = st.session_state.calc_nature
        nature_up, nature_down = stats.NATURES[nature]

        col_inputs, col_result = st.columns([1.25, 1], gap="large")
        with col_inputs:
            with st.container(key="calc_inputs"):
                ui.render('<div class="card-title">IVs e EVs</div>')
                b1, b2, b3 = st.columns(3)
                b1.button("IVs 31", on_click=set_ivs, args=(stats.MAX_IV,), width="stretch")
                b2.button("IVs 0", on_click=set_ivs, args=(0,), width="stretch")
                b3.button("Zerar EVs", on_click=reset_evs, width="stretch")
                st.selectbox(
                    "Distribuição rápida de EVs",
                    list(EV_PRESETS),
                    key="ev_preset",
                    placeholder="Distribuição rápida de EVs",
                    on_change=apply_ev_preset,
                    label_visibility="collapsed",
                )

                widths = [1.3, 0.6, 1, 2.6]
                h1, h2, h3, h4 = st.columns(widths)
                for col, label in zip((h1, h2, h3, h4), ("Atributo", "Base", "IV (0 a 31)", "EV (0 a 252)")):
                    with col:
                        ui.render(f'<div class="calc-head">{label}</div>')
                for s in stats.STATS:
                    c1, c2, c3, c4 = st.columns(widths, vertical_alignment="center")
                    with c1:
                        ui.render(f'<div class="calc-stat">{s}{ui.nature_tag(s, nature_up, nature_down)}</div>')
                    with c2:
                        ui.render(f'<div class="calc-base">{base.get(s, 0)}</div>')
                    with c3:
                        st.number_input(f"IV {s}", step=1, key=f"iv_{s}", on_change=clamp_iv, args=(s,), label_visibility="collapsed")
                    with c4:
                        st.slider(
                            f"EV {s}",
                            min_value=0,
                            max_value=stats.MAX_EV,
                            step=2,
                            key=f"ev_{s}",
                            on_change=clamp_ev,
                            args=(s,),
                            label_visibility="collapsed",
                        )

                ivs = {s: st.session_state[f"iv_{s}"] for s in stats.STATS}
                evs = {s: st.session_state[f"ev_{s}"] for s in stats.STATS}
                ui.render(ui.ev_meter_html(sum(evs.values()), stats.MAX_TOTAL_EV))

        level = st.session_state.calc_level
        final = stats.calc_all(base, ivs, evs, level, nature)
        with col_result:
            ui.render(
                '<div class="card">'
                f'<div class="card-title">Atributos no nível {level}</div>'
                f'{ui.mini_pokemon_html(dados, species_id, subtitle=stats.nature_label(nature))}'
                f"{ui.create_final_stats_radar(final, nature_up, nature_down)}"
                f"{ui.final_stats_table_html(stats.STATS, base, ivs, evs, final, nature_up, nature_down)}"
                "</div>"
            )

with tab_compare:
    st.segmented_control(
        "Comparar por",
        list(COMPARE_MODES),
        key="cmp_mode",
        format_func=COMPARE_MODES.get,
    )
    mode = st.session_state.cmp_mode or "base"

    pick_cols = st.columns(3)
    for i, col in enumerate(pick_cols):
        with col:
            options = names if i < 2 else [None] + names
            st.selectbox(
                f"Pokémon {i + 1}",
                options,
                key=f"cmp_{i}",
                format_func=lambda n: "Nenhum" if n is None else display(n),
                placeholder="Nenhum",
            )

    selected = [st.session_state[f"cmp_{i}"] for i in range(3) if st.session_state[f"cmp_{i}"]]
    loaded = [(name, *load(name)) for name in selected]
    loaded = [(name, dados, sid) for name, dados, sid in loaded if dados]

    if len(loaded) < 2:
        st.info("Escolha pelo menos dois Pokémon para comparar.")
    else:
        values_list = []
        for _, dados, _ in loaded:
            base = stats.base_stats(dados)
            values_list.append(base if mode == "base" else stats.calc_all(base, level=int(mode)))
        cap = 180 if mode == "base" else max(max(v.values()) for v in values_list) * 1.05
        names_shown = [name for name, _, _ in loaded]

        with st.container(key="cmp_panel"):
            card_cols = st.columns(len(loaded))
            for i, (col, (_, dados, sid)) in enumerate(zip(card_cols, loaded)):
                with col:
                    ui.render(ui.mini_pokemon_html(dados, sid, color=ui.COMPARE_COLORS[i]))

            col_radar, col_table = st.columns([1, 1.1], gap="large", vertical_alignment="center")
            with col_radar:
                ui.render(ui.create_compare_radar(values_list, cap) + ui.compare_legend_html(names_shown))
            with col_table:
                ui.render(ui.compare_table_html(stats.STATS, names_shown, values_list))
                if mode != "base":
                    st.caption(f"Valores no nível {mode} com IVs 31, sem EVs e natureza neutra.")

save_state()
ui.render(ui.footer_html())

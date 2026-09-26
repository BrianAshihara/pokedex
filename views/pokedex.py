# views/pokedex.py

import random

import requests
import streamlit as st

from src import pokeapi, stats, ui

QUICK_PICKS = [(25, "pikachu"), (6, "charizard"), (94, "gengar"), (133, "eevee"), (150, "mewtwo"), (448, "lucario"), (658, "greninja")]
IMAGE_MODES = {"art": "Arte", "pixel": "Pixel", "anim": "Animado"}

st.session_state.setdefault("img_mode", "art")
st.session_state.setdefault("shiny", False)


def go_to(ref):
    st.query_params["p"] = str(ref).strip().lower()


def on_search():
    value = st.session_state.get("search", "").strip()
    if value:
        go_to(value)
    st.session_state.search = ""


def pick_image(sprites, mode, shiny):
    other = sprites.get("other") or {}
    artwork = other.get("official-artwork") or {}
    candidates = {
        "art": [artwork, other.get("home") or {}],
        "pixel": [sprites],
        "anim": [other.get("showdown") or {}, sprites],
    }[mode] + [artwork, sprites]
    key = "front_shiny" if shiny else "front_default"
    for source in candidates:
        if source.get(key):
            return source[key], mode if source is not artwork else "art"
    return None, mode


def species_label(species_id):
    try:
        data = pokeapi.fetch_species_data(species_id) or {}
    except requests.RequestException:
        data = {}
    name = ui.format_pokemon_display_name(data.get("name", ""))
    return f"{ui.format_dex_number(species_id)} {name}".strip()


MOVE_METHODS = [("level-up", "Nível"), ("egg", "Ovo"), ("machine", "MT"), ("tutor", "Tutor")]


@st.fragment
def render_moves(learnset):
    with st.container(key="moves_panel"):
        groups = pokeapi.sorted_version_groups(learnset)
        col_title, col_version = st.columns([2, 1], vertical_alignment="center")
        with col_title:
            ui.render('<div class="card-title">Golpes</div>')
        if not groups:
            st.caption("Nenhum golpe registrado para este Pokémon.")
            return
        if st.session_state.get("move_vg") not in groups:
            st.session_state.move_vg = pokeapi.default_version_group(learnset)
        with col_version:
            st.selectbox(
                "Jogo",
                groups[::-1],
                key="move_vg",
                format_func=pokeapi.version_group_label,
                label_visibility="collapsed",
            )

        try:
            with st.spinner("Carregando golpes..."):
                grouped = pokeapi.get_learnset(learnset, st.session_state.move_vg)
        except requests.RequestException:
            st.error("Não foi possível carregar os golpes agora. Tente novamente em instantes.")
            return

        known = {method for method, _ in MOVE_METHODS}
        sections = [(method, label, grouped[method]) for method, label in MOVE_METHODS if grouped.get(method)]
        others = [row for method, rows in grouped.items() if method not in known for row in rows]
        if others:
            sections.append(("other", "Outros", sorted(others, key=lambda r: r["name"])))

        tabs = st.tabs([f"{label} ({len(rows)})" for _, label, rows in sections])
        for tab, (method, _, rows) in zip(tabs, sections):
            with tab:
                ui.render(ui.moves_table_html(rows, method))


species_count = pokeapi.get_species_count()

col_brand, col_search, col_random = st.columns([1.1, 2.6, 0.9], vertical_alignment="center")
with col_brand:
    ui.render(ui.brand_html())
with col_search:
    st.text_input(
        "Buscar Pokémon",
        key="search",
        on_change=on_search,
        placeholder="Buscar por nome ou número (ex: pikachu, 25, mr mime)",
        label_visibility="collapsed",
    )
with col_random:
    if st.button("Aleatório", type="primary", icon=":material/casino:", width="stretch"):
        go_to(random.randint(1, species_count))
        st.rerun()

ref = st.query_params.get("p")

if not ref:
    picks = "".join(
        f'<a class="evo-node" href="?p={name}" target="_self">'
        f'<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pid}.png" alt="{name}">'
        f'<span class="evo-name">{ui.format_pokemon_display_name(name)}</span></a>'
        for pid, name in QUICK_PICKS
    )
    ui.render(
        '<div class="card" style="margin-top:18px; text-align:center">'
        '<div class="card-title" style="justify-content:center">Comece por aqui</div>'
        '<p class="muted" style="margin:0 0 16px">Busque um Pokémon pelo nome ou número, sorteie um aleatório ou escolha um abaixo.</p>'
        f'<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px">{picks}</div></div>'
    )
    ui.render(ui.footer_html())
    st.stop()

try:
    dados = pokeapi.fetch_pokemon_data(ref)
except requests.RequestException:
    st.error("Não foi possível acessar a PokeAPI agora. Tente novamente em instantes.")
    st.stop()

if not dados:
    st.error(f"Nenhum Pokémon encontrado para \"{ref}\". Confira a grafia ou tente pelo número.")
    ui.render(ui.footer_html())
    st.stop()

try:
    species_name = dados["species"]["name"]
    species = pokeapi.fetch_species_data(species_name) or {}
    dex_id = species.get("id") or dados["id"]
    types = [t["type"]["name"] for t in dados.get("types", [])]
    accent = ui.type_color(types[0] if types else "unknown")

    prev_id = dex_id - 1 if dex_id > 1 else species_count
    next_id = dex_id + 1 if dex_id < species_count else 1

    nav_prev, nav_form, nav_next = st.columns([1, 1.4, 1], vertical_alignment="bottom")
    with nav_prev:
        if st.button(species_label(prev_id), key="nav_prev", icon=":material/chevron_left:", width="stretch"):
            go_to(prev_id)
            st.rerun()
    with nav_next:
        if st.button(species_label(next_id), key="nav_next", icon=":material/chevron_right:", icon_position="right", width="stretch"):
            go_to(next_id)
            st.rerun()
    with nav_form:
        varieties = [v["name"] for v in pokeapi.get_varieties(species_name)]
        if len(varieties) > 1:
            form_key = f"form_{species_name}"
            if dados["name"] in varieties:
                st.session_state[form_key] = dados["name"]
            st.selectbox(
                "Forma",
                varieties,
                key=form_key,
                format_func=ui.format_pokemon_display_name,
                on_change=lambda: go_to(st.session_state[form_key]),
                label_visibility="collapsed",
            )

    col_hero, col_info, col_stats = st.columns([1, 1.12, 1.18], gap="medium")

    with col_hero:
        mode = st.session_state.img_mode or "art"
        image_url, shown_mode = pick_image(dados.get("sprites") or {}, mode, st.session_state.shiny)
        ui.render(ui.hero_html(dados, species, pokeapi.get_genus(species), image_url, shown_mode, st.session_state.shiny))

        with st.container(key="hero_controls"):
            c_mode, c_shiny = st.columns([2.6, 1], vertical_alignment="center")
            with c_mode:
                st.segmented_control(
                    "Estilo da imagem",
                    list(IMAGE_MODES),
                    key="img_mode",
                    format_func=IMAGE_MODES.get,
                    label_visibility="collapsed",
                )
            with c_shiny:
                st.toggle("Shiny", key="shiny")

            cries = dados.get("cries") or {}
            cry = cries.get("latest") or cries.get("legacy")
            if cry:
                st.audio(cry, format="audio/ogg")
                st.caption("Cuidado com o volume.")
            else:
                st.caption("Grito indisponível para este Pokémon.")

            st.page_link(
                "views/laboratorio.py",
                label="Abrir no Laboratório",
                icon=":material/science:",
                query_params={"p": dados["name"]},
                width="stretch",
            )

    with col_info:
        ui.render(ui.info_card_html(dados, species, pokeapi.get_flavor_text(species), accent))
        ui.render(ui.abilities_card_html(pokeapi.get_abilities(dados.get("abilities", [])), accent))
        ui.render(ui.matchups_card_html(pokeapi.get_type_matchups(dados.get("types", [])), accent))

    with col_stats:
        base_stats = stats.base_stats(dados)
        if base_stats:
            ui.render(ui.stats_card_html(base_stats, accent))
        else:
            st.info("Dados de atributos não disponíveis.")

    tree, evo_sprites = pokeapi.get_evolution_tree(species_name)
    ui.render(ui.evolution_card_html(tree, evo_sprites, species_name, accent))
    render_moves(dados.get("learnset") or {})

except requests.RequestException:
    st.error("A PokeAPI demorou para responder. Algumas informações podem estar incompletas; tente recarregar.")

ui.render(ui.footer_html())

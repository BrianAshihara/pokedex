# src/pokeapi.py

import requests
import streamlit as st
from concurrent.futures import ThreadPoolExecutor

_SESSION = requests.Session()
_REQUEST_TIMEOUT = 10  # seconds — evita travar em API lenta

# Função para pegar formas alternativas (todas as variedades da espécie, não só mega/gmax/regionais)
@st.cache_data(ttl=3600) # Cachear por 1 hora
def get_varieties(species_name):
    species_url = f"https://pokeapi.co/api/v2/pokemon-species/{species_name}"
    res = _SESSION.get(species_url, timeout=_REQUEST_TIMEOUT)
    if res.status_code != 200:
        return []
    data = res.json()
    formas = []
    for var in data.get("varieties", []):
        if var.get("is_default", True):
            continue  # forma padrão é exibida como "Normal" na UI
        name = var["pokemon"]["name"]
        formas.append({"name": name, "url": var["pokemon"]["url"]})
    return formas

# Função para buscar dados de tipo (cacheado por URL)
@st.cache_data(ttl=3600) # Cachear por 1 hora
def fetch_type_data(type_url):
    res = _SESSION.get(type_url, timeout=_REQUEST_TIMEOUT)
    if res.status_code != 200:
        return None
    return res.json()

# Função para calcular fraquezas, resistências e imunidades (tipos buscados em paralelo)
@st.cache_data(ttl=3600) # Cachear por 1 hora
def get_type_weaknesses(pokemon_types):
    type_urls = [t["type"]["url"] for t in pokemon_types]
    with ThreadPoolExecutor(max_workers=min(5, len(type_urls))) as executor:
        type_datas = list(executor.map(fetch_type_data, type_urls))

    type_damage_multipliers = {}
    for type_data in type_datas:
        if not type_data:
            continue
        for damage_relation in type_data["damage_relations"]["double_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = type_damage_multipliers.get(attacking_type, 1) * 2
        for damage_relation in type_data["damage_relations"]["half_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = type_damage_multipliers.get(attacking_type, 1) * 0.5
        for damage_relation in type_data["damage_relations"]["no_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = 0  # Imune

    weaknesses_2x = []
    weaknesses_4x = []
    resistances_0_5x = []
    immunities_0x = []
    
    for type_name, multiplier in type_damage_multipliers.items():
        if multiplier == 4:
            weaknesses_4x.append(type_name)
        elif multiplier == 2:
            weaknesses_2x.append(type_name)
        elif multiplier == 0.5:
            resistances_0_5x.append(type_name)
        elif multiplier == 0:
            immunities_0x.append(type_name)
            
    return weaknesses_2x, weaknesses_4x, resistances_0_5x, immunities_0x

# Função para buscar dados do Pokémon
@st.cache_data(ttl=3600) # Cachear por 1 hora
def fetch_pokemon_data(pokemon_name):
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_name}"
    resposta = _SESSION.get(url, timeout=_REQUEST_TIMEOUT)
    if resposta.status_code == 200:
        return resposta.json()
    return None

# Função para buscar dados do Pokémon por URL
@st.cache_data(ttl=3600) # Cachear por 1 hora
def fetch_pokemon_by_url(url):
    resposta = _SESSION.get(url, timeout=_REQUEST_TIMEOUT)
    if resposta.status_code == 200:
        return resposta.json()
    return None

# Função para buscar dados da espécie do Pokémon
@st.cache_data(ttl=3600) # Cachear por 1 hora
def fetch_species_data(pokemon_name):
    url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_name}"
    resposta = _SESSION.get(url, timeout=_REQUEST_TIMEOUT)
    if resposta.status_code == 200:
        return resposta.json()
    return None

# Função para buscar cadeia de evolução por URL
@st.cache_data(ttl=3600) # Cachear por 1 hora
def fetch_evolution_chain(chain_url):
    resposta = _SESSION.get(chain_url, timeout=_REQUEST_TIMEOUT)
    if resposta.status_code == 200:
        return resposta.json()
    return None

# Função para resumir métodos de evolução
def summarize_evolution_methods(evolution_details_list):
    summaries = []

    def titleize(text):
        return text.replace("-", " ").title()

    for detail in evolution_details_list or []:
        if not detail:
            continue
        trigger = (detail.get("trigger") or {}).get("name", "")
        parts = []

        if trigger == "level-up":
            min_level = detail.get("min_level")
            if min_level is not None:
                parts.append(f"Nv {min_level}")
            time_of_day = detail.get("time_of_day")
            if time_of_day:
                parts.append("Dia" if time_of_day == "day" else "Noite")
            known_move = (detail.get("known_move") or {}).get("name")
            if known_move:
                parts.append(f"Mov {titleize(known_move)}")
            known_move_type = (detail.get("known_move_type") or {}).get("name")
            if known_move_type:
                parts.append(f"Golpe {titleize(known_move_type)}")
            held_item = (detail.get("held_item") or {}).get("name")
            if held_item:
                parts.append(f"Segurando {titleize(held_item)}")
            if detail.get("min_happiness") is not None:
                parts.append("Amizade")
            if detail.get("min_beauty") is not None:
                parts.append("Beleza")
            if detail.get("min_affection") is not None:
                parts.append("Afeto")
            location = (detail.get("location") or {}).get("name")
            if location:
                parts.append(titleize(location))
            if detail.get("needs_overworld_rain"):
                parts.append("Chuva")
            party_species = (detail.get("party_species") or {}).get("name")
            if party_species:
                parts.append(f"Equipe {titleize(party_species)}")
            party_type = (detail.get("party_type") or {}).get("name")
            if party_type:
                parts.append(f"Equipe {titleize(party_type)}")
            rel_stats = detail.get("relative_physical_stats")
            if rel_stats == 1:
                parts.append("Atk > Def")
            elif rel_stats == -1:
                parts.append("Atk < Def")
            elif rel_stats == 0:
                parts.append("Atk = Def")
            gender = detail.get("gender")
            if gender == 1:
                parts.append("Fêmea")
            elif gender == 2:
                parts.append("Macho")
            if detail.get("turn_upside_down"):
                parts.append("De cabeça para baixo")

        elif trigger == "use-item":
            item = (detail.get("item") or {}).get("name")
            if item:
                parts.append(f"Usar {titleize(item)}")
            else:
                parts.append("Usar item")

        elif trigger == "trade":
            held_item = (detail.get("held_item") or {}).get("name")
            trade_species = (detail.get("trade_species") or {}).get("name")
            if held_item:
                parts.append(f"Troca + {titleize(held_item)}")
            elif trade_species:
                parts.append(f"Troca com {titleize(trade_species)}")
            else:
                parts.append("Troca")

        else:
            if trigger:
                parts.append(titleize(trigger))

        summary = " + ".join(parts) if parts else titleize(trigger) if trigger else ""
        if summary:
            summaries.append(summary)

    if not summaries:
        return ""

    # Remover duplicados preservando ordem
    seen = set()
    unique = []
    for s in summaries:
        if s not in seen:
            unique.append(s)
            seen.add(s)
    return " / ".join(unique)

def _sprite_from_pokemon_data(data):
    """Extrai URL do sprite a partir dos dados do Pokémon (para uso em paralelo)."""
    if not data:
        return None
    sprites = data.get("sprites", {})
    sprite = sprites.get("front_default")
    if not sprite:
        sprite = (
            (sprites.get("other") or {}).get("official-artwork", {}).get("front_default")
        )
    return sprite


# Função para obter cadeia de evolução com métodos e sprites (cacheada + sprites em paralelo)
@st.cache_data(ttl=3600)
def get_evolution_chain_with_methods(pokemon_name):
    species_data = fetch_species_data(pokemon_name)
    if not species_data:
        return [], {}

    chain_url = species_data.get("evolution_chain", {}).get("url")
    if not chain_url:
        return [], {}

    chain_data = fetch_evolution_chain(chain_url)
    if not chain_data or "chain" not in chain_data:
        return [], {}

    def build_paths(node):
        head = (node["species"]["name"], None)
        children = node.get("evolves_to", [])
        if not children:
            return [[head]]

        paths = []
        for child in children:
            child_paths = build_paths(child)
            method = summarize_evolution_methods(child.get("evolution_details", []))
            for path in child_paths:
                if path:
                    path[0] = (path[0][0], method)
                paths.append([head] + path)
        return paths

    paths = build_paths(chain_data["chain"])

    names_to_fetch = []
    seen = set()
    for path in paths:
        for name, _ in path:
            if name not in seen:
                seen.add(name)
                names_to_fetch.append(name)

    with ThreadPoolExecutor(max_workers=min(8, len(names_to_fetch))) as executor:
        pokemon_datas = list(executor.map(fetch_pokemon_data, names_to_fetch))

    sprites_map = {
        name: _sprite_from_pokemon_data(data)
        for name, data in zip(names_to_fetch, pokemon_datas)
    }

    return paths, sprites_map

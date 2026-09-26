# src/pokeapi.py

import requests
import streamlit as st
from concurrent.futures import ThreadPoolExecutor
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx

_BASE_URL = "https://pokeapi.co/api/v2"
_SESSION = requests.Session()
_REQUEST_TIMEOUT = 10
_POKEMON_LIST_URL = f"{_BASE_URL}/pokemon?limit=20000"
_FALLBACK_SPECIES_COUNT = 1025

_UNUSED_POKEMON_FIELDS = ("game_indices", "held_items", "past_abilities")
_PARALLEL_WORKERS = 16
# Incrementar ao mudar o formato de _slim_pokemon, para descartar dados antigos do cache.
_POKEMON_SCHEMA = 2


def _sanitize_lookup_name(value):
    return str(value or "").strip().lower().replace(" ", "-").replace("_", "-").replace(".", "")


def _normalize_query(value):
    text = str(value or "").strip().lower()
    return "".join(ch for ch in text if ch.isalnum())


def _get_json(url):
    """Retorna None em 404. Erros de rede sobem para nao serem cacheados."""
    resposta = _SESSION.get(url, timeout=_REQUEST_TIMEOUT)
    if resposta.status_code == 404:
        return None
    resposta.raise_for_status()
    return resposta.json()


def _slim_pokemon(data):
    if not data:
        return data
    for field in _UNUSED_POKEMON_FIELDS:
        data.pop(field, None)
    learnset = {}
    for entry in data.pop("moves", None) or []:
        move_name = entry["move"]["name"]
        for detail in entry["version_group_details"]:
            learnset.setdefault(detail["version_group"]["name"], []).append(
                (move_name, detail["move_learn_method"]["name"], detail.get("level_learned_at") or 0)
            )
    data["learnset"] = learnset
    data["schema"] = _POKEMON_SCHEMA
    (data.get("sprites") or {}).pop("versions", None)
    return data


def _parallel(func, items, max_workers=_PARALLEL_WORKERS):
    items = list(items)
    if not items:
        return []
    ctx = get_script_run_ctx()
    with ThreadPoolExecutor(
        max_workers=min(max_workers, len(items)),
        initializer=lambda: add_script_run_ctx(ctx=ctx) if ctx else None,
    ) as executor:
        return list(executor.map(func, items))


def _fetch_pokemon_data_raw(pokemon_ref):
    return _slim_pokemon(_get_json(f"{_BASE_URL}/pokemon/{pokemon_ref}"))


@st.cache_data(ttl=3600)
def fetch_all_pokemon_names():
    data = _get_json(_POKEMON_LIST_URL) or {}
    return [p.get("name") for p in data.get("results", []) if p.get("name")]


@st.cache_data(ttl=3600)
def build_pokemon_alias_map():
    aliases = {}
    for name in fetch_all_pokemon_names():
        normalized = _normalize_query(name)
        if normalized and normalized not in aliases:
            aliases[normalized] = name
    return aliases


@st.cache_data(ttl=86400)
def get_species_count():
    try:
        data = _get_json(f"{_BASE_URL}/pokemon-species?limit=1") or {}
        return int(data.get("count") or _FALLBACK_SPECIES_COUNT)
    except requests.RequestException:
        return _FALLBACK_SPECIES_COUNT


def resolve_pokemon_name(query):
    candidate = _sanitize_lookup_name(query)
    if not candidate:
        return candidate

    normalized = _normalize_query(candidate)
    if not normalized:
        return candidate

    alias_map = build_pokemon_alias_map()
    return alias_map.get(normalized, candidate)


@st.cache_data(ttl=3600)
def fetch_species_data(species_ref):
    return _get_json(f"{_BASE_URL}/pokemon-species/{species_ref}")


@st.cache_data(ttl=3600)
def get_varieties(species_name):
    data = fetch_species_data(species_name) or {}
    return [
        {"name": var["pokemon"]["name"], "url": var["pokemon"]["url"], "is_default": var.get("is_default", False)}
        for var in data.get("varieties", [])
    ]


@st.cache_data(ttl=3600)
def fetch_type_data(type_url):
    return _get_json(type_url)


@st.cache_data(ttl=3600)
def get_type_matchups(pokemon_types):
    """Retorna {multiplicador: [tipos]} para multiplicadores diferentes de 1."""
    type_urls = [t["type"]["url"] for t in pokemon_types]
    if not type_urls:
        return {}
    type_datas = _parallel(fetch_type_data, type_urls)

    multipliers = {}
    for type_data in type_datas:
        if not type_data:
            continue
        relations = type_data["damage_relations"]
        for rel in relations["double_damage_from"]:
            multipliers[rel["name"]] = multipliers.get(rel["name"], 1) * 2
        for rel in relations["half_damage_from"]:
            multipliers[rel["name"]] = multipliers.get(rel["name"], 1) * 0.5
        for rel in relations["no_damage_from"]:
            multipliers[rel["name"]] = 0

    matchups = {}
    for type_name, multiplier in multipliers.items():
        if multiplier != 1:
            matchups.setdefault(multiplier, []).append(type_name)
    return matchups


def fetch_pokemon_data(pokemon_name):
    data = _fetch_pokemon_cached(pokemon_name)
    if data and data.get("schema") != _POKEMON_SCHEMA:
        _fetch_pokemon_cached.clear()
        data = _fetch_pokemon_cached(pokemon_name)
    return data


@st.cache_data(ttl=3600)
def _fetch_pokemon_cached(pokemon_name):
    original_ref = str(pokemon_name or "").strip().lower()
    if not original_ref:
        return None

    direct_ref = original_ref if original_ref.isdigit() else _sanitize_lookup_name(original_ref)
    direct_data = _fetch_pokemon_data_raw(direct_ref)
    if direct_data:
        return direct_data

    if direct_ref.isdigit():
        return None

    resolved_ref = resolve_pokemon_name(direct_ref)
    if resolved_ref and resolved_ref != direct_ref:
        resolved_data = _fetch_pokemon_data_raw(resolved_ref)
        if resolved_data:
            return resolved_data

    species = fetch_species_data(direct_ref)
    if species:
        for var in species.get("varieties", []):
            if var.get("is_default"):
                return _fetch_pokemon_data_raw(var["pokemon"]["name"])
    return None


@st.cache_data(ttl=3600)
def fetch_evolution_chain(chain_url):
    return _get_json(chain_url)


def get_flavor_text(species_data, languages=("pt-BR", "pt", "en")):
    entries = (species_data or {}).get("flavor_text_entries", [])
    for lang in languages:
        texts = [e["flavor_text"] for e in entries if e["language"]["name"] == lang]
        if texts:
            return " ".join(texts[-1].replace("\f", " ").replace("\n", " ").replace("­ ", "").split())
    return ""


def get_genus(species_data, languages=("pt-BR", "pt", "en")):
    genera = (species_data or {}).get("genera", [])
    for lang in languages:
        for g in genera:
            if g["language"]["name"] == lang:
                return g["genus"]
    return ""


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
                parts.append({"day": "Dia", "night": "Noite", "dusk": "Crepúsculo"}.get(time_of_day, titleize(time_of_day)))
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
            if not parts:
                parts.append("Subir de nível")

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

    return " / ".join(dict.fromkeys(summaries))


def _sprite_from_pokemon_data(data):
    if not data:
        return None
    sprites = data.get("sprites", {})
    sprite = sprites.get("front_default")
    if not sprite:
        sprite = (sprites.get("other") or {}).get("official-artwork", {}).get("front_default")
    return sprite


@st.cache_data(ttl=3600)
def get_evolution_tree(species_name):
    """Retorna (arvore, sprites). Cada no tem name, method e children."""
    species_data = fetch_species_data(species_name)
    chain_url = ((species_data or {}).get("evolution_chain") or {}).get("url")
    if not chain_url:
        return None, {}

    chain_data = fetch_evolution_chain(chain_url)
    if not chain_data or "chain" not in chain_data:
        return None, {}

    names = []

    def build(node, method=None):
        name = node["species"]["name"]
        names.append(name)
        return {
            "name": name,
            "method": method,
            "children": [
                build(child, summarize_evolution_methods(child.get("evolution_details", [])))
                for child in node.get("evolves_to", [])
            ],
        }

    tree = build(chain_data["chain"])

    pokemon_datas = _parallel(fetch_pokemon_data, names)

    sprites_map = {name: _sprite_from_pokemon_data(data) for name, data in zip(names, pokemon_datas)}
    return tree, sprites_map


VERSION_GROUPS = [
    ("red-green-japan", "Red / Green (JP)"),
    ("red-blue", "Red / Blue"),
    ("blue-japan", "Blue (JP)"),
    ("yellow", "Yellow"),
    ("gold-silver", "Gold / Silver"),
    ("crystal", "Crystal"),
    ("ruby-sapphire", "Ruby / Sapphire"),
    ("emerald", "Emerald"),
    ("firered-leafgreen", "FireRed / LeafGreen"),
    ("colosseum", "Colosseum"),
    ("xd", "XD"),
    ("diamond-pearl", "Diamond / Pearl"),
    ("platinum", "Platinum"),
    ("heartgold-soulsilver", "HeartGold / SoulSilver"),
    ("black-white", "Black / White"),
    ("black-2-white-2", "Black 2 / White 2"),
    ("x-y", "X / Y"),
    ("omega-ruby-alpha-sapphire", "Omega Ruby / Alpha Sapphire"),
    ("sun-moon", "Sun / Moon"),
    ("ultra-sun-ultra-moon", "Ultra Sun / Ultra Moon"),
    ("lets-go-pikachu-lets-go-eevee", "Let's Go Pikachu / Eevee"),
    ("sword-shield", "Sword / Shield"),
    ("the-isle-of-armor", "The Isle of Armor"),
    ("the-crown-tundra", "The Crown Tundra"),
    ("brilliant-diamond-shining-pearl", "Brilliant Diamond / Shining Pearl"),
    ("legends-arceus", "Legends: Arceus"),
    ("scarlet-violet", "Scarlet / Violet"),
    ("the-teal-mask", "The Teal Mask"),
    ("the-indigo-disk", "The Indigo Disk"),
    ("legends-za", "Legends: Z-A"),
    ("mega-dimension", "Mega Dimension"),
    ("champions", "Champions"),
]
_VERSION_ORDER = {name: i for i, (name, _) in enumerate(VERSION_GROUPS)}
_VERSION_LABELS = dict(VERSION_GROUPS)


def version_group_label(name):
    return _VERSION_LABELS.get(name) or name.replace("-", " ").title()


def sorted_version_groups(learnset):
    return sorted(learnset, key=lambda vg: (_VERSION_ORDER.get(vg, len(_VERSION_ORDER)), vg))


def default_version_group(learnset):
    groups = sorted_version_groups(learnset)
    with_level_up = [vg for vg in groups if any(method == "level-up" for _, method, _ in learnset[vg])]
    return (with_level_up or groups or [None])[-1]


def _english(entries, field):
    texts = [e[field] for e in entries or [] if e["language"]["name"] == "en"]
    if not texts:
        return ""
    return " ".join(texts[-1].replace("\f", " ").replace("\n", " ").split())


def _english_name(data):
    return next((n["name"] for n in data.get("names", []) if n["language"]["name"] == "en"), None) or data["name"].replace("-", " ").title()


@st.cache_data(ttl=86400)
def get_ability(name):
    data = _get_json(f"{_BASE_URL}/ability/{name}")
    if not data:
        return {"name": name.replace("-", " ").title(), "description": ""}
    description = _english(data.get("flavor_text_entries"), "flavor_text") or _english(data.get("effect_entries"), "short_effect")
    return {"name": _english_name(data), "description": description}


def get_abilities(abilities):
    """Recebe a lista 'abilities' do Pokemon e devolve nome, descricao e se e oculta."""
    details = _parallel(get_ability, [a["ability"]["name"] for a in abilities])
    return [{**info, "hidden": a.get("is_hidden", False)} for a, info in zip(abilities, details)]


@st.cache_data(ttl=86400)
def get_move(name):
    data = _get_json(f"{_BASE_URL}/move/{name}")
    if not data:
        return None
    effect = _english(data.get("effect_entries"), "short_effect")
    if effect and data.get("effect_chance") is not None:
        effect = effect.replace("$effect_chance", str(data["effect_chance"]))
    return {
        "name": _english_name(data),
        "type": (data.get("type") or {}).get("name", "unknown"),
        "category": (data.get("damage_class") or {}).get("name", "status"),
        "power": data.get("power"),
        "accuracy": data.get("accuracy"),
        "pp": data.get("pp"),
        "effect": effect or _english(data.get("flavor_text_entries"), "flavor_text"),
        "machines": {m["version_group"]["name"]: m["machine"]["url"] for m in data.get("machines", [])},
    }


@st.cache_data(ttl=86400)
def get_machine_label(url):
    data = _get_json(url) or {}
    return ((data.get("item") or {}).get("name") or "").upper()


def _machine_sort_key(label):
    prefix = label.rstrip("0123456789")
    digits = label[len(prefix):]
    return (label == "", {"TM": 0, "HM": 1, "TR": 2}.get(prefix, 3), int(digits) if digits else 0)


def get_learnset(learnset, version_group):
    """Agrupa os golpes de uma versao por metodo de aprendizado, ja com os detalhes de cada golpe."""
    entries = learnset.get(version_group, [])
    move_names = list(dict.fromkeys(name for name, _, _ in entries))
    moves = dict(zip(move_names, _parallel(get_move, move_names)))

    machine_urls = {
        name: moves[name]["machines"][version_group]
        for name, method, _ in entries
        if method == "machine" and moves.get(name) and version_group in moves[name]["machines"]
    }
    machine_labels = dict(zip(machine_urls, _parallel(get_machine_label, machine_urls.values())))

    grouped = {}
    for name, method, level in entries:
        move = moves.get(name)
        if not move:
            continue
        grouped.setdefault(method, []).append({**move, "level": level, "machine": machine_labels.get(name, "")})

    for method, rows in grouped.items():
        if method == "level-up":
            rows.sort(key=lambda r: (r["level"], r["name"]))
        elif method == "machine":
            rows.sort(key=lambda r: (_machine_sort_key(r["machine"]), r["name"]))
        else:
            rows.sort(key=lambda r: r["name"])
    return grouped

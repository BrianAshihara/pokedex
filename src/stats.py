# src/stats.py

STATS = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]
API_NAMES = {
    "hp": "HP",
    "attack": "Attack",
    "defense": "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    "speed": "Speed",
}

MAX_IV = 31
MAX_EV = 252
MAX_TOTAL_EV = 510

NATURES = {
    "Hardy": (None, None),
    "Lonely": ("Attack", "Defense"),
    "Brave": ("Attack", "Speed"),
    "Adamant": ("Attack", "Sp. Atk"),
    "Naughty": ("Attack", "Sp. Def"),
    "Bold": ("Defense", "Attack"),
    "Docile": (None, None),
    "Relaxed": ("Defense", "Speed"),
    "Impish": ("Defense", "Sp. Atk"),
    "Lax": ("Defense", "Sp. Def"),
    "Timid": ("Speed", "Attack"),
    "Hasty": ("Speed", "Defense"),
    "Serious": (None, None),
    "Jolly": ("Speed", "Sp. Atk"),
    "Naive": ("Speed", "Sp. Def"),
    "Modest": ("Sp. Atk", "Attack"),
    "Mild": ("Sp. Atk", "Defense"),
    "Quiet": ("Sp. Atk", "Speed"),
    "Bashful": (None, None),
    "Rash": ("Sp. Atk", "Sp. Def"),
    "Calm": ("Sp. Def", "Attack"),
    "Gentle": ("Sp. Def", "Defense"),
    "Sassy": ("Sp. Def", "Speed"),
    "Careful": ("Sp. Def", "Sp. Atk"),
    "Quirky": (None, None),
}


def nature_label(nature):
    up, down = NATURES[nature]
    if not up:
        return f"{nature} (neutra)"
    return f"{nature} (+{up}, -{down})"


def nature_multiplier(nature, stat):
    """Retorna o multiplicador em porcentagem inteira para evitar erro de ponto flutuante."""
    up, down = NATURES.get(nature, (None, None))
    if stat == up:
        return 110
    if stat == down:
        return 90
    return 100


def calc_stat(stat, base, iv=MAX_IV, ev=0, level=100, nature="Hardy"):
    core = (2 * base + iv + ev // 4) * level // 100
    if stat == "HP":
        return 1 if base == 1 else core + level + 10
    return (core + 5) * nature_multiplier(nature, stat) // 100


def calc_all(base_stats, ivs=None, evs=None, level=100, nature="Hardy"):
    ivs = ivs or {}
    evs = evs or {}
    return {
        s: calc_stat(s, base_stats.get(s, 0), ivs.get(s, MAX_IV), evs.get(s, 0), level, nature)
        for s in STATS
    }


def _nature_affecting(stat, boosted):
    index = 0 if boosted else 1
    return next((name for name, effect in NATURES.items() if effect[index] == stat), "Hardy")


def stat_range_lv100(stat, base):
    """Minimo (IV 0, sem EVs, natureza desfavoravel) e maximo (IV 31, 252 EVs, natureza favoravel)."""
    low = calc_stat(stat, base, 0, 0, 100, _nature_affecting(stat, boosted=False))
    high = calc_stat(stat, base, MAX_IV, MAX_EV, 100, _nature_affecting(stat, boosted=True))
    return low, high


def base_stats(pokemon_data):
    return {
        API_NAMES[entry["stat"]["name"]]: entry["base_stat"]
        for entry in (pokemon_data or {}).get("stats", [])
        if entry["stat"]["name"] in API_NAMES
    }

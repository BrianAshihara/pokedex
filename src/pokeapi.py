# src/pokeapi.py

import requests
import streamlit as st

# Função para pegar formas alternativas
def get_varieties(pokemon_name):
    species_url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_name}"
    res = requests.get(species_url)
    if res.status_code != 200:
        return []
    data = res.json()
    formas = []
    for var in data.get("varieties", []):
        name = var["pokemon"]["name"]
        if any(x in name for x in ["mega", "gmax", "alola", "galar", "paldea"]) and name != pokemon_name:
            formas.append({"name": name, "url": var["pokemon"]["url"]})
    return formas

# Função para calcular fraquezas 2x e 4x
@st.cache_data(ttl=3600) # Cachear por 1 hora
def get_type_weaknesses(pokemon_types):
    type_damage_multipliers = {}

    for type_info in pokemon_types:
        type_name = type_info["type"]["name"]
        type_url = type_info["type"]["url"]
        
        type_response = requests.get(type_url)
        if type_response.status_code != 200:
            continue
        
        type_data = type_response.json()
        
        for damage_relation in type_data["damage_relations"]["double_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = type_damage_multipliers.get(attacking_type, 1) * 2
            
        for damage_relation in type_data["damage_relations"]["half_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = type_damage_multipliers.get(attacking_type, 1) * 0.5

        for damage_relation in type_data["damage_relations"]["no_damage_from"]:
            attacking_type = damage_relation["name"]
            type_damage_multipliers[attacking_type] = 0 # Imune
    
    weaknesses_2x = []
    weaknesses_4x = []
    
    for type_name, multiplier in type_damage_multipliers.items():
        if multiplier == 4:
            weaknesses_4x.append(type_name)
        elif multiplier == 2:
            weaknesses_2x.append(type_name)
            
    return weaknesses_2x, weaknesses_4x

# Função para buscar dados do Pokémon
def fetch_pokemon_data(pokemon_name):
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_name}"
    resposta = requests.get(url)
    if resposta.status_code == 200:
        return resposta.json()
    return None

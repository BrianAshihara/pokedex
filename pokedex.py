# pokedex.py
# ⚡ Pokédex em Python + Streamlit + PokeAPI
# Autor: Brian Ashihara
# Versão: 2.0 (Aleatório e Pesquisa independentes)

import requests
import streamlit as st
import random

# ⚙️ Configuração inicial
st.set_page_config(
    page_title="Pokédex ⚡",
    page_icon="⚡",
    layout="centered"
)

# 🎨 Dark mode + botões
st.markdown("""
<style>
    .stApp { background-color: #121212; color: #f1f1f1; }
    .stTextInput>div>div>input { background-color: #1e1e1e; color: #f1f1f1; border: 1px solid #3b4cca; border-radius: 8px; }
    .stButton>button { background-color: #ffcb05; color: #000; border: none; border-radius: 10px; font-weight: bold; transition: 0.3s; margin-top: 5px; }
    .stButton>button:hover { background-color: #f5b700; color: #1e1e1e; transform: scale(1.05); }
    .green-button > button { background-color: #4CAF50; color: #fff; border-radius: 10px; border: none; font-weight: bold; transition: 0.3s; margin-top: 5px; height: 38px; }
    .green-button > button:hover { background-color: #45a049; transform: scale(1.05); }
    h1,h2,h3,h4 { color: #ffcb05; }
    footer { text-align: center; font-size: 0.9em; margin-top: 50px; color: #888; }
</style>
""", unsafe_allow_html=True)

# Cabeçalho
st.title("⚡ Pokédex ⚡")
st.write("Explore o mundo Pokémon com dados em tempo real da [PokeAPI](https://pokeapi.co/)!")

# Inicializar estados
if "mostrar_shiny" not in st.session_state:
    st.session_state.mostrar_shiny = False
if "pokemon_aleatorio" not in st.session_state:
    st.session_state.pokemon_aleatorio = None
if "forma_atual" not in st.session_state:
    st.session_state.forma_atual = None

# Entrada do usuário
nome_input = st.text_input("Digite o nome do Pokémon:", "").strip().lower()

# Botão Pokémon Aleatório (abaixo da barra)
if st.button("🎲 Pokémon Aleatório"):
    st.session_state.pokemon_aleatorio = str(random.randint(1, 1010))
    st.session_state.mostrar_shiny = False
    st.session_state.forma_atual = None
    st.rerun()

# Determinar Pokémon a mostrar
# Prioridade: barra de pesquisa > aleatório
if nome_input:
    pokemon_nome = nome_input
elif st.session_state.pokemon_aleatorio:
    pokemon_nome = st.session_state.pokemon_aleatorio
else:
    pokemon_nome = None

# Função para pegar formas alternativas
def get_varieties(pokemon_name):
    species_url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_name}"
    res = requests.get(species_url)
    if res.status_code != 200:
        return []
    data = res.json()
    formas = []
    for var in data["varieties"]:
        name = var["pokemon"]["name"]
        if any(x in name for x in ["mega", "gmax", "alola", "galar", "paldea"]) and name != pokemon_name:
            formas.append({"name": name, "url": var["pokemon"]["url"]})
    return formas

# Buscar Pokémon
if pokemon_nome:
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon_nome}"
    resposta = requests.get(url)
    if resposta.status_code == 200:
        dados = resposta.json()

        # Pegar formas alternativas
        formas = get_varieties(dados["name"])

        # Seleção da forma se houver
        if formas:
            opcoes = [f["name"].replace("-", " ").title() for f in formas]
            escolha = st.selectbox("Formas alternativas disponíveis:", ["Normal"] + opcoes)
            if escolha != "Normal":
                for f in formas:
                    if f["name"].replace("-", " ").title() == escolha:
                        url = f["url"]
                        resposta = requests.get(url)
                        dados = resposta.json()
                        st.session_state.forma_atual = escolha
                        break
        else:
            st.session_state.forma_atual = None

        # Layout colunas
        col1, col2 = st.columns([1,2])
        with col1:
            if st.session_state.mostrar_shiny:
                sprite = dados["sprites"]["front_shiny"]
                st.image(sprite, width=200, caption=f"{dados['name'].title()} (Shiny ✨)")
                if st.button("⬅️ Voltar ao Sprite Normal"):
                    st.session_state.mostrar_shiny = False
                    st.rerun()
            else:
                sprite = dados["sprites"]["front_default"]
                st.image(sprite, width=200, caption=dados['name'].title())
                if st.button("✨ Mostrar Sprite Shiny"):
                    st.session_state.mostrar_shiny = True
                    st.rerun()

        with col2:
            st.subheader(dados["name"].title())
            st.write(f"**ID:** {dados['id']}")
            st.write(f"**Altura:** {dados['height']}  |  **Peso:** {dados['weight']}")

            tipos = ", ".join([t["type"]["name"].capitalize() for t in dados["types"]])
            habilidades = ", ".join([a["ability"]["name"].capitalize() for a in dados["abilities"]])

            st.write(f"**Tipos:** {tipos}")
            st.write(f"**Habilidades:** {habilidades}")

        st.write("### Atributos:")
        for stat in dados["stats"]:
            st.progress(stat["base_stat"] / 200)
            st.write(f"{stat['stat']['name'].capitalize()}: {stat['base_stat']}")
    else:
        st.error("❌ Pokémon não encontrado. Tente novamente!")
else:
    st.info("Digite o nome de um Pokémon ou clique no botão 'Pokémon Aleatório' para começar.")

# Rodapé
st.markdown("""
---
<footer>👨‍💻 Autor: <b>Brian Ashihara</b> | Projeto Pokédex ⚡</footer>
""", unsafe_allow_html=True)

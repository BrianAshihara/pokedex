# pokedex.py
# ⚡ Pokédex em Python + Streamlit + PokeAPI
# Autor: Brian Ashihara
# Versão: 2.6 (fix: aleatório x pesquisa sem erro; formatação BR de peso/altura)

import requests
import streamlit as st
import random

# Configuração inicial
st.set_page_config(page_title="Pokédex ⚡", page_icon="⚡", layout="centered")

# Estilo Dark
st.markdown("""
<style>
    .stApp { background-color: #121212; color: #f1f1f1; }
    .stTextInput>div>div>input { background-color: #1e1e1e; color: #f1f1f1; border: 1px solid #3b4cca; border-radius: 8px; }
    .stButton>button { background-color: #ffcb05; color: #000; border: none; border-radius: 10px; font-weight: bold; transition: 0.2s; margin-top: 5px; }
    .stButton>button:hover { background-color: #f5b700; color: #1e1e1e; transform: scale(1.02); }
    .green-button > button { background-color: #4CAF50; color: #fff; border-radius: 10px; border: none; font-weight: bold; transition: 0.2s; margin-top: 5px; height: 38px; }
    .green-button > button:hover { background-color: #45a049; transform: scale(1.02); }
    h1,h2,h3,h4 { color: #ffcb05; }
    footer { text-align: center; font-size: 0.9em; margin-top: 50px; color: #888; }
</style>
""", unsafe_allow_html=True)

st.title("⚡ Pokédex ⚡")
st.write("Explore o mundo Pokémon com dados em tempo real da [PokeAPI](https://pokeapi.co/)!")

# Inicializar session_state (só aqui, antes dos widgets)
if "mostrar_shiny" not in st.session_state:
    st.session_state.mostrar_shiny = False
if "pokemon_aleatorio" not in st.session_state:
    st.session_state.pokemon_aleatorio = None
if "submitted_name" not in st.session_state:
    st.session_state.submitted_name = None
if "forma_atual" not in st.session_state:
    st.session_state.forma_atual = None
if "last_action" not in st.session_state:
    st.session_state.last_action = None
# 'nome_input' será criado como widget abaixo; não atribuímos depois para evitar erro

# Callback quando o usuário submete (pressiona Enter no input)
def submit_name():
    val = st.session_state.get("nome_input", "").strip()
    if val:
        st.session_state.submitted_name = val.lower()
        st.session_state.pokemon_aleatorio = None   # cancelar aleatório quando busca manual
        st.session_state.last_action = "search"
        # não atribuímos st.session_state["nome_input"] aqui

# Campo de texto (vinculado ao session_state por key). Não iremos sobrescrevê-lo manualmente.
st.text_input("Digite o nome do Pokémon:", key="nome_input", on_change=submit_name, placeholder="Ex: pikachu")

# Botão Pokémon Aleatório (abaixo da barra)
if st.button("🎲 Pokémon Aleatório", key="random", help="Gera um Pokémon aleatório"):
    st.session_state.pokemon_aleatorio = str(random.randint(1, 1010))
    st.session_state.submitted_name = None
    st.session_state.mostrar_shiny = False
    st.session_state.forma_atual = None
    st.session_state.last_action = "random"
    st.rerun()

# Determinar qual Pokémon mostrar (prioridade baseada em last_action)
pokemon = None
if st.session_state.last_action == "search" and st.session_state.submitted_name:
    pokemon = st.session_state.submitted_name
elif st.session_state.last_action == "random" and st.session_state.pokemon_aleatorio:
    pokemon = st.session_state.pokemon_aleatorio
# fallback se last_action não estiver definida
elif st.session_state.submitted_name:
    pokemon = st.session_state.submitted_name
elif st.session_state.pokemon_aleatorio:
    pokemon = st.session_state.pokemon_aleatorio

# Função para pegar formas alternativas (Mega, Gmax, Alola, Galar, Paldea)
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

# Buscar Pokémon e renderizar
if pokemon:
    url = f"https://pokeapi.co/api/v2/pokemon/{pokemon}"
    resposta = requests.get(url)
    if resposta.status_code == 200:
        dados = resposta.json()

        # Formas alternativas
        formas = get_varieties(dados["name"])
        if formas:
            opcoes = [f["name"].replace("-", " ").title() for f in formas]
            escolha = st.selectbox("Formas alternativas disponíveis:", ["Normal"] + opcoes)
            if escolha != "Normal":
                for f in formas:
                    if f["name"].replace("-", " ").title() == escolha:
                        url = f["url"]
                        resposta = requests.get(url)
                        if resposta.status_code == 200:
                            dados = resposta.json()
                            st.session_state.forma_atual = escolha
                        break
        else:
            st.session_state.forma_atual = None

        # Layout
        col1, col2 = st.columns([1,2])
        with col1:
            if st.session_state.mostrar_shiny:
                sprite = dados["sprites"].get("front_shiny")
                if sprite:
                    st.image(sprite, width=200, caption=f"{dados['name'].title()} (Shiny ✨)")
                else:
                    st.write("Sprite shiny indisponível.")
                if st.button("⬅️ Voltar ao Sprite Normal"):
                    st.session_state.mostrar_shiny = False
                    st.rerun()
            else:
                sprite = dados["sprites"].get("front_default")
                if sprite:
                    st.image(sprite, width=200, caption=dados['name'].title())
                else:
                    st.write("Sprite padrão indisponível.")
                if st.button("✨ Mostrar Sprite Shiny"):
                    st.session_state.mostrar_shiny = True
                    st.rerun()

            # 🔊 Cry do Pokémon (som)
            cry = dados.get("cries", {}).get("latest") or dados.get("cries", {}).get("legacy")
            if cry:
                if st.button("🔊 Tocar Cry"):
                    st.audio(cry, format="audio/ogg")
                    st.markdown("🔈 *Alerta de som alto!*")
            else:
                st.write("🔇 Cry não disponível para este Pokémon.")



        with col2:
            st.subheader(dados["name"].title())

            # Conversão de altura/peso (PokeAPI: decímetros / hectogramas)
            altura_m = dados.get("height", 0) / 10
            peso_kg = dados.get("weight", 0) / 10
            altura_fmt = f"{altura_m:.1f}".replace(".", ",")
            peso_fmt = f"{peso_kg:.1f}".replace(".", ",")

            st.write(f"**ID:** {dados['id']}")
            st.write(f"**Altura:** {altura_fmt} m  |  **Peso:** {peso_fmt} kg")

            tipos = ", ".join([t["type"]["name"].capitalize() for t in dados.get("types", [])])
            habilidades = ", ".join([a["ability"]["name"].capitalize() for a in dados.get("abilities", [])])

            st.write(f"**Tipos:** {tipos}")
            st.write(f"**Habilidades:** {habilidades}")

        st.write("### Atributos:")
        for stat in dados.get("stats", []):
            st.progress(stat["base_stat"] / 200)
            st.write(f"{stat['stat']['name'].capitalize()}: {stat['base_stat']}")
    else:
        st.error("❌ Pokémon não encontrado. Tente novamente!")
else:
    st.info("Digite o nome de um Pokémon (pressione Enter) ou clique no botão 'Pokémon Aleatório' para começar.")

# Rodapé
st.markdown("""
---
<footer>👨‍💻 Autor: <b>Brian Ashihara</b> | Projeto Pokédex ⚡</footer>
""", unsafe_allow_html=True)

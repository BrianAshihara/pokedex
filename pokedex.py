# pokedex.py
# ⚡ Pokédex em Python + Streamlit + PokeAPI
# Autor: Brian Ashihara
# Versão: 1.4 (Dark Mode + Alternância Sprite Shiny)

import requests
import streamlit as st

# ⚙️ Configuração inicial
st.set_page_config(
    page_title="Pokédex ⚡",
    page_icon="⚡",
    layout="centered"
)

# 🎨 Tema Dark Personalizado
st.markdown("""
<style>
    .stApp {
        background-color: #121212;
        color: #f1f1f1;
    }
    .stTextInput>div>div>input {
        background-color: #1e1e1e;
        color: #f1f1f1;
        border: 1px solid #3b4cca;
        border-radius: 8px;
    }
    .stButton>button {
        background-color: #ffcb05;
        color: #000;
        border: none;
        border-radius: 10px;
        font-weight: bold;
        transition: 0.3s;
    }
    .stButton>button:hover {
        background-color: #f5b700;
        color: #1e1e1e;
        transform: scale(1.05);
    }
    h1, h2, h3, h4 {
        color: #ffcb05;
    }
    footer {
        text-align: center;
        font-size: 0.9em;
        margin-top: 50px;
        color: #888;
    }
</style>
""", unsafe_allow_html=True)

# 🧠 Cabeçalho
st.title("⚡ Pokédex ⚡")
st.write("Explore o mundo Pokémon com dados em tempo real da [PokeAPI](https://pokeapi.co/)!")

# 🔍 Entrada do usuário
nome = st.text_input("Digite o nome do Pokémon:", "").strip().lower()

# Inicializa o estado da sprite shiny (False por padrão)
if "mostrar_shiny" not in st.session_state:
    st.session_state.mostrar_shiny = False

if nome:
    url = f"https://pokeapi.co/api/v2/pokemon/{nome}"
    resposta = requests.get(url)

    if resposta.status_code == 200:
        dados = resposta.json()

        # 🧩 Criação das colunas
        col1, col2 = st.columns([1, 2])

        with col1:
            # Botão para alternar sprite
            if st.session_state.mostrar_shiny:
                sprite = dados["sprites"]["front_shiny"]
                st.image(sprite, width=200, caption=f"{dados['name'].title()} (Shiny ✨)")
                if st.button("⬅️ Voltar ao Sprite Normal"):
                    st.session_state.mostrar_shiny = False
                    st.rerun()
            else:
                sprite = dados["sprites"]["front_default"]
                st.image(sprite, width=200, caption=dados["name"].title())
                if st.button("✨ Mostrar Sprite Shiny"):
                    st.session_state.mostrar_shiny = True
                    st.rerun()

        with col2:
            st.subheader(dados["name"].title())
            st.write(f"**ID:** {dados['id']}")
            st.write(f"**Altura:** {dados['height']}  |  **Peso:** {dados['weight']}")

            tipos = ", ".join([t["type"]["name"] for t in dados["types"]])
            habilidades = ", ".join([a["ability"]["name"] for a in dados["abilities"]])

            st.write(f"**Tipos:** {tipos}")
            st.write(f"**Habilidades:** {habilidades}")

        st.write("### Atributos:")
        for stat in dados["stats"]:
            st.progress(stat["base_stat"] / 200)
            st.write(f"{stat['stat']['name'].title()}: {stat['base_stat']}")
    else:
        st.error("❌ Pokémon não encontrado. Tente novamente!")
else:
    st.info("Digite o nome de um Pokémon acima para começar.")

# 👇 Rodapé
st.markdown("""
---
<footer>👨‍💻 Autor: <b>Brian Ashihara</b> | Projeto Pokédex ⚡</footer>
""", unsafe_allow_html=True)

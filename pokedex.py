# pokedex.py
# ⚡ Pokédex em Python + Streamlit + PokeAPI
# Autor: Brian Ashihara
# Versão: 3.8.2 -

import streamlit as st
import random
from src import pokeapi, ui

# Configuração inicial
st.set_page_config(page_title="Pokédex ⚡", page_icon="⚡", layout="centered")

# Estilo Dark
st.markdown(ui.DARK_STYLE, unsafe_allow_html=True)

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

# Callback quando o usuário submete (pressiona Enter no input)
def submit_name():
    val = st.session_state.get("nome_input", "").strip()
    if val:
        st.session_state.submitted_name = val.lower()
        st.session_state.pokemon_aleatorio = None
        st.session_state.last_action = "search"

# Campo de texto
st.text_input("Digite o nome do Pokémon:", key="nome_input", on_change=submit_name, placeholder="Ex: pikachu")

# Botão Pokémon Aleatório
if st.button("🎲 Pokémon Aleatório", key="random", help="Gera um Pokémon aleatório"):
    st.session_state.pokemon_aleatorio = str(random.randint(1, 1010))
    st.session_state.submitted_name = None
    st.session_state.mostrar_shiny = False
    st.session_state.forma_atual = None
    st.session_state.last_action = "random"
    st.rerun()

# Determinar qual Pokémon mostrar
pokemon = None
if st.session_state.last_action == "search" and st.session_state.submitted_name:
    pokemon = st.session_state.submitted_name
elif st.session_state.last_action == "random" and st.session_state.pokemon_aleatorio:
    pokemon = st.session_state.pokemon_aleatorio
elif st.session_state.submitted_name:
    pokemon = st.session_state.submitted_name
elif st.session_state.pokemon_aleatorio:
    pokemon = st.session_state.pokemon_aleatorio


# Buscar Pokémon e renderizar
if pokemon:
    dados = pokeapi.fetch_pokemon_data(pokemon)
    if dados:
        
        # Navegação entre Pokémons
        col_nav1, col_nav2, col_nav3 = st.columns([1, 2, 1])
        with col_nav1:
            if dados["id"] > 1:
                if st.button("⬅️ Anterior"):
                    st.session_state.submitted_name = str(dados["id"] - 1)
                    st.session_state.pokemon_aleatorio = None
                    st.session_state.mostrar_shiny = False
                    st.session_state.forma_atual = None
                    st.session_state.last_action = "search"
                    st.rerun()
        with col_nav3:
            if st.button("Próximo ➡️"):
                st.session_state.submitted_name = str(dados["id"] + 1)
                st.session_state.pokemon_aleatorio = None
                st.session_state.mostrar_shiny = False
                st.session_state.forma_atual = None
                st.session_state.last_action = "search"
                st.rerun()

        # Formas alternativas
        formas = pokeapi.get_varieties(dados["name"])
        if formas:
            opcoes = [f["name"].replace("-", " ").title() for f in formas]
            escolha = st.selectbox("Formas alternativas disponíveis:", ["Normal"] + opcoes)
            if escolha != "Normal":
                for f in formas:
                    if f["name"].replace("-", " ").title() == escolha:
                        url = f["url"]
                        dados_alt = pokeapi.fetch_pokemon_by_url(url)
                        if dados_alt:
                            dados = dados_alt
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

            # Cry do Pokémon
            cry = dados.get("cries", {}).get("latest") or dados.get("cries", {}).get("legacy")
            if cry:
                if st.button("🔊 Tocar Cry"):
                    st.audio(cry, format="audio/ogg")
                    st.markdown("🔈 *Alerta de som alto!*")
            else:
                st.write("🔇 Cry não disponível para este Pokémon.")

        with col2:
            st.subheader(dados["name"].title())

            altura_m = dados.get("height", 0) / 10
            peso_kg = dados.get("weight", 0) / 10
            altura_fmt = f"{altura_m:.1f}".replace(".", ",")
            peso_fmt = f"{peso_kg:.1f}".replace(".", ",")

            st.write(f"**ID:** {dados['id']}")
            st.write(f"**Altura:** {altura_fmt} m  |  **Peso:** {peso_fmt} kg")

            # Tipos com badges estilizados
            type_badges = ui.get_type_badges(dados.get("types", []))
            st.markdown(f"**Tipos:** {type_badges}", unsafe_allow_html=True)
            
            # Fraquezas, resistências e imunidades
            weaknesses_2x, weaknesses_4x, resistances_0_5x, immunities_0x = pokeapi.get_type_weaknesses(dados.get("types", []))
            
            all_weaknesses_html = ""
            if weaknesses_4x:
                for type_name in weaknesses_4x:
                    all_weaknesses_html += ui.generate_single_weakness_badge(type_name, '4x')
            if weaknesses_2x:
                for type_name in weaknesses_2x:
                    all_weaknesses_html += ui.generate_single_weakness_badge(type_name, '2x')

            if all_weaknesses_html:
                st.markdown(f"**Fraquezas:** {all_weaknesses_html}", unsafe_allow_html=True)

            all_resistances_html = ""
            if resistances_0_5x:
                for type_name in resistances_0_5x:
                    all_resistances_html += ui.generate_single_weakness_badge(type_name, '0.5x')
            if all_resistances_html:
                st.markdown(f"**Resistências:** {all_resistances_html}", unsafe_allow_html=True)

            all_immunities_html = ""
            if immunities_0x:
                for type_name in immunities_0x:
                    all_immunities_html += ui.generate_single_weakness_badge(type_name, '0x')
            if all_immunities_html:
                st.markdown(f"**Imunidades:** {all_immunities_html}", unsafe_allow_html=True)
            
            habilidades_normais = []
            habilidades_ocultas = []
            for a in dados.get("abilities", []):
                nome = a["ability"]["name"].capitalize()
                if a.get("is_hidden"):
                    habilidades_ocultas.append(nome)
                else:
                    habilidades_normais.append(nome)

            if habilidades_normais:
                st.write(f"**Habilidades:** {', '.join(habilidades_normais)}")
            if habilidades_ocultas:
                st.write(f"**Habilidades Ocultas:** {', '.join(habilidades_ocultas)}")


        
        # Prepare stats for radar chart
        stats_map = {
            "hp": "HP",
            "attack": "Attack",
            "defense": "Defense",
            "special-attack": "Sp. Atk",
            "special-defense": "Sp. Def",
            "speed": "Speed"
        }
        pokemon_stats = {}
        for stat_entry in dados.get("stats", []):
            stat_name = stat_entry["stat"]["name"]
            base_stat = stat_entry["base_stat"]
            if stat_name in stats_map:
                pokemon_stats[stats_map[stat_name]] = base_stat

        # Display the stats bar chart
        st.write("### Atributos:")
        if pokemon_stats:
            stats_html = ui.create_stats_bars(pokemon_stats)
            # Use components.html for better rendering
            import streamlit.components.v1 as components
            components.html(stats_html, height=400, scrolling=False)
        else:
            st.write("Dados de atributos não disponíveis.")
    else:
        st.error("❌ Pokémon não encontrado. Tente novamente!")
else:
    st.info("Digite o nome de um Pokémon (pressione Enter) ou clique no botão 'Pokémon Aleatório' para começar.")

# Rodapé
st.markdown("""
---
<footer>👨‍💻 Autor: <b>Brian Ashihara</b> | Projeto Pokédex ⚡</footer>
""", unsafe_allow_html=True)

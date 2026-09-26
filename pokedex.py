# pokedex.py
# Pokédex em Python + Streamlit + PokeAPI
# Autor: Brian Ashihara
# Versão: 5.1.0

import streamlit as st

from src import ui

st.set_page_config(page_title="Pokédex", page_icon="⚡", layout="wide")
st.markdown(ui.GLOBAL_STYLE, unsafe_allow_html=True)

page = st.navigation(
    [
        st.Page("views/pokedex.py", title="Pokédex", icon=":material/menu_book:", default=True),
        st.Page("views/laboratorio.py", title="Laboratório", icon=":material/science:", url_path="laboratorio"),
    ],
    position="top",
)
page.run()

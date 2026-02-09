# ⚡ Pokédex ⚡

Uma **Pokédex interativa e moderna** construída com **Python** e **Streamlit**, que utiliza a **PokeAPI** para fornecer dados em tempo real sobre o universo Pokémon. Explore, descubra e aprenda sobre seus Pokémons favoritos com uma interface elegante e responsiva.

---

## 🚀 Demonstração

<p align="center">
  <img src="assets/pokedex.png" alt="Demonstração da Pokédex" width="70%">
</p>
<p align="center">
  <img src="assets/atributos.png" alt="Gráfico de Atributos" width="70%">
</p>

> Busque qualquer Pokémon, descubra um aleatoriamente e veja suas informações completas instantaneamente!

---

## ✨ Principais Funcionalidades

-   **🔎 Pesquisa Inteligente**: Busque um Pokémon pelo nome ou ID.
-   **🎲 Modo Aleatório**: Descubra um Pokémon aleatório com um único clique.
-   **↔️ Navegação Sequencial**: Navegue facilmente para o Pokémon anterior ou seguinte.
-   **🖼️ Galeria de Sprites**: Visualize os sprites normais e shiny de cada Pokémon.
-   **🔊 Áudio Original**: Ouça o "cry" oficial de cada Pokémon (cuidado com o volume!).
-   **🧬 Formas Alternativas**: Explore as diferentes formas e variações de um Pokémon (ex: Mega Evoluções, formas regionais).
-   **📊 Atributos Detalhados**: Veja os status de combate (HP, Ataque, Defesa, etc.) em um gráfico de barras claro e informativo.
-   **🛡️ Tipos e Fraquezas**: Identifique os tipos do Pokémon com badges estilizadas e veja suas fraquezas (dano 2x e 4x).
-   **🎨 Interface Moderna**: Desfrute de um tema escuro e um layout limpo e organizado.

---

## ⚙️ Tecnologias Utilizadas

-   **🐍 Python 3**: Linguagem principal do projeto.
-   **streamlit**: Framework para a criação da interface web interativa.
-   **requests**: Biblioteca para realizar as requisições à PokeAPI.
-   **PokeAPI**: Fonte de todos os dados dos Pokémons.

---

## 📂 Estrutura do Projeto

O código foi modularizado para facilitar a manutenção e escalabilidade:

```
pokedex/
├── src/
│   ├── __init__.py
│   ├── pokeapi.py      # Módulo para interagir com a PokeAPI
│   └── ui.py           # Módulo para componentes de UI (estilos, badges)
├── assets/
│   ├── pokedex.png     # Imagens para o README
│   └── atributos.png
├── pokedex.py          # Arquivo principal da aplicação Streamlit
├── requirements.txt    # Dependências do projeto
└── README.md           # Este arquivo
```

---

## 🏁 Como Executar Localmente

Siga os passos abaixo para rodar a Pokédex em sua máquina.

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/BrianAshihara/pokedex.git
    cd pokedex
    ```

2.  **Instale as dependências:**
    Certifique-se de ter o Python 3 instalado e execute o comando abaixo para instalar as bibliotecas necessárias.
    ```bash
    pip install -r requirements.txt
    ```

3.  **Execute a aplicação:**
    ```bash
    streamlit run pokedex.py
    ```
    A aplicação será aberta automaticamente no seu navegador padrão.

---

<footer>
  <p align="center">
    Feito com ❤️ por <b>Brian Ashihara</b>
  </p>
</footer>
<h1 align="center">Pokédex</h1>

<p align="center">
  Pokédex web interativa construída em Python e Streamlit, com dados em tempo real da <a href="https://pokeapi.co/">PokeAPI</a>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/Streamlit-1.54-FF4B4B?logo=streamlit&logoColor=white" alt="Streamlit 1.54">
  <img src="https://img.shields.io/badge/dados-PokeAPI-EF5350" alt="PokeAPI">
</p>

<p align="center">
  <img src="assets/pokedex.png" alt="Tela da Pokédex mostrando o Charizard: card com arte oficial, dados da Pokédex, habilidades, dano recebido e hexágono de atributos base" width="90%">
</p>

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Executando localmente](#executando-localmente)
- [Deploy](#deploy)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)
- [Créditos](#créditos)

## Visão geral

O projeto reúne em uma única tela as informações mais consultadas sobre um Pokémon: tipos, atributos base, fraquezas e resistências, habilidades, formas alternativas e a cadeia de evolução completa. A interface segue a linguagem visual dos jogos da série principal, com layout em colunas no desktop e empilhado em telas menores.

## Funcionalidades

### Busca e navegação

- Busca por nome ou número da Pokédex nacional, tolerante a espaços e pontuação (`mr mime`, `deoxys`, `25`).
- Navegação sequencial pela numeração nacional, exibindo o nome do Pokémon anterior e do próximo.
- Sorteio de um Pokémon aleatório entre todas as espécies disponíveis na API.
- Estado refletido na URL (`?p=charizard`), permitindo compartilhar links e usar o histórico do navegador.

### Informações exibidas

| Seção | Conteúdo |
| --- | --- |
| Card principal | Arte oficial, sprite em pixel ou animado, versão shiny, tipos, categoria e marcação de lendário, mítico ou bebê |
| Dados da Pokédex | Altura, peso, proporção de gênero, taxa de captura, experiência base, geração e descrição |
| Habilidades | Habilidades regulares e oculta, com a descrição de cada uma |
| Dano recebido | Multiplicadores 4×, 2×, ½×, ¼× e 0× calculados a partir da combinação de tipos |
| Atributos base | Hexágono no estilo de Sword/Shield, barras por faixa de valor e mínimo/máximo no nível 100 |
| Formas alternativas | Mega, Gigantamax, formas regionais e demais variedades da espécie |
| Evolução | Árvore completa com ramificações (ex.: Eevee, Wurmple), métodos de evolução e links para cada estágio |
| Golpes | Golpes aprendidos por nível, ovo, MT e tutor em cada jogo, com tipo, categoria, poder, precisão, PP e efeito |

### Laboratório

Página separada, acessível pelo menu no topo ou pelo botão "Abrir no Laboratório" no card do Pokémon.

- **Calculadora de atributos reais**: escolha nível, natureza, IVs e EVs e veja os atributos finais no hexágono, com o atributo favorecido pela natureza em vermelho e o desfavorecido em azul, como nos jogos. Inclui atalhos para IVs e distribuições comuns de EVs, e avisa quando o total passa de 510.
- **Comparador**: até três Pokémon com os hexágonos sobrepostos e tabela lado a lado destacando o maior valor de cada atributo, por atributos base ou nos níveis 50 e 100.

<p align="center">
  <img src="assets/evolucao.png" alt="Cadeia de evolução ramificada do Eevee com todas as oito evoluções e seus métodos" width="90%">
</p>

## Stack

| Camada | Tecnologia |
| --- | --- |
| Linguagem | Python 3.10+ |
| Interface | Streamlit 1.54, com HTML, CSS e SVG customizados |
| Cliente HTTP | requests |
| Fonte de dados | PokeAPI v2 |

## Arquitetura

A aplicação é dividida em três módulos com responsabilidades separadas:

- **`pokedex.py`**: ponto de entrada. Aplica o tema e define a navegação entre as páginas.
- **`views/`**: uma página por arquivo (`pokedex.py` e `laboratorio.py`), responsáveis pelo layout e pelo estado de cada tela.
- **`src/pokeapi.py`**: acesso à PokeAPI. Resolve nomes, busca espécies, tipos, habilidades, golpes e cadeias de evolução, e calcula a efetividade de tipos.
- **`src/stats.py`**: regras do jogo sem dependência de interface: fórmulas de atributos, naturezas e limites de IVs e EVs.
- **`src/ui.py`**: camada de apresentação. Gera o HTML dos componentes, os gráficos SVG e o tema visual.

Decisões de desempenho:

- **Cache**: todas as respostas da API são armazenadas com `st.cache_data` por uma hora.
- **Payload reduzido**: a resposta de `/pokemon` é compactada antes de entrar no cache (a lista de golpes, cerca de 90% do tamanho, vira um índice enxuto por jogo).
- **Paralelismo**: tipos, habilidades, golpes, MTs e sprites da evolução são buscados em paralelo com `ThreadPoolExecutor`.
- **Fragmentos**: a seção de golpes usa `st.fragment`, então trocar de jogo não recarrega o restante da página.
- **Tratamento de falhas**: erros de rede não são cacheados e resultam em uma mensagem amigável, sem interromper a aplicação.

## Executando localmente

**Pré-requisitos:** Python 3.10 ou superior e `pip`.

```bash
git clone https://github.com/BrianAshihara/pokedex.git
cd pokedex
pip install -r requirements.txt
python -m streamlit run pokedex.py
```

A aplicação ficará disponível em `http://localhost:8501`.

## Deploy

O projeto está preparado para o [Streamlit Community Cloud](https://streamlit.io/cloud):

1. Conecte o repositório ao Streamlit Community Cloud.
2. Defina `main` como branch e `pokedex.py` como arquivo principal.
3. Selecione Python 3.10 ou superior nas configurações avançadas.

Cada push para a branch `main` dispara um novo deploy automaticamente.

## Estrutura do projeto

```
pokedex/
├── .streamlit/
│   └── config.toml      # Tema e configurações do servidor
├── assets/              # Imagens usadas neste README
├── src/
│   ├── __init__.py
│   ├── pokeapi.py       # Integração com a PokeAPI
│   ├── stats.py         # Fórmulas de atributos e naturezas
│   └── ui.py            # Componentes visuais e estilos
├── views/
│   ├── pokedex.py       # Página principal da Pokédex
│   └── laboratorio.py   # Calculadora e comparador
├── pokedex.py           # Ponto de entrada e navegação
├── requirements.txt
└── README.md
```

## Roadmap

- [ ] Autocomplete na busca, com tolerância a erros de digitação
- [ ] Filtros por tipo, geração e categoria
- [ ] Montador de time com análise de cobertura de fraquezas
- [ ] Testes automatizados e pipeline de CI

## Créditos

Desenvolvido por **Brian Ashihara**.

Dados fornecidos pela [PokeAPI](https://pokeapi.co/). Pokémon e seus respectivos nomes são marcas registradas da Nintendo, Game Freak e The Pokémon Company. Este é um projeto de fãs, sem fins comerciais e sem afiliação oficial.

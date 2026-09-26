# src/ui.py

import html
import math

import streamlit as st

from src.stats import stat_range_lv100

TYPE_COLORS = {
    "normal": "#a8a878",
    "fire": "#f08030",
    "water": "#6890f0",
    "electric": "#f8d030",
    "grass": "#78c850",
    "ice": "#98d8d8",
    "fighting": "#c03028",
    "poison": "#a040a0",
    "ground": "#e0c068",
    "flying": "#a890f0",
    "psychic": "#f85888",
    "bug": "#a8b820",
    "rock": "#b8a038",
    "ghost": "#705898",
    "dragon": "#7038f8",
    "dark": "#705848",
    "steel": "#b8b8d0",
    "fairy": "#ee99ac",
    "stellar": "#40b5a5",
    "unknown": "#68a090",
}

GLOBAL_STYLE = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
    --bg: #0d0f14;
    --surface: #151922;
    --surface-2: #1c2130;
    --border: rgba(255, 255, 255, 0.07);
    --border-strong: rgba(255, 255, 255, 0.14);
    --text: #eef1f6;
    --muted: #8b93a7;
    --yellow: #ffcb05;
    --yellow-deep: #e0a800;
    --red: #e3350d;
    --blue: #3b4cca;
    --radius: 16px;
}

.stApp {
    background:
        radial-gradient(1200px 600px at 10% -10%, rgba(59, 76, 202, 0.16), transparent 60%),
        radial-gradient(900px 500px at 110% 0%, rgba(227, 53, 13, 0.10), transparent 60%),
        var(--bg);
    color: var(--text);
    font-family: 'Outfit', 'Source Sans Pro', sans-serif;
}
.stApp p, .stApp label, .stApp input, .stApp button, .stApp li { font-family: 'Outfit', 'Source Sans Pro', sans-serif; }
header[data-testid="stHeader"] { background: transparent; }
[data-testid="stMainBlockContainer"], .block-container {
    max-width: 1440px;
    padding-top: 4.2rem;
    padding-bottom: 2rem;
}

.stTextInput [data-baseweb="input"] {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    transition: border-color .15s, box-shadow .15s;
}
.stTextInput [data-baseweb="input"]:focus-within {
    border-color: var(--yellow);
    box-shadow: 0 0 0 3px rgba(255, 203, 5, 0.18);
}
.stTextInput input { color: var(--text); font-size: 1rem; padding: 0.7rem 0.9rem; }
.stSelectbox [data-baseweb="select"] > div {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 12px;
}
.stButton button {
    border-radius: 12px;
    font-weight: 600;
    min-height: 2.9rem;
    transition: transform .12s, background .15s, border-color .15s;
}
.stButton button[kind="secondary"] {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    color: var(--text);
}
.stButton button[kind="secondary"]:hover:not(:disabled) {
    border-color: var(--yellow);
    color: var(--yellow);
    transform: translateY(-1px);
}
.stButton button[kind="primary"] {
    background: linear-gradient(180deg, #ffd83d, var(--yellow));
    border: 1px solid var(--yellow-deep);
    color: #1a1a1a;
    box-shadow: 0 6px 18px rgba(255, 203, 5, 0.18);
}
.stButton button[kind="primary"]:hover { transform: translateY(-1px); filter: brightness(1.05); color: #000; }
.stButton button:disabled { opacity: 0.35; }
[data-testid="stPageLink"] a {
    justify-content: center;
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    padding: 0.5rem 0.9rem;
    transition: border-color .15s, background .15s;
}
[data-testid="stPageLink"] a:hover { border-color: var(--yellow); background: rgba(255, 203, 5, 0.06); }
.st-key-nav_next button { justify-content: flex-end; }
.st-key-nav_prev button { justify-content: flex-start; }

.brand { display: flex; align-items: center; gap: 12px; }
.brand svg { width: 42px; height: 42px; filter: drop-shadow(0 4px 10px rgba(227, 53, 13, 0.35)); }
.brand-title { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: var(--text); }
.brand-title span { color: var(--yellow); }
.brand-sub { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
.brand-sub a { color: var(--muted); text-decoration: underline; text-decoration-color: rgba(255,255,255,0.2); }

.card {
    background: linear-gradient(180deg, var(--surface-2), var(--surface));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    margin-bottom: 14px;
}
.card-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--muted);
    margin-bottom: 14px;
}
.card-title::before {
    content: ""; width: 4px; height: 14px; border-radius: 2px;
    background: var(--accent, var(--yellow));
}

.hero {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    padding: 18px 20px 22px;
    border: 1px solid var(--border-strong);
    background:
        radial-gradient(circle at 50% 38%, var(--glow) 0%, transparent 62%),
        linear-gradient(160deg, var(--tint1) 0%, var(--tint2) 55%, var(--surface) 100%);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    margin-bottom: 12px;
}
.hero-ball {
    position: absolute; right: -70px; top: 40px;
    width: 300px; height: 300px; opacity: 0.08;
    animation: spin 60s linear infinite;
}
.hero-top { display: flex; justify-content: space-between; align-items: center; position: relative; }
.dex-no { font-weight: 800; font-size: 1.05rem; color: rgba(255,255,255,0.75); letter-spacing: 0.04em; }
.tag {
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
    padding: 4px 10px; border-radius: 999px;
    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.18); color: #fff;
}
.tag.legendary { background: linear-gradient(90deg, #b8860b, #ffcb05); color: #1a1a1a; border: none; }
.tag.mythical { background: linear-gradient(90deg, #8e44ad, #ee99ac); border: none; }
.hero-art { display: flex; justify-content: center; align-items: center; height: 250px; position: relative; }
.hero-art img {
    max-width: 250px; max-height: 250px;
    filter: drop-shadow(0 16px 18px rgba(0,0,0,0.45));
    animation: float 4.5s ease-in-out infinite;
}
.hero-art img.pixel { width: 288px; height: 288px; max-width: none; max-height: none; margin: -19px; object-fit: contain; image-rendering: pixelated; }
.hero-art img.anim { max-width: 160px; max-height: 160px; min-height: 90px; image-rendering: pixelated; transform: scale(1.5); animation: none; }
.hero-art .no-art { color: var(--muted); }
.hero-name { position: relative; z-index: 1; font-size: 2.1rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; color: #fff; margin: 4px 0 2px; text-align: center; }
.hero-genus { text-align: center; color: rgba(255,255,255,0.7); font-size: 0.95rem; margin-bottom: 12px; }
.hero .types { display: flex; justify-content: center; gap: 8px; }

@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes spin { to { transform: rotate(360deg); } }

.type-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px;
    border-radius: 8px;
    font-weight: 700; font-size: 0.78rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: #fff;
    background: linear-gradient(180deg, color-mix(in srgb, var(--t) 80%, #fff 20%), var(--t));
    border: 1px solid color-mix(in srgb, var(--t) 60%, #000 40%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.25);
    text-shadow: 0 1px 2px rgba(0,0,0,0.75);
    white-space: nowrap;
}
.type-badge.sm { padding: 3px 10px; font-size: 0.68rem; border-radius: 6px; }

.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tile {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
}
.tile .k { display: block; font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.tile .v { display: block; font-size: 1.05rem; font-weight: 700; color: var(--text); margin-top: 2px; white-space: nowrap; }
.tile .v.sm { font-size: 0.88rem; }
.tile .v .m { color: #6ab0ff; }
.tile .v .f { color: #ff7aa8; }
.flavor {
    margin-top: 14px; padding: 12px 14px;
    border-left: 3px solid var(--accent, var(--yellow));
    background: rgba(255,255,255,0.025);
    border-radius: 0 10px 10px 0;
    color: #c9cfdb; font-size: 0.92rem; line-height: 1.5; font-style: italic;
}

.ability-pill {
    display: inline-block;
    background: rgba(255,255,255,0.06);
    color: var(--text);
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.85rem; font-weight: 600;
    margin: 0 6px 6px 0;
    border: 1px solid var(--border-strong);
}
.ability-pill.hidden {
    background: rgba(184, 160, 120, 0.14);
    color: #e2d2ac;
    border-color: rgba(184, 160, 120, 0.4);
}
.ability-pill small { opacity: 0.7; font-weight: 500; margin-left: 4px; }

.ability-row { padding: 8px 0; border-top: 1px solid var(--border); }
.ability-row:first-of-type { border-top: none; padding-top: 0; }
.ability-row .ability-pill { margin: 0 0 6px; }
.ability-desc { color: #b9c0cf; font-size: 0.86rem; line-height: 1.45; }

.mu-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; border-top: 1px solid var(--border); }
.mu-row:first-of-type { border-top: none; padding-top: 0; }
.mu-mult {
    flex: 0 0 44px; text-align: center;
    font-weight: 800; font-size: 0.85rem;
    padding: 3px 0; border-radius: 6px;
}
.mu-mult.x4 { background: rgba(243, 68, 68, 0.2); color: #ff6b6b; }
.mu-mult.x2 { background: rgba(255, 127, 15, 0.18); color: #ffa24d; }
.mu-mult.x05 { background: rgba(35, 205, 94, 0.15); color: #4ade80; }
.mu-mult.x025 { background: rgba(0, 194, 184, 0.15); color: #2dd4bf; }
.mu-mult.x0 { background: rgba(255,255,255,0.08); color: #b5bccb; }
.mu-types { display: flex; flex-wrap: wrap; gap: 6px; }
.muted { color: var(--muted); font-size: 0.88rem; }

.stats-hex { display: flex; justify-content: center; margin: -4px 0 8px; }
.stats-hex svg { width: 100%; max-width: 380px; height: auto; overflow: visible; }
.hex-grow { animation: hexGrow .7s cubic-bezier(.2,.9,.3,1.2) both; }
@keyframes hexGrow { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.stat-table { width: 100%; border-collapse: collapse; border: none; margin: 0; display: table; }
.stat-table tr, .stat-table td, .stat-table th { border: none !important; background: transparent !important; }
.stat-table th {
    font-size: 0.64rem; color: var(--muted); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    text-align: right; padding: 0 0 6px;
}
.stat-table td { padding: 5px 0; font-size: 0.88rem; }
.stat-table .s-name { color: var(--muted); width: 64px; }
.stat-table .s-val { font-weight: 800; text-align: right; width: 38px; padding-right: 12px; font-variant-numeric: tabular-nums; }
.stat-table .s-range { text-align: right; width: 40px; color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.bar-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
.bar-fill {
    height: 100%; border-radius: 999px;
    box-shadow: inset 0 -2px 0 rgba(0,0,0,0.18);
    animation: barGrow .8s ease-out both;
    transform-origin: left;
}
@keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.stat-table tr.total td { border-top: 1px solid var(--border-strong); padding-top: 9px; }
.stat-table tr.total .s-name, .stat-table tr.total .s-val { color: var(--yellow); }
.stat-note { font-size: 0.72rem; color: var(--muted); margin-top: 8px; text-align: right; }

.evo-scroll { overflow-x: auto; padding-bottom: 4px; }
.evo-tree { display: flex; justify-content: center; min-width: max-content; }
.evo-stage { display: flex; align-items: center; }
.evo-branches { display: flex; flex-direction: column; gap: 10px; }
.evo-branches.many { display: grid; grid-template-columns: repeat(2, auto); gap: 8px 18px; }
.evo-branches.many.wide { grid-template-columns: repeat(4, auto); }
.evo-branch { display: flex; align-items: center; }
.evo-node {
    display: flex; flex-direction: column; align-items: center;
    width: 108px; padding: 8px 6px 10px;
    border-radius: 14px;
    background: rgba(255,255,255,0.035);
    border: 1px solid var(--border);
    text-decoration: none !important;
    transition: transform .15s, border-color .15s, background .15s;
}
.evo-node:hover { transform: translateY(-3px); border-color: var(--yellow); background: rgba(255, 203, 5, 0.06); }
.evo-node.current { border-color: var(--accent, var(--yellow)); background: rgba(255,255,255,0.07); box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
.evo-node img { width: 80px; height: 80px; image-rendering: pixelated; }
.evo-node .evo-name { font-size: 0.82rem; font-weight: 600; color: var(--text); text-align: center; line-height: 1.15; }
.evo-link { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 10px; min-width: 92px; }
.evo-method {
    font-size: 0.7rem; font-weight: 600; color: var(--yellow);
    background: rgba(255, 203, 5, 0.1); border: 1px solid rgba(255, 203, 5, 0.3);
    padding: 3px 9px; border-radius: 999px; text-align: center; max-width: 150px;
}
.evo-arrow { width: 100%; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,203,5,0.6)); position: relative; }
.evo-arrow::after {
    content: ""; position: absolute; right: -1px; top: -4px;
    border-left: 7px solid rgba(255,203,5,0.8); border-top: 5px solid transparent; border-bottom: 5px solid transparent;
}

[class*="st-key-hero_controls"] {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 14px;
}
[data-testid="stAudio"] { height: 40px; }

[class*="st-key-moves_panel"] {
    background: linear-gradient(180deg, var(--surface-2), var(--surface));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
[class*="st-key-moves_panel"] .card-title { margin-bottom: 0; }
.mv-scroll { max-height: 520px; overflow: auto; border-radius: 12px; border: 1px solid var(--border); }
.mv-table { width: 100%; border-collapse: collapse; margin: 0; display: table; font-size: 0.86rem; }
.mv-table tr, .mv-table td, .mv-table th { border: none !important; background: transparent; }
.mv-table thead th {
    position: sticky; top: 0; z-index: 1;
    background: var(--surface-2) !important;
    font-size: 0.66rem; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    text-align: left; padding: 10px 12px;
    box-shadow: inset 0 -1px 0 var(--border-strong);
}
.mv-table td { padding: 8px 12px; vertical-align: middle; border-top: 1px solid var(--border) !important; }
.mv-table tbody tr:hover td { background: rgba(255,255,255,0.03) !important; }
.mv-table .mv-first { width: 56px; color: var(--yellow); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.mv-table .mv-name { font-weight: 700; color: var(--text); white-space: nowrap; }
.mv-table .mv-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; width: 70px; }
.mv-table td.mv-effect { color: var(--muted); font-size: 0.8rem; line-height: 1.35; }
.mv-table .mv-effect { min-width: 240px; }
.mv-cat {
    display: inline-block; padding: 2px 9px; border-radius: 6px;
    font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #fff;
}
.mv-cat.physical { background: #c92112; }
.mv-cat.special { background: #4f5870; }
.mv-cat.status { background: #8c888c; }

[class*="st-key-calc_inputs"], [class*="st-key-cmp_panel"] {
    background: linear-gradient(180deg, var(--surface-2), var(--surface));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.page-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text); line-height: 1.1; }
.page-sub { color: var(--muted); font-size: 0.9rem; margin-top: 4px; }
.mini-mon {
    display: flex; gap: 12px; align-items: center;
    padding: 10px 14px; border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border); border-left: 4px solid var(--c);
    margin-bottom: 12px;
}
.mini-mon img { width: 72px; height: 72px; object-fit: contain; filter: drop-shadow(0 6px 8px rgba(0,0,0,0.4)); }
.mini-no { font-size: 0.72rem; color: var(--muted); font-weight: 700; letter-spacing: 0.04em; }
.mini-name { font-size: 1.15rem; font-weight: 800; color: var(--text); line-height: 1.2; }
.mini-sub { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
.mini-mon .types { display: flex; gap: 4px; margin-top: 5px; }
.calc-head { font-size: 0.64rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.calc-stat { font-weight: 700; color: var(--text); font-size: 0.92rem; white-space: nowrap; }
.calc-base { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.92rem; }
.nat-tag { font-size: 0.66rem; font-weight: 800; padding: 1px 6px; border-radius: 5px; margin-left: 6px; vertical-align: middle; }
.nat-tag.up { background: rgba(255,107,107,0.16); color: #ff6b6b; }
.nat-tag.down { background: rgba(106,176,255,0.16); color: #6ab0ff; }
.ev-meter { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; color: var(--muted); margin-top: 6px; }
.ev-meter .bar-track { flex: 1; }
.ev-meter b { color: var(--text); font-variant-numeric: tabular-nums; }
.lab-table { width: 100%; border-collapse: collapse; margin: 0; display: table; font-size: 0.9rem; }
.lab-table tr, .lab-table td, .lab-table th { border: none !important; background: transparent !important; }
.lab-table th {
    font-size: 0.64rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em;
    text-align: right; padding: 0 8px 8px;
}
.lab-table th:first-child, .lab-table td:first-child { text-align: left; padding-left: 0; }
.lab-table td { padding: 7px 8px; text-align: right; font-variant-numeric: tabular-nums; border-top: 1px solid var(--border) !important; }
.lab-table td.name { color: var(--muted); font-weight: 600; }
.lab-table td.name.up { color: #ff6b6b; }
.lab-table td.name.down { color: #6ab0ff; }
.lab-table td.final { font-weight: 800; font-size: 1.05rem; color: #fff; }
.lab-table td.best { font-weight: 800; }
.lab-table td.dim { color: var(--muted); }
.lab-table tr.total td { border-top: 1px solid var(--border-strong) !important; font-weight: 800; color: var(--yellow); }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; font-size: 0.82rem; color: var(--muted); margin-top: 4px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); display: inline-block; }

.footer {
    text-align: center; color: var(--muted); font-size: 0.82rem;
    margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--border);
}
.footer b { color: var(--text); }

@media (max-width: 640px) {
    [class*="st-key-calc_inputs"] [data-testid="stHorizontalBlock"] { flex-wrap: nowrap !important; gap: 0.5rem; }
    [class*="st-key-calc_inputs"] [data-testid="stColumn"] { min-width: 0 !important; }
    [class*="st-key-calc_inputs"] .calc-head { font-size: 0.56rem; }
    [class*="st-key-calc_inputs"] [data-testid="stNumberInput"] button { display: none; }
}

@media (max-width: 900px) {
    .mv-table .mv-effect { display: none; }
    .info-grid { grid-template-columns: repeat(2, 1fr); }
    .evo-tree { justify-content: flex-start; }
}
</style>
"""

POKEBALL_SVG = """
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="{cls}">
  <circle cx="50" cy="50" r="46" fill="{top}" stroke="{stroke}" stroke-width="6"/>
  <path d="M4 50 A46 46 0 0 0 96 50 Z" fill="{bottom}" stroke="{stroke}" stroke-width="6"/>
  <line x1="4" y1="50" x2="96" y2="50" stroke="{stroke}" stroke-width="6"/>
  <circle cx="50" cy="50" r="13" fill="{bottom}" stroke="{stroke}" stroke-width="6"/>
</svg>
"""


def render(markup):
    st.markdown(" ".join(line.strip() for line in markup.splitlines()), unsafe_allow_html=True)


def pokeball(cls="", top="#e3350d", bottom="#f4f4f4", stroke="#1a1a1a"):
    return POKEBALL_SVG.format(cls=cls, top=top, bottom=bottom, stroke=stroke)


def _hex_to_rgba(hex_color, alpha):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r}, {g}, {b}, {alpha})"


def type_color(type_name):
    return TYPE_COLORS.get(type_name, TYPE_COLORS["unknown"])


def format_pokemon_display_name(name):
    return str(name or "").replace("-", " ").title()


def format_dex_number(number):
    return f"#{int(number):04d}"


def type_badge(type_name, small=False):
    cls = "type-badge sm" if small else "type-badge"
    return f'<span class="{cls}" style="--t:{type_color(type_name)}">{html.escape(type_name)}</span>'


def brand_html():
    return f"""
<div class="brand">
  {pokeball()}
  <div>
    <div class="brand-title">Poké<span>dex</span></div>
    <div class="brand-sub">Dados em tempo real da <a href="https://pokeapi.co/" target="_blank">PokeAPI</a></div>
  </div>
</div>
"""


def hero_html(dados, species, genus, image_url, image_mode, shiny):
    types = [t["type"]["name"] for t in dados.get("types", [])]
    c1 = type_color(types[0] if types else "unknown")
    c2 = type_color(types[1]) if len(types) > 1 else c1

    name = format_pokemon_display_name(dados["name"])
    dex_no = format_dex_number((species or {}).get("id") or dados["id"])

    species = species or {}
    tags = []
    if species.get("is_legendary"):
        tags.append('<span class="tag legendary">Lendário</span>')
    elif species.get("is_mythical"):
        tags.append('<span class="tag mythical">Mítico</span>')
    elif species.get("is_baby"):
        tags.append('<span class="tag">Bebê</span>')
    if shiny:
        tags.append('<span class="tag">Shiny</span>')
    tag = f'<span style="display:flex; gap:6px">{"".join(tags)}</span>'

    if image_url:
        img_cls = {"pixel": "pixel", "anim": "anim"}.get(image_mode, "")
        art = f'<img class="{img_cls}" src="{html.escape(image_url)}" alt="{html.escape(name)}">'
    else:
        art = '<span class="no-art">Imagem indisponível</span>'

    return f"""
<div class="hero" style="--tint1:{_hex_to_rgba(c1, 0.55)}; --tint2:{_hex_to_rgba(c2, 0.22)}; --glow:{_hex_to_rgba(c1, 0.55)};">
  {pokeball("hero-ball", top="none", bottom="none", stroke="#fff")}
  <div class="hero-top"><span class="dex-no">{dex_no}</span>{tag}</div>
  <div class="hero-art">{art}</div>
  <div class="hero-name">{html.escape(name)}</div>
  <div class="hero-genus">{html.escape(genus)}</div>
  <div class="types">{"".join(type_badge(t) for t in types)}</div>
</div>
"""


def _gender_html(gender_rate):
    if gender_rate is None:
        return "?"
    if gender_rate < 0:
        return "Sem gênero"
    female = gender_rate / 8 * 100
    male = 100 - female
    fmt = lambda v: f"{v:.1f}".rstrip("0").rstrip(".").replace(".", ",")
    return f'<span class="m">♂ {fmt(male)}%</span> <span class="f">♀ {fmt(female)}%</span>'


def _roman_generation(generation_name):
    suffix = str(generation_name or "").replace("generation-", "")
    return f"Gen {suffix.upper()}" if suffix else "?"


def info_card_html(dados, species, flavor, accent):
    fmt = lambda v: f"{v:.1f}".replace(".", ",")
    species = species or {}
    capture = species.get("capture_rate")
    tiles = [
        ("Altura", f"{fmt(dados.get('height', 0) / 10)} m"),
        ("Peso", f"{fmt(dados.get('weight', 0) / 10)} kg"),
        ("Gênero", _gender_html(species.get("gender_rate"))),
        ("Captura", capture if capture is not None else "?"),
        ("Exp. base", dados.get("base_experience") or "?"),
        ("Geração", _roman_generation((species.get("generation") or {}).get("name"))),
    ]
    tiles_html = "".join(
        f'<div class="tile"><span class="k">{k}</span><span class="v{" sm" if k == "Gênero" else ""}">{v}</span></div>' for k, v in tiles
    )
    flavor_html = f'<div class="flavor">{html.escape(flavor)}</div>' if flavor else ""
    return f"""
<div class="card" style="--accent:{accent}">
  <div class="card-title">Dados da Pokédex</div>
  <div class="info-grid">{tiles_html}</div>
  {flavor_html}
</div>
"""


def abilities_card_html(abilities, accent):
    rows = []
    for a in abilities:
        pill_cls = "ability-pill hidden" if a["hidden"] else "ability-pill"
        tag = "<small>oculta</small>" if a["hidden"] else ""
        description = f'<div class="ability-desc">{html.escape(a["description"])}</div>' if a["description"] else ""
        rows.append(f'<div class="ability-row"><span class="{pill_cls}">{html.escape(a["name"])}{tag}</span>{description}</div>')
    body = "".join(rows) or '<span class="muted">Nenhuma habilidade registrada.</span>'
    return f'<div class="card" style="--accent:{accent}"><div class="card-title">Habilidades</div>{body}</div>'


_CATEGORY_LABELS = {"physical": "Físico", "special": "Especial", "status": "Status"}
_MACHINE_PREFIXES = {"TM": "MT", "HM": "MO", "TR": "DT"}


def _machine_label(label):
    for en, pt in _MACHINE_PREFIXES.items():
        if label.startswith(en):
            return pt + label[len(en):]
    return label or "?"


def moves_table_html(rows, method):
    first_header = {"level-up": "Nv.", "machine": "MT"}.get(method)
    head = f'<th class="mv-first">{first_header}</th>' if first_header else ""
    body = []
    for r in rows:
        first = ""
        if method == "level-up":
            first = f'<td class="mv-first">{"Evo." if r["level"] == 0 else r["level"]}</td>'
        elif method == "machine":
            first = f'<td class="mv-first">{html.escape(_machine_label(r["machine"]))}</td>'
        category = r["category"]
        body.append(
            f"<tr>{first}"
            f'<td class="mv-name">{html.escape(r["name"])}</td>'
            f"<td>{type_badge(r['type'], small=True)}</td>"
            f'<td><span class="mv-cat {category}">{_CATEGORY_LABELS.get(category, category)}</span></td>'
            f'<td class="mv-num">{r["power"] or "-"}</td>'
            f'<td class="mv-num">{str(r["accuracy"]) + "%" if r["accuracy"] else "-"}</td>'
            f'<td class="mv-num">{r["pp"] or "-"}</td>'
            f'<td class="mv-effect">{html.escape(r["effect"])}</td></tr>'
        )
    return (
        '<div class="mv-scroll"><table class="mv-table"><thead><tr>'
        f'{head}<th>Golpe</th><th>Tipo</th><th>Categoria</th><th class="mv-num">Poder</th>'
        '<th class="mv-num">Precisão</th><th class="mv-num">PP</th><th class="mv-effect">Efeito</th>'
        f'</tr></thead><tbody>{"".join(body)}</tbody></table></div>'
    )


_MATCHUP_ROWS = [
    (4, "x4", "4×"),
    (2, "x2", "2×"),
    (0.5, "x05", "½×"),
    (0.25, "x025", "¼×"),
    (0, "x0", "0×"),
]


def matchups_card_html(matchups, accent):
    rows = []
    for mult, cls, label in _MATCHUP_ROWS:
        types = matchups.get(mult)
        if types:
            badges = "".join(type_badge(t, small=True) for t in sorted(types))
            rows.append(f'<div class="mu-row"><span class="mu-mult {cls}">{label}</span><div class="mu-types">{badges}</div></div>')
    body = "".join(rows) or '<span class="muted">Sem dados de tipo.</span>'
    return f'<div class="card" style="--accent:{accent}"><div class="card-title">Dano recebido</div>{body}</div>'


def _short_method(method):
    full = method or "?"
    options = full.split(" / ")
    if len(options) <= 2:
        return full, full
    options.sort(key=lambda o: not o.startswith("Usar"))
    return f"{options[0]} +{len(options) - 1}", full


def _render_evo_node(node, sprites, current):
    name = node["name"]
    label = html.escape(format_pokemon_display_name(name))
    sprite = sprites.get(name)
    img = f'<img src="{html.escape(sprite)}" alt="{label}">' if sprite else '<div style="height:80px"></div>'
    cls = "evo-node current" if name == current else "evo-node"
    out = [f'<div class="evo-stage"><a class="{cls}" href="?p={html.escape(name)}" target="_self">{img}<span class="evo-name">{label}</span></a>']
    children = node.get("children") or []
    if children:
        many = " many" if len(children) > 3 else ""
        if len(children) > 6:
            many += " wide"
        out.append(f'<div class="evo-branches{many}">')
        for child in children:
            method, full = _short_method(child.get("method"))
            out.append(
                f'<div class="evo-branch"><div class="evo-link"><span class="evo-method" title="{html.escape(full)}">{html.escape(method)}</span>'
                f'<span class="evo-arrow"></span></div>{_render_evo_node(child, sprites, current)}</div>'
            )
        out.append("</div>")
    out.append("</div>")
    return "".join(out)


def evolution_card_html(tree, sprites, current_species, accent):
    if not tree or not tree.get("children"):
        body = '<span class="muted">Este Pokémon não evolui.</span>'
    else:
        body = f'<div class="evo-scroll"><div class="evo-tree">{_render_evo_node(tree, sprites, current_species)}</div></div>'
    return f'<div class="card" style="--accent:{accent}"><div class="card-title">Cadeia de evolução</div>{body}</div>'


def stat_color(value):
    if value < 30:
        return "#f34444"
    if value < 60:
        return "#ff7f0f"
    if value < 90:
        return "#ffdd57"
    if value < 120:
        return "#a0e515"
    if value < 150:
        return "#23cd5e"
    return "#00c2b8"


RADAR_ORDER = ["HP", "Attack", "Defense", "Speed", "Sp. Def", "Sp. Atk"]
NATURE_UP_COLOR = "#ff6b6b"
NATURE_DOWN_COLOR = "#6ab0ff"
COMPARE_COLORS = ["#ffcb05", "#38bdf8", "#f472b6"]


def _radar_svg(series, cap, labels):
    """Hexagono no estilo de Sword/Shield. series: (valores, cor, destaque); labels: (nome, cor, valor, cor do valor)."""
    w, h = 380, 340
    cx, cy = w / 2, h / 2 + 2
    R = 118
    angles = [-math.pi / 2 + i * math.pi / 3 for i in range(6)]

    def pt(r, a, ox=0.0, oy=0.0):
        return ox + r * math.cos(a), oy + r * math.sin(a)

    def poly(radii, ox=0.0, oy=0.0):
        return " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(r, a, ox, oy) for r, a in zip(radii, angles)))

    rings = "".join(
        f'<polygon points="{poly([R * lvl] * 6, cx, cy)}" fill="none" stroke="rgba(255,255,255,{0.07 if lvl < 1 else 0.22})" stroke-width="{1 if lvl < 1 else 1.5}"/>'
        for lvl in (0.25, 0.5, 0.75, 1.0)
    )
    axes = "".join(
        f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x:.1f}" y2="{y:.1f}" stroke="rgba(255,255,255,0.08)"/>'
        for x, y in (pt(R, a, cx, cy) for a in angles)
    )

    shapes = []
    for values, color, featured in series:
        radii = [max(min(int(values.get(s, 0) or 0) / cap, 1.0), 0.04) * R for s in RADAR_ORDER]
        if featured:
            fill = 'fill="url(#hexFill)" filter="url(#hexGlow)"'
            dot_fill, dot_stroke = "#fff6c2", "#e0a800"
        else:
            fill = f'fill="{_hex_to_rgba(color, 0.18)}"'
            dot_fill, dot_stroke = color, "#0d0f14"
        dots = "".join(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{dot_fill}" stroke="{dot_stroke}" stroke-width="1.5"/>'
            for x, y in (pt(r, a) for r, a in zip(radii, angles))
        )
        shapes.append(
            f'<g class="hex-grow"><polygon points="{poly(radii)}" {fill} stroke="{color}" stroke-width="2.2" stroke-linejoin="round"/>{dots}</g>'
        )

    label_svg = []
    for (name, name_color, value_text, value_color), a in zip(labels, angles):
        x, y = pt(R + 22, a, cx, cy)
        ca = math.cos(a)
        anchor = "middle" if abs(ca) < 0.2 else ("start" if ca > 0 else "end")
        if abs(ca) < 0.2:
            y += -14 if math.sin(a) < 0 else 8
        else:
            y -= 6
        value_span = (
            f'<tspan x="{x:.1f}" dy="17" font-size="16" font-weight="800" fill="{value_color}">{html.escape(value_text)}</tspan>'
            if value_text else ""
        )
        label_svg.append(
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-family="Outfit, sans-serif">'
            f'<tspan x="{x:.1f}" font-size="11" font-weight="700" fill="{name_color}" letter-spacing="0.6">{html.escape(name.upper())}</tspan>'
            f"{value_span}</text>"
        )

    return f"""
<div class="stats-hex">
<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="hexPlate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3145"/><stop offset="1" stop-color="#1a1f2d"/>
    </linearGradient>
    <linearGradient id="hexFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff07a" stop-opacity="0.95"/><stop offset="1" stop-color="#f5b700" stop-opacity="0.85"/>
    </linearGradient>
    <filter id="hexGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <polygon points="{poly([R + 8] * 6, cx, cy)}" fill="url(#hexPlate)" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
  {rings}
  {axes}
  <g transform="translate({cx:.1f},{cy:.1f})">{"".join(shapes)}</g>
  {"".join(label_svg)}
</svg>
</div>
"""


def create_stats_radar(stats, cap=180):
    labels = [(s, "#8b93a7", str(int(stats.get(s, 0) or 0)), stat_color(int(stats.get(s, 0) or 0))) for s in RADAR_ORDER]
    return _radar_svg([(stats, "#ffcb05", True)], cap, labels)


def create_final_stats_radar(final_stats, nature_up=None, nature_down=None):
    cap = max(max(final_stats.values(), default=1), 1) * 1.05
    labels = []
    for s in RADAR_ORDER:
        name_color = NATURE_UP_COLOR if s == nature_up else NATURE_DOWN_COLOR if s == nature_down else "#8b93a7"
        labels.append((s, name_color, str(final_stats.get(s, 0)), "#ffffff"))
    return _radar_svg([(final_stats, "#ffcb05", True)], cap, labels)


def create_compare_radar(series_stats, cap):
    series = [(values, COMPARE_COLORS[i], False) for i, values in enumerate(series_stats)]
    labels = [(s, "#8b93a7", "", "") for s in RADAR_ORDER]
    return _radar_svg(series, cap, labels)


def create_stats_bars(stats, cap=200):
    order = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]
    rows = []
    for i, name in enumerate(order):
        value = int(stats.get(name, 0) or 0)
        pct = min(value / cap * 100, 100)
        lo, hi = stat_range_lv100(name, value)
        rows.append(
            f'<tr><td class="s-name">{name}</td><td class="s-val">{value}</td>'
            f'<td><div class="bar-track"><div class="bar-fill" style="width:{pct:.1f}%; background:{stat_color(value)}; animation-delay:{i * 60}ms"></div></div></td>'
            f'<td class="s-range">{lo}</td><td class="s-range">{hi}</td></tr>'
        )
    total = sum(int(stats.get(n, 0) or 0) for n in order)
    rows.append(
        f'<tr class="total"><td class="s-name">Total</td><td class="s-val">{total}</td>'
        f'<td><div class="bar-track"><div class="bar-fill" style="width:{min(total / 720 * 100, 100):.1f}%; background:linear-gradient(90deg,#ffcb05,#ffe066)"></div></div></td>'
        f'<td></td><td></td></tr>'
    )
    return (
        '<table class="stat-table"><thead><tr><th></th><th></th><th></th><th>Mín</th><th>Máx</th></tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table>'
        '<div class="stat-note">Mín / Máx no nível 100 (natureza, IVs e EVs)</div>'
    )


def stats_card_html(stats, accent):
    return f"""
<div class="card" style="--accent:{accent}">
  <div class="card-title">Atributos base</div>
  {create_stats_radar(stats)}
  {create_stats_bars(stats)}
</div>
"""


def footer_html():
    return '<div class="footer">Feito por <b>Brian Ashihara</b> · Dados da PokeAPI · Pokémon é marca registrada da Nintendo/Game Freak</div>'


def pokemon_art(dados):
    sprites = (dados or {}).get("sprites") or {}
    artwork = ((sprites.get("other") or {}).get("official-artwork") or {}).get("front_default")
    return artwork or sprites.get("front_default")


def mini_pokemon_html(dados, species_id=None, color=None, subtitle=""):
    types = [t["type"]["name"] for t in dados.get("types", [])]
    color = color or type_color(types[0] if types else "unknown")
    art = pokemon_art(dados)
    img = f'<img src="{html.escape(art)}" alt="">' if art else ""
    sub = f'<div class="mini-sub">{html.escape(subtitle)}</div>' if subtitle else ""
    return (
        f'<div class="mini-mon" style="--c:{color}">{img}<div>'
        f'<div class="mini-no">{format_dex_number(species_id or dados["id"])}</div>'
        f'<div class="mini-name">{html.escape(format_pokemon_display_name(dados["name"]))}</div>'
        f'<div class="types">{"".join(type_badge(t, small=True) for t in types)}</div>{sub}</div></div>'
    )


def page_header_html(title, subtitle):
    return f'<div><div class="page-title">{html.escape(title)}</div><div class="page-sub">{html.escape(subtitle)}</div></div>'


def nature_tag(stat, nature_up, nature_down):
    if stat == nature_up:
        return '<span class="nat-tag up">+10%</span>'
    if stat == nature_down:
        return '<span class="nat-tag down">-10%</span>'
    return ""


def ev_meter_html(total, limit):
    pct = min(total / limit * 100, 100)
    return (
        '<div class="ev-meter"><span>EVs usados</span>'
        f'<div class="bar-track"><div class="bar-fill" style="width:{pct:.1f}%; background:linear-gradient(90deg,#ffcb05,#ffe066)"></div></div>'
        f"<span><b>{total}</b> / {limit}</span></div>"
    )


def final_stats_table_html(order, base, ivs, evs, final, nature_up, nature_down):
    rows = []
    for s in order:
        cls = "up" if s == nature_up else "down" if s == nature_down else ""
        rows.append(
            f'<tr><td class="name {cls}">{s}</td><td class="dim">{base.get(s, 0)}</td>'
            f'<td class="dim">{ivs.get(s, 0)}</td><td class="dim">{evs.get(s, 0)}</td>'
            f'<td class="final">{final.get(s, 0)}</td></tr>'
        )
    rows.append(
        f'<tr class="total"><td>Total</td><td>{sum(base.values())}</td><td></td><td>{sum(evs.values())}</td>'
        f"<td>{sum(final.values())}</td></tr>"
    )
    return (
        '<table class="lab-table"><thead><tr><th>Atributo</th><th>Base</th><th>IV</th><th>EV</th><th>Final</th></tr></thead>'
        f'<tbody>{"".join(rows)}</tbody></table>'
    )


def compare_legend_html(names):
    items = "".join(
        f'<span><i style="--c:{COMPARE_COLORS[i]}"></i>{html.escape(format_pokemon_display_name(n))}</span>' for i, n in enumerate(names)
    )
    return f'<div class="legend">{items}</div>'


def compare_table_html(order, names, values_list):
    head = "".join(
        f'<th style="color:{COMPARE_COLORS[i]}">{html.escape(format_pokemon_display_name(n))}</th>' for i, n in enumerate(names)
    )
    rows = []
    for s in order + ["Total"]:
        vals = [sum(v.values()) if s == "Total" else v.get(s, 0) for v in values_list]
        best = max(vals)
        cells = "".join(
            f'<td class="best" style="color:{COMPARE_COLORS[i]}">{v}</td>' if v == best and vals.count(best) < len(vals) else f"<td>{v}</td>"
            for i, v in enumerate(vals)
        )
        cls = ' class="total"' if s == "Total" else ""
        rows.append(f'<tr{cls}><td class="name">{s}</td>{cells}</tr>')
    return f'<table class="lab-table"><thead><tr><th>Atributo</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>'

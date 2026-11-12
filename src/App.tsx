import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, type CSSProperties } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigationType, useSearchParams } from 'react-router'
import { BagIcon, BookIcon, FlaskIcon, GithubIcon, GlobeIcon, LinkedinIcon, SparkIcon, SwordIcon } from './components/icons'
import { prefetchContent, useContentPrefetch } from './i18n/content'
import { useI18n, type Language } from './i18n/I18nProvider'
import { FROM_ABILITY_LIST, FROM_MOVE_LIST } from './lib/format'
import { AbilitiesListPage } from './pages/AbilitiesListPage'
import { AbilityPage } from './pages/AbilityPage'
import { ItemPage } from './pages/ItemPage'
import { ItemsListPage } from './pages/ItemsListPage'
import { LabPage } from './pages/LabPage'
import { MovePage } from './pages/MovePage'
import { MovesListPage } from './pages/MovesListPage'
import { WhoIsThatPage } from './pages/WhoIsThatPage'
import { HomePage, PokemonPage } from './pages/PokedexPage'
import { LabStateProvider } from './state/LabState'

function TopNav() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  // A página de um golpe pertence à aba de onde veio: Pokémon se veio de um Pokémon, Golpes nos demais casos.
  const onMove = pathname.startsWith('/golpe/')
  const fromPokemon = onMove && !!params.get('de') && params.get('de') !== FROM_MOVE_LIST
  // A página de uma habilidade segue a mesma regra.
  const onAbility = pathname.startsWith('/habilidade/')
  const abilityFromPokemon = onAbility && !!params.get('de') && params.get('de') !== FROM_ABILITY_LIST
  const onDex = pathname === '/' || pathname.startsWith('/pokemon') || pathname === '/quem-e-esse' || fromPokemon || abilityFromPokemon
  const onMoves = pathname === '/golpes' || (onMove && !fromPokemon)
  const onAbilities = pathname === '/habilidades' || (onAbility && !abilityFromPokemon)
  const onItems = pathname === '/itens' || pathname.startsWith('/item/')
  return (
    <nav className="topnav" aria-label={t.nav.label}>
      <NavLink to="/" className={onDex ? 'active' : undefined}>
        <BookIcon />
        {t.nav.pokemon}
      </NavLink>
      <NavLink to="/golpes" className={onMoves ? 'active' : undefined}>
        <SwordIcon />
        {t.nav.moves}
      </NavLink>
      <NavLink to="/habilidades" className={onAbilities ? 'active' : undefined}>
        <SparkIcon />
        {t.nav.abilities}
      </NavLink>
      <NavLink to="/itens" className={onItems ? 'active' : undefined}>
        <BagIcon />
        {t.nav.items}
      </NavLink>
      <NavLink to="/laboratorio" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <FlaskIcon />
        {/* Com cinco abas, o nome curto é o que cabe no celular. */}
        <span className="nav-full">{t.nav.lab}</span>
        <span className="nav-short">{t.nav.labShort}</span>
      </NavLink>
    </nav>
  )
}

const LANGUAGES: { value: Language; label: string; name: string; htmlLang: string }[] = [
  { value: 'pt', label: 'PT', name: 'Português', htmlLang: 'pt-BR' },
  { value: 'en', label: 'EN', name: 'English', htmlLang: 'en' },
]

// Espera as traduções no máximo isso antes de trocar; depois troca assim mesmo (o texto chega em seguida).
const PREFETCH_WAIT = 400

function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()
  const queryClient = useQueryClient()
  // Último idioma clicado: se o usuário trocar de ideia durante a espera do PT, vale o clique mais recente.
  const latest = useRef(lang)
  // Ao passar o mouse ou focar, já baixa as traduções: a troca para PT chega com as descrições prontas.
  const warmUp = () => void prefetchContent(queryClient)

  const choose = async (next: Language) => {
    latest.current = next
    if (next === lang) return
    if (next === 'pt') await Promise.race([prefetchContent(queryClient), new Promise((resolve) => setTimeout(resolve, PREFETCH_WAIT))])
    if (latest.current === next) setLang(next)
  }

  const active = LANGUAGES.findIndex((l) => l.value === lang)
  return (
    <div className="lang-switch" role="group" aria-label={t.nav.language} onPointerEnter={warmUp} onFocus={warmUp} style={{ '--active': active } as CSSProperties}>
      <span className="lang-thumb" aria-hidden="true" />
      {LANGUAGES.map((l) => (
        <button key={l.value} type="button" lang={l.htmlLang} aria-pressed={l.value === lang} title={l.name} onClick={() => void choose(l.value)}>
          {l.label}
        </button>
      ))}
    </div>
  )
}

function SocialLinks() {
  const { t } = useI18n()
  const links = [
    { href: 'https://github.com/BrianAshihara', label: 'GitHub', Icon: GithubIcon },
    { href: 'https://www.linkedin.com/in/brianashihara', label: 'LinkedIn', Icon: LinkedinIcon },
    { href: 'https://portfolio-brian-ashihara.vercel.app', label: t.nav.portfolio, Icon: GlobeIcon },
  ]
  return (
    <div className="social">
      {links.map(({ href, label, Icon }) => (
        <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
          <Icon />
        </a>
      ))}
    </div>
  )
}

function ScrollToTop() {
  const { pathname, key } = useLocation()
  const navigationType = useNavigationType()
  // Links que só trocam os filtros (ex.: clicar num tipo dentro da lista) também sobem; digitar nos filtros usa replace e não.
  const pushKey = navigationType === 'PUSH' ? key : null
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, pushKey])
  return null
}

export function App() {
  useContentPrefetch()
  return (
    <LabStateProvider>
      <ScrollToTop />
      <div className="container">
        <header className="topbar">
          <TopNav />
          <div className="topbar-end">
            <LanguageSwitch />
            <SocialLinks />
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pokemon/:ref" element={<PokemonPage />} />
            <Route path="/golpes" element={<MovesListPage />} />
            <Route path="/golpe/:slug" element={<MovePage />} />
            <Route path="/habilidades" element={<AbilitiesListPage />} />
            <Route path="/habilidade/:slug" element={<AbilityPage />} />
            <Route path="/itens" element={<ItemsListPage />} />
            <Route path="/item/:slug" element={<ItemPage />} />
            <Route path="/laboratorio" element={<LabPage />} />
            <Route path="/quem-e-esse" element={<WhoIsThatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LabStateProvider>
  )
}

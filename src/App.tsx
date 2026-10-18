import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { BookIcon, FlaskIcon, SwordIcon } from './components/icons'
import { FROM_MOVE_LIST } from './lib/format'
import { LabPage } from './pages/LabPage'
import { MovePage } from './pages/MovePage'
import { MovesListPage } from './pages/MovesListPage'
import { HomePage, PokemonPage } from './pages/PokedexPage'
import { LabStateProvider } from './state/LabState'

function TopNav() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  // A página de um golpe pertence à aba de onde veio: Pokédex se veio de um Pokémon, Golpes nos demais casos.
  const onMove = pathname.startsWith('/golpe/')
  const fromPokemon = onMove && !!params.get('de') && params.get('de') !== FROM_MOVE_LIST
  const onDex = pathname === '/' || pathname.startsWith('/pokemon') || fromPokemon
  const onMoves = pathname === '/golpes' || (onMove && !fromPokemon)
  return (
    <nav className="topnav" aria-label="Páginas">
      <NavLink to="/" className={onDex ? 'active' : undefined}>
        <BookIcon />
        Pokédex
      </NavLink>
      <NavLink to="/golpes" className={onMoves ? 'active' : undefined}>
        <SwordIcon />
        Golpes
      </NavLink>
      <NavLink to="/laboratorio" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <FlaskIcon />
        Laboratório
      </NavLink>
    </nav>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <LabStateProvider>
      <ScrollToTop />
      <div className="container">
        <TopNav />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pokemon/:ref" element={<PokemonPage />} />
            <Route path="/golpes" element={<MovesListPage />} />
            <Route path="/golpe/:slug" element={<MovePage />} />
            <Route path="/laboratorio" element={<LabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LabStateProvider>
  )
}

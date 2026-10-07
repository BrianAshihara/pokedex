import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { BookIcon, FlaskIcon } from './components/icons'
import { LabPage } from './pages/LabPage'
import { HomePage, PokemonPage } from './pages/PokedexPage'
import { LabStateProvider } from './state/LabState'

function TopNav() {
  const { pathname } = useLocation()
  const onDex = pathname === '/' || pathname.startsWith('/pokemon')
  return (
    <nav className="topnav" aria-label="Páginas">
      <NavLink to="/" className={onDex ? 'active' : undefined}>
        <BookIcon />
        Pokédex
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
            <Route path="/laboratorio" element={<LabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LabStateProvider>
  )
}

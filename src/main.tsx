import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import './styles/global.css'

const HOUR = 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados da PokeAPI praticamente não mudam: cache de uma hora, sem refazer ao focar a aba.
      staleTime: HOUR,
      gcTime: HOUR,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

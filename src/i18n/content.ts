import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useI18n } from './I18nProvider'

// Textos da PokeAPI traduzidos para PT-BR (a API não tem português). Gerados a partir de
// scripts/i18n-source.en.json; veja scripts/i18n-content.mjs para atualizar.
export type ContentKind = 'pokedex' | 'abilities' | 'moves'

type Translations = Record<string, string>

// Um chunk por tipo: no modo EN nada disso é baixado.
const LOADERS: Record<ContentKind, () => Promise<Translations>> = {
  pokedex: () => import('./content/pt/pokedex.json').then((m) => m.default as Translations),
  abilities: () => import('./content/pt/abilities.json').then((m) => m.default as Translations),
  moves: () => import('./content/pt/moves.json').then((m) => m.default as Translations),
}

const contentQuery = (kind: ContentKind) =>
  queryOptions({ queryKey: ['content', 'pt', kind], queryFn: LOADERS[kind], staleTime: Infinity, gcTime: Infinity })

/**
 * Tradutor de um tipo de texto da PokeAPI: `text(chave, inglês)`.
 * Em EN devolve o inglês; em PT, a tradução (ou o inglês, se faltar). Enquanto o arquivo
 * carrega devolve '', para a descrição não aparecer em inglês e trocar logo depois.
 */
export function useContentText(kind: ContentKind): (key: string, english: string) => string {
  const { lang } = useI18n()
  const { data, isError } = useQuery({ ...contentQuery(kind), enabled: lang === 'pt' })
  return (key, english) => {
    if (lang !== 'pt' || isError) return english
    return data ? (data[key] ?? english) : ''
  }
}

/** Baixa todas as traduções (no-op se já estiverem em cache). */
export function prefetchContent(queryClient: QueryClient): Promise<void> {
  return Promise.all((Object.keys(LOADERS) as ContentKind[]).map((kind) => queryClient.prefetchQuery(contentQuery(kind)))).then(() => undefined)
}

/** No modo PT, baixa as traduções logo no início, antes de alguma tela precisar delas. */
export function useContentPrefetch() {
  const { lang } = useI18n()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (lang === 'pt') void prefetchContent(queryClient)
  }, [lang, queryClient])
}

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { en } from './en'
import { pt, type Dictionary } from './pt'

export type Language = 'pt' | 'en'

const DICTIONARIES: Record<Language, Dictionary> = { pt, en }
const HTML_LANG: Record<Language, string> = { pt: 'pt-BR', en: 'en-US' }

/** Navegador em português abre em PT; qualquer outro idioma, em EN. */
function browserLanguage(): Language {
  const preferred = typeof navigator === 'undefined' ? '' : (navigator.languages?.[0] ?? navigator.language ?? '')
  return preferred.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

interface I18nValue {
  lang: Language
  setLang: (lang: Language) => void
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [stored, setLang] = usePersistentState<Language>('pokedex:lang', browserLanguage())
  // Valor salvo inválido (versão antiga, edição manual) volta para o padrão do navegador.
  const lang = stored in DICTIONARIES ? stored : browserLanguage()

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang]
  }, [lang])

  return <I18nContext.Provider value={{ lang, setLang, t: DICTIONARIES[lang] }}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n precisa estar dentro de <I18nProvider>')
  return context
}

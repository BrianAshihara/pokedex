import { useState } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * Texto de um campo de busca espelhado na URL. O campo tem estado próprio (a URL atualiza um instante
 * depois e, lida direto, engoliria letras digitadas rápido), mas volta a seguir a URL quando ela muda
 * por navegação (link de tipo, voltar do navegador). A digitação usa replace, então é ignorada aqui.
 */
export function useSearchField(urlValue: string): [string, (value: string) => void] {
  const { key } = useLocation()
  const navigationType = useNavigationType()
  const [value, setValue] = useState(urlValue)
  const [syncedKey, setSyncedKey] = useState(key)
  if (key !== syncedKey) {
    setSyncedKey(key)
    if (navigationType !== 'REPLACE') setValue(urlValue)
  }
  return [value, setValue]
}

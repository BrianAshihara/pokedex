import { useEffect, useState } from 'react'

/** useState que lembra o valor no localStorage (preferências do visitante). */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : (JSON.parse(stored) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Armazenamento indisponível (modo privado, cota cheia): segue só em memória.
    }
  }, [key, value])

  return [value, setValue]
}

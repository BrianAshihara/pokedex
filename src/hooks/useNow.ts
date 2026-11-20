import { useEffect, useState } from 'react'

/** Hora atual que se atualiza sozinha (contagens regressivas e eventos que começam ou acabam com a página aberta). */
export function useNow(interval = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

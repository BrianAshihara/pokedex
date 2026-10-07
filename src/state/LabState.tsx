import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { MAX_IV, mapStats, type Nature, type StatValues } from '../lib/stats'

export type CompareMode = 'base' | '50' | '100'
export type LabTab = 'calc' | 'compare'

export interface LabState {
  tab: LabTab
  calcPokemon: string
  level: number
  nature: Nature
  ivs: StatValues
  evs: StatValues
  compareMode: CompareMode
  /** '' significa "Nenhum" (só permitido no terceiro slot). */
  compare: [string, string, string]
  /** Último Pokémon recebido via ?p=, para não sobrescrever escolhas feitas depois. */
  linked: string | null
}

const INITIAL_STATE: LabState = {
  tab: 'calc',
  calcPokemon: 'garchomp',
  level: 50,
  nature: 'Hardy',
  ivs: mapStats(() => MAX_IV),
  evs: mapStats(() => 0),
  compareMode: 'base',
  compare: ['charizard', 'blastoise', ''],
  linked: null,
}

const LabStateContext = createContext<[LabState, Dispatch<SetStateAction<LabState>>] | null>(null)

export function LabStateProvider({ children }: { children: ReactNode }) {
  const value = useState(INITIAL_STATE)
  return <LabStateContext.Provider value={value}>{children}</LabStateContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useLabState() {
  const context = useContext(LabStateContext)
  if (!context) throw new Error('useLabState precisa estar dentro de <LabStateProvider>')
  return context
}

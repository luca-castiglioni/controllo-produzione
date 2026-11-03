import type { Ruolo } from './types'

export const NOMI_RUOLO: Record<Ruolo, string> = {
  operatore: 'Operatore',
  capo_reparto: 'Capo reparto',
  admin: 'Amministratore',
}

export const LUNGHEZZA_MINIMA_PASSWORD = 6

// Pagine di servizio del menu laterale (solo capo reparto e admin).
// Per aggiungerne una: una voce qui + il suo componente in App.tsx.
export const PAGINE_SERVIZIO = [
  { id: 'operatori', titolo: 'Operatori' },
  { id: 'impianti', titolo: 'Impianti' },
] as const

export type PaginaServizio = (typeof PAGINE_SERVIZIO)[number]['id']

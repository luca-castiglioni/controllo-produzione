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

// Le due sezioni principali condividono elenco, modulo e dettaglio:
// cambiano solo tabella, nomi dei campi ed etichette.
export interface Registro {
  tabella: 'test_incollaggio' | 'validazioni'
  colonnaData: 'data' | 'giorno'
  titolo: string
  etichettaData: string
  etichettaEsito: string
  conNote: boolean
  scriveSoloCapo: boolean // gli operatori vedono ma non inseriscono/modificano
  mostraValidazione: boolean // nel modulo, avvisa se la commessa è già validata
}

export const REGISTRO_TEST: Registro = {
  tabella: 'test_incollaggio',
  colonnaData: 'data',
  titolo: 'Test colla',
  etichettaData: 'Data',
  etichettaEsito: 'Esito test',
  conNote: true,
  scriveSoloCapo: false,
  mostraValidazione: true,
}

export const REGISTRO_VALIDAZIONI: Registro = {
  tabella: 'validazioni',
  colonnaData: 'giorno',
  titolo: 'Validazione',
  etichettaData: 'Giorno',
  etichettaEsito: 'Validazione',
  conNote: false,
  scriveSoloCapo: true,
  mostraValidazione: false,
}

// Quanti giorni mostra l'elenco all'apertura e a ogni "Carica altri"
export const GIORNI_PER_PAGINA = 30

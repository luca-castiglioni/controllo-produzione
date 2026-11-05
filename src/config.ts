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
  esitoComeSpunta: boolean // spunta (true = OK) invece dei due pulsanti NO / OK
  etichettaBreveEsito: string // nelle etichette dell'elenco e nei filtri
  conVerificaDimensionale: boolean // seconda spunta "Verifica dimensionale" (true = OK)
  nomeFileExcel: string
  conNote: boolean
  conControlloIncollaggio: boolean // spunta facoltativa "Controllo incollaggio"
  scriveSoloCapo: boolean // gli operatori vedono ma non inseriscono/modificano
  mostraValidazione: boolean // nel modulo, avvisa se la commessa è già validata
}

export const REGISTRO_VERIFICA: Registro = {
  tabella: 'test_incollaggio',
  colonnaData: 'data',
  titolo: 'Verifica',
  etichettaData: 'Data',
  etichettaEsito: 'Test incollaggio',
  esitoComeSpunta: true,
  etichettaBreveEsito: 'Incollaggio',
  conVerificaDimensionale: true,
  nomeFileExcel: 'verifiche',
  conNote: true,
  conControlloIncollaggio: false,
  scriveSoloCapo: false,
  mostraValidazione: true,
}

export const REGISTRO_VALIDAZIONI: Registro = {
  tabella: 'validazioni',
  colonnaData: 'giorno',
  titolo: 'Validazione',
  etichettaData: 'Giorno',
  etichettaEsito: 'Validazione',
  esitoComeSpunta: false,
  etichettaBreveEsito: 'Esito',
  conVerificaDimensionale: false,
  nomeFileExcel: 'validazioni',
  conNote: false,
  conControlloIncollaggio: true,
  scriveSoloCapo: true,
  mostraValidazione: false,
}

// Quanti giorni mostra l'elenco all'apertura e a ogni "Carica altri"
export const GIORNI_PER_PAGINA = 30

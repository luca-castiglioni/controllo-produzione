export type Ruolo = 'operatore' | 'capo_reparto' | 'admin'

export interface Operatore {
  id: string
  nome: string
  telefono: string
  auth_user_id: string | null
  ruolo: Ruolo
  attivo: boolean
  created_at: string
}

export type StatoAccesso = 'nuovo' | 'attivo' | 'disattivato' | 'sconosciuto'

export interface Impianto {
  codice: string
  descrizione: string | null
  attivo: boolean
}

// Un record di test incollaggio o di validazione.
// "data" corrisponde alla colonna data (test) o giorno (validazioni).
export interface RecordRegistro {
  id: string
  commessa: string
  barcode: string | null
  impianto: string
  data: string // AAAA-MM-GG
  ora: string // HH:MM:SS
  operatore_id: string
  esito: boolean // true = OK
  note?: string | null // solo test incollaggio
  controllo_incollaggio?: boolean // solo validazioni
  created_at: string
  updated_at: string | null
  operatore: { nome: string } | null
}

// Dati inseriti dall'utente nel modulo (operatore e ora li mette il database)
export interface DatiRecord {
  commessa: string
  barcode: string | null
  impianto: string
  data: string
  esito: boolean
  note: string | null
  controllo_incollaggio: boolean
}

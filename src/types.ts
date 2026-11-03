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

import type { Registro } from './config'
import { dataItaliana, oggi } from './format'
import type { Operatore, RecordRegistro } from './types'

// Solo per mostrare/nascondere i pulsanti: le stesse regole sono applicate
// dal database (policy RLS), che ha sempre l'ultima parola.

export function isCapo(p: Operatore): boolean {
  return p.ruolo === 'capo_reparto' || p.ruolo === 'admin'
}

export function puoInserire(p: Operatore, registro: Registro): boolean {
  return !registro.scriveSoloCapo || isCapo(p)
}

// Operatore: solo i propri record e solo nel giorno di inserimento
// (e mai le validazioni, che può solo consultare)
export function puoModificare(p: Operatore, registro: Registro, r: RecordRegistro): boolean {
  if (isCapo(p)) return true
  return puoInserire(p, registro) && r.operatore_id === p.id && dataItaliana(r.created_at) === oggi()
}

// Admin: tutti gli operatori. Capo reparto: solo gli operatori normali.
export function puoGestireOperatore(io: Operatore, altro: Operatore): boolean {
  return io.ruolo === 'admin' || (io.ruolo === 'capo_reparto' && altro.ruolo === 'operatore')
}

export type StatoOperatore = 'attivo' | 'disattivato' | 'in attesa'

export function statoOperatore(o: Operatore): StatoOperatore {
  if (!o.attivo) return 'disattivato'
  return o.auth_user_id ? 'attivo' : 'in attesa'
}

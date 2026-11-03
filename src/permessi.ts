import { dataItaliana, oggi } from './format'
import type { Operatore, RecordRegistro } from './types'

// Solo per mostrare/nascondere i pulsanti: le stesse regole sono applicate
// dal database (policy RLS), che ha sempre l'ultima parola.

export function isCapo(p: Operatore): boolean {
  return p.ruolo === 'capo_reparto' || p.ruolo === 'admin'
}

// Operatore: solo i propri record e solo nel giorno di inserimento
export function puoModificare(p: Operatore, r: RecordRegistro): boolean {
  return isCapo(p) || (r.operatore_id === p.id && dataItaliana(r.created_at) === oggi())
}

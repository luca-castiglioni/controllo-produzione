import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import { emailDaTelefono, normalizzaTelefono } from './telefono'
import type { Registro } from './config'
import type { DatiRecord, Impianto, Operatore, RecordRegistro, StatoAccesso } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurato = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'non-configurato')

// Chiama una Edge Function; in caso di errore lancia il messaggio in italiano restituito
async function chiamaFunzione(nome: string, corpo: object) {
  const { error } = await supabase.functions.invoke(nome, { body: corpo })
  if (!error) return
  if (error instanceof FunctionsHttpError) {
    const dettaglio = await error.context.json().catch(() => null)
    if (dettaglio?.errore) throw new Error(dettaglio.errore)
  }
  throw new Error('Servizio non raggiungibile, riprova.')
}

// ---------- Accesso ----------

export async function statoAccesso(telefono: string): Promise<StatoAccesso> {
  const { data, error } = await supabase.rpc('stato_accesso', { telefono: normalizzaTelefono(telefono) })
  if (error) throw error
  return data as StatoAccesso
}

export async function accedi(telefono: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email: emailDaTelefono(telefono), password })
  return !error
}

export async function primoAccesso(telefono: string, password: string) {
  await chiamaFunzione('primo_accesso', { telefono: normalizzaTelefono(telefono), password })
  if (!(await accedi(telefono, password))) throw new Error('Password creata, ma accesso non riuscito: riprova.')
}

export async function cambiaPassword(email: string, attuale: string, nuova: string) {
  const { error: erroreVerifica } = await supabase.auth.signInWithPassword({ email, password: attuale })
  if (erroreVerifica) throw new Error('La password attuale non è corretta.')
  const { error } = await supabase.auth.updateUser({ password: nuova })
  if (error) throw new Error('Impossibile cambiare la password: ' + error.message)
}

export async function reimpostaAccesso(operatoreId: string) {
  await chiamaFunzione('reimposta_accesso', { operatore_id: operatoreId })
}

// Operatore collegato all'utente loggato; null se disattivato o non collegato
export async function caricaProfilo(authUserId: string): Promise<Operatore | null> {
  const { data, error } = await supabase
    .from('operatori')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) throw error
  return data as Operatore | null
}

// ---------- Messaggi di errore comprensibili ----------

export function messaggioErrore(err: unknown): string {
  const e = err as { code?: string; message?: string }
  switch (e.code) {
    case '42501':
      return 'Non hai i permessi per questa operazione.'
    case '23503':
      return 'Il dato è usato altrove e non si può eliminare.'
    case '23505':
      return 'Esiste già un elemento con lo stesso valore.'
    case 'P0001':
      return e.message ?? 'Operazione non consentita.'
  }
  if (e.message?.includes('Failed to fetch')) return 'Connessione assente, riprova.'
  return e.message ?? 'Errore sconosciuto.'
}

// ---------- Impianti ----------

export async function caricaImpianti(): Promise<Impianto[]> {
  const { data, error } = await supabase.from('impianti').select('*').order('codice')
  if (error) throw error
  return data as Impianto[]
}

// ---------- Test incollaggio e validazioni ----------

function campiRecord(r: Registro): string {
  return [
    'id, commessa, barcode, impianto',
    `data:${r.colonnaData}`, // la colonna "giorno" delle validazioni arriva come "data"
    'ora, operatore_id, esito',
    r.conNote ? 'note' : null,
    'created_at, updated_at, operatore:operatori(nome)',
  ]
    .filter(Boolean)
    .join(', ')
}

// Record dalla data indicata in poi, dal più recente
export async function caricaRecord(r: Registro, dal: string): Promise<RecordRegistro[]> {
  const { data, error } = await supabase
    .from(r.tabella)
    .select(campiRecord(r))
    .gte(r.colonnaData, dal)
    .order(r.colonnaData, { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as RecordRegistro[]
}

export async function salvaRecord(r: Registro, dati: DatiRecord, id?: string) {
  const riga = {
    commessa: dati.commessa,
    barcode: dati.barcode,
    impianto: dati.impianto,
    [r.colonnaData]: dati.data,
    esito: dati.esito,
    ...(r.conNote ? { note: dati.note } : {}),
  }
  if (!id) {
    const { error } = await supabase.from(r.tabella).insert(riga)
    if (error) throw new Error(messaggioErrore(error))
    return
  }
  // se le regole non permettono la modifica, il database non aggiorna nulla (nessun errore)
  const { data, error } = await supabase.from(r.tabella).update(riga).eq('id', id).select('id')
  if (error) throw new Error(messaggioErrore(error))
  if (!data.length) throw new Error('Non puoi più modificare questo record.')
}

export async function eliminaRecord(r: Registro, id: string) {
  const { data, error } = await supabase.from(r.tabella).delete().eq('id', id).select('id')
  if (error) throw new Error(messaggioErrore(error))
  if (!data.length) throw new Error('Non puoi eliminare questo record.')
}

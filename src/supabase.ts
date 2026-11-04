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

// "specifici": messaggi per codice di errore o nome del vincolo, validi solo in quel contesto
export function messaggioErrore(err: unknown, specifici: Record<string, string> = {}): string {
  const e = err as { code?: string; message?: string }
  for (const [chiave, testo] of Object.entries(specifici)) {
    if (e.code === chiave || e.message?.includes(chiave)) return testo
  }
  switch (e.code) {
    case '42501':
      return 'Non hai i permessi per questa operazione.'
    case '23503':
      return 'Il dato è usato altrove e non si può eliminare.'
    case '23505':
      return 'Esiste già un elemento con lo stesso valore.'
    case '23514':
      return 'Dati non validi.'
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

const ERRORI_IMPIANTO = {
  '23505': 'Esiste già un impianto con questo codice.',
  '23503': 'Impianto usato in alcuni record: non si può eliminare, disattivalo.',
  impianti_codice_obbligatorio: 'Il codice è obbligatorio.',
}

export async function salvaImpianto(impianto: Impianto, nuovo: boolean) {
  const { error } = nuovo
    ? await supabase.from('impianti').insert(impianto)
    : await supabase
        .from('impianti')
        .update({ descrizione: impianto.descrizione, attivo: impianto.attivo })
        .eq('codice', impianto.codice)
  if (error) throw new Error(messaggioErrore(error, ERRORI_IMPIANTO))
}

export async function eliminaImpianto(codice: string) {
  const { data, error } = await supabase.from('impianti').delete().eq('codice', codice).select('codice')
  if (error) throw new Error(messaggioErrore(error, ERRORI_IMPIANTO))
  if (!data.length) throw new Error('Non puoi eliminare questo impianto.')
}

// ---------- Operatori ----------

const ERRORI_OPERATORE = {
  '23505': 'Questo numero di telefono è già registrato.',
  '23503': 'Questo operatore ha già inserito dei record: non si può eliminare, disattivalo.',
  operatori_telefono_formato: 'Numero di telefono non valido (servono da 6 a 15 cifre).',
  operatori_nome_obbligatorio: 'Il nome è obbligatorio.',
}

export async function caricaOperatori(): Promise<Operatore[]> {
  const { data, error } = await supabase.from('operatori').select('*').order('nome')
  if (error) throw error
  return data as Operatore[]
}

export type DatiOperatore = Pick<Operatore, 'nome' | 'telefono' | 'ruolo' | 'attivo'>

export async function salvaOperatore(dati: DatiOperatore, id?: string) {
  const riga = { ...dati, telefono: normalizzaTelefono(dati.telefono) }
  if (!id) {
    const { error } = await supabase.from('operatori').insert(riga)
    if (error) throw new Error(messaggioErrore(error, ERRORI_OPERATORE))
    return
  }
  const { data, error } = await supabase.from('operatori').update(riga).eq('id', id).select('id')
  if (error) throw new Error(messaggioErrore(error, ERRORI_OPERATORE))
  if (!data.length) throw new Error('Non puoi modificare questo operatore.')
}

// Chi ha già fatto l'accesso lo elimina solo l'admin, tramite Edge Function
// (va cancellato anche l'utente di Supabase Auth); gli altri direttamente.
export async function eliminaOperatore(operatore: Operatore) {
  if (operatore.auth_user_id) {
    await chiamaFunzione('elimina_operatore', { operatore_id: operatore.id })
    return
  }
  const { data, error } = await supabase.from('operatori').delete().eq('id', operatore.id).select('id')
  if (error) throw new Error(messaggioErrore(error, ERRORI_OPERATORE))
  if (!data.length) throw new Error('Non puoi eliminare questo operatore.')
}

// ---------- Test incollaggio e validazioni ----------

function campiRecord(r: Registro): string {
  return [
    'id, commessa, barcode, impianto',
    `data:${r.colonnaData}`, // la colonna "giorno" delle validazioni arriva come "data"
    'ora, operatore_id, esito',
    r.conNote ? 'note' : null,
    r.conControlloIncollaggio ? 'controllo_incollaggio' : null,
    'created_at, updated_at, operatore:operatori(nome)',
  ]
    .filter(Boolean)
    .join(', ')
}

export interface Filtri {
  commessa: string
  impianto: string // '' = tutti
  esito: '' | 'ok' | 'no' // '' = tutti
}

export const NESSUN_FILTRO: Filtri = { commessa: '', impianto: '', esito: '' }

// Massimo di risultati per una ricerca su tutto lo storico
const LIMITE_RICERCA = 500

// Record dalla data indicata in poi, dal più recente.
// Se si cerca una commessa, la ricerca vale su tutto lo storico.
export async function caricaRecord(r: Registro, dal: string, filtri: Filtri = NESSUN_FILTRO): Promise<RecordRegistro[]> {
  let query = supabase.from(r.tabella).select(campiRecord(r))
  const commessa = filtri.commessa.trim()
  if (commessa) {
    query = query.ilike('commessa', `%${commessa.replace(/[\\%_]/g, '\\$&')}%`).limit(LIMITE_RICERCA)
  } else {
    query = query.gte(r.colonnaData, dal)
  }
  if (filtri.impianto) query = query.eq('impianto', filtri.impianto)
  if (filtri.esito) query = query.eq('esito', filtri.esito === 'ok')
  const { data, error } = await query
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
    ...(r.conControlloIncollaggio ? { controllo_incollaggio: dati.controllo_incollaggio } : {}),
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

export interface UltimaValidazione {
  giorno: string
  impianto: string
  esito: boolean
}

// Validazione più recente di una commessa (null se mai validata)
export async function ultimaValidazione(commessa: string): Promise<UltimaValidazione | null> {
  const { data, error } = await supabase
    .from('validazioni')
    .select('giorno, impianto, esito')
    .eq('commessa', commessa.trim())
    .order('giorno', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as UltimaValidazione | null
}

export async function eliminaRecord(r: Registro, id: string) {
  const { data, error } = await supabase.from(r.tabella).delete().eq('id', id).select('id')
  if (error) throw new Error(messaggioErrore(error))
  if (!data.length) throw new Error('Non puoi eliminare questo record.')
}

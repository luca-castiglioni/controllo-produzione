import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import { emailDaTelefono, normalizzaTelefono } from './telefono'
import type { Operatore, StatoAccesso } from './types'

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

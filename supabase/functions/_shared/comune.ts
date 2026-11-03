// Parti comuni alle Edge Function.

// Stessa regola di public.normalizza_telefono (SQL) e src/telefono.ts (app)
export function normalizzaTelefono(t: string): string {
  const d = t.replace(/\D/g, '')
  if (d.startsWith('0039')) return d.slice(4)
  if (d.startsWith('39') && d.length > 10) return d.slice(2)
  return d
}

// Email fittizia usata da Supabase Auth: non viene mai mostrata né usata per scrivere
export function emailDaTelefono(telefono: string): string {
  return `${telefono}@operatori.local`
}

// Risposta di errore con messaggio in italiano da mostrare all'utente
export function errore(messaggio: string, status = 400): Response {
  return Response.json({ errore: messaggio }, { status })
}

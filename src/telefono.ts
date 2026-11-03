// Stessa regola di public.normalizza_telefono (SQL) e delle Edge Function:
// solo cifre, senza prefisso +39 / 0039
export function normalizzaTelefono(t: string): string {
  const d = t.replace(/\D/g, '')
  if (d.startsWith('0039')) return d.slice(4)
  if (d.startsWith('39') && d.length > 10) return d.slice(2)
  return d
}

// Email fittizia usata da Supabase Auth: non viene mai mostrata
export function emailDaTelefono(telefono: string): string {
  return `${normalizzaTelefono(telefono)}@operatori.local`
}

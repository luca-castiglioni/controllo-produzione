// Date in formato AAAA-MM-GG riferite all'ora italiana

const formatoGiornoItalia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })

// Giorno italiano di un istante (es. created_at)
export function dataItaliana(istante: string | Date): string {
  return formatoGiornoItalia.format(new Date(istante))
}

export function oggi(): string {
  return dataItaliana(new Date())
}

export function aggiungiGiorni(iso: string, giorni: number): string {
  const [a, m, g] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, g + giorni))
  return d.toISOString().slice(0, 10)
}

// "2026-05-21" → "21/5/2026"
export function formatDataBreve(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return `${g}/${m}/${a}`
}

// "08:15:00" → "08:15"
export function formatOra(ora: string): string {
  return ora.slice(0, 5)
}

export function formatDataOra(istante: string): string {
  return new Date(istante).toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

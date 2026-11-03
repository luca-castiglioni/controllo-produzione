// Ricava la commessa dal codice letto sull'etichetta.
// Regola: togli gli asterischi, poi i primi 3 caratteri (es. "CF$")
// e gli ultimi 3 (es. "020"). Es.: *CF$661539020* → 661539
// In "barcode" si salva il codice senza asterischi.

export const LUNGHEZZA_MINIMA_CODICE = 7

export type RisultatoBarcode =
  | { valido: true; barcode: string; commessa: string }
  | { valido: false; barcode: string; errore: string }

export function parseBarcode(letto: string): RisultatoBarcode {
  const barcode = letto.replace(/\*/g, '').trim()
  if (barcode.length < LUNGHEZZA_MINIMA_CODICE) {
    return { valido: false, barcode, errore: 'Codice non valido' }
  }
  return { valido: true, barcode, commessa: barcode.slice(3, -3) }
}

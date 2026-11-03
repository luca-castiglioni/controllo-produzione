import { useEffect, useState } from 'react'
import type { Filtri } from '../supabase'
import type { Impianto } from '../types'

interface Props {
  filtri: Filtri
  impianti: Impianto[]
  onCambia: (filtri: Filtri) => void
}

const ESITI: [Filtri['esito'], string][] = [
  ['', 'Tutti'],
  ['ok', 'OK'],
  ['no', 'NO'],
]

// Ricerca per commessa + filtri per impianto ed esito
export default function BarraFiltri({ filtri, impianti, onCambia }: Props) {
  const [commessa, setCommessa] = useState(filtri.commessa)

  // aspetta che si smetta di scrivere prima di cercare
  useEffect(() => {
    if (commessa === filtri.commessa) return
    const timer = setTimeout(() => onCambia({ ...filtri, commessa }), 400)
    return () => clearTimeout(timer)
  }, [commessa, filtri, onCambia])

  return (
    <div className="scheda barra-filtri modulo">
      <input
        type="search"
        placeholder="Cerca commessa…"
        value={commessa}
        onChange={(e) => setCommessa(e.target.value)}
        autoFocus
      />
      <div className="riga-filtri">
        <select value={filtri.impianto} onChange={(e) => onCambia({ ...filtri, impianto: e.target.value })}>
          <option value="">Tutti gli impianti</option>
          {impianti.map((i) => (
            <option key={i.codice} value={i.codice}>
              {i.codice}
            </option>
          ))}
        </select>
        <div className="scelta-filtro">
          {ESITI.map(([valore, etichetta]) => (
            <button
              key={etichetta}
              type="button"
              className={filtri.esito === valore ? 'attivo' : ''}
              onClick={() => onCambia({ ...filtri, esito: valore })}
            >
              {etichetta}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

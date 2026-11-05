import { useEffect, useState } from 'react'
import type { Registro } from '../config'
import type { Filtri } from '../supabase'
import type { Impianto } from '../types'

interface Props {
  registro: Registro
  filtri: Filtri
  impianti: Impianto[]
  onCambia: (filtri: Filtri) => void
}

type SceltaEsito = Filtri['esito']

const ESITI: [SceltaEsito, string][] = [
  ['', 'Tutti'],
  ['ok', 'OK'],
  ['no', 'NO'],
]

// Ricerca per commessa + filtri per impianto ed esito
// (nelle verifiche: un filtro per il test incollaggio e uno per la verifica dimensionale)
export default function BarraFiltri({ registro, filtri, impianti, onCambia }: Props) {
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
      <select value={filtri.impianto} onChange={(e) => onCambia({ ...filtri, impianto: e.target.value })}>
        <option value="">Tutti gli impianti</option>
        {impianti.map((i) => (
          <option key={i.codice} value={i.codice}>
            {i.codice}
          </option>
        ))}
      </select>
      <FiltroEsito
        etichetta={registro.etichettaBreveEsito}
        valore={filtri.esito}
        onCambia={(esito) => onCambia({ ...filtri, esito })}
      />
      {registro.conVerificaDimensionale && (
        <FiltroEsito
          etichetta="Dimensionale"
          valore={filtri.dimensionale}
          onCambia={(dimensionale) => onCambia({ ...filtri, dimensionale })}
        />
      )}
    </div>
  )
}

function FiltroEsito(props: { etichetta: string; valore: SceltaEsito; onCambia: (v: SceltaEsito) => void }) {
  return (
    <div className="riga-filtri">
      <span className="etichetta">{props.etichetta}</span>
      <div className="scelta-filtro">
        {ESITI.map(([valore, testo]) => (
          <button
            key={testo}
            type="button"
            className={props.valore === valore ? 'attivo' : ''}
            onClick={() => props.onCambia(valore)}
          >
            {testo}
          </button>
        ))}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import type { Registro } from '../config'
import { formatDataBreve, formatDataOra, formatOra } from '../format'
import type { RecordRegistro } from '../types'

interface Props {
  registro: Registro
  record: RecordRegistro
  modificabile: boolean
  onChiudi: () => void
  onModifica: () => void
  onElimina: () => void
}

export default function DettaglioRecord({ registro, record, modificabile, onChiudi, onModifica, onElimina }: Props) {
  const righe: [string, ReactNode][] = [
    ['Commessa', <strong>{record.commessa}</strong>],
    ['Codice letto', record.barcode ?? '—'],
    ['Impianto', record.impianto],
    [registro.etichettaData, formatDataBreve(record.data)],
    ['Ora', formatOra(record.ora)],
    ['Utente', record.operatore?.nome ?? '—'],
    [
      registro.etichettaEsito,
      <span className={`esito ${record.esito ? 'ok' : 'no'}`}>{record.esito ? 'OK' : 'NO'}</span>,
    ],
  ]
  if (registro.conControlloIncollaggio) {
    righe.push(['Controllo incollaggio', record.controllo_incollaggio ? 'Sì' : 'No'])
  }
  if (registro.conNote) righe.push(['Note', record.note || '—'])
  if (record.updated_at) righe.push(['Ultima modifica', formatDataOra(record.updated_at)])

  return (
    <div className="foglio">
      <div className="foglio-testata">
        <button className="link" onClick={onChiudi}>
          Chiudi
        </button>
        <h2>{registro.titolo}</h2>
      </div>
      <div className="foglio-corpo">
        <dl className="scheda dettaglio">
          {righe.map(([etichetta, valore]) => (
            <div key={etichetta}>
              <dt>{etichetta}</dt>
              <dd>{valore}</dd>
            </div>
          ))}
        </dl>
        {modificabile && (
          <div className="pulsanti-fondo">
            <button className="pulsante grande pericolo" onClick={onElimina}>
              Elimina
            </button>
            <button className="pulsante primario grande" onClick={onModifica}>
              Modifica
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import type { Registro } from '../config'
import { formatDataBreve } from '../format'
import type { RecordRegistro } from '../types'
import Icona from './Icone'

interface Props {
  record: RecordRegistro[]
  registro: Registro
  puoModificare: (r: RecordRegistro) => boolean
  onDettaglio: (r: RecordRegistro) => void
  onModifica: (r: RecordRegistro) => void
  onElimina: (r: RecordRegistro) => void
}

export default function ElencoRecord({ record, registro, puoModificare, onDettaglio, onModifica, onElimina }: Props) {
  // raggruppa per data (l'elenco arriva già ordinato dal più recente)
  const gruppi: [string, RecordRegistro[]][] = []
  for (const r of record) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo[0] === r.data) ultimo[1].push(r)
    else gruppi.push([r.data, [r]])
  }

  return (
    <div className="elenco">
      {gruppi.map(([data, voci]) => (
        <section key={data}>
          <h3 className="giorno">{formatDataBreve(data)}</h3>
          <ul>
            {voci.map((r) => {
              const modificabile = puoModificare(r)
              return (
                <li key={r.id} className="scheda riga">
                  <button className="riga-corpo" onClick={() => onDettaglio(r)}>
                    <span className="riga-alto">
                      <strong className="commessa">{r.commessa}</strong>
                      <span className="impianto">{r.impianto}</span>
                    </span>
                    <span className="riga-basso">
                      {registro.esitoComeSpunta ? (
                        <>
                          <EtichettaEsito testo={registro.etichettaBreveEsito} ok={r.esito} />
                          {registro.conVerificaDimensionale && (
                            <EtichettaEsito testo="Dimensionale" ok={Boolean(r.verifica_dimensionale)} />
                          )}
                        </>
                      ) : (
                        <span className={`esito ${r.esito ? 'ok' : 'no'}`}>{r.esito ? 'OK' : 'NO'}</span>
                      )}
                      {r.controllo_incollaggio && <span className="etichetta-flag">Controllo incollaggio</span>}
                      {registro.conNote && r.note && <span className="note-breve">{r.note}</span>}
                    </span>
                    <small className="autore">{r.operatore?.nome}</small>
                  </button>
                  <span className="riga-azioni">
                    {modificabile && (
                      <button className="icona-pulsante" onClick={() => onElimina(r)} aria-label="Elimina">
                        <Icona nome="cestino" />
                      </button>
                    )}
                    {modificabile && (
                      <button className="icona-pulsante" onClick={() => onModifica(r)} aria-label="Modifica">
                        <Icona nome="matita" />
                      </button>
                    )}
                    <button className="icona-pulsante" onClick={() => onDettaglio(r)} aria-label="Dettaglio">
                      <Icona nome="info" />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

// es. "Incollaggio OK" in verde, "Dimensionale NO" in rosso
function EtichettaEsito({ testo, ok }: { testo: string; ok: boolean }) {
  return (
    <span className={`etichetta-esito ${ok ? 'ok' : 'no'}`}>
      {testo} {ok ? 'OK' : 'NO'}
    </span>
  )
}

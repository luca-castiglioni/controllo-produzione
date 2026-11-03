import { useCallback, useEffect, useState } from 'react'
import { GIORNI_PER_PAGINA, type Registro } from '../config'
import { aggiungiGiorni, formatDataBreve, oggi } from '../format'
import { isCapo, puoInserire, puoModificare } from '../permessi'
import { scaricaExcel } from '../export'
import {
  caricaImpianti,
  caricaRecord,
  eliminaRecord,
  messaggioErrore,
  NESSUN_FILTRO,
  type Filtri,
} from '../supabase'
import type { Impianto, Operatore, RecordRegistro } from '../types'
import BarraFiltri from './BarraFiltri'
import Conferma from './Conferma'
import DettaglioRecord from './DettaglioRecord'
import ElencoRecord from './ElencoRecord'
import Icona from './Icone'
import ModuloRecord from './ModuloRecord'

interface Props {
  registro: Registro
  profilo: Operatore
  versione: number // cambia quando si preme "aggiorna" nella barra in alto
  ricerca: boolean // barra di ricerca aperta (pulsante lente nella barra in alto)
  onMessaggio: (testo: string) => void
}

// Elenco + inserimento/modifica/eliminazione per test incollaggio o validazioni
export default function SezioneRegistro({ registro, profilo, versione, ricerca, onMessaggio }: Props) {
  const [giorni, setGiorni] = useState(GIORNI_PER_PAGINA)
  const [record, setRecord] = useState<RecordRegistro[]>([])
  const [impianti, setImpianti] = useState<Impianto[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [modulo, setModulo] = useState<{ record?: RecordRegistro } | null>(null)
  const [dettaglio, setDettaglio] = useState<RecordRegistro | null>(null)
  const [daEliminare, setDaEliminare] = useState<RecordRegistro | null>(null)
  const [eliminazione, setEliminazione] = useState(false)
  const [filtri, setFiltri] = useState<Filtri>(NESSUN_FILTRO)
  const [esportazione, setEsportazione] = useState(false)

  // chiudendo la ricerca si torna all'elenco completo
  useEffect(() => {
    if (!ricerca) setFiltri(NESSUN_FILTRO)
  }, [ricerca])

  const dal = aggiungiGiorni(oggi(), -(giorni - 1))

  const ricarica = useCallback(async () => {
    setCaricamento(true)
    try {
      const [r, i] = await Promise.all([caricaRecord(registro, dal, filtri), caricaImpianti()])
      setRecord(r)
      setImpianti(i)
      setErrore(null)
    } catch (err) {
      setErrore('Impossibile caricare i dati: ' + messaggioErrore(err))
    } finally {
      setCaricamento(false)
    }
  }, [registro, dal, filtri])

  useEffect(() => {
    ricarica()
  }, [ricarica, versione])

  async function elimina() {
    if (!daEliminare) return
    setEliminazione(true)
    try {
      await eliminaRecord(registro, daEliminare.id)
      onMessaggio('Eliminato')
      setDettaglio(null)
      ricarica()
    } catch (err) {
      setErrore((err as Error).message)
    } finally {
      setEliminazione(false)
      setDaEliminare(null)
    }
  }

  async function esporta() {
    setEsportazione(true)
    try {
      await scaricaExcel(registro, record)
    } catch (err) {
      setErrore('Esportazione non riuscita: ' + (err as Error).message)
    } finally {
      setEsportazione(false)
    }
  }

  const modificabile = (r: RecordRegistro) => puoModificare(profilo, registro, r)
  const inserisce = puoInserire(profilo, registro)
  const cercaCommessa = filtri.commessa.trim() !== ''
  const filtrato = cercaCommessa || filtri.impianto !== '' || filtri.esito !== ''

  return (
    <>
      {ricerca && <BarraFiltri filtri={filtri} impianti={impianti} onCambia={setFiltri} />}
      {errore && <p className="errore riquadro">{errore}</p>}
      {cercaCommessa && !caricamento && (
        <p className="nota-ricerca">
          {record.length} risultati per «{filtri.commessa.trim()}» in tutto lo storico
        </p>
      )}

      {caricamento && record.length === 0 ? (
        <p className="vuoto">Caricamento…</p>
      ) : record.length === 0 ? (
        <p className="vuoto">
          {cercaCommessa
            ? 'Nessun risultato.'
            : `Nessun inserimento${filtrato ? ' con questi filtri' : ''} dal ${formatDataBreve(dal)}.`}
          {inserisce && !filtrato && (
            <>
              <br />
              Tocca + per aggiungerne uno.
            </>
          )}
        </p>
      ) : (
        <ElencoRecord
          record={record}
          conNote={registro.conNote}
          puoModificare={modificabile}
          onDettaglio={setDettaglio}
          onModifica={(r) => setModulo({ record: r })}
          onElimina={setDaEliminare}
        />
      )}

      {!caricamento && (
        <div className="carica-altri">
          {!cercaCommessa && (
            <>
              <small>Dal {formatDataBreve(dal)}</small>
              <button className="pulsante" onClick={() => setGiorni(giorni + GIORNI_PER_PAGINA)}>
                Carica altri {GIORNI_PER_PAGINA} giorni
              </button>
            </>
          )}
          {isCapo(profilo) && record.length > 0 && (
            <button className="pulsante" onClick={esporta} disabled={esportazione}>
              {esportazione ? 'Preparazione…' : `Esporta in Excel (${record.length})`}
            </button>
          )}
        </div>
      )}

      {inserisce && (
        <button className="aggiungi" onClick={() => setModulo({})} aria-label="Nuovo inserimento">
          <Icona nome="piu" dimensione={32} />
        </button>
      )}

      {dettaglio && (
        <DettaglioRecord
          registro={registro}
          record={dettaglio}
          modificabile={modificabile(dettaglio)}
          onChiudi={() => setDettaglio(null)}
          onModifica={() => {
            setModulo({ record: dettaglio })
            setDettaglio(null)
          }}
          onElimina={() => setDaEliminare(dettaglio)}
        />
      )}

      {modulo && (
        <ModuloRecord
          registro={registro}
          record={modulo.record}
          profilo={profilo}
          impianti={impianti}
          onChiudi={() => setModulo(null)}
          onSalvato={() => {
            onMessaggio(modulo.record ? 'Modifiche salvate' : 'Salvato')
            setModulo(null)
            ricarica()
          }}
        />
      )}

      {daEliminare && (
        <Conferma
          testo={`Eliminare la commessa ${daEliminare.commessa} del ${formatDataBreve(daEliminare.data)}?`}
          etichettaConferma="Elimina"
          attesa={eliminazione}
          onAnnulla={() => setDaEliminare(null)}
          onConferma={elimina}
        />
      )}
    </>
  )
}

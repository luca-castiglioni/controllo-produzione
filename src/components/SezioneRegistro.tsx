import { useCallback, useEffect, useState } from 'react'
import { GIORNI_PER_PAGINA, type Registro } from '../config'
import { aggiungiGiorni, formatDataBreve, oggi } from '../format'
import { puoModificare } from '../permessi'
import { caricaImpianti, caricaRecord, eliminaRecord, messaggioErrore } from '../supabase'
import type { Impianto, Operatore, RecordRegistro } from '../types'
import Conferma from './Conferma'
import DettaglioRecord from './DettaglioRecord'
import ElencoRecord from './ElencoRecord'
import Icona from './Icone'
import ModuloRecord from './ModuloRecord'

interface Props {
  registro: Registro
  profilo: Operatore
  versione: number // cambia quando si preme "aggiorna" nella barra in alto
  onMessaggio: (testo: string) => void
}

// Elenco + inserimento/modifica/eliminazione per test incollaggio o validazioni
export default function SezioneRegistro({ registro, profilo, versione, onMessaggio }: Props) {
  const [giorni, setGiorni] = useState(GIORNI_PER_PAGINA)
  const [record, setRecord] = useState<RecordRegistro[]>([])
  const [impianti, setImpianti] = useState<Impianto[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [modulo, setModulo] = useState<{ record?: RecordRegistro } | null>(null)
  const [dettaglio, setDettaglio] = useState<RecordRegistro | null>(null)
  const [daEliminare, setDaEliminare] = useState<RecordRegistro | null>(null)
  const [eliminazione, setEliminazione] = useState(false)

  const dal = aggiungiGiorni(oggi(), -(giorni - 1))

  const ricarica = useCallback(async () => {
    setCaricamento(true)
    try {
      const [r, i] = await Promise.all([caricaRecord(registro, dal), caricaImpianti()])
      setRecord(r)
      setImpianti(i)
      setErrore(null)
    } catch (err) {
      setErrore('Impossibile caricare i dati: ' + messaggioErrore(err))
    } finally {
      setCaricamento(false)
    }
  }, [registro, dal])

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

  const modificabile = (r: RecordRegistro) => puoModificare(profilo, r)

  return (
    <>
      {errore && <p className="errore riquadro">{errore}</p>}

      {caricamento && record.length === 0 ? (
        <p className="vuoto">Caricamento…</p>
      ) : record.length === 0 ? (
        <p className="vuoto">
          Nessun inserimento dal {formatDataBreve(dal)}.
          <br />
          Tocca + per aggiungerne uno.
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
          <small>Dal {formatDataBreve(dal)}</small>
          <button className="pulsante" onClick={() => setGiorni(giorni + GIORNI_PER_PAGINA)}>
            Carica altri {GIORNI_PER_PAGINA} giorni
          </button>
        </div>
      )}

      <button className="aggiungi" onClick={() => setModulo({})} aria-label="Nuovo inserimento">
        <Icona nome="piu" dimensione={32} />
      </button>

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

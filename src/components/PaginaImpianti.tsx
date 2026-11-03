import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { caricaImpianti, eliminaImpianto, messaggioErrore, salvaImpianto } from '../supabase'
import type { Impianto } from '../types'
import Conferma from './Conferma'
import Icona from './Icone'

interface Props {
  versione: number
  onMessaggio: (testo: string) => void
}

export default function PaginaImpianti({ versione, onMessaggio }: Props) {
  const [impianti, setImpianti] = useState<Impianto[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [modulo, setModulo] = useState<{ impianto?: Impianto } | null>(null)

  const ricarica = useCallback(async () => {
    setCaricamento(true)
    try {
      setImpianti(await caricaImpianti())
      setErrore(null)
    } catch (err) {
      setErrore('Impossibile caricare gli impianti: ' + messaggioErrore(err))
    } finally {
      setCaricamento(false)
    }
  }, [])

  useEffect(() => {
    ricarica()
  }, [ricarica, versione])

  return (
    <>
      {errore && <p className="errore riquadro">{errore}</p>}
      {caricamento && impianti.length === 0 ? (
        <p className="vuoto">Caricamento…</p>
      ) : impianti.length === 0 ? (
        <p className="vuoto">Nessun impianto. Tocca + per aggiungerne uno.</p>
      ) : (
        <ul className="elenco-semplice">
          {impianti.map((i) => (
            <li key={i.codice}>
              <button className="scheda riga-semplice" onClick={() => setModulo({ impianto: i })}>
                <span className="riga-alto">
                  <strong className="commessa">{i.codice}</strong>
                  {!i.attivo && <span className="stato stato-disattivato">Disattivato</span>}
                </span>
                {i.descrizione && <span className="autore">{i.descrizione}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="aggiungi" onClick={() => setModulo({})} aria-label="Nuovo impianto">
        <Icona nome="piu" dimensione={32} />
      </button>

      {modulo && (
        <ModuloImpianto
          impianto={modulo.impianto}
          onChiudi={() => setModulo(null)}
          onSalvato={(messaggio) => {
            onMessaggio(messaggio)
            setModulo(null)
            ricarica()
          }}
        />
      )}
    </>
  )
}

interface PropsModulo {
  impianto?: Impianto // assente = nuovo impianto
  onChiudi: () => void
  onSalvato: (messaggio: string) => void
}

function ModuloImpianto({ impianto, onChiudi, onSalvato }: PropsModulo) {
  const nuovo = !impianto
  const [codice, setCodice] = useState(impianto?.codice ?? '')
  const [descrizione, setDescrizione] = useState(impianto?.descrizione ?? '')
  const [attivo, setAttivo] = useState(impianto?.attivo ?? true)
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [confermaElimina, setConfermaElimina] = useState(false)

  async function esegui(azione: () => Promise<void>, messaggio: string) {
    setErrore(null)
    setAttesa(true)
    try {
      await azione()
      onSalvato(messaggio)
    } catch (err) {
      setErrore((err as Error).message)
      setAttesa(false)
      setConfermaElimina(false)
    }
  }

  function salva(e: FormEvent) {
    e.preventDefault()
    if (!codice.trim()) return
    esegui(
      () => salvaImpianto({ codice: codice.trim().toUpperCase(), descrizione: descrizione.trim() || null, attivo }, nuovo),
      nuovo ? 'Impianto aggiunto' : 'Modifiche salvate',
    )
  }

  return (
    <div className="foglio">
      <div className="foglio-testata">
        <span />
        <h2>{nuovo ? 'Nuovo impianto' : `Impianto ${impianto.codice}`}</h2>
      </div>
      <form className="foglio-corpo modulo" onSubmit={salva}>
        <label>
          Codice *
          <input
            value={codice}
            onChange={(e) => setCodice(e.target.value.toUpperCase())}
            disabled={!nuovo}
            autoCapitalize="characters"
            required
          />
          {!nuovo && <small className="nota-campo">Il codice non si può cambiare: è usato nei record.</small>}
        </label>
        <label>
          Descrizione <span className="facoltativo">(facoltativa)</span>
          <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </label>
        <label className="spunta">
          <input type="checkbox" checked={attivo} onChange={(e) => setAttivo(e.target.checked)} />
          Attivo (compare nel menu degli inserimenti)
        </label>

        {errore && <p className="errore">{errore}</p>}

        <div className="pulsanti-fondo">
          <button type="button" className="pulsante grande" onClick={onChiudi}>
            Annulla
          </button>
          <button className="pulsante primario grande" disabled={!codice.trim() || attesa}>
            {attesa ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>

        {!nuovo && (
          <div className="azioni-secondarie">
            <button type="button" className="pulsante pericolo" onClick={() => setConfermaElimina(true)}>
              Elimina impianto
            </button>
          </div>
        )}
      </form>

      {confermaElimina && (
        <Conferma
          testo={`Eliminare l'impianto ${impianto!.codice}? Se è già usato in qualche record non sarà possibile: in quel caso disattivalo.`}
          etichettaConferma="Elimina"
          attesa={attesa}
          onAnnulla={() => setConfermaElimina(false)}
          onConferma={() => esegui(() => eliminaImpianto(impianto!.codice), 'Impianto eliminato')}
        />
      )}
    </div>
  )
}

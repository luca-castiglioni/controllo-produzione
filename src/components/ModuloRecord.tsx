import { lazy, Suspense, useCallback, useState, type FormEvent } from 'react'
import { parseBarcode } from '../barcode'
import type { Registro } from '../config'
import { oggi } from '../format'
import { salvaRecord } from '../supabase'
import type { Impianto, Operatore, RecordRegistro } from '../types'
import Icona from './Icone'

// la libreria di lettura codici è pesante: si scarica solo alla prima scansione
const Scanner = lazy(() => import('./Scanner'))

interface Props {
  registro: Registro
  record?: RecordRegistro // assente = nuovo inserimento
  profilo: Operatore
  impianti: Impianto[]
  onChiudi: () => void
  onSalvato: () => void
}

function chiaveUltimoImpianto(profilo: Operatore) {
  return `ultimo-impianto-${profilo.id}`
}

function leggiUltimoImpianto(profilo: Operatore, impianti: Impianto[]): string {
  try {
    const codice = localStorage.getItem(chiaveUltimoImpianto(profilo)) ?? ''
    return impianti.some((i) => i.codice === codice && i.attivo) ? codice : ''
  } catch {
    return ''
  }
}

export default function ModuloRecord({ registro, record, profilo, impianti, onChiudi, onSalvato }: Props) {
  const [commessa, setCommessa] = useState(record?.commessa ?? '')
  const [barcode, setBarcode] = useState<string | null>(record?.barcode ?? null)
  const [impianto, setImpianto] = useState(record?.impianto ?? leggiUltimoImpianto(profilo, impianti))
  const [data, setData] = useState(record?.data ?? oggi())
  const [esito, setEsito] = useState<boolean | null>(record?.esito ?? null)
  const [note, setNote] = useState(record?.note ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [scansione, setScansione] = useState(false)
  const [erroreCodice, setErroreCodice] = useState<string | null>(null)

  // codice letto dalla fotocamera: commessa ricavata con parseBarcode
  const codiceLetto = useCallback((testo: string) => {
    setScansione(false)
    const r = parseBarcode(testo)
    if (r.valido) {
      setCommessa(r.commessa)
      setBarcode(r.barcode)
      setErroreCodice(null)
    } else {
      setBarcode(null)
      setErroreCodice(`${r.errore} (${r.barcode || 'vuoto'}): inserisci la commessa a mano.`)
    }
  }, [])

  // nel menu: impianti attivi + quello del record (anche se nel frattempo disattivato)
  const opzioni = impianti.filter((i) => i.attivo || i.codice === record?.impianto)
  const completo = commessa.trim() !== '' && impianto !== '' && data !== '' && esito !== null

  async function salva(e: FormEvent) {
    e.preventDefault()
    if (!completo) return
    setErrore(null)
    setAttesa(true)
    try {
      await salvaRecord(
        registro,
        { commessa: commessa.trim(), barcode, impianto, data, esito, note: note.trim() || null },
        record?.id,
      )
      try {
        localStorage.setItem(chiaveUltimoImpianto(profilo), impianto)
      } catch {
        // non indispensabile
      }
      onSalvato()
    } catch (err) {
      setErrore((err as Error).message)
      setAttesa(false)
    }
  }

  return (
    <div className="foglio">
      <div className="foglio-testata">
        <span />
        <h2>{record ? 'Modifica' : 'Nuovo'} – {registro.titolo}</h2>
      </div>
      <form className="foglio-corpo modulo" onSubmit={salva}>
        <div className="campo">
          <label htmlFor="commessa" className="etichetta">
            Commessa *
          </label>
          <div className="campo-con-pulsante">
            <input
              id="commessa"
              value={commessa}
              onChange={(e) => {
                setCommessa(e.target.value)
                setBarcode(null) // inserimento manuale: il codice letto non vale più
                setErroreCodice(null)
              }}
              autoComplete="off"
              required
            />
            <button
              type="button"
              className="pulsante primario pulsante-scansione"
              onClick={() => setScansione(true)}
              aria-label="Leggi codice a barre"
            >
              <Icona nome="codice" dimensione={28} />
            </button>
          </div>
          {barcode && <small className="nota-campo">Codice letto: {barcode}</small>}
          {erroreCodice && <small className="errore">{erroreCodice}</small>}
        </div>

        <label>
          Impianto *
          <select value={impianto} onChange={(e) => setImpianto(e.target.value)} required>
            <option value="" disabled>
              Scegli…
            </option>
            {opzioni.map((i) => (
              <option key={i.codice} value={i.codice}>
                {i.codice}
                {i.descrizione ? ` – ${i.descrizione}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          {registro.etichettaData} *
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </label>

        <label>
          Utente
          <input value={record ? (record.operatore?.nome ?? '') : profilo.nome} readOnly disabled />
        </label>

        <div className="campo">
          <span className="etichetta">{registro.etichettaEsito} *</span>
          <div className="scelta-esito">
            <button
              type="button"
              className={esito === false ? 'scelto no' : ''}
              onClick={() => setEsito(false)}
            >
              NO
            </button>
            <button
              type="button"
              className={esito === true ? 'scelto ok' : ''}
              onClick={() => setEsito(true)}
            >
              OK
            </button>
          </div>
        </div>

        {registro.conNote && (
          <label>
            Note <span className="facoltativo">(facoltative)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </label>
        )}

        {errore && <p className="errore">{errore}</p>}

        <div className="pulsanti-fondo">
          <button type="button" className="pulsante grande" onClick={onChiudi}>
            Annulla
          </button>
          <button className="pulsante primario grande" disabled={!completo || attesa}>
            {attesa ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
      {scansione && (
        <Suspense fallback={<div className="scanner"><p className="scanner-testo">Avvio fotocamera…</p></div>}>
          <Scanner onLetto={codiceLetto} onChiudi={() => setScansione(false)} />
        </Suspense>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { LUNGHEZZA_MINIMA_PASSWORD } from '../config'
import { accedi, primoAccesso, statoAccesso } from '../supabase'
import { normalizzaTelefono } from '../telefono'

type Passo = 'telefono' | 'password' | 'crea'

const CHIAVE_TELEFONO = 'ultimo-telefono'

function leggiUltimoTelefono(): string {
  try {
    return localStorage.getItem(CHIAVE_TELEFONO) ?? ''
  } catch {
    return ''
  }
}

// Schermata di accesso: prima il telefono, poi password oppure "Crea la tua password"
export default function Accesso({ avviso }: { avviso?: string | null }) {
  const [passo, setPasso] = useState<Passo>('telefono')
  const [telefono, setTelefono] = useState(leggiUltimoTelefono)
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState<string | null>(avviso ?? null)
  const [attesa, setAttesa] = useState(false)

  async function avanti(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (normalizzaTelefono(telefono).length < 6) {
      setErrore('Inserisci un numero di telefono valido.')
      return
    }
    setAttesa(true)
    try {
      const stato = await statoAccesso(telefono)
      if (stato === 'sconosciuto') setErrore('Numero non registrato. Rivolgiti al capo reparto.')
      else if (stato === 'disattivato') setErrore('Accesso disattivato. Rivolgiti al capo reparto.')
      else {
        try {
          localStorage.setItem(CHIAVE_TELEFONO, telefono)
        } catch {
          // non indispensabile
        }
        setPasso(stato === 'nuovo' ? 'crea' : 'password')
      }
    } catch {
      setErrore('Servizio non raggiungibile. Controlla la connessione e riprova.')
    } finally {
      setAttesa(false)
    }
  }

  async function entra(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setAttesa(true)
    const riuscito = await accedi(telefono, password)
    setAttesa(false)
    if (!riuscito) setErrore('Password non corretta.')
  }

  async function crea(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (password.length < LUNGHEZZA_MINIMA_PASSWORD) {
      setErrore(`La password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri.`)
      return
    }
    if (password !== conferma) {
      setErrore('Le due password non coincidono.')
      return
    }
    setAttesa(true)
    try {
      await primoAccesso(telefono, password)
    } catch (err) {
      setErrore((err as Error).message)
      setAttesa(false)
    }
  }

  function cambiaNumero() {
    setPasso('telefono')
    setPassword('')
    setConferma('')
    setErrore(null)
  }

  return (
    <main className="schermata-centrale">
      <img className="logo" src="./icon.svg" alt="" />
      <h1>Controllo Produzione</h1>

      {passo === 'telefono' && (
        <form onSubmit={avanti} className="scheda modulo">
          <label>
            Numero di telefono
            <input
              type="tel"
              inputMode="tel"
              autoComplete="username"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              autoFocus
              required
            />
          </label>
          {errore && <p className="errore">{errore}</p>}
          <button className="pulsante primario grande" disabled={attesa}>
            {attesa ? 'Verifica…' : 'Avanti'}
          </button>
        </form>
      )}

      {passo === 'password' && (
        <form onSubmit={entra} className="scheda modulo">
          <NumeroScelto telefono={telefono} onCambia={cambiaNumero} />
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </label>
          {errore && <p className="errore">{errore}</p>}
          <button className="pulsante primario grande" disabled={attesa}>
            {attesa ? 'Accesso…' : 'Accedi'}
          </button>
        </form>
      )}

      {passo === 'crea' && (
        <form onSubmit={crea} className="scheda modulo">
          <h2>Crea la tua password</h2>
          <p className="nota-modulo">
            È il tuo primo accesso. Scegli una password personale (almeno {LUNGHEZZA_MINIMA_PASSWORD}{' '}
            caratteri) e non comunicarla a nessuno.
          </p>
          <NumeroScelto telefono={telefono} onCambia={cambiaNumero} />
          <label>
            Nuova password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label>
            Ripeti la password
            <input
              type="password"
              autoComplete="new-password"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              required
            />
          </label>
          {errore && <p className="errore">{errore}</p>}
          <button className="pulsante primario grande" disabled={attesa}>
            {attesa ? 'Creazione…' : 'Crea password ed entra'}
          </button>
        </form>
      )}

      <p className="nota">Gli operatori vengono registrati dal capo reparto.</p>
    </main>
  )
}

function NumeroScelto({ telefono, onCambia }: { telefono: string; onCambia: () => void }) {
  return (
    <div className="numero-scelto">
      {/* campo nascosto: permette al telefono di ricordare la password insieme al numero */}
      <input type="tel" autoComplete="username" value={telefono} readOnly hidden />
      <span>{telefono}</span>
      <button type="button" className="link" onClick={onCambia}>
        Cambia numero
      </button>
    </div>
  )
}

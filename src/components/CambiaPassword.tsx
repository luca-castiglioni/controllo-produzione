import { useState, type FormEvent } from 'react'
import { LUNGHEZZA_MINIMA_PASSWORD } from '../config'
import { cambiaPassword } from '../supabase'

interface Props {
  email: string
  onChiudi: () => void
  onFatto: () => void
}

export default function CambiaPassword({ email, onChiudi, onFatto }: Props) {
  const [attuale, setAttuale] = useState('')
  const [nuova, setNuova] = useState('')
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function salva(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (nuova.length < LUNGHEZZA_MINIMA_PASSWORD) {
      setErrore(`La nuova password deve avere almeno ${LUNGHEZZA_MINIMA_PASSWORD} caratteri.`)
      return
    }
    if (nuova !== conferma) {
      setErrore('Le due password nuove non coincidono.')
      return
    }
    setAttesa(true)
    try {
      await cambiaPassword(email, attuale, nuova)
      onFatto()
    } catch (err) {
      setErrore((err as Error).message)
      setAttesa(false)
    }
  }

  return (
    <div className="foglio">
      <div className="foglio-testata">
        <button className="link" onClick={onChiudi}>
          Annulla
        </button>
        <h2>Cambia password</h2>
      </div>
      <form className="foglio-corpo modulo" onSubmit={salva}>
        <label>
          Password attuale
          <input
            type="password"
            autoComplete="current-password"
            value={attuale}
            onChange={(e) => setAttuale(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Nuova password
          <input
            type="password"
            autoComplete="new-password"
            value={nuova}
            onChange={(e) => setNuova(e.target.value)}
            required
          />
        </label>
        <label>
          Ripeti la nuova password
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
          {attesa ? 'Salvataggio…' : 'Salva nuova password'}
        </button>
      </form>
    </div>
  )
}

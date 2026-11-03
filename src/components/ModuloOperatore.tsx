import { useState, type FormEvent } from 'react'
import { NOMI_RUOLO } from '../config'
import { puoGestireOperatore, statoOperatore } from '../permessi'
import { eliminaOperatore, reimpostaAccesso, salvaOperatore } from '../supabase'
import type { Operatore, Ruolo } from '../types'
import Conferma from './Conferma'

interface Props {
  operatore?: Operatore // assente = nuovo operatore
  io: Operatore
  onChiudi: () => void
  onSalvato: (messaggio: string) => void
}

const TESTI_STATO = {
  attivo: 'Accesso attivo (password creata)',
  disattivato: 'Disattivato: non può accedere',
  'in attesa': 'In attesa di primo accesso',
}

export default function ModuloOperatore({ operatore, io, onChiudi, onSalvato }: Props) {
  const nuovo = !operatore
  const modificabile = nuovo || puoGestireOperatore(io, operatore)
  const sonoIo = operatore?.id === io.id
  const haAccesso = Boolean(operatore?.auth_user_id)

  const [nome, setNome] = useState(operatore?.nome ?? '')
  const [telefono, setTelefono] = useState(operatore?.telefono ?? '')
  const [ruolo, setRuolo] = useState<Ruolo>(operatore?.ruolo ?? 'operatore')
  const [attivo, setAttivo] = useState(operatore?.attivo ?? true)
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [conferma, setConferma] = useState<'reimposta' | 'elimina' | null>(null)

  const completo = nome.trim() !== '' && telefono.trim() !== ''

  async function esegui(azione: () => Promise<void>, messaggio: string) {
    setErrore(null)
    setAttesa(true)
    try {
      await azione()
      onSalvato(messaggio)
    } catch (err) {
      setErrore((err as Error).message)
      setAttesa(false)
      setConferma(null)
    }
  }

  function salva(e: FormEvent) {
    e.preventDefault()
    if (!completo) return
    esegui(
      () => salvaOperatore({ nome: nome.trim(), telefono, ruolo, attivo }, operatore?.id),
      nuovo ? 'Operatore aggiunto' : 'Modifiche salvate',
    )
  }

  return (
    <div className="foglio">
      <div className="foglio-testata">
        <span />
        <h2>{nuovo ? 'Nuovo operatore' : operatore.nome}</h2>
      </div>
      <form className="foglio-corpo modulo" onSubmit={salva}>
        {!nuovo && <p className={`stato stato-${statoOperatore(operatore).replace(' ', '-')}`}>{TESTI_STATO[statoOperatore(operatore)]}</p>}
        {!modificabile && <p className="nota-modulo">Solo l'admin può modificare capi reparto e admin.</p>}

        <label>
          Nome e cognome *
          <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!modificabile} required />
        </label>

        <label>
          Telefono *
          <input
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={!modificabile || haAccesso}
            required
          />
          {modificabile && haAccesso && (
            <small className="nota-campo">Per cambiare il telefono usa prima "Reimposta accesso".</small>
          )}
        </label>

        <label>
          Ruolo
          <select
            value={ruolo}
            onChange={(e) => setRuolo(e.target.value as Ruolo)}
            disabled={io.ruolo !== 'admin' || sonoIo}
          >
            {(Object.keys(NOMI_RUOLO) as Ruolo[]).map((r) => (
              <option key={r} value={r}>
                {NOMI_RUOLO[r]}
              </option>
            ))}
          </select>
          {sonoIo && <small className="nota-campo">Non puoi cambiare il tuo ruolo.</small>}
        </label>

        <label className="spunta">
          <input
            type="checkbox"
            checked={attivo}
            onChange={(e) => setAttivo(e.target.checked)}
            disabled={!modificabile || sonoIo}
          />
          Attivo (può accedere all'app)
        </label>

        {errore && <p className="errore">{errore}</p>}

        {modificabile ? (
          <div className="pulsanti-fondo">
            <button type="button" className="pulsante grande" onClick={onChiudi}>
              Annulla
            </button>
            <button className="pulsante primario grande" disabled={!completo || attesa}>
              {attesa ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        ) : (
          <button type="button" className="pulsante grande" onClick={onChiudi}>
            Chiudi
          </button>
        )}

        {!nuovo && modificabile && !sonoIo && (
          <div className="azioni-secondarie">
            {haAccesso ? (
              <button type="button" className="pulsante" onClick={() => setConferma('reimposta')}>
                Reimposta accesso (password dimenticata)
              </button>
            ) : (
              <button type="button" className="pulsante pericolo" onClick={() => setConferma('elimina')}>
                Elimina operatore
              </button>
            )}
          </div>
        )}
      </form>

      {conferma === 'reimposta' && (
        <Conferma
          testo={`Reimpostare l'accesso di ${operatore!.nome}? Al prossimo accesso dovrà creare una nuova password. Fallo in sua presenza.`}
          etichettaConferma="Reimposta"
          attesa={attesa}
          onAnnulla={() => setConferma(null)}
          onConferma={() => esegui(() => reimpostaAccesso(operatore!.id), 'Accesso reimpostato')}
        />
      )}
      {conferma === 'elimina' && (
        <Conferma
          testo={`Eliminare ${operatore!.nome}?`}
          etichettaConferma="Elimina"
          attesa={attesa}
          onAnnulla={() => setConferma(null)}
          onConferma={() => esegui(() => eliminaOperatore(operatore!.id), 'Operatore eliminato')}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { NOMI_RUOLO } from '../config'
import { statoOperatore } from '../permessi'
import { caricaOperatori, messaggioErrore } from '../supabase'
import type { Operatore } from '../types'
import Icona from './Icone'
import ModuloOperatore from './ModuloOperatore'

interface Props {
  io: Operatore
  versione: number
  onMessaggio: (testo: string) => void
}

const ETICHETTE_STATO = { attivo: 'Attivo', disattivato: 'Disattivato', 'in attesa': 'In attesa di primo accesso' }

export default function PaginaOperatori({ io, versione, onMessaggio }: Props) {
  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [modulo, setModulo] = useState<{ operatore?: Operatore } | null>(null)

  const ricarica = useCallback(async () => {
    setCaricamento(true)
    try {
      setOperatori(await caricaOperatori())
      setErrore(null)
    } catch (err) {
      setErrore('Impossibile caricare gli operatori: ' + messaggioErrore(err))
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
      {caricamento && operatori.length === 0 ? (
        <p className="vuoto">Caricamento…</p>
      ) : (
        <ul className="elenco-semplice">
          {operatori.map((o) => {
            const stato = statoOperatore(o)
            return (
              <li key={o.id}>
                <button className="scheda riga-semplice" onClick={() => setModulo({ operatore: o })}>
                  <span className="riga-alto">
                    <strong>{o.nome}</strong>
                    <span className="impianto">{NOMI_RUOLO[o.ruolo]}</span>
                  </span>
                  <span className="riga-alto">
                    <span className="autore">{o.telefono}</span>
                    <span className={`stato stato-${stato.replace(' ', '-')}`}>{ETICHETTE_STATO[stato]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button className="aggiungi" onClick={() => setModulo({})} aria-label="Nuovo operatore">
        <Icona nome="piu" dimensione={32} />
      </button>

      {modulo && (
        <ModuloOperatore
          operatore={modulo.operatore}
          io={io}
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

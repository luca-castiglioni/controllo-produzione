import { useEffect, useState } from 'react'
import { formatDataBreve } from '../format'
import { ultimaValidazione, type UltimaValidazione } from '../supabase'

// Sotto il campo commessa: dice se la commessa è già stata validata
export default function StatoValidazione({ commessa }: { commessa: string }) {
  const [stato, setStato] = useState<UltimaValidazione | null | 'attesa' | 'errore'>('attesa')
  const testo = commessa.trim()

  useEffect(() => {
    if (!testo) return
    setStato('attesa')
    let annullato = false
    // piccolo ritardo: non interroga il database a ogni tasto premuto
    const timer = setTimeout(() => {
      ultimaValidazione(testo)
        .then((v) => !annullato && setStato(v))
        .catch(() => !annullato && setStato('errore'))
    }, 400)
    return () => {
      annullato = true
      clearTimeout(timer)
    }
  }, [testo])

  if (!testo || stato === 'attesa') return null
  if (stato === 'errore') return <p className="validazione validazione-attesa">Stato validazione non disponibile</p>
  if (!stato) return <p className="validazione validazione-attesa">Commessa non ancora validata</p>
  return (
    <p className={`validazione ${stato.esito ? 'validazione-ok' : 'validazione-no'}`}>
      {stato.esito ? '✓ Commessa validata' : '✗ Validazione NO'} il {formatDataBreve(stato.giorno)} su {stato.impianto}
    </p>
  )
}

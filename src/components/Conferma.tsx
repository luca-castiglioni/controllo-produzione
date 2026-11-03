interface Props {
  testo: string
  etichettaConferma: string
  attesa?: boolean
  onAnnulla: () => void
  onConferma: () => void
}

// Finestra di conferma con pulsanti grandi (es. prima di eliminare)
export default function Conferma({ testo, etichettaConferma, attesa, onAnnulla, onConferma }: Props) {
  return (
    <div className="velo centrato" onClick={onAnnulla}>
      <div className="scheda finestra" onClick={(e) => e.stopPropagation()} role="dialog">
        <p>{testo}</p>
        <div className="pulsanti-fondo">
          <button className="pulsante grande" onClick={onAnnulla}>
            Annulla
          </button>
          <button className="pulsante grande pericolo-pieno" onClick={onConferma} disabled={attesa}>
            {attesa ? 'Attendere…' : etichettaConferma}
          </button>
        </div>
      </div>
    </div>
  )
}

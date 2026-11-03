import { NOMI_RUOLO, PAGINE_SERVIZIO, type PaginaServizio } from '../config'
import type { Operatore } from '../types'
import Icona, { type NomeIcona } from './Icone'

const ICONE_PAGINE: Record<PaginaServizio, NomeIcona> = {
  operatori: 'persone',
  impianti: 'fabbrica',
}

interface Props {
  profilo: Operatore
  onChiudi: () => void
  onApriPagina: (pagina: PaginaServizio) => void
  onCambiaPassword: () => void
  onEsci: () => void
}

export default function MenuLaterale({ profilo, onChiudi, onApriPagina, onCambiaPassword, onEsci }: Props) {
  const capo = profilo.ruolo !== 'operatore'
  return (
    <div className="velo" onClick={onChiudi}>
      <nav className="menu-laterale" onClick={(e) => e.stopPropagation()} aria-label="Menu">
        <div className="menu-utente">
          <strong>{profilo.nome}</strong>
          <small>{NOMI_RUOLO[profilo.ruolo]}</small>
        </div>

        {capo && (
          <div className="menu-gruppo">
            <small className="menu-titolo">Anagrafiche</small>
            {PAGINE_SERVIZIO.map((p) => (
              <button key={p.id} className="menu-voce" onClick={() => onApriPagina(p.id)}>
                <Icona nome={ICONE_PAGINE[p.id]} /> {p.titolo}
              </button>
            ))}
          </div>
        )}

        <div className="menu-gruppo">
          <button className="menu-voce" onClick={onCambiaPassword}>
            <Icona nome="chiave" /> Cambia password
          </button>
          <button className="menu-voce" onClick={onEsci}>
            <Icona nome="esci" /> Esci
          </button>
        </div>

        <small className="menu-versione">Versione {__VERSIONE_APP__}</small>
      </nav>
    </div>
  )
}

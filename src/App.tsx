import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Accesso from './components/Accesso'
import CambiaPassword from './components/CambiaPassword'
import Icona from './components/Icone'
import MenuLaterale from './components/MenuLaterale'
import PaginaImpianti from './components/PaginaImpianti'
import PaginaOperatori from './components/PaginaOperatori'
import SezioneRegistro from './components/SezioneRegistro'
import { PAGINE_SERVIZIO, REGISTRO_TEST, REGISTRO_VALIDAZIONI, type PaginaServizio } from './config'
import { caricaProfilo, supabase, supabaseConfigurato } from './supabase'
import type { Operatore } from './types'

export default function App() {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)
  const [profilo, setProfilo] = useState<Operatore | null | undefined>(undefined)
  const [avviso, setAvviso] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigurato) return
    supabase.auth.getSession().then(({ data }) => setSessione(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // dopo il login: carica l'operatore collegato; se è disattivato lo fa uscire
  const authUserId = sessione?.user.id
  useEffect(() => {
    if (!authUserId) {
      setProfilo(undefined)
      return
    }
    caricaProfilo(authUserId)
      .then((p) => {
        if (p) {
          setProfilo(p)
          setAvviso(null)
        } else {
          setAvviso('Accesso disattivato. Rivolgiti al capo reparto.')
          supabase.auth.signOut()
        }
      })
      .catch(() => setAvviso('Impossibile caricare il profilo. Controlla la connessione e riprova.'))
  }, [authUserId])

  if (!supabaseConfigurato) return <DaConfigurare />
  if (sessione === undefined) return <p className="vuoto">Caricamento…</p>
  if (!sessione) return <Accesso key={avviso ?? ''} avviso={avviso} />
  if (!profilo) {
    return avviso ? <ErroreProfilo messaggio={avviso} /> : <p className="vuoto">Caricamento…</p>
  }
  return <Principale profilo={profilo} email={sessione.user.email ?? ''} />
}

type Sezione = 'test' | 'validazione'

function Principale({ profilo, email }: { profilo: Operatore; email: string }) {
  const [sezione, setSezione] = useState<Sezione>('test')
  const [menuAperto, setMenuAperto] = useState(false)
  const [pagina, setPagina] = useState<PaginaServizio | null>(null)
  const [cambioPassword, setCambioPassword] = useState(false)
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const [versione, setVersione] = useState(0)

  useEffect(() => {
    if (!messaggio) return
    const t = setTimeout(() => setMessaggio(null), 2500)
    return () => clearTimeout(t)
  }, [messaggio])

  const registro = sezione === 'test' ? REGISTRO_TEST : REGISTRO_VALIDAZIONI
  const titolo = pagina ? PAGINE_SERVIZIO.find((p) => p.id === pagina)!.titolo : registro.titolo

  return (
    <div className="app">
      <header className="barra-alta">
        {pagina ? (
          <button className="icona-pulsante" onClick={() => setPagina(null)} aria-label="Indietro">
            <Icona nome="indietro" />
          </button>
        ) : (
          <button className="icona-pulsante" onClick={() => setMenuAperto(true)} aria-label="Menu">
            <Icona nome="menu" />
          </button>
        )}
        <img className="logo-piccolo" src="./logo.png" alt="Castiglioni" />
        <h1>{titolo}</h1>
        <button className="icona-pulsante" onClick={() => setVersione(versione + 1)} aria-label="Aggiorna">
          <Icona nome="aggiorna" />
        </button>
      </header>

      <main className="contenuto">
        {pagina === 'operatori' ? (
          <PaginaOperatori io={profilo} versione={versione} onMessaggio={setMessaggio} />
        ) : pagina === 'impianti' ? (
          <PaginaImpianti versione={versione} onMessaggio={setMessaggio} />
        ) : (
          <SezioneRegistro
            key={registro.tabella}
            registro={registro}
            profilo={profilo}
            versione={versione}
            onMessaggio={setMessaggio}
          />
        )}
      </main>

      {!pagina && (
        <nav className="schede-basso">
          <button className={sezione === 'test' ? 'attiva' : ''} onClick={() => setSezione('test')}>
            <Icona nome="occhio" />
            TEST COLLA
          </button>
          {/* gli operatori vedono le validazioni in sola lettura */}
          <button className={sezione === 'validazione' ? 'attiva' : ''} onClick={() => setSezione('validazione')}>
            <Icona nome="pollice" />
            VALIDAZIONE
          </button>
        </nav>
      )}

      {menuAperto && (
        <MenuLaterale
          profilo={profilo}
          onChiudi={() => setMenuAperto(false)}
          onApriPagina={(p) => {
            setPagina(p)
            setMenuAperto(false)
          }}
          onCambiaPassword={() => {
            setCambioPassword(true)
            setMenuAperto(false)
          }}
          onEsci={() => supabase.auth.signOut()}
        />
      )}

      {cambioPassword && (
        <CambiaPassword
          email={email}
          onChiudi={() => setCambioPassword(false)}
          onFatto={() => {
            setCambioPassword(false)
            setMessaggio('Password cambiata')
          }}
        />
      )}

      {messaggio && <div className="messaggio-breve">{messaggio}</div>}
    </div>
  )
}

function ErroreProfilo({ messaggio }: { messaggio: string }) {
  return (
    <main className="schermata-centrale">
      <img className="logo" src="./logo.png" alt="Castiglioni" />
      <p className="errore riquadro">{messaggio}</p>
      <button className="pulsante" onClick={() => supabase.auth.signOut()}>
        Torna all'accesso
      </button>
    </main>
  )
}

function DaConfigurare() {
  return (
    <main className="schermata-centrale">
      <img className="logo" src="./logo.png" alt="Castiglioni" />
      <h1>Controllo Produzione</h1>
      <div className="scheda testo">
        <p><strong>Manca il collegamento a Supabase.</strong></p>
        <p>
          Crea il file <code>.env.local</code> copiando <code>.env.example</code> e inserisci URL e
          chiave del tuo progetto Supabase. Poi riavvia l'app.
        </p>
      </div>
    </main>
  )
}

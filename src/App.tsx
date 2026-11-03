import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Accesso from './components/Accesso'
import CambiaPassword from './components/CambiaPassword'
import Icona from './components/Icone'
import MenuLaterale from './components/MenuLaterale'
import { PAGINE_SERVIZIO, type PaginaServizio } from './config'
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
  const capo = profilo.ruolo !== 'operatore'
  const [sezione, setSezione] = useState<Sezione>('test')
  const [menuAperto, setMenuAperto] = useState(false)
  const [pagina, setPagina] = useState<PaginaServizio | null>(null)
  const [cambioPassword, setCambioPassword] = useState(false)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  useEffect(() => {
    if (!messaggio) return
    const t = setTimeout(() => setMessaggio(null), 2500)
    return () => clearTimeout(t)
  }, [messaggio])

  const sezioneVisibile: Sezione = capo ? sezione : 'test'
  const titolo = pagina
    ? PAGINE_SERVIZIO.find((p) => p.id === pagina)!.titolo
    : sezioneVisibile === 'test'
      ? 'Test colla'
      : 'Validazione'

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
        <img className="logo-piccolo" src="./icon.svg" alt="" />
        <h1>{titolo}</h1>
      </header>

      <main className="contenuto">
        <p className="vuoto">
          {pagina
            ? 'Pagina in arrivo nella fase 5.'
            : sezioneVisibile === 'test'
              ? 'Elenco dei test di incollaggio in arrivo nella fase 3.'
              : 'Elenco delle validazioni in arrivo nella fase 4.'}
        </p>
      </main>

      {!pagina && (
        <nav className="schede-basso">
          <button
            className={sezioneVisibile === 'test' ? 'attiva' : ''}
            onClick={() => setSezione('test')}
          >
            <Icona nome="occhio" />
            TEST COLLA
          </button>
          {capo && (
            <button
              className={sezioneVisibile === 'validazione' ? 'attiva' : ''}
              onClick={() => setSezione('validazione')}
            >
              <Icona nome="pollice" />
              VALIDAZIONE
            </button>
          )}
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
      <img className="logo" src="./icon.svg" alt="" />
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
      <img className="logo" src="./icon.svg" alt="" />
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

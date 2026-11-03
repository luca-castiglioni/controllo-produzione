import { supabaseConfigurato } from './supabase'

// Fase 1: solo lo scheletro. Accesso e schermate arrivano nelle fasi successive.
export default function App() {
  if (!supabaseConfigurato) return <DaConfigurare />
  return (
    <main className="schermata-centrale">
      <img className="logo" src="./icon.svg" alt="" />
      <h1>Controllo Produzione</h1>
      <p className="sottotitolo">Collegamento a Supabase configurato. Accesso in arrivo nella fase 2.</p>
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

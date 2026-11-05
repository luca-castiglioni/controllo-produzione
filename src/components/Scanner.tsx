import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { FORMATI_NATIVI, suggerimentiZxing } from '../codici'
import { IOS } from '../dispositivo'

interface Props {
  onLetto: (testo: string) => void
  onChiudi: () => void
}

const LIVELLI_ZOOM = [1, 2, 3]
const CHIAVE_FOTOCAMERA = 'fotocamera-scanner'

// Su iPhone il permesso per la fotocamera spesso non viene ricordato tra una
// richiesta e l'altra (soprattutto nell'app sulla schermata Home): dopo una
// scansione il flusso resta aperto per un po' e la scansione successiva lo riusa.
const MANTIENI_FLUSSO_MS = 2 * 60 * 1000
let flussoPronto: { flusso: MediaStream; fotocamera: string | null; timer: ReturnType<typeof setTimeout> } | null =
  null

function spegni(flusso: MediaStream) {
  flusso.getTracks().forEach((t) => t.stop())
}

// Riprende il flusso tenuto aperto, se è della stessa fotocamera ed è ancora attivo
function riprendiFlusso(fotocamera: string | null): MediaStream | null {
  if (!flussoPronto) return null
  const { flusso, fotocamera: sua, timer } = flussoPronto
  clearTimeout(timer)
  flussoPronto = null
  if (sua === fotocamera && flusso.active) return flusso
  spegni(flusso)
  return null
}

function rilasciaFlusso(flusso: MediaStream, fotocamera: string | null) {
  if (!IOS) return spegni(flusso)
  const precedente = riprendiFlusso(null)
  if (precedente && precedente !== flusso) spegni(precedente)
  flussoPronto = {
    flusso,
    fotocamera,
    timer: setTimeout(() => {
      spegni(flusso)
      flussoPronto = null
    }, MANTIENI_FLUSSO_MS),
  }
}

// Funzioni del browser non ancora nei tipi standard di TypeScript
type Capacita = MediaTrackCapabilities & { focusMode?: string[]; zoom?: { min: number; max: number } }
interface RilevatoreNativo {
  detect(sorgente: HTMLVideoElement): Promise<{ rawValue: string }[]>
}
interface CostruttoreRilevatore {
  new (opzioni: { formats: string[] }): RilevatoreNativo
  getSupportedFormats(): Promise<string[]>
}

// Lettore di codici integrato nel browser (Chrome su Android): più veloce e
// affidabile di zxing. Non esiste su iPhone: lì si usa zxing.
async function creaRilevatoreNativo(): Promise<RilevatoreNativo | null> {
  const Rilevatore = (window as unknown as { BarcodeDetector?: CostruttoreRilevatore }).BarcodeDetector
  if (!Rilevatore) return null
  try {
    const supportati = await Rilevatore.getSupportedFormats()
    const formati = FORMATI_NATIVI.filter((f) => supportati.includes(f))
    return formati.length ? new Rilevatore({ formats: formati }) : null
  } catch {
    return null
  }
}

function messaggioFotocamera(err: unknown): string {
  const nome = (err as { name?: string }).name
  if (nome === 'NotAllowedError') {
    return 'Permesso per la fotocamera negato. Consentilo nelle impostazioni del browser e riprova.'
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
    return 'Fotocamera non trovata. Prova "Cambia fotocamera".'
  }
  return 'Impossibile avviare la fotocamera.'
}

function leggiFotocameraScelta(): string | null {
  try {
    return localStorage.getItem(CHIAVE_FOTOCAMERA)
  } catch {
    return null
  }
}

function salvaFotocameraScelta(id: string) {
  try {
    localStorage.setItem(CHIAVE_FOTOCAMERA, id)
  } catch {
    // non indispensabile
  }
}

// Fotocamere posteriori (i nomi sono disponibili solo dopo il permesso)
async function fotocamerePosteriori(): Promise<MediaDeviceInfo[]> {
  const video = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
  if (video.some((d) => !d.label)) return []
  const posteriori = video.filter((d) => /back|rear|environment|posterior/i.test(d.label))
  return posteriori.length ? posteriori : video
}

// Su Android la principale è di norma la prima ("camera2 0, facing back"):
// le altre posteriori sono grandangolo/tele, spesso senza messa a fuoco ravvicinata
function fotocameraPreferita(elenco: MediaDeviceInfo[]): string | undefined {
  const scelta = leggiFotocameraScelta()
  if (scelta && elenco.some((d) => d.deviceId === scelta)) return scelta
  return [...elenco].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))[0]?.deviceId
}

// Lettura di codici a barre e QR con la fotocamera posteriore
export default function Scanner({ onLetto, onChiudi }: Props) {
  const contenitore = useRef<HTMLDivElement>(null)
  const traccia = useRef<MediaStreamTrack | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [fotocamere, setFotocamere] = useState<MediaDeviceInfo[]>([])
  // undefined = ancora da decidere; null = "quella posteriore" scelta dal browser
  const [fotocamera, setFotocamera] = useState<string | null | undefined>(undefined)
  const [zoomMassimo, setZoomMassimo] = useState(1)
  const [zoom, setZoom] = useState(1)

  // scelta iniziale: se il permesso c'è già, si conoscono i nomi delle fotocamere
  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setErrore("La fotocamera funziona solo se l'app è aperta con un indirizzo https://")
      return
    }
    // senza nomi (iPhone, prima del permesso) si prova la fotocamera scelta in passato
    fotocamerePosteriori()
      .then((elenco) => {
        setFotocamere(elenco)
        setFotocamera(fotocameraPreferita(elenco) ?? leggiFotocameraScelta() ?? null)
      })
      .catch(() => setFotocamera(leggiFotocameraScelta() ?? null))
  }, [])

  useEffect(() => {
    if (fotocamera === undefined) return
    // Ogni avvio usa un proprio elemento video: chiudere una lettura
    // non può spegnere quella successiva.
    const video = document.createElement('video')
    video.muted = true
    video.autoplay = true
    video.playsInline = true
    video.setAttribute('playsinline', '') // richiesto da Safari su iPhone
    contenitore.current!.appendChild(video)

    let flusso: MediaStream | undefined
    let controlliZxing: IScannerControls | undefined
    let prossimoTentativo: ReturnType<typeof setTimeout> | undefined
    let chiuso = false

    function ferma() {
      chiuso = true
      clearTimeout(prossimoTentativo)
      controlliZxing?.stop()
      if (flusso) rilasciaFlusso(flusso, fotocamera ?? null)
      flusso = undefined
      traccia.current = null
    }

    function letto(testo: string) {
      if (chiuso) return
      ferma()
      navigator.vibrate?.(80)
      onLetto(testo)
    }

    async function regolaFotocamera(t: MediaStreamTrack) {
      traccia.current = t
      const capacita = (t.getCapabilities?.() ?? {}) as Capacita
      if (capacita.focusMode?.includes('continuous')) {
        await t.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
      }
      if (capacita.zoom) {
        // il flusso riusato potrebbe essere rimasto ingrandito
        await t.applyConstraints({ advanced: [{ zoom: 1 } as MediaTrackConstraintSet] }).catch(() => {})
      }
      setZoom(1)
      setZoomMassimo(capacita.zoom?.max ?? 1)

      // primo utilizzo in assoluto: ora che c'è il permesso si può scegliere la principale.
      // Non su iPhone: lì la posteriore scelta dal sistema va bene e riavviare la
      // fotocamera farebbe chiedere di nuovo il permesso.
      if (fotocamera === null && IOS) {
        setFotocamere(await fotocamerePosteriori())
      } else if (fotocamera === null) {
        const elenco = await fotocamerePosteriori()
        setFotocamere(elenco)
        const preferita = fotocameraPreferita(elenco)
        if (preferita && preferita !== t.getSettings().deviceId && !chiuso) setFotocamera(preferita)
      }
    }

    async function avvia() {
      const fc = fotocamera ?? null
      let nuovo = riprendiFlusso(fc)
      if (!nuovo) {
        try {
          nuovo = await navigator.mediaDevices.getUserMedia({
            video: {
              // alta risoluzione: le barre sottili si leggono meglio
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              ...(fc ? { deviceId: { exact: fc } } : { facingMode: { ideal: 'environment' } }),
            },
          })
        } catch (err) {
          if (chiuso) return
          // fotocamera scelta in passato non più disponibile: si torna alla posteriore
          const nome = (err as { name?: string }).name
          if (fc && (nome === 'OverconstrainedError' || nome === 'NotFoundError')) setFotocamera(null)
          else setErrore(messaggioFotocamera(err))
          return
        }
      }
      if (chiuso) {
        rilasciaFlusso(nuovo, fc) // chiuso mentre la fotocamera si avviava
        return
      }
      flusso = nuovo
      video.srcObject = flusso
      await video.play().catch(() => {})
      await regolaFotocamera(flusso.getVideoTracks()[0])
      if (chiuso) return

      const nativo = await creaRilevatoreNativo()
      if (nativo) {
        // qualche tentativo al secondo sul fotogramma corrente
        const tentativo = async () => {
          if (chiuso) return
          try {
            const codici = await nativo.detect(video)
            if (codici.length) return letto(codici[0].rawValue)
          } catch {
            // fotogramma non pronto: si riprova
          }
          prossimoTentativo = setTimeout(tentativo, 100)
        }
        tentativo()
        return
      }

      controlliZxing = await new BrowserMultiFormatReader(suggerimentiZxing()).decodeFromVideoElement(
        video,
        (risultato) => risultato && letto(risultato.getText()),
      )
      if (chiuso) controlliZxing.stop()
    }

    // piccolo ritardo: se il componente viene smontato subito (in sviluppo React
    // lo monta due volte) la fotocamera non parte affatto
    const timer = setTimeout(avvia, 50)

    return () => {
      clearTimeout(timer)
      ferma()
      video.remove()
    }
  }, [fotocamera, onLetto])

  function cambiaFotocamera() {
    if (fotocamere.length < 2) return
    const attuale = fotocamere.findIndex((d) => d.deviceId === fotocamera)
    const prossima = fotocamere[(attuale + 1) % fotocamere.length].deviceId
    salvaFotocameraScelta(prossima)
    setErrore(null)
    setFotocamera(prossima)
  }

  function cambiaZoom() {
    const livelli = LIVELLI_ZOOM.filter((z) => z <= zoomMassimo)
    const prossimo = livelli[(livelli.indexOf(zoom) + 1) % livelli.length] ?? 1
    traccia.current
      ?.applyConstraints({ advanced: [{ zoom: prossimo } as MediaTrackConstraintSet] })
      .then(() => setZoom(prossimo))
      .catch(() => {})
  }

  const numeroFotocamera = fotocamere.findIndex((d) => d.deviceId === fotocamera) + 1

  return (
    <div className="scanner">
      <div ref={contenitore} className="scanner-video" />
      <div className="scanner-mirino" />
      <p className="scanner-testo">
        {errore ?? 'Inquadra il codice a barre o il QR, tenendo il telefono a 15-20 cm'}
      </p>
      <div className="scanner-comandi">
        {zoomMassimo >= 2 && (
          <button className="pulsante grande" onClick={cambiaZoom}>
            Zoom {zoom}x
          </button>
        )}
        {fotocamere.length > 1 && (
          <button className="pulsante grande" onClick={cambiaFotocamera}>
            Fotocamera {numeroFotocamera || '?'}/{fotocamere.length}
          </button>
        )}
      </div>
      <button className="pulsante grande scanner-annulla" onClick={onChiudi}>
        Annulla
      </button>
    </div>
  )
}

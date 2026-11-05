import { BrowserMultiFormatReader } from '@zxing/browser'
import { FORMATI_NATIVI, suggerimentiZxing } from './codici'

// Legge un codice a barre / QR da una foto scattata con la fotocamera del telefono.
// Usata su iPhone: la fotocamera di sistema non chiede permessi all'app.
// Caricata solo quando serve (zxing è una libreria grande).

// lati massimi provati: le foto del telefono sono enormi e zxing va meglio su immagini medie
const DIMENSIONI = [1600, 1000, 2400]
const ROTAZIONI = [0, 90]

function disegna(foto: ImageBitmap, latoMassimo: number, rotazione: number): HTMLCanvasElement {
  const scala = Math.min(1, latoMassimo / Math.max(foto.width, foto.height))
  const w = Math.round(foto.width * scala)
  const h = Math.round(foto.height * scala)
  const canvas = document.createElement('canvas')
  canvas.width = rotazione ? h : w
  canvas.height = rotazione ? w : h
  const ctx = canvas.getContext('2d')!
  if (rotazione) {
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotazione * Math.PI) / 180)
    ctx.drawImage(foto, -w / 2, -h / 2, w, h)
  } else {
    ctx.drawImage(foto, 0, 0, w, h)
  }
  return canvas
}

async function conLettoreNativo(foto: ImageBitmap): Promise<string | null> {
  const Rilevatore = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(s: ImageBitmap): Promise<{ rawValue: string }[]> } }).BarcodeDetector
  if (!Rilevatore) return null
  try {
    const codici = await new Rilevatore({ formats: FORMATI_NATIVI }).detect(foto)
    return codici[0]?.rawValue ?? null
  } catch {
    return null
  }
}

// Restituisce il testo del codice, oppure null se nella foto non se ne trova nessuno
export async function leggiCodiceDaFoto(file: Blob): Promise<string | null> {
  // createImageBitmap applica l'orientamento della foto (EXIF)
  const foto = await createImageBitmap(file)
  try {
    const nativo = await conLettoreNativo(foto)
    if (nativo) return nativo
    const lettore = new BrowserMultiFormatReader(suggerimentiZxing())
    for (const rotazione of ROTAZIONI) {
      for (const lato of DIMENSIONI) {
        try {
          return lettore.decodeFromCanvas(disegna(foto, lato, rotazione)).getText()
        } catch {
          // nessun codice a questa dimensione/rotazione: si prova la successiva
        }
      }
    }
    return null
  } finally {
    foto.close()
  }
}

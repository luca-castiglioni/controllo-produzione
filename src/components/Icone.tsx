// Icone semplici disegnate in SVG (nessuna libreria esterna)
const percorsi = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  chiudi: 'M6 6l12 12M18 6L6 18',
  occhio: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  pollice:
    'M7 11v9H4v-9h3zM7 11l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1.2 7A2 2 0 0117.3 20H7',
  chiave: 'M15 7a4 4 0 11-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0115 7z',
  esci: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4',
  persone: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-4.9',
  fabbrica: 'M3 21V10l6 4v-4l6 4V5h4v16H3z',
  indietro: 'M15 18l-6-6 6-6',
}

export type NomeIcona = keyof typeof percorsi

export default function Icona({ nome, dimensione = 24 }: { nome: NomeIcona; dimensione?: number }) {
  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={percorsi[nome]} />
    </svg>
  )
}

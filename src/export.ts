import type { Registro } from './config'
import { formatDataOra, formatOra, oggi } from './format'
import type { RecordRegistro } from './types'

function dataExcel(iso: string): Date {
  const [a, m, g] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, g))
}

// Crea il file Excel con i record mostrati (filtri compresi) e lo fa scaricare
export async function scaricaExcel(registro: Registro, record: RecordRegistro[]) {
  // caricata solo quando serve: è una libreria grande
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Controllo Produzione'
  wb.created = new Date()

  const ws = wb.addWorksheet(registro.titolo, { views: [{ state: 'frozen', ySplit: 1 }] })
  const colonne = [
    { name: registro.etichettaData, larghezza: 12 },
    { name: 'Ora', larghezza: 8 },
    { name: 'Commessa', larghezza: 14 },
    { name: 'Codice letto', larghezza: 18 },
    { name: 'Impianto', larghezza: 10 },
    { name: registro.etichettaEsito, larghezza: 12 },
    ...(registro.conControlloIncollaggio ? [{ name: 'Controllo incollaggio', larghezza: 20 }] : []),
    ...(registro.conNote ? [{ name: 'Note', larghezza: 40 }] : []),
    { name: 'Operatore', larghezza: 22 },
    { name: 'Ultima modifica', larghezza: 18 },
  ]
  ws.addTable({
    name: registro.tabella,
    ref: 'A1',
    style: { theme: 'TableStyleMedium7', showRowStripes: true },
    columns: colonne.map((c) => ({ name: c.name, filterButton: true })),
    rows: record.map((r) => [
      dataExcel(r.data),
      formatOra(r.ora),
      r.commessa,
      r.barcode ?? '',
      r.impianto,
      r.esito ? 'OK' : 'NO',
      ...(registro.conControlloIncollaggio ? [r.controllo_incollaggio ? 'Sì' : 'No'] : []),
      ...(registro.conNote ? [r.note ?? ''] : []),
      r.operatore?.nome ?? '',
      r.updated_at ? formatDataOra(r.updated_at) : '',
    ]),
  })
  colonne.forEach((c, i) => (ws.getColumn(i + 1).width = c.larghezza))
  ws.getColumn(1).numFmt = 'dd/mm/yyyy'

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${registro.tabella}-${oggi()}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

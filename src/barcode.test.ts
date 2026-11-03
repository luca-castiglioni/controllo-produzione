import { describe, expect, it } from 'vitest'
import { parseBarcode } from './barcode'

describe('parseBarcode', () => {
  it('esempi reali della specifica', () => {
    expect(parseBarcode('CF$661539020')).toEqual({ valido: true, barcode: 'CF$661539020', commessa: '661539' })
    expect(parseBarcode('CF$661539040')).toEqual({ valido: true, barcode: 'CF$661539040', commessa: '661539' })
  })

  it('toglie gli asterischi a inizio e fine', () => {
    expect(parseBarcode('*CF$661539020*')).toEqual({ valido: true, barcode: 'CF$661539020', commessa: '661539' })
  })

  it('la lunghezza della commessa non è fissa', () => {
    expect(parseBarcode('CF$12345678901')).toMatchObject({ valido: true, commessa: '12345678' })
    expect(parseBarcode('CF$1001')).toMatchObject({ valido: true, commessa: '1' })
  })

  it('meno di 7 caratteri dopo la pulizia: codice non valido', () => {
    expect(parseBarcode('*CF$123*')).toEqual({ valido: false, barcode: 'CF$123', errore: 'Codice non valido' })
    expect(parseBarcode('')).toMatchObject({ valido: false })
  })
})

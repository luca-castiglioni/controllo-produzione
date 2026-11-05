import { BarcodeFormat, DecodeHintType } from '@zxing/library'

// Formati accettati (Code 39: gli asterischi sulle etichette sono tipici di quel formato).
// Questo file usa zxing (libreria grande): va importato solo da moduli caricati su richiesta.
export const FORMATI_NATIVI = ['code_128', 'code_39', 'code_93', 'qr_code', 'data_matrix', 'itf', 'codabar', 'ean_13']

const FORMATI_ZXING = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
]

export function suggerimentiZxing() {
  return new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, FORMATI_ZXING],
    [DecodeHintType.TRY_HARDER, true],
  ])
}

export const WASTE_GUARD_FIELDS = [
  'date',
  'menu_item',
  'category',
  'prepared_quantity',
  'sold_quantity',
  'leftover_quantity',
  'waste_quantity',
  'unit',
  'unit_cost',
  'selling_price',
] as const

export type WasteGuardField = (typeof WASTE_GUARD_FIELDS)[number]

export const REQUIRED_FIELDS: WasteGuardField[] = ['date', 'menu_item', 'prepared_quantity']

/** One raw row straight out of the CSV/Excel file, keyed by its original column header. */
export type RawImportRow = Record<string, string>

/** source column header -> Waste Guard field (or null if left unmapped) */
export type ColumnMapping = Partial<Record<WasteGuardField, string | null>>

export type NormalizedRow = {
  rowNumber: number
  date: string | null
  menu_item: string | null
  category: string | null
  prepared_quantity: number | null
  sold_quantity: number | null
  leftover_quantity: number | null
  waste_quantity: number | null
  unit: string | null
  unit_cost: number | null
  selling_price: number | null
}

export type RowValidation = {
  isValid: boolean
  isDuplicate: boolean
  errors: string[]
  warnings: string[]
}

export type ValidatedRow = {
  raw: RawImportRow
  normalized: NormalizedRow
  validation: RowValidation
}

export type ValidationSummary = {
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  missingRequiredCount: number
  negativeQuantityCount: number
  soldExceedsPreparedCount: number
  invalidDateCount: number
}

export type ParsedFile = {
  fileName: string
  fileType: 'csv' | 'xlsx' | 'xls'
  headers: string[]
  rows: RawImportRow[]
}

export type ImportSummary = {
  totalRows: number
  importedRows: number
  skippedRows: number
  menuItemCount: number
  distinctDayCount: number
}

import type { ColumnMapping, NormalizedRow, RawImportRow, RowValidation, ValidatedRow, ValidationSummary, WasteGuardField } from './types'

function parseNumber(value: string | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  const num = Number(trimmed.replace(/,/g, ''))
  return Number.isFinite(num) ? num : null
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

function getMapped(raw: RawImportRow, mapping: ColumnMapping, field: WasteGuardField): string | undefined {
  const column = mapping[field]
  if (!column) return undefined
  return raw[column]
}

export function normalizeRow(raw: RawImportRow, mapping: ColumnMapping, rowNumber: number): NormalizedRow {
  const preparedQuantity = parseNumber(getMapped(raw, mapping, 'prepared_quantity'))
  const soldQuantity = parseNumber(getMapped(raw, mapping, 'sold_quantity'))
  let leftoverQuantity = parseNumber(getMapped(raw, mapping, 'leftover_quantity'))

  // Derive leftover when only prepared + sold were provided.
  if (leftoverQuantity == null && preparedQuantity != null && soldQuantity != null) {
    leftoverQuantity = Math.max(0, preparedQuantity - soldQuantity)
  }

  return {
    rowNumber,
    date: parseDate(getMapped(raw, mapping, 'date')),
    menu_item: getMapped(raw, mapping, 'menu_item')?.trim() || null,
    category: getMapped(raw, mapping, 'category')?.trim() || null,
    prepared_quantity: preparedQuantity,
    sold_quantity: soldQuantity,
    leftover_quantity: leftoverQuantity,
    waste_quantity: parseNumber(getMapped(raw, mapping, 'waste_quantity')),
    unit: getMapped(raw, mapping, 'unit')?.trim() || null,
    unit_cost: parseNumber(getMapped(raw, mapping, 'unit_cost')),
    selling_price: parseNumber(getMapped(raw, mapping, 'selling_price')),
  }
}

export function validateNormalizedRow(row: NormalizedRow, rawDateValue: string | undefined): RowValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!row.date) {
    errors.push(rawDateValue && rawDateValue.trim() ? 'Invalid date' : 'Missing date')
  }
  if (!row.menu_item) errors.push('Missing menu item')
  // POS exports usually only have sold_quantity; manual kitchen logs usually only
  // have prepared/leftover. Any one of the three is enough for the row to be useful.
  if (row.prepared_quantity == null && row.sold_quantity == null && row.leftover_quantity == null) {
    errors.push('Missing prepared, sold, or leftover quantity')
  }

  const quantityChecks: Array<[string, number | null]> = [
    ['prepared quantity', row.prepared_quantity],
    ['sold quantity', row.sold_quantity],
    ['leftover quantity', row.leftover_quantity],
    ['waste quantity', row.waste_quantity],
  ]
  for (const [label, value] of quantityChecks) {
    if (value != null && value < 0) {
      errors.push(`Negative ${label}`)
    }
  }

  if (row.prepared_quantity != null && row.sold_quantity != null && row.sold_quantity > row.prepared_quantity) {
    warnings.push('Sold quantity is greater than prepared quantity')
  }

  return {
    isValid: errors.length === 0,
    isDuplicate: false,
    errors,
    warnings,
  }
}

/** Normalizes + validates every row, and flags in-file duplicates (same date + menu item). */
export function buildValidatedRows(rawRows: RawImportRow[], mapping: ColumnMapping): ValidatedRow[] {
  const dateColumn = mapping.date
  const seenKeys = new Set<string>()

  return rawRows.map((raw, index) => {
    const normalized = normalizeRow(raw, mapping, index + 1)
    const validation = validateNormalizedRow(normalized, dateColumn ? raw[dateColumn] : undefined)

    if (normalized.date && normalized.menu_item) {
      const key = `${normalized.date}__${normalized.menu_item.toLowerCase()}`
      if (seenKeys.has(key)) {
        validation.isDuplicate = true
        validation.warnings.push('Duplicate of an earlier row (same date + menu item)')
      } else {
        seenKeys.add(key)
      }
    }

    return { raw, normalized, validation }
  })
}

export function summarizeValidation(rows: ValidatedRow[]): ValidationSummary {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.validation.isValid && !row.validation.isDuplicate).length,
    invalidRows: rows.filter((row) => !row.validation.isValid).length,
    duplicateRows: rows.filter((row) => row.validation.isDuplicate).length,
    missingRequiredCount: rows.filter((row) => row.validation.errors.some((error) => error.startsWith('Missing'))).length,
    negativeQuantityCount: rows.filter((row) => row.validation.errors.some((error) => error.startsWith('Negative'))).length,
    soldExceedsPreparedCount: rows.filter((row) => row.validation.warnings.some((warning) => warning.includes('greater than prepared'))).length,
    invalidDateCount: rows.filter((row) => row.validation.errors.includes('Invalid date')).length,
  }
}

/** Rows that will actually be sent to the database if the owner confirms the import. */
export function getImportableRows(rows: ValidatedRow[]): ValidatedRow[] {
  return rows.filter((row) => row.validation.isValid && !row.validation.isDuplicate)
}

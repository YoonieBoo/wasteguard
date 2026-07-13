import { WASTE_GUARD_FIELDS, type ColumnMapping, type WasteGuardField } from './types'

const FIELD_ALIASES: Record<WasteGuardField, string[]> = {
  date: ['date', 'day', 'report date', 'sale date'],
  menu_item: ['menu item', 'menu_item', 'product name', 'product', 'item name', 'item'],
  category: ['category', 'type', 'menu category'],
  prepared_quantity: ['prepared quantity', 'prepared qty', 'prepared', 'qty prepared', 'production qty'],
  sold_quantity: ['sold quantity', 'sales qty', 'sold qty', 'qty sold', 'sales quantity', 'units sold'],
  leftover_quantity: ['leftover quantity', 'unsold qty', 'leftover', 'leftover qty', 'remaining qty', 'unsold'],
  waste_quantity: ['waste quantity', 'waste qty', 'wasted', 'wastage'],
  unit: ['unit', 'uom', 'unit of measure'],
  unit_cost: ['unit cost', 'cost', 'cost per unit'],
  selling_price: ['selling price', 'price', 'sale price', 'unit price'],
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ')
}

/** Best-effort auto-mapping from source headers to Waste Guard fields; the UI lets the owner override any of it. */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }))

  for (const field of WASTE_GUARD_FIELDS) {
    const aliases = FIELD_ALIASES[field]
    const match = normalizedHeaders.find(({ normalized }) => aliases.includes(normalized))
    mapping[field] = match ? match.header : null
  }

  return mapping
}

export const FIELD_LABELS: Record<WasteGuardField, string> = {
  date: 'Date',
  menu_item: 'Menu Item',
  category: 'Category',
  prepared_quantity: 'Prepared Quantity',
  sold_quantity: 'Sold Quantity',
  leftover_quantity: 'Leftover Quantity',
  waste_quantity: 'Waste Quantity',
  unit: 'Unit',
  unit_cost: 'Unit Cost',
  selling_price: 'Selling Price',
}

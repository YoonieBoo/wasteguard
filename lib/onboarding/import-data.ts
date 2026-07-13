import { supabase } from '@/lib/supabase'
import type { ImportSummary, ValidatedRow } from './types'

const BATCH_SIZE = 200

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export type ImportProgress = {
  phase: 'menu-items' | 'daily-operations' | 'finalizing'
  completed: number
  total: number
}

type ImportInput = {
  businessId: string
  fileName: string
  fileType: string
  totalRows: number
  importableRows: ValidatedRow[]
  onProgress?: (progress: ImportProgress) => void
}

/**
 * Upserts unique menu items, resolves each to its id, batch-inserts the daily
 * operation rows (duplicates against existing data are skipped, not overwritten),
 * records the import in data_imports, then marks onboarding complete.
 */
export async function importValidatedRows({
  businessId,
  fileName,
  fileType,
  totalRows,
  importableRows,
  onProgress,
}: ImportInput): Promise<ImportSummary> {
  type MenuItemPayload = {
    business_id: string
    name: string
    category: string | null
    unit: string | null
    unit_cost: number | null
    selling_price: number | null
  }

  const menuItemsByName = new Map<string, MenuItemPayload>()
  for (const row of importableRows) {
    const name = row.normalized.menu_item!
    if (!menuItemsByName.has(name)) {
      menuItemsByName.set(name, {
        business_id: businessId,
        name,
        category: row.normalized.category,
        unit: row.normalized.unit,
        unit_cost: row.normalized.unit_cost,
        selling_price: row.normalized.selling_price,
      })
    }
  }

  const menuItemIdByName = new Map<string, string>()
  const menuItemBatches = chunk(Array.from(menuItemsByName.values()), BATCH_SIZE)

  for (let i = 0; i < menuItemBatches.length; i++) {
    const { data, error } = await supabase
      .from('menu_items')
      .upsert(menuItemBatches[i], { onConflict: 'business_id,name' })
      .select('id, name')

    if (error) throw new Error(`Unable to save menu items: ${error.message}`)
    for (const item of data ?? []) {
      menuItemIdByName.set(item.name as string, item.id as string)
    }
    onProgress?.({ phase: 'menu-items', completed: i + 1, total: menuItemBatches.length || 1 })
  }

  const dailyOperationsPayload = importableRows
    .map((row) => {
      const menuItemId = menuItemIdByName.get(row.normalized.menu_item!)
      if (!menuItemId) return null
      return {
        business_id: businessId,
        menu_item_id: menuItemId,
        date: row.normalized.date!,
        // Any of these three can be null now — a POS export usually only has
        // sold_quantity, a manual kitchen log usually only has prepared/leftover.
        prepared_quantity: row.normalized.prepared_quantity,
        sold_quantity: row.normalized.sold_quantity,
        leftover_quantity: row.normalized.leftover_quantity,
        waste_quantity: row.normalized.waste_quantity,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  let importedCount = 0
  const operationBatches = chunk(dailyOperationsPayload, BATCH_SIZE)

  for (let i = 0; i < operationBatches.length; i++) {
    const { data, error } = await supabase
      .from('daily_operations')
      .upsert(operationBatches[i], { onConflict: 'business_id,menu_item_id,date', ignoreDuplicates: true })
      .select('id')

    if (error) throw new Error(`Unable to save historical data: ${error.message}`)
    importedCount += data?.length ?? 0
    onProgress?.({ phase: 'daily-operations', completed: i + 1, total: operationBatches.length || 1 })
  }

  onProgress?.({ phase: 'finalizing', completed: 0, total: 1 })

  const failedRows = totalRows - importedCount

  const { error: importLogError } = await supabase.from('data_imports').insert({
    business_id: businessId,
    file_name: fileName,
    file_type: fileType,
    total_rows: totalRows,
    imported_rows: importedCount,
    failed_rows: failedRows,
    status: failedRows > 0 ? 'completed_with_errors' : 'completed',
  })
  if (importLogError) throw new Error(`Unable to record import: ${importLogError.message}`)

  const { error: onboardingError } = await supabase
    .from('bakeries')
    .update({ onboarding_completed: true })
    .eq('id', businessId)
  if (onboardingError) throw new Error(`Unable to finish onboarding: ${onboardingError.message}`)

  onProgress?.({ phase: 'finalizing', completed: 1, total: 1 })

  return {
    totalRows,
    importedRows: importedCount,
    skippedRows: failedRows,
    menuItemCount: menuItemIdByName.size,
    distinctDayCount: new Set(dailyOperationsPayload.map((row) => row.date)).size,
  }
}

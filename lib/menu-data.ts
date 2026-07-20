import { supabase } from '@/lib/supabase'
import type { FoodRow } from '@/lib/mock-data'

export type MenuItemIngredient = {
  name: string
  quantityPerPortion: number
  unit: string
}

export type BusinessMenuItem = {
  id: string
  name: string
  category: string | null
  unit: string | null
  unitCost: number | null
  sellingPrice: number | null
  imageUrl: string | null
  ingredients: MenuItemIngredient[]
}

export type BusinessSalesHistoryRow = {
  date: string
  menu_item: string
  category: string | null
  prepared_quantity: number | null
  sold_quantity: number | null
  leftover_quantity: number | null
  selling_price: number | null
  unit_cost: number | null
}

export type BusinessMenuData = {
  menuItems: BusinessMenuItem[]
  salesHistory: BusinessSalesHistoryRow[]
}

function toMenuItem(row: Record<string, unknown>): BusinessMenuItem {
  const rawIngredients = Array.isArray(row.ingredients) ? row.ingredients : []

  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string | null) ?? null,
    unit: (row.unit as string | null) ?? null,
    unitCost: (row.unit_cost as number | null) ?? null,
    sellingPrice: (row.selling_price as number | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    ingredients: rawIngredients.map((ingredient) => {
      const i = ingredient as Record<string, unknown>
      return {
        name: String(i.name ?? ''),
        quantityPerPortion: Number(i.quantityPerPortion ?? 0),
        unit: String(i.unit ?? ''),
      }
    }),
  }
}

const MENU_ITEM_COLUMNS = 'id, name, category, unit, unit_cost, selling_price, image_url, ingredients'

/**
 * Reads back the per-dish history an owner imported during onboarding
 * (menu_items + daily_operations), joined into a flat shape the
 * recommendation engine can consume directly.
 */
export async function fetchBusinessMenuData(businessId: string): Promise<BusinessMenuData> {
  const [{ data: menuItemRows }, { data: operationRows }] = await Promise.all([
    supabase.from('menu_items').select(MENU_ITEM_COLUMNS).eq('business_id', businessId),
    supabase
      .from('daily_operations')
      .select('menu_item_id, date, prepared_quantity, sold_quantity, leftover_quantity')
      .eq('business_id', businessId),
  ])

  const menuItems: BusinessMenuItem[] = (menuItemRows ?? []).map(toMenuItem)
  const menuItemById = new Map(menuItems.map((item) => [item.id, item]))

  const salesHistory: BusinessSalesHistoryRow[] = (operationRows ?? [])
    .map((row) => {
      const menuItem = menuItemById.get(row.menu_item_id as string)
      if (!menuItem) return null
      return {
        date: row.date as string,
        menu_item: menuItem.name,
        category: menuItem.category,
        prepared_quantity: row.prepared_quantity as number | null,
        sold_quantity: row.sold_quantity as number | null,
        leftover_quantity: row.leftover_quantity as number | null,
        selling_price: menuItem.sellingPrice,
        unit_cost: menuItem.unitCost,
      }
    })
    .filter((row): row is BusinessSalesHistoryRow => row !== null)

  return { menuItems, salesHistory }
}

/**
 * Aggregates per-dish sales history into one row per day, in the same shape
 * the rest of the dashboard (revenue chart, demand analytics, quality score,
 * ESG/savings pages) already consumes — so imported CSV data shows up there
 * immediately, without requiring a separate manual daily check-in.
 *
 * Money-saved/CO2-saved use the same rough heuristics as a manual check-in
 * save (see handleDailyInputSave in app/dashboard/page.tsx) since there's no
 * more precise per-dish source for those two fields.
 */
export function deriveDailyRowsFromSalesHistory(salesHistory: BusinessSalesHistoryRow[]): FoodRow[] {
  const byDate = new Map<
    string,
    { prepared: number; sold: number; leftover: number; revenue: number }
  >()

  for (const row of salesHistory) {
    const entry = byDate.get(row.date) ?? { prepared: 0, sold: 0, leftover: 0, revenue: 0 }
    const prepared = row.prepared_quantity ?? 0
    const sold = row.sold_quantity ?? 0
    const leftover = row.leftover_quantity ?? (row.prepared_quantity != null ? Math.max(0, prepared - sold) : 0)

    entry.prepared += prepared
    entry.sold += sold
    entry.leftover += leftover
    entry.revenue += sold * (row.selling_price ?? 0)
    byDate.set(row.date, entry)
  }

  return Array.from(byDate.entries())
    .map(([date, totals]) => {
      const wastePercent = totals.prepared > 0 ? (totals.leftover / totals.prepared) * 100 : 0
      const dayOfWeek = new Date(date).getDay()

      return {
        date,
        orders: totals.sold,
        food_prepared: totals.prepared,
        food_sold: totals.sold,
        leftover: totals.leftover,
        waste_percent: Number(wastePercent.toFixed(2)),
        money_saved: Math.round(Math.max(0, totals.sold - totals.leftover) * 12),
        co2_saved: Number((totals.sold * (1 - wastePercent / 100) * 0.1).toFixed(2)),
        revenue: Math.round(totals.revenue),
        weather: 'sunny',
        is_weekend: dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0,
        promotion: 0,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Owner-facing list for the Menu tab — no daily_operations join needed. */
export async function fetchMenuItems(businessId: string): Promise<BusinessMenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(MENU_ITEM_COLUMNS)
    .eq('business_id', businessId)
    .order('name')

  if (error) throw new Error(`Unable to load menu items: ${error.message}`)
  return (data ?? []).map(toMenuItem)
}

export type MenuItemEditableFields = {
  name: string
  category: string | null
  unit: string | null
  unitCost: number | null
  sellingPrice: number | null
  imageUrl: string | null
  ingredients: MenuItemIngredient[]
}

export async function updateMenuItem(id: string, fields: MenuItemEditableFields): Promise<BusinessMenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      name: fields.name,
      category: fields.category,
      unit: fields.unit,
      unit_cost: fields.unitCost,
      selling_price: fields.sellingPrice,
      image_url: fields.imageUrl,
      ingredients: fields.ingredients,
    })
    .eq('id', id)
    .select(MENU_ITEM_COLUMNS)
    .single()

  if (error) throw new Error(`Unable to save dish: ${error.message}`)
  return toMenuItem(data)
}

export async function createMenuItem(
  businessId: string,
  fields: Pick<MenuItemEditableFields, 'name' | 'category' | 'unit'>,
): Promise<BusinessMenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      business_id: businessId,
      name: fields.name,
      category: fields.category,
      unit: fields.unit,
    })
    .select(MENU_ITEM_COLUMNS)
    .single()

  if (error) throw new Error(`Unable to add dish: ${error.message}`)
  return toMenuItem(data)
}

/** Uploads a dish photo to the public menu-photos bucket and returns its public URL. */
export async function uploadMenuItemPhoto(businessId: string, menuItemId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/${menuItemId}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from('menu-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(`Unable to upload photo: ${error.message}`)

  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path)
  return data.publicUrl
}

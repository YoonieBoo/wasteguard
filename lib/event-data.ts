import { supabase } from '@/lib/supabase'
import type { BusinessMenuItem } from '@/lib/menu-data'

export type EventStatus = 'planned' | 'closed'

export type EventMenuItemRecord = {
  id: string
  eventId: string
  menuItemId: string | null
  name: string
  unit: string | null
  unitCost: number | null
  plannedQuantity: number
  actualPrepared: number | null
  leftover: number | null
  photoUrl: string | null
  aiPredictedQuantity: number | null
}

export type EventRecord = {
  id: string
  businessId: string
  name: string
  eventDate: string
  expectedGuests: number | null
  status: EventStatus
  totalPrepared: number | null
  totalLeftover: number | null
  wastePercent: number | null
  moneyValueWasted: number | null
  createdAt: string
  closedAt: string | null
  items: EventMenuItemRecord[]
}

function toEventMenuItem(row: Record<string, unknown>): EventMenuItemRecord {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    menuItemId: (row.menu_item_id as string | null) ?? null,
    name: row.name as string,
    unit: (row.unit as string | null) ?? null,
    unitCost: (row.unit_cost as number | null) ?? null,
    plannedQuantity: Number(row.planned_quantity ?? 0),
    actualPrepared: row.actual_prepared != null ? Number(row.actual_prepared) : null,
    leftover: row.leftover != null ? Number(row.leftover) : null,
    photoUrl: (row.photo_url as string | null) ?? null,
    aiPredictedQuantity: row.ai_predicted_quantity != null ? Number(row.ai_predicted_quantity) : null,
  }
}

function toEvent(row: Record<string, unknown>): EventRecord {
  const rawItems = Array.isArray(row.event_menu_items) ? row.event_menu_items : []

  return {
    id: row.id as string,
    businessId: row.business_id as string,
    name: row.name as string,
    eventDate: row.event_date as string,
    expectedGuests: (row.expected_guests as number | null) ?? null,
    status: row.status as EventStatus,
    totalPrepared: row.total_prepared != null ? Number(row.total_prepared) : null,
    totalLeftover: row.total_leftover != null ? Number(row.total_leftover) : null,
    wastePercent: row.waste_percent != null ? Number(row.waste_percent) : null,
    moneyValueWasted: row.money_value_wasted != null ? Number(row.money_value_wasted) : null,
    createdAt: row.created_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
    items: (rawItems as Record<string, unknown>[]).map(toEventMenuItem),
  }
}

const EVENT_COLUMNS = '*, event_menu_items(*)'

export async function fetchEvents(businessId: string): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('business_id', businessId)
    .order('event_date', { ascending: false })
    .order('name', { foreignTable: 'event_menu_items' })

  if (error) throw new Error(`Unable to load events: ${error.message}`)
  return (data ?? []).map(toEvent)
}

export type NewEventItem = {
  menuItemId: string
  plannedQuantity: number
}

export type NewEventFields = {
  name: string
  eventDate: string
  expectedGuests: number | null
  items: NewEventItem[]
}

export async function createEvent(
  businessId: string,
  fields: NewEventFields,
  menuItems: BusinessMenuItem[],
): Promise<EventRecord> {
  const { data: eventRow, error: eventError } = await supabase
    .from('events')
    .insert({
      business_id: businessId,
      name: fields.name,
      event_date: fields.eventDate,
      expected_guests: fields.expectedGuests,
    })
    .select('*')
    .single()

  if (eventError) throw new Error(`Unable to create event: ${eventError.message}`)

  const menuItemById = new Map(menuItems.map((item) => [item.id, item]))
  const itemRows = fields.items.map((item) => {
    const menuItem = menuItemById.get(item.menuItemId)
    return {
      event_id: eventRow.id as string,
      business_id: businessId,
      menu_item_id: item.menuItemId,
      name: menuItem?.name ?? 'Dish',
      unit: menuItem?.unit ?? null,
      unit_cost: menuItem?.unitCost ?? null,
      planned_quantity: item.plannedQuantity,
    }
  })

  const { error: itemsError } = await supabase.from('event_menu_items').insert(itemRows)
  if (itemsError) {
    // No cross-table transaction via supabase-js — roll back the event row
    // by hand rather than leave an empty, unusable event behind.
    await supabase.from('events').delete().eq('id', eventRow.id as string)
    throw new Error(`Unable to add dishes to event: ${itemsError.message}`)
  }

  return fetchEventById(eventRow.id as string)
}

async function fetchEventById(eventId: string): Promise<EventRecord> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', eventId)
    .order('name', { foreignTable: 'event_menu_items' })
    .single()

  if (error) throw new Error(`Unable to load event: ${error.message}`)
  return toEvent(data)
}

export type CloseEventItem = {
  id: string
  actualPrepared: number
  leftover: number
  photoUrl?: string | null
  aiPredictedQuantity?: number | null
}

export async function closeEvent(eventId: string, items: CloseEventItem[]): Promise<EventRecord> {
  const totalPrepared = items.reduce((sum, item) => sum + item.actualPrepared, 0)
  const totalLeftover = items.reduce((sum, item) => sum + item.leftover, 0)
  const wastePercent =
    totalPrepared > 0 ? Math.max(0, Math.min(100, (totalLeftover / totalPrepared) * 100)) : 0

  const itemById = new Map(items.map((item) => [item.id, item]))
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', eventId)
    .single()
  if (fetchError) throw new Error(`Unable to load event: ${fetchError.message}`)
  const eventRecord = toEvent(currentEvent)
  const moneyValueWasted = eventRecord.items.reduce((sum, row) => {
    const closing = itemById.get(row.id)
    if (!closing) return sum
    return sum + closing.leftover * (row.unitCost ?? 0)
  }, 0)

  // Concurrent-close guard: only the first submit for this event succeeds —
  // a second staff member closing the same event gets a clear error instead
  // of silently overwriting the first submission's numbers.
  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      total_prepared: totalPrepared,
      total_leftover: totalLeftover,
      waste_percent: Number(wastePercent.toFixed(2)),
      money_value_wasted: Number(moneyValueWasted.toFixed(2)),
    })
    .eq('id', eventId)
    .eq('status', 'planned')
    .select('id')
    .single()

  if (updateError || !updatedEvent) {
    throw new Error('This event was already closed')
  }

  await Promise.all(
    items.map((item) =>
      supabase
        .from('event_menu_items')
        .update({
          actual_prepared: item.actualPrepared,
          leftover: item.leftover,
          photo_url: item.photoUrl ?? null,
          ai_predicted_quantity: item.aiPredictedQuantity ?? null,
        })
        .eq('id', item.id),
    ),
  )

  return fetchEventById(eventId)
}

/** Uploads a per-dish event closing photo and returns its public URL. */
export async function uploadEventPhoto(
  businessId: string,
  eventId: string,
  menuItemId: string,
  file: File,
): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/events/${eventId}/${menuItemId}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from('leftover-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(`Unable to upload photo: ${error.message}`)

  const { data } = supabase.storage.from('leftover-photos').getPublicUrl(path)
  return data.publicUrl
}

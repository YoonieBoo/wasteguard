'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, Plus, UtensilsCrossed, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, type Language } from '@/lib/i18n'
import { createEvent, fetchEvents, type EventRecord, type NewEventItem } from '@/lib/event-data'
import type { BusinessMenuItem } from '@/lib/menu-data'

interface EventManagementProps {
  businessId: string
  language: Language
  menuItems: BusinessMenuItem[]
}

export function EventManagement({ businessId, language, menuItems }: EventManagementProps) {
  const t = getText(language)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [viewingEvent, setViewingEvent] = useState<EventRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchEvents(businessId)
      .then((data) => {
        if (!cancelled) setEvents(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load events')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId])

  function handleCreated(event: EventRecord) {
    setEvents((current) => [event, ...current])
    setIsCreating(false)
  }

  const plannedEvents = events.filter((event) => event.status === 'planned')
  const closedEvents = events.filter((event) => event.status === 'closed')

  return (
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">{t.today}</p>
        <h1 className="wg-page-title">{t.eventsTabTitle}</h1>
        <p className="wg-page-subtitle">{t.eventsTabNote}</p>
      </div>

      {isLoading ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <p className="wg-meta">…</p>
        </div>
      ) : loadError ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <p className="text-sm font-bold text-destructive">{loadError}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-foreground">{t.noEventsYet}</p>
          <p className="wg-meta mt-1 mb-5">{t.noEventsYetNote}</p>
          <Button
            onClick={() => setIsCreating(true)}
            className="h-11 rounded-[0.5rem] bg-primary px-6 text-sm font-black text-primary-foreground hover:bg-primary/90"
          >
            {t.addEvent}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => setIsCreating(true)}
              className="h-11 rounded-[0.5rem] bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t.addEvent}
            </Button>
          </div>

          {plannedEvents.length > 0 && (
            <div className="mb-6">
              <p className="wg-label mb-3">{t.eventStatusPlanned}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plannedEvents.map((event) => (
                  <EventCard key={event.id} event={event} language={language} onClick={() => setViewingEvent(event)} />
                ))}
              </div>
            </div>
          )}

          {closedEvents.length > 0 && (
            <div>
              <p className="wg-label mb-3">{t.eventStatusClosed}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closedEvents.map((event) => (
                  <EventCard key={event.id} event={event} language={language} onClick={() => setViewingEvent(event)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {isCreating && (
        <NewEventPanel
          businessId={businessId}
          language={language}
          menuItems={menuItems}
          onClose={() => setIsCreating(false)}
          onCreated={handleCreated}
        />
      )}

      {viewingEvent && (
        <EventDetailPanel event={viewingEvent} language={language} onClose={() => setViewingEvent(null)} />
      )}
    </main>
  )
}

function EventCard({
  event,
  language,
  onClick,
}: {
  event: EventRecord
  language: Language
  onClick: () => void
}) {
  const t = getText(language)
  const dateLabel = new Date(event.eventDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-[0.75rem] bg-white p-4 text-left shadow-[0_14px_35px_rgba(41,91,67,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(41,91,67,0.12)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-black text-foreground">{event.name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
            event.status === 'closed' ? 'bg-primary/12 text-primary' : 'bg-secondary text-muted-foreground'
          }`}
        >
          {event.status === 'closed' ? t.eventStatusClosed : t.eventStatusPlanned}
        </span>
      </div>
      <p className="wg-meta">{dateLabel}</p>
      <p className="wg-meta">
        {event.items.length} {event.items.length === 1 ? 'dish' : 'dishes'}
        {event.expectedGuests != null ? ` · ${event.expectedGuests} guests` : ''}
      </p>
      {event.status === 'closed' && (
        <p className="mt-1 text-xs font-black text-primary">
          {(event.wastePercent ?? 0).toFixed(1)}% waste
        </p>
      )}
    </button>
  )
}

function NewEventPanel({
  businessId,
  language,
  menuItems,
  onClose,
  onCreated,
}: {
  businessId: string
  language: Language
  menuItems: BusinessMenuItem[]
  onClose: () => void
  onCreated: (event: EventRecord) => void
}) {
  const t = getText(language)
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [expectedGuests, setExpectedGuests] = useState('')
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function toggleItem(menuItemId: string) {
    setSelectedItems((current) => {
      const next = { ...current }
      if (menuItemId in next) {
        delete next[menuItemId]
      } else {
        next[menuItemId] = '1'
      }
      return next
    })
  }

  const canSave = name.trim().length > 0 && Object.keys(selectedItems).length > 0 && !isSaving

  async function handleSave() {
    if (!canSave) return
    setError('')
    setIsSaving(true)

    try {
      const items: NewEventItem[] = Object.entries(selectedItems).map(([menuItemId, quantity]) => ({
        menuItemId,
        plannedQuantity: Number(quantity) || 0,
      }))
      const event = await createEvent(
        businessId,
        {
          name: name.trim(),
          eventDate,
          expectedGuests: expectedGuests ? Number(expectedGuests) : null,
          items,
        },
        menuItems,
      )
      onCreated(event)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to create event.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted) {
    return null
  }

  return createPortal(
    <aside className="fixed inset-0 z-[70] flex flex-col overflow-hidden overscroll-contain bg-white animate-in slide-in-from-right-4 duration-300 xl:inset-x-auto xl:right-0 xl:w-[440px] xl:border-l xl:border-secondary/80 xl:shadow-[-24px_0_70px_rgba(35,88,62,0.14)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-secondary/70 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <p className="wg-eyebrow mb-0">{t.addEvent}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:grid"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        <div className="space-y-4">
          <div>
            <label className="wg-label">{t.eventName}</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="wg-control mt-2 border-secondary bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="wg-label">{t.eventDate}</label>
              <Input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="wg-control mt-2 border-secondary bg-white"
              />
            </div>
            <div>
              <label className="wg-label">{t.expectedGuests}</label>
              <Input
                type="number"
                inputMode="numeric"
                value={expectedGuests}
                onChange={(event) => setExpectedGuests(event.target.value)}
                className="wg-control mt-2 border-secondary bg-white"
              />
            </div>
          </div>

          <div>
            <label className="wg-label">{t.eventMenuItemsLabel}</label>
            <div className="mt-2 space-y-2">
              {menuItems.length === 0 ? (
                <p className="wg-meta">{t.noMenuItemsYet}</p>
              ) : (
                menuItems.map((item) => {
                  const isSelected = item.id in selectedItems
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-[0.5rem] border p-3 transition ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-secondary bg-secondary/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 shrink-0 accent-primary"
                        aria-label={item.name}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{item.name}</span>
                      {isSelected && (
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={selectedItems[item.id]}
                          onChange={(event) =>
                            setSelectedItems((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          placeholder={t.plannedQuantity}
                          className="wg-control h-9 w-24 shrink-0 border-secondary bg-white text-center"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
      </div>

      <div className="shrink-0 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_30px_rgba(41,91,67,0.08)] sm:px-6">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
        >
          {isSaving ? t.creatingEvent : t.addEvent}
        </Button>
      </div>
    </aside>,
    document.body,
  )
}

function EventDetailPanel({
  event,
  language,
  onClose,
}: {
  event: EventRecord
  language: Language
  onClose: () => void
}) {
  const t = getText(language)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!mounted) {
    return null
  }

  const dateLabel = new Date(event.eventDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return createPortal(
    <aside className="fixed inset-0 z-[70] flex flex-col overflow-hidden overscroll-contain bg-white animate-in slide-in-from-right-4 duration-300 xl:inset-x-auto xl:right-0 xl:w-[440px] xl:border-l xl:border-secondary/80 xl:shadow-[-24px_0_70px_rgba(35,88,62,0.14)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-secondary/70 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <p className="wg-eyebrow mb-0 truncate">{event.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:grid"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        <div className="space-y-4">
          <div className="rounded-[0.5rem] bg-secondary/40 p-4">
            <p className="wg-meta">{dateLabel}</p>
            {event.expectedGuests != null && <p className="wg-meta mt-1">{event.expectedGuests} guests</p>}
            {event.status === 'closed' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-black text-primary">{(event.wastePercent ?? 0).toFixed(1)}%</p>
                  <p className="wg-meta">{t.wastePercentLabel}</p>
                </div>
                <div>
                  <p className="text-lg font-black text-primary">
                    THB {(event.moneyValueWasted ?? 0).toLocaleString()}
                  </p>
                  <p className="wg-meta">{t.moneyWastedLabel}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {event.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-[0.5rem] border border-secondary/80 p-3">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-[0.4rem] object-cover" />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[0.4rem] bg-secondary text-muted-foreground">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-foreground">{item.name}</p>
                  <p className="wg-meta mt-0.5">
                    {t.plannedQuantity}: {item.plannedQuantity} {item.unit}
                    {item.actualPrepared != null ? ` · ${item.actualPrepared} ${item.unit}` : ''}
                    {item.leftover != null ? ` · ${item.leftover} ${item.unit} left` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>,
    document.body,
  )
}

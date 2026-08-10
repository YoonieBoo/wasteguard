'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CalendarDays, CheckCircle2, ChevronLeft, LoaderCircle, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, type Language } from '@/lib/i18n'
import { closeEvent, fetchEvents, uploadEventPhoto, type EventRecord } from '@/lib/event-data'
import { normalizeImageFile, requestLeftoverEstimate } from '@/lib/leftover-scan'

interface EventCheckProps {
  businessId: string
  language: Language
}

type ScanStatus = 'idle' | 'estimating' | 'done' | 'error'

export function EventCheck({ businessId, language }: EventCheckProps) {
  const t = getText(language)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

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

  function handleClosed(closedEvent: EventRecord) {
    setEvents((current) => current.map((event) => (event.id === closedEvent.id ? closedEvent : event)))
    setSelectedEventId(null)
  }

  const plannedEvents = events.filter((event) => event.status === 'planned')
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null

  if (selectedEvent) {
    return (
      <EventChecklist
        businessId={businessId}
        language={language}
        event={selectedEvent}
        onBack={() => setSelectedEventId(null)}
        onClosed={handleClosed}
      />
    )
  }

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
      ) : plannedEvents.length === 0 ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-foreground">{t.noPlannedEvents}</p>
          <p className="wg-meta mt-1">{t.noPlannedEventsNote}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[0.75rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          {plannedEvents.map((event) => {
            const dateLabel = new Date(event.eventDate).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className="flex w-full items-center justify-between gap-3 border-b border-secondary/80 p-4 text-left transition last:border-b-0 hover:bg-secondary/40 md:p-5"
              >
                <div className="min-w-0">
                  <p className="wg-card-title truncate">{event.name}</p>
                  <p className="wg-meta mt-1">
                    {dateLabel} · {event.items.length} {event.items.length === 1 ? 'dish' : 'dishes'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[10px] font-black text-muted-foreground">
                  {t.eventStatusPlanned}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}

function EventChecklist({
  businessId,
  language,
  event,
  onBack,
  onClosed,
}: {
  businessId: string
  language: Language
  event: EventRecord
  onBack: () => void
  onClosed: (event: EventRecord) => void
}) {
  const t = getText(language)
  const [actualPrepared, setActualPrepared] = useState<Record<string, string>>(
    Object.fromEntries(event.items.map((item) => [item.id, String(item.plannedQuantity)])),
  )
  const [leftovers, setLeftovers] = useState<Record<string, string>>(
    Object.fromEntries(event.items.map((item) => [item.id, '0'])),
  )
  const [scanStatus, setScanStatus] = useState<Record<string, ScanStatus>>({})
  const [scanPhotoUrls, setScanPhotoUrls] = useState<Record<string, string>>({})
  const [scanPredictions, setScanPredictions] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const scanFileInputRef = useRef<HTMLInputElement>(null)
  const activeScanItemIdRef = useRef<string | null>(null)

  function handleCameraClick(itemId: string) {
    activeScanItemIdRef.current = itemId
    scanFileInputRef.current?.click()
  }

  async function handleScanFileSelected(changeEvent: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = changeEvent.target.files?.[0]
    const itemId = activeScanItemIdRef.current
    changeEvent.target.value = ''
    if (!rawFile || !itemId) return

    const item = event.items.find((row) => row.id === itemId)
    if (!item) return

    setScanStatus((current) => ({ ...current, [itemId]: 'estimating' }))

    try {
      const file = await normalizeImageFile(rawFile)
      const quantity = await requestLeftoverEstimate({
        file,
        itemName: item.name,
        unit: item.unit || 'portion',
        referencePhotoUrl: null,
      })
      setLeftovers((current) => ({ ...current, [itemId]: String(quantity) }))
      setScanPredictions((current) => ({ ...current, [itemId]: quantity }))
      setScanStatus((current) => ({ ...current, [itemId]: 'done' }))

      uploadEventPhoto(businessId, event.id, itemId, file)
        .then((url) => setScanPhotoUrls((current) => ({ ...current, [itemId]: url })))
        .catch((uploadError) => console.error('Unable to upload event photo', uploadError))
    } catch (scanError) {
      console.error('Event leftover photo scan failed', scanError)
      setScanStatus((current) => ({ ...current, [itemId]: 'error' }))
    }
  }

  function adjustBaked(itemId: string, delta: number) {
    setActualPrepared((current) => ({
      ...current,
      [itemId]: String(Math.max(0, Number(current[itemId] || 0) + delta)),
    }))
  }

  async function handleSubmit() {
    if (isSaving) return
    setError('')
    setIsSaving(true)

    try {
      const closed = await closeEvent(
        event.id,
        event.items.map((item) => ({
          id: item.id,
          actualPrepared: Number(actualPrepared[item.id] || 0),
          leftover: Number(leftovers[item.id] || 0),
          photoUrl: scanPhotoUrls[item.id] ?? null,
          aiPredictedQuantity: scanPredictions[item.id] ?? null,
        })),
      )
      onClosed(closed)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.eventAlreadyClosed)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="wg-page">
      <div className="wg-page-header flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="wg-eyebrow">{t.beforeClosing}</p>
          <h1 className="wg-page-title">{event.name}</h1>
        </div>
      </div>

      <section className="mb-5 overflow-hidden rounded-[0.75rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
        {event.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 border-b border-secondary/80 p-4 last:border-b-0 md:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.9fr)_minmax(9rem,0.55fr)] md:items-center md:gap-5 md:p-5"
          >
            <div className="min-w-0">
              <h2 className="wg-card-title truncate">{item.name}</h2>
              <p className="wg-meta mt-1">
                {t.planned}: {item.plannedQuantity.toLocaleString()} {item.unit}
              </p>
            </div>

            <div>
              <p className="wg-label mb-2">{t.actualBaked}</p>
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustBaked(item.id, -1)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  value={actualPrepared[item.id] ?? ''}
                  onChange={(changeEvent) =>
                    setActualPrepared((current) => ({ ...current, [item.id]: changeEvent.target.value }))
                  }
                  inputMode="numeric"
                  aria-label={`${item.name} ${t.actualBaked}`}
                  className="h-11 rounded-[0.5rem] border-secondary bg-secondary/45 text-center text-base font-black"
                />
                <button
                  type="button"
                  onClick={() => adjustBaked(item.id, 1)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className="wg-label mb-2">{t.leftovers}</p>
              <div className="flex items-center gap-2">
                <Input
                  value={leftovers[item.id] ?? ''}
                  onChange={(changeEvent) =>
                    setLeftovers((current) => ({ ...current, [item.id]: changeEvent.target.value }))
                  }
                  inputMode="numeric"
                  aria-label={`${item.name} ${t.leftovers}`}
                  className="h-11 flex-1 rounded-[0.5rem] border-secondary bg-secondary/45 px-4 text-center text-base font-black"
                />
                <button
                  type="button"
                  onClick={() => handleCameraClick(item.id)}
                  disabled={scanStatus[item.id] === 'estimating'}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75 disabled:opacity-50"
                  aria-label={`${t.scanLeftoverPhoto} ${item.name}`}
                >
                  {scanStatus[item.id] === 'estimating' ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              {scanStatus[item.id] === 'estimating' && (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{t.analyzingPhoto}</p>
              )}
              {scanStatus[item.id] === 'done' && (
                <p className="mt-1 text-xs font-semibold text-primary">{t.aiEstimatedTapToAdjust}</p>
              )}
              {scanStatus[item.id] === 'error' && (
                <p className="mt-1 text-xs font-semibold text-destructive">{t.photoScanFailed}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <input
        ref={scanFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleScanFileSelected}
      />

      {error && <p className="mb-3 text-sm font-bold text-destructive">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={isSaving}
        className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
      >
        {isSaving ? (
          t.closingEvent
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" /> {t.closeEvent}
          </>
        )}
      </Button>
    </main>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, LoaderCircle, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import { buildRealBakeryItems, translatePrepUnit } from '@/lib/bakery-catalog'
import type { FoodRow, WasteGuardRole } from '@/lib/mock-data'
import { fetchDailyOperationTotals, saveDailyOperations, type BusinessMenuItem } from '@/lib/menu-data'
import type { FlaskFoodPrepItem } from '@/lib/ai-api'
import { DishMismatchError, normalizeImageFile, requestLeftoverEstimate, saveLeftoverScan, uploadLeftoverPhoto } from '@/lib/leftover-scan'
import { MealPeriodToggle, type CheckMealPeriod } from '@/components/meal-period-toggle'

// A dish tagged "both" has independent Breakfast and Dinner numbers in the
// same browser session, so per-dish UI state is keyed by (dish, period) —
// menu_item_id is always a UUID (never contains ":"), so splitting on the
// last ":" to recover both parts is unambiguous.
function stateKey(itemKey: string, period: CheckMealPeriod) {
  return `${itemKey}:${period}`
}

interface QuickInputProps {
  language: Language
  role?: WasteGuardRole
  businessId?: string
  dailyInputs?: FoodRow[]
  menuItems?: BusinessMenuItem[]
  foodPrepItems?: FlaskFoodPrepItem[]
  onSave?: (input: FoodRow) => void
  onViewResults?: () => void
}

type ScanStatus = 'idle' | 'estimating' | 'done' | 'error' | 'mismatch'

type CheckResult = {
  date: string
  customers: string
  leftover: string
  wasteLevel: string
  moneySaved: string
}

type SubmissionState = 'entry' | 'saving' | 'success'

const orderMap: Record<string, number> = {
  '0-50': 25,
  '50-100': 75,
  '100-150': 125,
  '150+': 175,
}

const leftoverMap: Record<string, number> = {
  '0-5': 3,
  '5-15': 10,
  '15-30': 22,
  '30+': 35,
}

const wasteLevelMap: Record<string, string> = {
  '0-5': 'Low',
  '5-15': 'Medium',
  '15-30': 'High',
  '30+': 'High',
}

export function QuickInput({
  language,
  role = 'staff',
  businessId,
  dailyInputs = [],
  menuItems = [],
  foodPrepItems = [],
  onSave,
  onViewResults,
}: QuickInputProps) {
  const t = getText(language)
  const [demand, setDemand] = useState<string | null>(null)
  const [waste, setWaste] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('entry')
  const [mealPeriod, setMealPeriod] = useState<CheckMealPeriod>('breakfast')
  // Real per-business dishes once the owner has added any — a business with
  // no menu set up yet genuinely has nothing to check off, so this must not
  // fall back to the 4 demo dishes (staff would be logging production
  // numbers against dishes the business doesn't actually serve). Also
  // filtered to the currently-selected meal period — a dish tagged
  // Breakfast-only has nothing to do with the Dinner buffet's checklist.
  const productionItems = useMemo(
    () =>
      (menuItems.length > 0
        ? buildRealBakeryItems(
            menuItems
              .filter((item) => item.mealPeriod === 'both' || item.mealPeriod === mealPeriod)
              .map((item) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                unit: item.unit,
                imageUrl: item.imageUrl,
                ingredients: item.ingredients,
              })),
            foodPrepItems,
          )
        : []
      ).map((item) => ({
        key: item.fileName,
        name: item.title,
        planned: item.prepQuantity,
        unit: item.prepUnit,
      })),
    [menuItems, foodPrepItems, mealPeriod],
  )
  const referencePhotoByKey = useMemo(
    () => new Map(menuItems.map((item) => [item.id, item.referencePhotoUrl])),
    [menuItems],
  )
  const [scanStatus, setScanStatus] = useState<Record<string, ScanStatus>>({})
  const [scanPhotoUrls, setScanPhotoUrls] = useState<Record<string, string>>({})
  const [scanPredictions, setScanPredictions] = useState<Record<string, number>>({})
  const [scanMismatchDish, setScanMismatchDish] = useState<Record<string, string | null>>({})
  const scanFileInputRef = useRef<HTMLInputElement>(null)
  const activeScanKeyRef = useRef<string | null>(null)
  const [actualBaked, setActualBaked] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [stateKey(item.key, mealPeriod), String(item.planned)])),
  )
  const [leftovers, setLeftovers] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [stateKey(item.key, mealPeriod), '0'])),
  )
  const demandOptions = [
    { label: '0-50', helper: t.quiet, value: '0-50' },
    { label: '50-100', helper: t.normal, value: '50-100' },
    { label: '100-150', helper: t.busy, value: '100-150' },
    { label: '150+', helper: t.busy, value: '150+' },
  ]
  const wasteOptions = [
    { label: '0-5', helper: t.almostNone, value: '0-5' },
    { label: '5-15', helper: t.someLeft, value: '5-15' },
    { label: '15-30', helper: t.manyLeft, value: '15-30' },
    { label: '30+', helper: t.manyLeft, value: '30+' },
  ]

  useEffect(() => {
    setActualBaked((current) => ({
      ...Object.fromEntries(productionItems.map((item) => [stateKey(item.key, mealPeriod), String(item.planned)])),
      ...current,
    }))
    setLeftovers((current) => ({
      ...Object.fromEntries(productionItems.map((item) => [stateKey(item.key, mealPeriod), '0'])),
      ...current,
    }))
  }, [productionItems, mealPeriod])

  function handleCameraClick(compositeKey: string) {
    activeScanKeyRef.current = compositeKey
    scanFileInputRef.current?.click()
  }

  async function handleScanFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = event.target.files?.[0]
    const compositeKey = activeScanKeyRef.current
    // Reset so selecting the same file again still fires onChange next time.
    event.target.value = ''
    if (!rawFile || !compositeKey) return

    // menu_item_id is always a UUID (never contains ":"), so the part before
    // the last ":" is unambiguously the raw dish id, and the part after is
    // the meal period that was active when the camera button was tapped.
    const itemKey = compositeKey.slice(0, compositeKey.lastIndexOf(':'))
    const item = productionItems.find((production) => production.key === itemKey)
    if (!item) return

    setScanStatus((current) => ({ ...current, [compositeKey]: 'estimating' }))

    try {
      // iOS cameras often capture HEIC, which the vision API can't read —
      // normalize once and reuse for both the AI call and the audit upload.
      const file = await normalizeImageFile(rawFile)
      // Staff has usually already logged Actual Prepared before scanning —
      // passing the real batch size lets the AI estimate a % remaining and
      // apply it to a known number, instead of also having to guess the
      // batch size itself from the reference photo alone.
      const preparedQuantity = Number(actualBaked[compositeKey])
      const quantity = await requestLeftoverEstimate({
        file,
        itemName: item.name,
        unit: item.unit,
        referencePhotoUrl: referencePhotoByKey.get(itemKey),
        preparedQuantity: preparedQuantity > 0 ? preparedQuantity : null,
      })
      setLeftovers((current) => ({ ...current, [compositeKey]: String(quantity) }))
      setScanPredictions((current) => ({ ...current, [compositeKey]: quantity }))
      setScanStatus((current) => ({ ...current, [compositeKey]: 'done' }))

      // Fire-and-forget: keep a copy for the audit trail without blocking the UI.
      if (businessId) {
        const date = new Date().toISOString().slice(0, 10)
        uploadLeftoverPhoto(businessId, itemKey, date, file)
          .then((url) => setScanPhotoUrls((current) => ({ ...current, [compositeKey]: url })))
          .catch((error) => console.error('Unable to upload leftover photo', error))
      }
    } catch (error) {
      console.error('Leftover photo scan failed', error)
      if (error instanceof DishMismatchError) {
        setScanMismatchDish((current) => ({ ...current, [compositeKey]: error.detectedDish }))
        setScanStatus((current) => ({ ...current, [compositeKey]: 'mismatch' }))
        return
      }
      setScanStatus((current) => ({ ...current, [compositeKey]: 'error' }))
    }
  }

  function handleDone() {
    if (!demand || !waste) {
      return
    }

    const orders = orderMap[demand] ?? 75
    const leftover = leftoverMap[waste] ?? 10
    const foodPrepared = orders + leftover
    const today = new Date()
    const date = today.toISOString().slice(0, 10)
    const selectedDemand = demandOptions.find((option) => option.value === demand)?.label ?? '50-100'
    const selectedWaste = wasteOptions.find((option) => option.value === waste)?.label ?? '5-15'
    const nextResult = {
      date,
      customers: selectedDemand,
      leftover: selectedWaste,
      wasteLevel: wasteLevelMap[waste] ?? 'Medium',
      moneySaved: '+120 THB',
    }
    const newInput: FoodRow = {
      date,
      orders,
      food_prepared: foodPrepared,
      food_sold: orders,
      leftover,
      waste_percent: Number(Math.min(100, (leftover / foodPrepared) * 100).toFixed(2)),
      weather: 'sunny',
      is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
      promotion: 0,
    }

    onSave?.(newInput)
    setResult(nextResult)
    setSubmissionState('success')
  }

  async function handleProductionDone() {
    const today = new Date()
    const date = today.toISOString().slice(0, 10)
    setSubmissionState('saving')

    const thisPeriodBaked = productionItems.reduce(
      (sum, item) => sum + Number(actualBaked[stateKey(item.key, mealPeriod)] || 0),
      0,
    )
    const thisPeriodLeftover = productionItems.reduce(
      (sum, item) => sum + Number(leftovers[stateKey(item.key, mealPeriod)] || 0),
      0,
    )

    // Audit trail for any dish that got a photo scan — doesn't affect the
    // aggregate save below, purely additive so AI accuracy can be reviewed later.
    if (businessId) {
      for (const item of productionItems) {
        const key = stateKey(item.key, mealPeriod)
        if (scanStatus[key] !== 'done') continue
        saveLeftoverScan({
          businessId,
          itemKey: item.key,
          date,
          mealPeriod,
          photoUrl: scanPhotoUrls[key] ?? null,
          predictedQuantity: scanPredictions[key] ?? null,
          unit: item.unit,
          confirmedQuantity: Number(leftovers[key] || 0),
        }).catch((error) => console.error('Unable to save leftover scan', error))
      }
    }

    // Real per-dish numbers, written to the same table CSV import uses, so
    // the AI recommendation engine has genuine per-dish sales history even
    // for a business that never imports a CSV. item.key is only a real
    // menu_items.id when productionItems was built from real menuItems (see
    // buildRealBakeryItems) — the mock-fallback keys aren't valid dish ids,
    // so skip entirely when there's no real menu to attach numbers to.
    // Awaited (not fire-and-forget) so the read-back below sees this
    // period's own just-written rows rather than racing them.
    if (businessId && menuItems.length > 0) {
      const operationRows = productionItems.map((item) => {
        const key = stateKey(item.key, mealPeriod)
        const prepared = Number(actualBaked[key] || 0)
        const leftover = Number(leftovers[key] || 0)
        return {
          business_id: businessId,
          menu_item_id: item.key,
          date,
          meal_period: mealPeriod,
          prepared_quantity: prepared,
          sold_quantity: Math.max(0, prepared - leftover),
          leftover_quantity: leftover,
        }
      })
      try {
        await saveDailyOperations(operationRows)
      } catch (error) {
        console.error('Unable to save daily operations', error)
      }
    }

    // The single whole-day daily_reports aggregate must reflect BOTH meal
    // periods, not just the one just submitted — otherwise logging Dinner
    // after Breakfast would silently erase Breakfast's contribution. Read
    // the other period's already-saved totals fresh from the DB (it may
    // have been submitted by a different staff member in a different
    // session entirely, not just earlier in this one).
    let otherPeriodTotals = { prepared: 0, sold: 0, leftover: 0 }
    if (businessId) {
      try {
        otherPeriodTotals = await fetchDailyOperationTotals(businessId, date, mealPeriod)
      } catch (error) {
        console.error('Unable to load other meal period totals', error)
      }
    }

    const totalBaked = thisPeriodBaked + otherPeriodTotals.prepared
    const totalLeftover = thisPeriodLeftover + otherPeriodTotals.leftover
    const sold = Math.max(0, thisPeriodBaked - thisPeriodLeftover) + otherPeriodTotals.sold
    const foodPrepared = Math.max(1, totalBaked)
    const nextResult = {
      date,
      customers: String(sold),
      leftover: String(totalLeftover),
      wasteLevel: totalLeftover <= 5 ? 'Low' : totalLeftover <= 15 ? 'Medium' : 'High',
      moneySaved: '',
    }

    onSave?.({
      date,
      orders: sold,
      food_prepared: foodPrepared,
      food_sold: sold,
      leftover: totalLeftover,
      waste_percent: Number(Math.min(100, (totalLeftover / foodPrepared) * 100).toFixed(2)),
      weather: 'sunny',
      is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
      promotion: 0,
    })

    setResult(nextResult)
    setSubmissionState('success')
  }

  if (role === 'staff' && submissionState === 'entry') {
    if (productionItems.length === 0) {
      // A business with no menu at all needs a different message than one
      // that has dishes but none tagged for the period currently selected —
      // the latter isn't "you haven't set up your menu," so reusing that
      // copy would be misleading.
      const hasAnyMenu = menuItems.length > 0
      return (
        <main className="wg-page">
          <div className="wg-page-header">
            <p className="wg-eyebrow">{t.beforeClosing}</p>
            <h1 className="wg-page-title">{t.todaysProductionEntry}</h1>
          </div>
          {hasAnyMenu && <MealPeriodToggle value={mealPeriod} onChange={setMealPeriod} language={language} />}
          <div className="mt-5 rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            <p className="text-sm font-black text-foreground">{hasAnyMenu ? t.noMenuItemsForPeriod : t.noMenuItemsYet}</p>
            <p className="wg-meta mt-1">{hasAnyMenu ? t.noMenuItemsForPeriodNote : t.noMenuItemsYetStaffNote}</p>
          </div>
        </main>
      )
    }

    return (
      <main className="wg-page">
        <div className="wg-page-header">
          <p className="wg-eyebrow">{t.beforeClosing}</p>
          <h1 className="wg-page-title">{t.todaysProductionEntry}</h1>
        </div>

        <MealPeriodToggle value={mealPeriod} onChange={setMealPeriod} language={language} />

        <section className="mb-5 mt-5 overflow-hidden rounded-[0.75rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          {productionItems.map((item) => {
            const key = stateKey(item.key, mealPeriod)

            function adjustBaked(delta: number) {
              setActualBaked((current) => ({
                ...current,
                [key]: String(Math.max(0, Number(current[key] || 0) + delta)),
              }))
            }

            return (
              <div
                key={key}
                className="grid gap-3 border-b border-secondary/80 p-4 last:border-b-0 md:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.9fr)_minmax(9rem,0.55fr)] md:items-center md:gap-5 md:p-5"
              >
                <div className="min-w-0">
                  <h2 className="wg-card-title truncate">{translateItemName(item.name, language)}</h2>
                  <p className="wg-meta mt-1">
                    {t.planned}: {item.planned.toLocaleString()} {translatePrepUnit(item.unit, language)}
                  </p>
                </div>

                <div>
                  <p className="wg-label mb-2">{t.actualBaked}</p>
                  <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustBaked(-1)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75"
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      value={actualBaked[key] ?? ''}
                      onChange={(event) => setActualBaked((current) => ({ ...current, [key]: event.target.value }))}
                      inputMode="numeric"
                      aria-label={`${item.name} ${t.actualBaked}`}
                      className="h-11 rounded-[0.5rem] border-secondary bg-secondary/45 text-center text-base font-black"
                    />
                    <button
                      type="button"
                      onClick={() => adjustBaked(1)}
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
                      value={leftovers[key] ?? ''}
                      onChange={(event) => setLeftovers((current) => ({ ...current, [key]: event.target.value }))}
                      inputMode="numeric"
                      aria-label={`${item.name} ${t.leftovers}`}
                      className="h-11 flex-1 rounded-[0.5rem] border-secondary bg-secondary/45 px-4 text-center text-base font-black"
                    />
                    <button
                      type="button"
                      onClick={() => handleCameraClick(key)}
                      disabled={scanStatus[key] === 'estimating'}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75 disabled:opacity-50"
                      aria-label={`${t.scanLeftoverPhoto} ${item.name}`}
                    >
                      {scanStatus[key] === 'estimating' ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {scanStatus[key] === 'estimating' && (
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{t.analyzingPhoto}</p>
                  )}
                  {scanStatus[key] === 'done' && (
                    <p className="mt-1 text-xs font-semibold text-primary">{t.aiEstimatedTapToAdjust}</p>
                  )}
                  {scanStatus[key] === 'error' && (
                    <p className="mt-1 text-xs font-semibold text-destructive">{t.photoScanFailed}</p>
                  )}
                  {scanStatus[key] === 'mismatch' && (
                    <p className="mt-1 text-xs font-semibold text-destructive">
                      {scanMismatchDish[key]
                        ? t.photoScanMismatchWithDish
                            .replace('{expected}', item.name)
                            .replace('{detected}', scanMismatchDish[key] as string)
                        : t.photoScanMismatch.replace('{expected}', item.name)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </section>

        <input
          ref={scanFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleScanFileSelected}
        />

        <Button
          onClick={handleProductionDone}
          className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {t.submitProductionResults}
        </Button>
      </main>
    )
  }

  if (submissionState === 'saving') {
    return (
      <main className="flex min-h-[calc(100dvh-9rem)] items-center py-6 animate-in fade-in-0 duration-300 md:py-8">
        <section className="mx-auto w-full max-w-[32rem] text-center">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[1rem] bg-primary/12 text-primary shadow-[0_18px_40px_rgba(68,179,126,0.14)]">
            <LoaderCircle className="h-12 w-12 animate-spin" />
          </div>
          <h1 className="text-2xl font-black leading-tight text-foreground sm:text-3xl">
            {t.savingProductionData}
          </h1>
          <p className="mx-auto mt-3 max-w-[26rem] text-base font-semibold leading-7 text-muted-foreground">
            {t.analyzingProductionData}
          </p>
        </section>
      </main>
    )
  }

  if (result && submissionState === 'success') {
    return (
      <main className="flex min-h-[calc(100dvh-9rem)] items-center py-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 md:py-8">
        <section className="mx-auto w-full max-w-[32rem] text-center">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[1rem] bg-primary/12 text-primary shadow-[0_18px_40px_rgba(68,179,126,0.14)]">
            <CheckCircle2 className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-black leading-tight text-foreground sm:text-3xl">
            {t.todaysProductionSaved}
          </h1>
          <p className="mx-auto mt-3 max-w-[26rem] text-base font-semibold leading-7 text-muted-foreground">
            {t.productionDataSavedSimpleSubtitle}
          </p>
          <Button
            onClick={onViewResults}
            className="wg-action mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t.backHome}
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">{t.beforeClosing}</p>
        <h1 className="wg-page-title">
          {role === 'owner' ? t.dailyBusinessResult : t.howWasToday}
        </h1>
        <p className="wg-page-subtitle">
          {t.estimateHelper}
        </p>
      </div>

      <div className="mb-6 space-y-6">
        <section>
          <h2 className="wg-section-title mb-3">{t.customersToday}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {demandOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setDemand(option.value)
                }}
                className={`h-auto min-h-[3.75rem] whitespace-normal rounded-[0.5rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all ${
                  demand === option.value
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(68,179,126,0.2)]'
                    : 'bg-white text-foreground shadow-sm hover:bg-secondary'
                }`}
              >
                <span className="flex flex-col items-center gap-1">
                  <span>{option.label}</span>
                  <span className={`text-xs ${demand === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {option.helper}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="wg-section-title mb-3">{t.unsoldItems}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {wasteOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setWaste(option.value)
                }}
                className={`h-auto min-h-[3.75rem] whitespace-normal rounded-[0.5rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all ${
                  waste === option.value
                    ? 'bg-accent text-accent-foreground shadow-[0_10px_20px_rgba(199,168,76,0.18)]'
                    : 'bg-white text-foreground shadow-sm hover:bg-secondary'
                }`}
              >
                <span className="flex flex-col items-center gap-1">
                  <span>{option.label}</span>
                  <span className={`text-xs ${waste === option.value ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
                    {option.helper}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </section>
      </div>

      <Button
        onClick={handleDone}
        disabled={!demand || !waste}
        className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
      >
        {t.saveToday}
      </Button>
    </main>
  )
}

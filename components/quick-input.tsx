'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, LoaderCircle, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import { getBakeryItems, translatePrepUnit } from '@/lib/bakery-catalog'
import { getPrepList, type FoodRow, type WasteGuardRole } from '@/lib/mock-data'

interface QuickInputProps {
  language: Language
  role?: WasteGuardRole
  dailyInputs?: FoodRow[]
  onSave?: (input: FoodRow) => void
  onViewResults?: () => void
}

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

const checkResultKey = 'wasteGuardCheckResult'

export function QuickInput({ language, role = 'staff', dailyInputs = [], onSave, onViewResults }: QuickInputProps) {
  const t = getText(language)
  const [demand, setDemand] = useState<string | null>(null)
  const [waste, setWaste] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [submissionState, setSubmissionState] = useState<SubmissionState>('entry')
  const prepItems = getPrepList(dailyInputs).slice(0, 4)
  const prepDemand = prepItems.reduce((total, item) => total + item.quantity, 0)
  const productionItems = useMemo(
    () =>
      getBakeryItems(dailyInputs, prepDemand).map((item) => ({
        key: item.fileName,
        name: item.title,
        planned: item.prepQuantity,
        unit: item.prepUnit,
      })),
    [dailyInputs, prepDemand],
  )
  const [actualBaked, setActualBaked] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [item.key, String(item.planned)])),
  )
  const [leftovers, setLeftovers] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [item.key, '0'])),
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
      ...Object.fromEntries(productionItems.map((item) => [item.key, String(item.planned)])),
      ...current,
    }))
    setLeftovers((current) => ({
      ...Object.fromEntries(productionItems.map((item) => [item.key, '0'])),
      ...current,
    }))
  }, [productionItems])

  useEffect(() => {
    if (submissionState !== 'saving') {
      return
    }

    const timer = window.setTimeout(() => {
      setSubmissionState('success')
    }, 1400)

    return () => window.clearTimeout(timer)
  }, [submissionState])

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
      waste_percent: Number(((leftover / foodPrepared) * 100).toFixed(2)),
      weather: 'sunny',
      is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
      promotion: 0,
    }

    onSave?.(newInput)
    window.localStorage.setItem(checkResultKey, JSON.stringify(nextResult))
    setResult(nextResult)
    setSubmissionState('success')
  }

  function handleProductionDone() {
    const today = new Date()
    const date = today.toISOString().slice(0, 10)
    const totalBaked = productionItems.reduce((sum, item) => sum + Number(actualBaked[item.key] || 0), 0)
    const totalLeftover = productionItems.reduce((sum, item) => sum + Number(leftovers[item.key] || 0), 0)
    const sold = Math.max(0, totalBaked - totalLeftover)
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
      waste_percent: Number(((totalLeftover / foodPrepared) * 100).toFixed(2)),
      weather: 'sunny',
      is_weekend: today.getDay() === 0 || today.getDay() === 6 ? 1 : 0,
      promotion: 0,
    })
    window.localStorage.setItem(checkResultKey, JSON.stringify(nextResult))
    setResult(nextResult)
    setSubmissionState('saving')
  }

  if (role === 'staff' && submissionState === 'entry') {
    return (
      <main className="wg-page">
        <div className="wg-page-header">
          <p className="wg-eyebrow">{t.beforeClosing}</p>
          <h1 className="wg-page-title">{t.todaysProductionEntry}</h1>
          <p className="wg-page-subtitle">
            {t.productionEntrySubtitle}
          </p>
        </div>

        <section className="mb-5 overflow-hidden rounded-[1.35rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          {productionItems.map((item) => {
            function adjustBaked(delta: number) {
              setActualBaked((current) => ({
                ...current,
                [item.key]: String(Math.max(0, Number(current[item.key] || 0) + delta)),
              }))
            }

            return (
              <div
                key={item.key}
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
                      value={actualBaked[item.key] ?? ''}
                      onChange={(event) => setActualBaked((current) => ({ ...current, [item.key]: event.target.value }))}
                      inputMode="numeric"
                      aria-label={`${item.name} ${t.actualBaked}`}
                      className="h-11 rounded-[0.95rem] border-secondary bg-secondary/45 text-center text-base font-black"
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
                  <Input
                    value={leftovers[item.key] ?? ''}
                    onChange={(event) => setLeftovers((current) => ({ ...current, [item.key]: event.target.value }))}
                    inputMode="numeric"
                    aria-label={`${item.name} ${t.leftovers}`}
                    className="h-11 rounded-[0.95rem] border-secondary bg-secondary/45 px-4 text-center text-base font-black"
                  />
                </div>
              </div>
            )
          })}
        </section>

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
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[1.75rem] bg-primary/12 text-primary shadow-[0_18px_40px_rgba(68,179,126,0.14)]">
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
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[1.75rem] bg-primary/12 text-primary shadow-[0_18px_40px_rgba(68,179,126,0.14)]">
            <CheckCircle2 className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-black leading-tight text-foreground sm:text-3xl">
            {t.todaysProductionSaved}
          </h1>
          <p className="mx-auto mt-3 max-w-[26rem] text-base font-semibold leading-7 text-muted-foreground">
            {t.productionDataSavedSimpleSubtitle}
          </p>
          <p className="mx-auto mt-3 max-w-[27rem] text-sm font-medium leading-6 text-muted-foreground">
            {t.productionDataSavedNote}
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
                className={`h-auto min-h-[3.75rem] whitespace-normal rounded-[1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all ${
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
                className={`h-auto min-h-[3.75rem] whitespace-normal rounded-[1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all ${
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

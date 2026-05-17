'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, translateItemName, type Language } from '@/lib/i18n'
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

const bakeryCheckProducts = [
  'Hokkaido_milk',
  'Shio_pan',
  'Cereal_bun',
  'Assorted_8-Flavor_Cake',
  'Pandan_layer_cake',
  'Classic_butter_cake',
] as const

function cleanProductTitle(fileName: string) {
  return fileName
    .replace(/creaam/gi, 'cream')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function QuickInput({ language, role = 'staff', dailyInputs = [], onSave, onViewResults }: QuickInputProps) {
  const t = getText(language)
  const [demand, setDemand] = useState<string | null>(null)
  const [waste, setWaste] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)
  const prepItems = getPrepList(dailyInputs).slice(0, 3)
  const productionItems = useMemo(
    () =>
      bakeryCheckProducts.map((fileName, index) => ({
        key: fileName,
        name: cleanProductTitle(fileName),
        planned: prepItems[index % prepItems.length]?.quantity ?? 24 + index * 6,
      })),
    [prepItems],
  )
  const [actualBaked, setActualBaked] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [item.key, String(item.planned)])),
  )
  const [leftovers, setLeftovers] = useState<Record<string, string>>(
    Object.fromEntries(productionItems.map((item) => [item.key, '0'])),
  )
  const canSeeMoney = role === 'owner'
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
  }

  if (role === 'staff' && !result) {
    return (
      <main className="py-6 md:py-6">
        <div className="mb-5 md:pt-2">
          <p className="mb-2 text-sm font-black text-primary">{t.beforeClosing}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.todaysProductionEntry}</h1>
          <p className="mt-2 text-base font-medium leading-relaxed text-muted-foreground">
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
                className="grid gap-3 border-b border-secondary/80 p-4 last:border-b-0 md:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.9fr)_minmax(9rem,0.55fr)] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-foreground">{translateItemName(item.name, language)}</h2>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">{t.planned}: {item.planned.toLocaleString()}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted-foreground">{t.actualBaked}</p>
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
                      className="h-11 rounded-[0.95rem] border-secondary bg-secondary/45 text-center text-lg font-black"
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
                  <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted-foreground">{t.leftovers}</p>
                  <Input
                    value={leftovers[item.key] ?? ''}
                    onChange={(event) => setLeftovers((current) => ({ ...current, [item.key]: event.target.value }))}
                    inputMode="numeric"
                    aria-label={`${item.name} ${t.leftovers}`}
                    className="h-11 rounded-[0.95rem] border-secondary bg-secondary/45 px-4 text-center text-lg font-black"
                  />
                </div>
              </div>
            )
          })}
        </section>

        <Button
          onClick={handleProductionDone}
          className="h-16 w-full rounded-[1.35rem] bg-primary text-lg font-black text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.22)] hover:bg-primary/90"
        >
          {t.submitProductionResults}
        </Button>
      </main>
    )
  }

  if (result) {
    return (
      <main className="py-7 md:py-6">
        <div className="mb-7 pt-5 md:mb-6 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{t.beforeClosing}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.savedForToday}</h1>
        </div>

        <section className="mb-7 divide-y divide-secondary md:mb-6">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-1">
            <p className="text-base font-bold text-muted-foreground">{role === 'staff' ? t.actualBaked : t.customersResult}</p>
            <p className="text-xl font-black text-foreground">{result.customers}</p>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <p className="text-base font-bold text-muted-foreground">{t.unsoldResult}</p>
            <p className="text-xl font-black text-foreground">{result.leftover}</p>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <p className="text-base font-bold text-muted-foreground">{t.estimatedWaste}</p>
            <p className="text-xl font-black text-primary">{result.wasteLevel === 'Low' ? t.low : result.wasteLevel === 'High' ? t.high : t.medium}</p>
          </div>
          {canSeeMoney && (
            <div className="flex items-center justify-between gap-4 py-4 last:pb-1">
              <p className="text-base font-bold text-muted-foreground">{t.moneySavedToday}</p>
              <p className="text-xl font-black text-primary">{result.moneySaved}</p>
            </div>
          )}
        </section>

        <Button
          onClick={onViewResults}
          className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
        >
          {t.viewResults}
        </Button>
      </main>
    )
  }

  return (
    <main className="py-7 md:py-6">
      <div className="mb-7 md:mb-6 md:pt-2">
        <p className="mb-2 text-sm font-bold text-primary">{t.beforeClosing}</p>
        <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
          {role === 'owner' ? t.dailyBusinessResult : t.howWasToday}
        </h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          {t.estimateHelper}
        </p>
      </div>

      <div className="mb-7 space-y-8 md:mb-6 md:space-y-6">
        <section>
          <h2 className="mb-4 text-xl font-black text-foreground sm:text-2xl">{t.customersToday}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {demandOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setDemand(option.value)
                }}
                className={`h-auto min-h-16 whitespace-normal rounded-[1.1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all sm:text-base ${
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
          <h2 className="mb-4 text-xl font-black text-foreground sm:text-2xl">{t.unsoldItems}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {wasteOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setWaste(option.value)
                }}
                className={`h-auto min-h-16 whitespace-normal rounded-[1.1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all sm:text-base ${
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
        className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90 disabled:opacity-45"
      >
        {t.saveToday}
      </Button>
    </main>
  )
}

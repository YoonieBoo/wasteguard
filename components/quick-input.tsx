'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'
import type { FoodRow } from '@/lib/mock-data'

interface QuickInputProps {
  language: Language
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
  few: 80,
  normal: 150,
  many: 250,
}

const leftoverMap: Record<string, number> = {
  little: 5,
  some: 15,
  'a lot': 35,
}

const wasteLevelMap: Record<string, string> = {
  little: 'Low',
  some: 'Medium',
  'a lot': 'High',
}

const checkResultKey = 'wasteGuardCheckResult'

export function QuickInput({ language, onSave, onViewResults }: QuickInputProps) {
  const t = getText(language)
  const [demand, setDemand] = useState<string | null>(null)
  const [waste, setWaste] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)
  const demandOptions = [
    { label: t.quiet, value: 'few' },
    { label: t.normal, value: 'normal' },
    { label: t.busy, value: 'many' },
  ]
  const wasteOptions = [
    { label: t.almostNone, value: 'little' },
    { label: t.someLeft, value: 'some' },
    { label: t.manyLeft, value: 'a lot' },
  ]

  function handleDone() {
    if (!demand || !waste) {
      return
    }

    const orders = orderMap[demand] ?? 150
    const leftover = leftoverMap[waste] ?? 15
    const foodPrepared = orders + leftover
    const today = new Date()
    const date = today.toISOString().slice(0, 10)
    const selectedDemand = demandOptions.find((option) => option.value === demand)?.label ?? 'Normal'
    const selectedWaste = wasteOptions.find((option) => option.value === waste)?.label ?? 'Some left'
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

  if (result) {
    return (
      <main className="py-7 md:py-6">
        <div className="mb-7 pt-5 md:mb-6 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{t.beforeClosing}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.savedForToday}</h1>
        </div>

        <section className="mb-7 divide-y divide-secondary md:mb-6">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-1">
            <p className="text-base font-bold text-muted-foreground">{t.customersResult}</p>
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
          <div className="flex items-center justify-between gap-4 py-4 last:pb-1">
            <p className="text-base font-bold text-muted-foreground">{t.moneySavedToday}</p>
            <p className="text-xl font-black text-primary">{result.moneySaved}</p>
          </div>
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
        <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.howWasToday}</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          {t.estimateHelper}
        </p>
      </div>

      <div className="mb-7 space-y-8 md:mb-6 md:space-y-6">
        <section>
          <h2 className="mb-4 text-xl font-black text-foreground sm:text-2xl">{t.customersToday}</h2>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {demandOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setDemand(option.value)
                }}
                className={`min-h-14 whitespace-normal rounded-[1.1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all sm:text-base ${
                  demand === option.value
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(68,179,126,0.2)]'
                    : 'bg-white text-foreground shadow-sm hover:bg-secondary'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-black text-foreground sm:text-2xl">{t.unsoldItems}</h2>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {wasteOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  setWaste(option.value)
                }}
                className={`min-h-14 whitespace-normal rounded-[1.1rem] px-2 py-3 text-center text-sm font-bold leading-tight transition-all sm:text-base ${
                  waste === option.value
                    ? 'bg-accent text-accent-foreground shadow-[0_10px_20px_rgba(199,168,76,0.18)]'
                    : 'bg-white text-foreground shadow-sm hover:bg-secondary'
                }`}
              >
                {option.label}
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

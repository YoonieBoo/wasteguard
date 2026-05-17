'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDashboardData, getPrepList, type FoodRow } from '@/lib/mock-data'

interface TodayPlanProps {
  dailyInputs?: FoodRow[]
}

const prepDoneKey = 'prepDone'

export function TodayPlan({ dailyInputs = [] }: TodayPlanProps) {
  const prepItems = useMemo(() => getPrepList(dailyInputs).slice(0, 6), [dailyInputs])
  const dashboard = getDashboardData(dailyInputs)
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({})
  const [isFinished, setIsFinished] = useState(false)
  const doneCount = prepItems.filter((item) => doneTasks[item.name]).length
  const estimatedWaste = dashboard.wasteYesterday <= 12 ? 'Low' : dashboard.wasteYesterday <= 20 ? 'Normal' : 'High'

  useEffect(() => {
    setIsFinished(window.localStorage.getItem(prepDoneKey) === 'true')
  }, [])

  function toggleTask(itemName: string) {
    setDoneTasks((currentTasks) => ({
      ...currentTasks,
      [itemName]: !currentTasks[itemName],
    }))
  }

  function finishPrep() {
    window.localStorage.setItem(prepDoneKey, 'true')
    setIsFinished(true)
  }

  function resetForDemo() {
    window.localStorage.removeItem(prepDoneKey)
    window.localStorage.removeItem('wasteGuardDailyInputs')
    setDoneTasks({})
    setIsFinished(false)
  }

  if (isFinished) {
    return (
      <main className="wg-page">
        <div className="wg-page-header text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/12 text-primary">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="wg-page-title">You&apos;re ready for today</h1>
          <p className="wg-page-subtitle mx-auto">
            All items baked. You&apos;re good to open.
          </p>
        </div>

        <section className="wg-panel mb-6 divide-y divide-secondary">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <p className="wg-body">Orders planned</p>
            <p className="text-lg font-black text-foreground">{dashboard.ordersToday.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="wg-body">Total baked</p>
            <p className="text-lg font-black text-foreground">{dashboard.cookThisMuch.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between py-3 last:pb-0">
            <p className="wg-body">Estimated waste</p>
            <p className="text-lg font-black text-primary">{estimatedWaste}</p>
          </div>
        </section>

        <div className="space-y-3">
          <Button className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Done
          </Button>
          <Button
            onClick={() => setIsFinished(false)}
            variant="secondary"
            className="wg-action w-full bg-secondary text-foreground hover:bg-secondary/80"
          >
            Edit bake prep
          </Button>
          <button
            onClick={resetForDemo}
            className="mx-auto block h-9 px-3 text-xs font-bold text-muted-foreground/35 hover:text-muted-foreground"
          >
            Reset for demo
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">Today</p>
        <h1 className="wg-page-title">Today&apos;s Bake Prep</h1>
        <p className="wg-page-subtitle">
          Finish these before opening
        </p>
        <p className="mt-4 text-base font-black text-primary">
          {doneCount} / {prepItems.length} done
        </p>
      </div>

      <div className="divide-y divide-secondary">
        {prepItems.map((item) => {
          const isDone = doneTasks[item.name]

          return (
            <button
              key={item.name}
              onClick={() => toggleTask(item.name)}
              className={`flex w-full items-center gap-4 py-4 text-left transition md:py-5 ${
                isDone ? 'opacity-50' : 'opacity-100'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/35 bg-white'
                }`}
              >
                {isDone && <Check className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-base font-black text-foreground sm:text-lg">
                {item.name}
              </span>
              <span className="shrink-0 text-right text-sm font-black text-primary sm:text-base">
                {item.quantity.toLocaleString()} {item.unit}
              </span>
            </button>
          )
        })}
      </div>

      <Button
        onClick={finishPrep}
        className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Finish bake prep
      </Button>
    </main>
  )
}

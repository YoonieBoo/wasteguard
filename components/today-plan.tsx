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
      <main className="py-7 md:py-6">
        <div className="mb-8 pt-6 text-center md:pt-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/12 text-primary">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black leading-tight text-foreground">You&apos;re ready for today</h1>
          <p className="mx-auto mt-4 max-w-[22rem] text-lg font-bold leading-snug text-muted-foreground">
            All items baked. You&apos;re good to open.
          </p>
        </div>

        <section className="mb-6 divide-y divide-secondary rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <p className="text-base font-bold text-muted-foreground">Orders planned</p>
            <p className="text-xl font-black text-foreground">{dashboard.ordersToday.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-base font-bold text-muted-foreground">Total baked</p>
            <p className="text-xl font-black text-foreground">{dashboard.cookThisMuch.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between py-3 last:pb-0">
            <p className="text-base font-bold text-muted-foreground">Estimated waste</p>
            <p className="text-xl font-black text-primary">{estimatedWaste}</p>
          </div>
        </section>

        <div className="space-y-3">
          <Button className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90">
            Done
          </Button>
          <Button
            onClick={() => setIsFinished(false)}
            variant="secondary"
            className="h-16 w-full rounded-[1.4rem] bg-secondary text-lg font-bold text-foreground hover:bg-secondary/80"
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
    <main className="py-7 md:py-6">
      <div className="mb-7 md:mb-6 md:pt-2">
        <p className="mb-2 text-sm font-bold text-primary">Today</p>
        <h1 className="text-4xl font-black leading-tight text-foreground">Today&apos;s Bake Prep</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          Finish these before opening
        </p>
        <p className="mt-4 text-lg font-black text-primary">
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
              className={`flex w-full items-center gap-4 py-5 text-left transition md:py-6 ${
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
              <span className="min-w-0 flex-1 truncate text-xl font-black text-foreground">
                {item.name}
              </span>
              <span className="shrink-0 text-right text-lg font-black text-primary">
                {item.quantity.toLocaleString()} {item.unit}
              </span>
            </button>
          )
        })}
      </div>

      <Button
        onClick={finishPrep}
        className="mt-5 h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
      >
        Finish bake prep
      </Button>
    </main>
  )
}

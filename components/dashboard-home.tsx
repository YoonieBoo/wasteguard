'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPrepList, type FoodRow } from '@/lib/mock-data'

interface DashboardHomeProps {
  dailyInputs?: FoodRow[]
}

export function DashboardHome({ dailyInputs = [] }: DashboardHomeProps) {
  const prepList = getPrepList(dailyInputs).slice(0, 4)
  const [mainItem, ...secondaryItems] = prepList
  const [view, setView] = useState<'overview' | 'list' | 'done'>('overview')
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({})
  const doneCount = prepList.filter((item) => doneTasks[item.name]).length

  function toggleTask(itemName: string) {
    setDoneTasks((currentTasks) => ({
      ...currentTasks,
      [itemName]: !currentTasks[itemName],
    }))
  }

  if (view === 'done') {
    return (
      <main className="py-7 md:py-6">
        <div className="pt-8 text-center md:pt-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/12 text-primary">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black leading-tight text-foreground md:text-5xl">You&apos;re ready to open</h1>
          <p className="mx-auto mt-4 max-w-[22rem] text-lg font-bold leading-snug text-muted-foreground">
            All bakery items are prepared.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <Button
            onClick={() => {
              setDoneTasks({})
              setView('overview')
            }}
            className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
          >
            Back to Home
          </Button>
          <Button
            onClick={() => setView('list')}
            variant="secondary"
            className="h-16 w-full rounded-[1.4rem] bg-secondary text-lg font-bold text-foreground hover:bg-secondary/80"
          >
            Edit list
          </Button>
        </div>
      </main>
    )
  }

  if (view === 'list') {
    return (
      <main className="py-7 md:py-6">
        <div className="mb-7 pt-5 md:mb-6 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">Today</p>
          <h1 className="text-4xl font-black leading-tight text-foreground">Today&apos;s Baking List</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
            Prepare these before opening
          </p>
          <p className="mt-4 text-lg font-black text-primary">
            {doneCount} / {prepList.length} done
          </p>
        </div>

        <div className="divide-y divide-secondary">
          {prepList.map((item) => {
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
          onClick={() => setView('done')}
          className="mt-5 h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
        >
          Finish baking list
        </Button>
      </main>
    )
  }

  return (
    <main className="py-7 md:py-6">
      <div className="mb-7 pt-5 md:mb-6 md:pt-4">
        <p className="mb-2 text-sm font-bold text-primary">Today</p>
        <h1 className="text-4xl font-black leading-tight text-foreground">What to bake today</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          Start with the main bake.
        </p>
      </div>

      <section className="mb-7 md:mb-6">
        {mainItem && (
          <div className="rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
            <div className="mb-5">
              <div className="min-w-0">
                <p className="text-sm font-black text-primary">High demand today</p>
                <h3 className="mt-2 truncate text-3xl font-black text-foreground md:text-4xl">{mainItem.name}</h3>
              </div>
            </div>
            <div className="flex items-end gap-2 leading-none">
              <span className="text-5xl font-black text-primary md:text-6xl">{mainItem.quantity.toLocaleString()}</span>
              <span className="pb-1 text-2xl font-black text-foreground md:pb-1.5 md:text-3xl">{mainItem.unit}</span>
            </div>
          </div>
        )}

        <div className="mt-5 divide-y divide-secondary">
          {secondaryItems.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-foreground">{item.name}</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">{item.label}</p>
              </div>
              <p className="shrink-0 text-right text-lg font-black text-primary">
                {item.quantity.toLocaleString()} {item.unit}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Button
        onClick={() => setView('list')}
        className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
      >
        Show today&apos;s baking list
      </Button>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { ArrowRight, Leaf, Sprout } from 'lucide-react'
import { getImpactData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface CarbonImpactProps {
  dailyInputs?: FoodRow[]
}

export function CarbonImpact({ dailyInputs = [] }: CarbonImpactProps) {
  const [range, setRange] = useState<TimeRange>('month')
  const impact = getImpactData(range, dailyInputs)
  const circleSize = 232
  const strokeWidth = 12
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (Math.min(impact.percentComplete, 100) / 100) * circumference

  return (
    <main className="py-5 md:py-6">
      <div className="mb-5 pt-2 md:mb-6">
        <h1 className="text-4xl font-black leading-tight text-foreground">Your Impact</h1>
        <p className="mt-2 text-base font-bold text-muted-foreground">Waste less. Help more.</p>
        <TimeFilterToggle value={range} onChange={setRange} />
      </div>

      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_18%,rgba(91,211,151,0.3),transparent_17rem),linear-gradient(180deg,#073f3f_0%,#0b322f_100%)] px-5 pb-6 pt-6 text-white shadow-[0_18px_45px_rgba(15,82,62,0.22)] md:px-7">
        <div className="relative mx-auto mb-5 flex h-[232px] w-[232px] items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`}>
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(83, 213, 153, 0.2)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="#58d996"
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
            />
          </svg>
          <div className="relative text-center">
            <p className="text-sm font-black text-emerald-300">{impact.periodLabel}</p>
            <p className="mt-2 text-5xl font-black leading-none">{impact.co2Reduced} kg</p>
            <p className="mt-2 text-base font-bold text-emerald-200">CO₂ saved</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 items-center gap-3 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-emerald-300">
              <Sprout className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-emerald-100">Less waste</p>
          </div>
          <div className="rounded-full bg-emerald-400/15 px-3 py-3 text-lg font-black text-emerald-300">
            {impact.wasteDown}% less waste
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-100">Goal</p>
            <p className="mt-1 text-lg font-black">{impact.goal} kg</p>
          </div>
        </div>

        <button className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-400 text-lg font-black text-emerald-950 shadow-[0_14px_30px_rgba(71,211,137,0.25)] transition hover:bg-emerald-300">
          Add today’s result
          <ArrowRight className="h-5 w-5" />
        </button>
      </section>

      <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">{impact.listTitle}</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">Less waste helps the planet</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Leaf className="h-5 w-5" />
          </div>
        </div>

        <div className="divide-y divide-secondary">
          {impact.items.map((item) => (
            <div key={item.day} className="flex items-center justify-between gap-4 py-4 first:pt-2 last:pb-1">
              <div>
                <p className="text-base font-black text-foreground">{item.day}</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">CO₂ saved</p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">{item.note}</p>
              </div>
              <p className="shrink-0 text-right text-base font-black text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
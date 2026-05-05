'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { getImpactData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface CarbonImpactProps {
  dailyInputs?: FoodRow[]
  onAddToday?: () => void
}

const dailyInputsKey = 'wasteGuardDailyInputs'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function hasTodayInput(inputRows: FoodRow[]) {
  return inputRows.some((input) => input.date === todayDate())
}

export function CarbonImpact({ dailyInputs = [], onAddToday }: CarbonImpactProps) {
  const [range, setRange] = useState<TimeRange>('month')
  const [todaySavedFromStorage, setTodaySavedFromStorage] = useState(false)
  const [showGoalDetail, setShowGoalDetail] = useState(false)
  const impact = getImpactData(range, dailyInputs)
  const isTodaySaved = hasTodayInput(dailyInputs) || todaySavedFromStorage
  const impactTons = (impact.co2Reduced / 1000).toFixed(2)
  const goalTons = (impact.goal / 1000).toFixed(2)
  const goalPercent = Math.min(Math.round(impact.percentComplete), 100)
  const circleSize = 232
  const strokeWidth = 12
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (Math.min(impact.percentComplete, 100) / 100) * circumference

  useEffect(() => {
    const savedInputs = window.localStorage.getItem(dailyInputsKey)

    if (!savedInputs) {
      return
    }

    try {
      setTodaySavedFromStorage(hasTodayInput(JSON.parse(savedInputs) as FoodRow[]))
    } catch {
      setTodaySavedFromStorage(false)
    }
  }, [dailyInputs])

  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_50%_12%,rgba(91,211,151,0.3),transparent_17rem),linear-gradient(180deg,#073f3f_0%,#0b322f_100%)] px-4 pb-32 pt-5 text-white sm:px-5 md:px-6 md:pt-6">
      <div className="mx-auto w-full max-w-[430px] md:max-w-[620px]">
        <div className="mb-5 pt-2 md:mb-6">
          <h1 className="text-4xl font-black leading-tight text-white">Your Impact</h1>
          <p className="mt-2 text-base font-bold text-emerald-100">Waste less. Help more.</p>
          <TimeFilterToggle value={range} onChange={setRange} />
        </div>

      <section className="pb-2 pt-3 text-white md:pt-4">
        <button
          onClick={() => setShowGoalDetail((isOpen) => !isOpen)}
          className="relative mx-auto mb-4 flex h-[232px] w-[232px] items-center justify-center rounded-full text-white outline-none transition hover:scale-[1.01] focus-visible:ring-4 focus-visible:ring-emerald-300/40"
          aria-expanded={showGoalDetail}
          aria-label="Show goal detail"
        >
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
            <p className="mt-2 text-5xl font-black leading-none">{impactTons}</p>
            <p className="mt-1 text-xl font-black text-white">tons</p>
            <p className="mt-2 text-base font-bold text-emerald-200">CO₂ saved</p>
          </div>
        </button>

        {showGoalDetail && (
          <div className="mb-5 text-center">
            <p className="text-base font-black text-emerald-100">Goal: {goalTons} tons</p>
            <p className="mt-1 text-sm font-bold text-emerald-200">You&apos;re {goalPercent}% there</p>
          </div>
        )}

        {isTodaySaved ? (
          <p className="text-center text-sm font-black text-emerald-200">Today&apos;s result saved</p>
        ) : (
          <button
            onClick={onAddToday}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-400 text-lg font-black text-emerald-950 shadow-[0_14px_30px_rgba(71,211,137,0.25)] transition hover:bg-emerald-300"
          >
            Add today&apos;s result
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </section>

      <section className="mt-8 md:mt-10">
        <div className="mb-4">
          <h2 className="text-2xl font-black text-white">{impact.listTitle}</h2>
          <p className="mt-1 text-sm font-bold text-emerald-100">Less waste helps the planet</p>
        </div>

        <div className="divide-y divide-white/12 rounded-[2rem] bg-white/[0.08] p-5 text-white md:p-7">
          {impact.items.map((item) => (
            <div key={item.day} className="flex items-center justify-between gap-4 py-4 first:pt-2 last:pb-1">
              <div>
                <p className="text-base font-black text-white">{item.day}</p>
                <p className="mt-1 text-sm font-bold text-emerald-100">CO₂ saved</p>
                <p className="mt-1 text-xs font-bold text-emerald-200/80">{item.note}</p>
              </div>
              <p className="shrink-0 text-right text-base font-black text-emerald-200">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
      </div>
    </main>
  )
}

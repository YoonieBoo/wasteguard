'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import { getImpactData, type FoodRow, type TimeRange, type WasteGuardRole } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface CarbonImpactProps {
  dailyInputs?: FoodRow[]
  language: Language
  role?: WasteGuardRole
  onAddToday?: () => void
}

const dailyInputsKey = 'wasteGuardDailyInputs'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function hasTodayInput(inputRows: FoodRow[]) {
  return inputRows.some((input) => input.date === todayDate())
}

export function CarbonImpact({ dailyInputs = [], language, role = 'staff', onAddToday }: CarbonImpactProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const [todaySavedFromStorage, setTodaySavedFromStorage] = useState(false)
  const [showGoalDetail, setShowGoalDetail] = useState(false)
  const impact = getImpactData(range, dailyInputs)
  const isTodaySaved = hasTodayInput(dailyInputs) || todaySavedFromStorage
  const impactTons = (impact.co2Reduced / 1000).toFixed(2)
  const goalTons = (impact.goal / 1000).toFixed(2)
  const goalPercent = Math.min(Math.round(impact.percentComplete), 100)
  const periodLabel = range === 'day' ? t.impactToday : range === 'week' ? t.impactThisWeek : t.impactThisMonth
  const listTitle = range === 'day' ? t.dailyImpact : range === 'week' ? t.weeklyImpact : t.monthlyImpact
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
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
            {role === 'owner' ? t.yourImpact : t.resultSaved}
          </h1>
          <p className="mt-2 text-base font-bold text-emerald-100">
            {role === 'owner' ? t.wasteLess : t.productionStatus}
          </p>
          {role === 'owner' && <TimeFilterToggle value={range} onChange={setRange} language={language} />}
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
            <p className="text-sm font-black text-emerald-300">{periodLabel}</p>
            <p className="mt-2 text-5xl font-black leading-none">{impactTons}</p>
            <p className="mt-1 text-xl font-black text-white">{t.tons}</p>
            <p className="mt-2 text-base font-bold text-emerald-200">{t.co2Saved}</p>
          </div>
        </button>

        {role === 'owner' && showGoalDetail && (
          <div className="mb-5 text-center">
            <p className="text-base font-black text-emerald-100">{t.goal}: {goalTons} {t.tons}</p>
            <p className="mt-1 text-sm font-bold text-emerald-200">{t.youreThere.replace('{percent}', String(goalPercent))}</p>
          </div>
        )}

        {isTodaySaved ? (
          <p className="text-center text-sm font-black text-emerald-200">{t.resultSaved}</p>
        ) : (
          <button
            onClick={onAddToday}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-400 px-3 py-3 text-center text-base font-black leading-tight text-emerald-950 shadow-[0_14px_30px_rgba(71,211,137,0.25)] transition hover:bg-emerald-300 sm:text-lg"
          >
            {t.addTodayResult}
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </section>

      {role === 'owner' && (
      <section className="mt-8 md:mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-black text-white sm:text-2xl">{listTitle}</h2>
          <p className="mt-1 text-sm font-bold text-emerald-100">{t.lessWastePlanet}</p>
        </div>

        <div className="divide-y divide-white/12 rounded-[2rem] bg-white/[0.08] p-5 text-white md:p-7">
          {impact.items.map((item) => (
            <div key={item.day} className="flex items-center justify-between gap-4 py-4 first:pt-2 last:pb-1">
              <div>
                <p className="text-base font-black text-white">{item.day === 'Today' ? t.today : item.day === 'Yesterday' ? t.yesterday : item.day}</p>
                <p className="mt-1 text-sm font-bold text-emerald-100">{t.co2Saved}</p>
                <p className="mt-1 text-xs font-bold text-emerald-200/80">{item.note === 'Based on your data' ? t.basedOnData : t.lessFoodLeft}</p>
              </div>
              <p className="shrink-0 text-right text-sm font-black text-emerald-200 sm:text-base">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
      )}
      </div>
    </main>
  )
}

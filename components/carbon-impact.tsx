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
  const circleSize = 216
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
    <main className="min-h-dvh w-full bg-[radial-gradient(circle_at_18%_10%,rgba(91,211,151,0.28),transparent_18rem),radial-gradient(circle_at_88%_20%,rgba(99,226,172,0.16),transparent_20rem),linear-gradient(180deg,#073f3f_0%,#0b322f_100%)] px-4 pb-28 pt-8 text-white sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              {role === 'owner' ? t.yourImpact : t.resultSaved}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-100 sm:text-base">
              {role === 'owner' ? t.wasteLess : t.productionStatus}
            </p>
          </div>
          {role === 'owner' && (
            <div className="lg:pb-1">
              <TimeFilterToggle value={range} onChange={setRange} language={language} />
            </div>
          )}
        </div>

        <section className="rounded-[1.45rem] bg-white/[0.08] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur md:p-6">
          <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
            <button
              onClick={() => setShowGoalDetail((isOpen) => !isOpen)}
              className="relative mx-auto flex aspect-square w-40 items-center justify-center rounded-full text-white outline-none transition hover:scale-[1.01] focus-visible:ring-4 focus-visible:ring-emerald-300/40 sm:w-44 md:mx-0 lg:w-44"
              aria-expanded={showGoalDetail}
              aria-label="Show goal detail"
            >
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox={`0 0 ${circleSize} ${circleSize}`}>
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
                <p className="text-xs font-black text-emerald-300 sm:text-sm">{periodLabel}</p>
                <p className="mt-1 text-3xl font-black leading-none sm:text-4xl">{impactTons}</p>
                <p className="mt-1 text-base font-black text-white">{t.tons}</p>
              </div>
            </button>

            <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-4 md:grid-cols-1 lg:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-emerald-200">{t.goal}</p>
                <p className="mt-1 text-xl font-black text-white sm:text-2xl">{goalTons}</p>
                <p className="text-xs font-bold text-emerald-100 sm:text-sm">{t.tons}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-emerald-200">{t.onTrack}</p>
                <p className="mt-1 text-xl font-black text-white sm:text-2xl">{goalPercent}%</p>
                <p className="text-xs font-bold text-emerald-100 sm:text-sm">{t.youreThere.replace('{percent}', String(goalPercent))}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-emerald-200">{t.wasteReduced}</p>
                <p className="mt-1 text-xl font-black text-white sm:text-2xl">{impact.wasteDown}%</p>
                <p className="text-xs font-bold text-emerald-100 sm:text-sm">{t.lessFoodLeft}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
          {role === 'owner' && (
            <section className="text-white">
              <div className="mb-3">
                <h2 className="text-base font-black text-white sm:text-lg">{listTitle}</h2>
                <p className="mt-1 text-sm font-bold text-emerald-100">{t.lessWastePlanet}</p>
              </div>
              <div className="divide-y divide-white/12">
                {impact.items.map((item) => (
                  <div key={item.day} className="flex items-center justify-between gap-4 py-4 first:pt-2 last:pb-1">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">
                        {item.day === 'Today' ? t.today : item.day === 'Yesterday' ? t.yesterday : item.day}
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-100">{t.co2Saved}</p>
                      <p className="mt-1 text-xs font-bold text-emerald-200/80">
                        {item.note === 'Based on your data' ? t.basedOnData : t.lessFoodLeft}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-black text-emerald-200 sm:text-base">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="text-base font-black text-white">{role === 'owner' ? t.goal : t.productionStatus}</p>
            <p className="mt-2 text-sm font-bold leading-relaxed text-emerald-100">
              {showGoalDetail || role === 'owner'
                ? t.youreThere.replace('{percent}', String(goalPercent))
                : t.lessWastePlanet}
            </p>
            {role === 'owner' && (
              <button
                type="button"
                onClick={() => setShowGoalDetail((isOpen) => !isOpen)}
                className="mt-4 min-h-12 w-full rounded-[1.1rem] bg-white/[0.08] px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-white/[0.12]"
              >
                {showGoalDetail ? `${t.goal}: ${goalTons} ${t.tons}` : t.goal}
              </button>
            )}
            {role !== 'owner' && (
              <div className="mt-5">
                {isTodaySaved ? (
                  <p className="rounded-[1.15rem] bg-white/[0.08] px-4 py-3 text-center text-sm font-black text-emerald-200">
                    {t.resultSaved}
                  </p>
                ) : (
                  <button
                    onClick={onAddToday}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-emerald-400 px-4 py-3 text-center text-base font-black leading-tight text-emerald-950 shadow-[0_14px_30px_rgba(71,211,137,0.25)] transition hover:bg-emerald-300"
                  >
                    {t.addTodayResult}
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

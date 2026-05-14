'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import {
  getBusinessDashboardData,
  getPrepList,
  getSavingsData,
  type FoodRow,
  type IngredientEstimate,
  type TimeRange,
  type WasteGuardRole,
} from '@/lib/mock-data'

interface DashboardHomeProps {
  dailyInputs?: FoodRow[]
  language: Language
  role?: WasteGuardRole
  bakeryName?: string
  inviteCode?: string
  onGoCheck?: () => void
}

type DemandSegmentKey = 'morning' | 'afternoon' | 'evening'

export function DashboardHome({
  dailyInputs = [],
  language,
  role = 'staff',
  bakeryName,
  inviteCode,
  onGoCheck,
}: DashboardHomeProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('week')
  const [activeDemandSegment, setActiveDemandSegment] = useState<DemandSegmentKey | null>(null)
  const [activeRevenueIndex, setActiveRevenueIndex] = useState<number | null>(null)
  const [activeOrderIndex, setActiveOrderIndex] = useState<number | null>(null)
  const demandChartRef = useRef<HTMLDivElement>(null)
  const prepList = getPrepList(dailyInputs).slice(0, 4)
  const savings = getSavingsData(range, dailyInputs)
  const [mainItem, ...secondaryItems] = prepList
  const ingredientSummary = getIngredientSummary(prepList)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!activeDemandSegment || demandChartRef.current?.contains(event.target as Node)) {
        return
      }

      setActiveDemandSegment(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [activeDemandSegment])

  if (role === 'owner') {
    const business = getBusinessDashboardData(range, dailyInputs)
    const requestedItems = prepList.slice(0, 4)
    const maxRevenueBar = Math.max(1, ...business.revenueBars.flatMap((item) => [item.current, item.previous]))
    const currentOrderPoints = getLinePoints(business.orderTrend.map((item) => item.current), activeOrderIndex)
    const previousOrderPoints = getLinePoints(business.orderTrend.map((item) => item.previous), activeOrderIndex)
    const orderDots = getLineDots(business.orderTrend.map((item) => item.current), activeOrderIndex)
    const periodTitle = range === 'day' ? t.todayPeriod : range === 'week' ? t.thisWeek : t.thisMonth
    const demand = business.demand
    const activeDemandKey = activeDemandSegment ?? demand.dominant
    const demandSegments = getDemandSegments(demand)
    const activeDemand = demandSegments.find((segment) => segment.key === activeDemandKey) ?? demandSegments[0]

    return (
      <main className="w-full min-w-0 py-6 md:py-6 lg:py-7">
        <div className="mb-6 pt-5 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{bakeryName || t.today}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl lg:text-[2.5rem]">{t.ownerDashboard}</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">{t.ownerDashboardNote}</p>
          <TimeFilterToggle value={range} onChange={setRange} language={language} />
        </div>

        <div className="overflow-hidden rounded-[1.6rem] bg-white shadow-[0_18px_45px_rgba(41,91,67,0.08)]">
          <div className="grid xl:grid-cols-[1.75fr_1fr]">
            <section className="border-secondary/80 p-5 md:p-7 xl:border-r">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-black text-foreground">{t.revenueToday}</p>
                  <p className="mt-2 text-3xl font-black text-foreground sm:text-4xl">THB {business.revenue.toLocaleString()}</p>
                  <p className={`mt-1 text-sm font-bold ${business.revenueChangePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentChange(business.revenueChangePercent)} {t.fromLastWeek}
                  </p>
                  <p className="mt-5 text-sm font-bold text-muted-foreground">{periodTitle}</p>
                </div>
                <p className="rounded-[0.9rem] border border-secondary px-3 py-2 text-xs font-black text-foreground">{periodTitle}</p>
              </div>

              <div className="mt-7 flex h-36 min-w-0 items-end gap-1.5 overflow-hidden border-b border-secondary/80 pb-4 sm:h-40 sm:gap-3">
                {business.revenueBars.map((item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    type="button"
                    onMouseEnter={() => setActiveRevenueIndex(index)}
                    onMouseLeave={() => setActiveRevenueIndex(null)}
                    onFocus={() => setActiveRevenueIndex(index)}
                    onBlur={() => setActiveRevenueIndex(null)}
                    onClick={() => setActiveRevenueIndex(activeRevenueIndex === index ? null : index)}
                    className="group flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`${item.label}: THB ${item.current.toLocaleString()}`}
                  >
                    <div className="flex h-32 w-full items-end justify-center gap-1">
                      <span
                        className={`w-full max-w-3 rounded-t-full bg-primary transition-all duration-200 ${
                          activeRevenueIndex === index ? 'opacity-100 shadow-[0_0_0_3px_rgba(68,179,126,0.16)]' : 'opacity-80 group-hover:opacity-100'
                        }`}
                        style={{ height: `${getBarHeight(item.current, maxRevenueBar)}%` }}
                      />
                      <span
                        className={`w-full max-w-3 rounded-t-full bg-secondary transition-all duration-200 ${
                          activeRevenueIndex === index ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                        }`}
                        style={{ height: `${getBarHeight(item.previous, maxRevenueBar)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold transition-colors ${activeRevenueIndex === index ? 'text-primary' : 'text-muted-foreground/50'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-5 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" />{periodTitle}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-secondary" />{t.fromLastWeek}</span>
              </div>
            </section>

            <section className="min-w-0 border-t border-secondary/80 p-5 md:p-7 xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-black text-foreground">{t.demandAnalytics}</p>
                  <p className="mt-2 text-sm font-bold text-muted-foreground">{periodTitle}</p>
                </div>
                <p className="rounded-[0.9rem] border border-secondary px-3 py-2 text-xs font-black text-foreground">{periodTitle}</p>
              </div>

              <div
                ref={demandChartRef}
                onMouseLeave={() => setActiveDemandSegment(null)}
                className="relative mx-auto mt-6 grid aspect-square w-full max-w-[15rem] place-items-center sm:max-w-[17rem]"
              >
                <svg className="h-full w-full overflow-visible" viewBox="0 0 120 120" role="img" aria-label={t.demandAnalytics}>
                  {demandSegments.map((segment) => (
                    <circle
                      key={segment.key}
                      cx="60"
                      cy="60"
                      r="42"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeDasharray={`${segment.length} ${segment.gap}`}
                      strokeDashoffset={segment.offset}
                      className={`cursor-pointer transition-all duration-300 ${
                        activeDemandKey === segment.key ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        transform: `${activeDemandKey === segment.key ? 'scale(1.035)' : 'scale(1)'} rotate(-90deg)`,
                        transformOrigin: '60px 60px',
                      }}
                      onMouseEnter={() => setActiveDemandSegment(segment.key)}
                      onFocus={() => setActiveDemandSegment(segment.key)}
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveDemandSegment(activeDemandSegment === segment.key ? null : segment.key)
                      }}
                      tabIndex={0}
                      aria-label={`${t[segment.key]} ${segment.percent}%`}
                    />
                  ))}
                  <circle cx="60" cy="60" r="29" fill="white" />
                  <text x="60" y="56" textAnchor="middle" className="fill-primary text-[12px] font-black">
                    {activeDemand.percent}%
                  </text>
                  <text x="60" y="70" textAnchor="middle" className="fill-muted-foreground text-[7px] font-bold">
                    {t[activeDemand.key]}
                  </text>
                </svg>

                <div
                  className={`pointer-events-none absolute left-1/2 top-2 w-[min(11rem,92%)] -translate-x-1/2 rounded-[0.9rem] bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-[0_12px_25px_rgba(68,179,126,0.22)] transition-all duration-200 ${
                    activeDemandSegment ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-95 opacity-0'
                  }`}
                >
                  <p>{t[activeDemand.key]}</p>
                  <p className="mt-1 text-xs font-bold text-primary-foreground/80">{periodTitle}</p>
                  <p className="mt-2">{activeDemand.orders.toLocaleString()} {t.orders.toLowerCase()}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground">
                <p><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#2f9b6f]" />{t.afternoon}<br /><span className="ml-4">{demand.afternoon}%</span></p>
                <p><span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />{t.evening}<br /><span className="ml-4">{demand.evening}%</span></p>
                <p><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#9fe4c4]" />{t.morning}<br /><span className="ml-4">{demand.morning}%</span></p>
              </div>
            </section>
          </div>

          <div className="grid border-t border-secondary/80 xl:grid-cols-[1fr_1fr_1fr]">
            <section className="border-secondary/80 p-5 md:p-7 xl:border-r">
              <p className="text-base font-black text-foreground">{t.qualityScore}</p>
              <p className="mt-2 text-sm font-bold text-muted-foreground">{t.qualityScoreNote}</p>
              <div className="relative mt-8 h-60">
                <div className="absolute left-1 top-24 grid h-28 w-28 place-items-center rounded-full bg-[#2f9b6f] text-center text-white shadow-[0_14px_28px_rgba(68,179,126,0.18)]">
                  <p className="text-2xl font-black">{business.quality.packaging}%</p>
                  <p className="text-xs font-bold">{t.packaging}</p>
                </div>
                <div className="absolute left-16 top-0 grid h-28 w-28 place-items-center rounded-full bg-[#72d2aa] text-center text-white shadow-[0_14px_28px_rgba(68,179,126,0.16)]">
                  <p className="text-2xl font-black">{business.quality.freshness}%</p>
                  <p className="text-xs font-bold">{t.freshness}</p>
                </div>
                <div className="absolute right-2 top-10 grid h-40 w-40 place-items-center rounded-full bg-[#145c43] text-center text-white shadow-[0_18px_32px_rgba(68,179,126,0.2)]">
                  <p className="text-4xl font-black">{business.quality.taste}%</p>
                  <p className="text-sm font-bold">{t.taste}</p>
                </div>
              </div>
            </section>

            <section className="border-t border-secondary/80 p-5 md:p-7 xl:border-r xl:border-t-0">
              <p className="text-base font-black text-foreground">{t.mostRequestedItems}</p>
              <p className="mt-2 text-sm font-bold text-muted-foreground">{t.mostRequestedNote}</p>
              <div className="mt-8 divide-y divide-secondary/80">
                {requestedItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-lg">{item.image}</span>
                      <p className="truncate text-sm font-black text-foreground">{translateItemName(item.name, language)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-muted-foreground">THB {(item.quantity * 75).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-secondary/80 p-5 md:p-7 xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-black text-foreground">{t.orders}</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{business.orders.toLocaleString()}</p>
                  <p className={`mt-1 text-sm font-bold ${business.orderChangePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentChange(business.orderChangePercent)} {t.fromLastWeek}
                  </p>
                  <p className="mt-5 text-sm font-bold text-muted-foreground">{periodTitle}</p>
                </div>
                <p className="rounded-[0.9rem] border border-secondary px-3 py-2 text-xs font-black text-foreground">{periodTitle}</p>
              </div>

              <div className="relative mt-8 h-36 min-w-0 border-b border-secondary sm:h-40">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 260 140" preserveAspectRatio="none">
                  <polyline
                    points={previousOrderPoints}
                    fill="none"
                    stroke="#dff7ea"
                    strokeWidth="3"
                  />
                  <polyline
                    points={currentOrderPoints}
                    fill="none"
                    stroke="#145c43"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {orderDots.map((dot, index) => (
                    <circle
                      key={`${dot.x}-${dot.y}-${index}`}
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.isActive ? 5 : 3}
                      fill="#145c43"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveOrderIndex(index)}
                      onMouseLeave={() => setActiveOrderIndex(null)}
                      onClick={() => setActiveOrderIndex(activeOrderIndex === index ? null : index)}
                    />
                  ))}
                </svg>
              </div>
              <div className="mt-4 flex gap-5 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#145c43]" />{periodTitle}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-secondary" />{t.fromLastWeek}</span>
              </div>
            </section>
          </div>
        </div>

        <section className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
          {([
            [t.revenueTrend, formatPercentChange(business.revenueChangePercent), business.revenueChangePercent >= 0],
            [t.wasteTrend, `${savings.lessWaste}%`, true],
            [t.orderGrowth, formatPercentChange(business.orderChangePercent), business.orderChangePercent >= 0],
          ] as Array<[string, string, boolean]>).map(([label, value, isPositive]) => (
            <div key={label} className="rounded-[1.35rem] bg-white p-4 text-center shadow-[0_12px_28px_rgba(41,91,67,0.08)]">
              <p className={`text-xl font-black ${isPositive ? 'text-primary' : 'text-destructive'}`}>{value}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
            </div>
          ))}
        </section>

        <RecentActivity role={role} dailyInputs={dailyInputs} language={language} />

        {inviteCode && (
          <section className="mt-5 rounded-[1.6rem] bg-secondary/70 p-5 md:p-6">
            <p className="text-sm font-black text-primary">{t.staffInviteCode}</p>
            <p className="mt-2 text-2xl font-black tracking-normal text-foreground">{inviteCode}</p>
          </section>
        )}
      </main>
    )
  }

  return (
    <main className="py-7 md:py-6">
      <div className="mb-6 pt-5 md:pt-4">
        <p className="mb-2 text-sm font-bold text-primary">{t.today}</p>
        <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.staffDashboard}</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">{t.staffDashboardNote}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      {mainItem && (
        <section className="rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
          <p className="text-sm font-black text-primary">{t.todaysBakingRecommendation}</p>
          <h2 className="mt-2 truncate text-3xl font-black text-foreground sm:text-4xl">{translateItemName(mainItem.name, language)}</h2>
          <div className="mt-4 flex items-end gap-2 leading-none">
            <span className="text-5xl font-black text-primary md:text-6xl">{mainItem.quantity.toLocaleString()}</span>
            <span className="pb-1 text-xl font-black text-foreground sm:text-2xl">{t.pieces}</span>
          </div>
          <IngredientList ingredients={mainItem.ingredients} />
        </section>
      )}

      <section className="divide-y divide-secondary rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
        <p className="pb-3 text-base font-black text-foreground">{t.mostRequestedToday}</p>
        {[mainItem, ...secondaryItems].filter(Boolean).map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 py-3 last:pb-0">
            <p className="truncate text-base font-black text-foreground">{translateItemName(item.name, language)}</p>
            <p className="shrink-0 text-sm font-black text-primary">{item.quantity.toLocaleString()} {t.pieces}</p>
          </div>
        ))}
      </section>
      </div>

      <section className="mb-7 mt-5 rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
        <p className="mb-3 text-base font-black text-foreground">{t.ingredientPreparation}</p>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {ingredientSummary.slice(0, 3).map((ingredient) => (
            <div key={ingredient.name} className="rounded-[1.2rem] bg-white/75 p-3 text-center">
              <p className="text-lg font-black text-primary">{ingredient.amount}</p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">{ingredient.name}</p>
            </div>
          ))}
        </div>
      </section>

      <RecentActivity role={role} dailyInputs={dailyInputs} language={language} />

      <div className="lg:max-w-md">
        <Button
          onClick={onGoCheck}
          className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
        >
          {t.showBakingList}
        </Button>
      </div>
    </main>
  )
}

function IngredientList({ ingredients }: { ingredients?: IngredientEstimate[] }) {
  if (!ingredients || ingredients.length === 0) {
    return null
  }

  return (
    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
      {ingredients.map((ingredient) => (
        <span key={`${ingredient.name}-${ingredient.amount}`} className="text-sm font-bold text-muted-foreground">
          {ingredient.name}: {ingredient.amount}
        </span>
      ))}
    </div>
  )
}

function getBarHeight(value: number, maxValue: number) {
  return Math.max(10, Math.round((value / Math.max(1, maxValue)) * 100))
}

function formatPercentChange(value: number) {
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  const sign = value >= 0 ? '+' : '-'

  return `${sign}${Math.abs(rounded)}%`
}

function getLineCoordinates(values: number[]) {
  const safeValues = values.length > 0 ? values : [0]
  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)
  const range = Math.max(1, max - min)
  const step = safeValues.length > 1 ? 244 / (safeValues.length - 1) : 0

  return safeValues.map((value, index) => {
    const x = 8 + index * step
    const y = 120 - ((value - min) / range) * 92

    return { x, y }
  })
}

function getLinePoints(values: number[], activeIndex: number | null = null) {
  const points = getLineCoordinates(values)

  if (activeIndex === null || !points[activeIndex]) {
    return points.map((point) => `${point.x},${point.y}`).join(' ')
  }

  return points
    .map((point, index) => {
      if (index !== activeIndex) {
        return `${point.x},${point.y}`
      }

      return `${point.x},${point.y - 2}`
    })
    .join(' ')
}

function getLineDots(values: number[], activeIndex: number | null = null) {
  return getLineCoordinates(values).map((point, index) => ({
    ...point,
    isActive: activeIndex === index,
  }))
}

function getDemandSegments(demand: {
  morning: number
  afternoon: number
  evening: number
  morningOrders: number
  afternoonOrders: number
  eveningOrders: number
}) {
  const circumference = 2 * Math.PI * 42
  const segments: Array<{
    key: DemandSegmentKey
    percent: number
    orders: number
    color: string
    length: number
    gap: number
    offset: number
  }> = [
    { key: 'afternoon', percent: demand.afternoon, orders: demand.afternoonOrders, color: '#2f9b6f', length: 0, gap: 0, offset: 0 },
    { key: 'evening', percent: demand.evening, orders: demand.eveningOrders, color: '#44b37e', length: 0, gap: 0, offset: 0 },
    { key: 'morning', percent: demand.morning, orders: demand.morningOrders, color: '#9fe4c4', length: 0, gap: 0, offset: 0 },
  ]
  let offset = 0

  return segments.map((segment) => {
    const length = (segment.percent / 100) * circumference
    const row = {
      ...segment,
      length,
      gap: circumference - length,
      offset: -offset,
    }
    offset += length

    return row
  })
}

function RecentActivity({
  role,
  dailyInputs,
  language,
}: {
  role: WasteGuardRole
  dailyInputs: FoodRow[]
  language: Language
}) {
  const t = getText(language)
  const latestRows = [...dailyInputs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const fallbackRows = [
    { label: t.recentBakingSession, detail: t.aiRecommendation, time: t.today },
    { label: t.completedCheck, detail: t.productionDone, time: t.yesterday },
    { label: t.wasteEntry, detail: role === 'owner' ? t.lessWasteThisWeek : t.leftovers, time: 'Monday' },
  ]
  const rows =
    latestRows.length > 0
      ? latestRows.map((row, index) => ({
          label: index === 0 ? t.completedCheck : index === 1 ? t.wasteEntry : t.recentBakingSession,
          detail:
            role === 'owner'
              ? `${Math.round(row.waste_percent)}% ${t.estimatedWaste.toLowerCase()}`
              : `${row.food_prepared.toLocaleString()} ${t.pieces}, ${row.leftover.toLocaleString()} ${t.leftovers.toLowerCase()}`,
          time: index === 0 ? t.today : index === 1 ? t.yesterday : new Date(row.date).toLocaleDateString('en-US', { weekday: 'long' }),
        }))
      : fallbackRows

  return (
    <section className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-base font-black text-foreground">{t.recentBakeryActivity}</p>
        <span className="h-2 w-2 rounded-full bg-primary/70" aria-hidden="true" />
      </div>
      <div className="divide-y divide-secondary/80">
        {rows.map((item) => (
          <div key={`${item.label}-${item.time}`} className="flex items-start gap-3 py-3 first:pt-2 last:pb-0">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              <p className="min-w-0 truncate text-sm font-black text-foreground">{item.label}</p>
              <p className="shrink-0 whitespace-nowrap text-xs font-bold text-muted-foreground">{item.time}</p>
              <p className="col-span-2 text-sm font-bold leading-snug text-muted-foreground sm:col-span-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function getIngredientSummary(items: ReturnType<typeof getPrepList>) {
  const totals = new Map<string, number>()
  const units = new Map<string, string>()

  items.forEach((item) => {
    item.ingredients?.forEach((ingredient) => {
      const [rawAmount, unit = ''] = ingredient.amount.split(' ')
      const amount = Number(rawAmount)

      if (Number.isNaN(amount)) {
        return
      }

      totals.set(ingredient.name, (totals.get(ingredient.name) ?? 0) + amount)
      units.set(ingredient.name, unit)
    })
  })

  return Array.from(totals.entries()).map(([name, amount]) => ({
    name,
    amount: `${amount} ${units.get(name) ?? ''}`.trim(),
  }))
}

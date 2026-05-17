'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import {
  bakeryCategories,
  getBakeryItems,
  translateCategory,
  translateDemandLevel,
  translateIngredientName,
  translatePreparationNote,
  translatePrepUnit,
  translateWasteRisk,
  type BakeryCategory,
  type BakeryItem,
} from '@/lib/bakery-catalog'
import {
  getBusinessDashboardData,
  getPrepList,
  getSavingsData,
  type FoodRow,
  type TimeRange,
  type WasteGuardRole,
} from '@/lib/mock-data'

interface DashboardHomeProps {
  dailyInputs?: FoodRow[]
  language: Language
  role?: WasteGuardRole
  bakeryName?: string
  inviteCode?: string
  completedBakeryItems?: Record<string, boolean>
  onCompleteBakeryItem?: (fileName: string) => void
}

type DemandSegmentKey = 'morning' | 'afternoon' | 'evening'

export function DashboardHome({
  dailyInputs = [],
  language,
  role = 'staff',
  bakeryName,
  inviteCode,
  completedBakeryItems = {},
  onCompleteBakeryItem,
}: DashboardHomeProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('week')
  const [activeDemandSegment, setActiveDemandSegment] = useState<DemandSegmentKey | null>(null)
  const [activeRevenueIndex, setActiveRevenueIndex] = useState<number | null>(null)
  const [activeOrderIndex, setActiveOrderIndex] = useState<number | null>(null)
  const [selectedBakeryItem, setSelectedBakeryItem] = useState<BakeryItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BakeryCategory>('All')
  const demandChartRef = useRef<HTMLDivElement>(null)
  const prepList = getPrepList(dailyInputs).slice(0, 4)
  const savings = getSavingsData(range, dailyInputs)
  const bakeryItems = getBakeryItems(
    dailyInputs,
    prepList.reduce((total, item) => total + item.quantity, 0),
  )
  const [featuredBakeryItem, ...supportingBakeryItems] = bakeryItems
  const filteredBakeryItems =
    selectedCategory === 'All' ? bakeryItems : bakeryItems.filter((item) => item.category === selectedCategory)

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
      <main className="wg-page w-full min-w-0">
        <div className="wg-page-header">
          <p className="wg-eyebrow">{bakeryName || t.today}</p>
          <h1 className="wg-page-title">{t.ownerDashboard}</h1>
          <p className="wg-page-subtitle">{t.ownerDashboardNote}</p>
          <TimeFilterToggle value={range} onChange={setRange} language={language} />
        </div>

        <div className="overflow-hidden rounded-[1.45rem] bg-white shadow-[0_18px_45px_rgba(41,91,67,0.08)]">
          <div className="grid xl:grid-cols-[1.75fr_1fr]">
            <section className="border-secondary/80 p-5 md:p-6 xl:border-r">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="wg-section-title">{t.revenueToday}</p>
                  <p className="mt-2 text-2xl font-black text-foreground sm:text-3xl">THB {business.revenue.toLocaleString()}</p>
                  <p className={`mt-1 text-sm font-bold ${business.revenueChangePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentChange(business.revenueChangePercent)} {t.fromLastWeek}
                  </p>
                  <p className="wg-meta mt-5">{periodTitle}</p>
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

            <section className="min-w-0 border-t border-secondary/80 p-5 md:p-6 xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="wg-section-title">{t.demandAnalytics}</p>
                  <p className="wg-meta mt-2">{periodTitle}</p>
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
            <section className="border-secondary/80 p-5 md:p-6 xl:border-r">
              <p className="wg-section-title">{t.qualityScore}</p>
              <p className="wg-meta mt-2">{t.qualityScoreNote}</p>
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

            <section className="border-t border-secondary/80 p-5 md:p-6 xl:border-r xl:border-t-0">
              <p className="wg-section-title">{t.mostRequestedItems}</p>
              <p className="wg-meta mt-2">{t.mostRequestedNote}</p>
              <div className="mt-8 divide-y divide-secondary/80">
                {requestedItems.map((item, index) => {
                  const bakeryItem = supportingBakeryItems[index] ?? featuredBakeryItem

                  return (
                  <div key={item.name} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={bakeryItem.imageSrc}
                        alt={bakeryItem.title}
                        className="h-10 w-10 shrink-0 rounded-full object-cover shadow-[0_8px_16px_rgba(41,91,67,0.12)]"
                      />
                      <p className="truncate text-sm font-black text-foreground">{translateItemName(bakeryItem.title, language)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-muted-foreground">THB {(item.quantity * 75).toLocaleString()}</p>
                  </div>
                  )
                })}
              </div>
            </section>

            <section className="border-t border-secondary/80 p-5 md:p-6 xl:border-t-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="wg-section-title">{t.orders}</p>
                  <p className="mt-2 text-2xl font-black text-foreground sm:text-3xl">{business.orders.toLocaleString()}</p>
                  <p className={`mt-1 text-sm font-bold ${business.orderChangePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatPercentChange(business.orderChangePercent)} {t.fromLastWeek}
                  </p>
                  <p className="wg-meta mt-5">{periodTitle}</p>
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
            <div key={label} className="rounded-[1.2rem] bg-white p-4 text-center shadow-[0_12px_28px_rgba(41,91,67,0.08)]">
              <p className={`text-lg font-black ${isPositive ? 'text-primary' : 'text-destructive'}`}>{value}</p>
              <p className="wg-meta mt-1">{label}</p>
            </div>
          ))}
        </section>

        {inviteCode && (
          <section className="mt-5 rounded-[1.35rem] bg-secondary/70 p-5">
            <p className="text-sm font-black text-primary">{t.staffInviteCode}</p>
            <p className="mt-2 text-xl font-black tracking-normal text-foreground">{inviteCode}</p>
          </section>
        )}
      </main>
    )
  }

  return (
    <>
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">{t.today}</p>
        <h1 className="wg-page-title">{t.staffDashboard}</h1>
        <p className="wg-page-subtitle">{t.staffDashboardNote}</p>
      </div>

      <button
        type="button"
        onClick={() => setSelectedBakeryItem(featuredBakeryItem)}
        className={`block w-full overflow-hidden rounded-[1.45rem] bg-white text-left shadow-[0_18px_45px_rgba(41,91,67,0.1)] outline-none transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(41,91,67,0.14)] focus-visible:ring-4 focus-visible:ring-primary/20 ${
          selectedBakeryItem?.fileName === featuredBakeryItem.fileName ? 'ring-4 ring-primary/20' : ''
        }`}
      >
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[20rem] overflow-hidden bg-[#302927] sm:min-h-[23rem] lg:min-h-[26rem]">
            <img
              src={featuredBakeryItem.imageSrc}
              alt={featuredBakeryItem.title}
              className="h-full min-h-[20rem] w-full object-cover transition duration-700 hover:scale-[1.035] sm:min-h-[23rem] lg:min-h-[26rem]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent p-4 text-white md:p-5">
              <p className="text-xs font-black uppercase tracking-normal text-white/80">{t.mostRequestedToday}</p>
            </div>
          </div>

          <div className="flex flex-col justify-center p-6 md:p-8 lg:p-9">
            <h3 className="text-2xl font-black leading-tight text-foreground sm:text-3xl">{translateItemName(featuredBakeryItem.title, language)}</h3>
            <div className="mt-5 flex items-end gap-2 leading-none md:mt-6">
              <span className="text-4xl font-black text-primary md:text-5xl">{featuredBakeryItem.prepQuantity.toLocaleString()}</span>
              <span className="pb-1 text-lg font-black text-foreground sm:text-xl">{translatePrepUnit(featuredBakeryItem.prepUnit, language)}</span>
            </div>
          </div>
        </div>
      </button>

      <section className="mt-5">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="wg-section-title">{t.mostRequestedItems}</p>
            <p className="mt-1 text-xs font-black text-primary">{t.today}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:justify-end md:overflow-visible md:pb-0">
            {bakeryCategories.map((category) => {
              const isActive = selectedCategory === category

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black leading-none transition duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(68,179,126,0.18)]'
                      : 'bg-white text-muted-foreground shadow-[0_8px_20px_rgba(41,91,67,0.07)] hover:-translate-y-0.5 hover:text-foreground'
                  }`}
                >
                  {translateCategory(category, language)}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-3 transition-all duration-300 sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredBakeryItems.map((item) => {
            const isSelected = selectedBakeryItem?.fileName === item.fileName
            const isCompleted = completedBakeryItems[item.fileName]

            return (
              <button
                type="button"
                key={item.fileName}
                onClick={() => setSelectedBakeryItem(item)}
                className={`group min-w-[11rem] snap-start overflow-hidden rounded-[1.25rem] bg-white text-left shadow-[0_14px_35px_rgba(41,91,67,0.09)] outline-none transition duration-300 animate-in fade-in-0 zoom-in-95 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(41,91,67,0.14)] focus-visible:ring-4 focus-visible:ring-primary/20 ${
                  isSelected ? 'ring-4 ring-primary/20' : ''
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <div className="flex min-h-10 items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-black leading-snug text-foreground">{translateItemName(item.title, language)}</p>
                    {isCompleted && (
                      <span className="shrink-0 rounded-full bg-primary/12 px-2 py-1 text-[10px] font-black text-primary">
                        {t.completed}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-black text-primary">
                    {item.prepQuantity.toLocaleString()} {translatePrepUnit(item.prepUnit, language)}
                  </p>
                  <span className="mt-4 flex h-10 w-full items-center justify-center rounded-[1rem] bg-secondary text-xs font-black text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                    {isCompleted ? t.completed : t.viewDetails}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

    </main>
    <PreparationDetailsPanel
      item={selectedBakeryItem}
      language={language}
      isCompleted={selectedBakeryItem ? Boolean(completedBakeryItems[selectedBakeryItem.fileName]) : false}
      onComplete={(item) => {
        onCompleteBakeryItem?.(item.fileName)
      }}
      onClose={() => setSelectedBakeryItem(null)}
    />
    </>
  )
}

function PreparationDetailsPanel({
  item,
  language,
  isCompleted,
  onComplete,
  onClose,
}: {
  item: BakeryItem | null
  language: Language
  isCompleted: boolean
  onComplete: (item: BakeryItem) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!item) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose])

  if (!item) {
    return null
  }

  const t = getText(language)
  const demandTone = item.demandLevel === 'High Demand' ? 'bg-primary text-primary-foreground' : item.demandLevel === 'Medium Demand' ? 'bg-amber-100 text-amber-900' : 'bg-secondary text-foreground'
  const riskTone = item.wasteRisk === 'Low waste risk' ? 'text-primary' : item.wasteRisk === 'Medium waste risk' ? 'text-amber-700' : 'text-destructive'

  return (
    <>
      <aside className="fixed inset-0 z-[70] h-dvh overflow-y-auto bg-white animate-in slide-in-from-right-4 duration-300 xl:inset-x-auto xl:bottom-auto xl:right-0 xl:top-0 xl:max-h-dvh xl:w-[420px] xl:border-l xl:border-secondary/80 xl:shadow-[-24px_0_70px_rgba(35,88,62,0.14)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-secondary/70 bg-white/94 px-4 py-3 backdrop-blur sm:px-6 xl:border-b-0 xl:px-6 xl:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:hidden"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0">
              <p className="wg-eyebrow mb-0">{t.preparationDetails}</p>
              <p className="wg-meta mt-1 truncate">{t.aiDemandForecast}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:grid"
            aria-label="Close preparation details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 sm:px-6 md:pt-6 xl:max-w-none xl:px-6 xl:pb-5 xl:pt-0">
          <div className="overflow-hidden rounded-[1.25rem] bg-secondary shadow-[0_16px_36px_rgba(41,91,67,0.08)] xl:shadow-none">
            <img src={item.imageSrc} alt={translateItemName(item.title, language)} className="aspect-[4/3] w-full object-cover md:aspect-[16/9] xl:aspect-[4/3]" />
          </div>

          <div className="mt-6 xl:mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${demandTone}`}>{translateDemandLevel(item.demandLevel, language)}</span>
              <span className={`rounded-full bg-secondary px-3 py-1 text-xs font-black ${riskTone}`}>{translateWasteRisk(item.wasteRisk, language)}</span>
              {isCompleted && (
                <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-black text-primary">{t.completed}</span>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-black leading-tight text-foreground sm:text-3xl">{translateItemName(item.title, language)}</h2>
          </div>

          <section className="mt-7 xl:mt-6">
            <p className="text-xl font-black leading-tight text-foreground sm:text-2xl">
              {t.prepareAmount
                .replace('{amount}', item.prepQuantity.toLocaleString())
                .replace('{unit}', translatePrepUnit(item.prepUnit, language))}
            </p>
          </section>

          <section className="mt-7 xl:mt-6">
            <p className="wg-label">{t.estimatedIngredientUsage}</p>
            <div className="mt-3 divide-y divide-secondary">
              {item.ingredientUsage.map((ingredient) => (
                <div key={`${ingredient.name}-${ingredient.amount}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 xl:py-3">
                  <p className="text-sm font-bold text-foreground sm:text-base xl:text-sm">{translateIngredientName(ingredient.name, language)}</p>
                  <p className="text-sm font-black text-primary sm:text-base xl:text-sm">{ingredient.amount}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-7 xl:mt-6">
            <p className="wg-label">{t.preparationNote}</p>
            <p className="mt-2 text-base font-black leading-7 text-foreground">{translatePreparationNote(item.preparationNote, language)}</p>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_30px_rgba(41,91,67,0.08)] backdrop-blur sm:px-6 xl:sticky xl:px-6 xl:pb-5 xl:shadow-none">
          <Button
            type="button"
            onClick={() => onComplete(item)}
            disabled={isCompleted}
            className={`wg-action w-full transition-all ${
              isCompleted
                ? 'bg-emerald-900 text-white opacity-95'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isCompleted ? t.completed : t.done}
          </Button>
        </div>
      </aside>
    </>
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

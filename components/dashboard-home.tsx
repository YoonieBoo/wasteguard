'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import {
  getDashboardData,
  getImpactData,
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
  const prepList = getPrepList(dailyInputs).slice(0, 4)
  const dashboard = getDashboardData(dailyInputs)
  const savings = getSavingsData(range, dailyInputs)
  const impact = getImpactData(range, dailyInputs)
  const [mainItem, ...secondaryItems] = prepList
  const ingredientSummary = getIngredientSummary(prepList)

  if (role === 'owner') {
    const requestedItems = prepList.slice(0, 4)
    const rangeMultiplier = range === 'day' ? 1 : range === 'week' ? 7 : 30
    const revenue = Math.round(dashboard.revenueToday * rangeMultiplier * (range === 'month' ? 0.92 : 1))
    const revenueBars = savings.chartRows.map((item, index) => ({
      label: item.day,
      current: Math.max(24, Math.round((item.saved / 100) * 86)),
      previous: Math.max(18, 72 - index * 5),
    }))
    const periodTitle = range === 'day' ? t.todayPeriod : range === 'week' ? t.thisWeek : t.thisMonth

    return (
      <main className="py-7 md:py-6">
        <div className="mb-6 pt-5 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{bakeryName || t.today}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.ownerDashboard}</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">{t.ownerDashboardNote}</p>
          <TimeFilterToggle value={range} onChange={setRange} language={language} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-primary">{t.revenueToday}</p>
                <p className="mt-2 text-3xl font-black text-foreground sm:text-4xl">THB {revenue.toLocaleString()}</p>
                <p className="mt-1 text-sm font-bold text-primary">+8.2% {t.fromLastWeek}</p>
              </div>
              <p className="rounded-full bg-secondary px-3 py-2 text-xs font-black text-primary">{periodTitle}</p>
            </div>
            <div className="mt-8 flex h-36 items-end gap-2 overflow-hidden">
              {revenueBars.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex min-w-0 flex-1 items-end justify-center gap-1">
                  <span className="w-full max-w-3 rounded-t-full bg-primary" style={{ height: `${item.current}%` }} />
                  <span className="w-full max-w-3 rounded-t-full bg-accent/45" style={{ height: `${item.previous}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-5 text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />{periodTitle}</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent/70" />{t.fromLastWeek}</span>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
              <p className="text-sm font-black text-primary">{t.demandAnalytics}</p>
              <div className="mt-4 flex justify-center">
                <div className="grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#44b37e_0_42%,#9fe4c4_42%_75%,#e4f5ec_75%_100%)]">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-sm font-black text-primary">100%</div>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm font-bold text-muted-foreground">
                <p>{t.morning}: 42%</p>
                <p>{t.afternoon}: 33%</p>
                <p>{t.evening}: 25%</p>
              </div>
            </div>

            <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
              <p className="text-sm font-black text-primary">{t.wasteReduced}</p>
              <p className="mt-4 text-3xl font-black text-foreground">{savings.lessWaste}%</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{t.lessWasteThisWeek}</p>
              <p className="mt-5 text-3xl font-black text-foreground">{impact.co2Reduced.toLocaleString()} kg</p>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{t.co2Saved}</p>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
          <p className="mb-4 text-base font-black text-foreground">{t.qualityScore}</p>
          {[
            [t.freshness, 94],
            [t.taste, 91],
            [t.packaging, 88],
          ].map(([label, value]) => (
            <div key={label} className="mb-3 last:mb-0">
              <div className="mb-1 flex items-center justify-between text-sm font-bold">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-primary">{value}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="divide-y divide-secondary rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
          <p className="pb-3 text-base font-black text-foreground">{t.mostRequestedItems}</p>
          {requestedItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <p className="truncate text-base font-black text-foreground">{translateItemName(item.name, language)}</p>
              <p className="shrink-0 text-sm font-black text-primary">{item.quantity.toLocaleString()} {t.sold}</p>
            </div>
          ))}
        </section>
        </div>

        <section className="mt-5 grid grid-cols-3 gap-2 md:gap-3">
          {[
            [t.revenueTrend, '+8.2%'],
            [t.wasteTrend, '-18%'],
            [t.orderGrowth, '+11%'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.35rem] bg-white p-4 text-center shadow-[0_12px_28px_rgba(41,91,67,0.08)]">
              <p className="text-xl font-black text-primary">{value}</p>
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
      <p className="mb-4 text-base font-black text-foreground">{t.recentBakeryActivity}</p>
      <div className="space-y-3">
        {rows.map((item) => (
          <div key={`${item.label}-${item.time}`} className="flex gap-3 rounded-[1.25rem] bg-secondary/60 p-4">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black text-foreground">{item.label}</p>
                <p className="shrink-0 text-xs font-bold text-muted-foreground">{item.time}</p>
              </div>
              <p className="mt-1 text-sm font-bold text-muted-foreground">{item.detail}</p>
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

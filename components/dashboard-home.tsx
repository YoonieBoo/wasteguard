'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import { getDashboardData, getPrepList, type FoodRow, type IngredientEstimate, type WasteGuardRole } from '@/lib/mock-data'

interface DashboardHomeProps {
  dailyInputs?: FoodRow[]
  language: Language
  role?: WasteGuardRole
  bakeryName?: string
  inviteCode?: string
}

export function DashboardHome({ dailyInputs = [], language, role = 'staff', bakeryName, inviteCode }: DashboardHomeProps) {
  const t = getText(language)
  const prepList = getPrepList(dailyInputs).slice(0, 4)
  const dashboard = getDashboardData(dailyInputs)
  const [mainItem, ...secondaryItems] = prepList
  const [view, setView] = useState<'overview' | 'list' | 'done'>('overview')
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>({})
  const doneCount = prepList.filter((item) => doneTasks[item.name]).length

  if (role === 'owner') {
    return (
      <main className="py-7 md:py-6">
        <div className="mb-6 pt-5 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{bakeryName || t.today}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.ownerDashboard}</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">{t.ownerDashboardNote}</p>
        </div>

        <section className="mb-5 grid grid-cols-2 gap-3 md:gap-4">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <p className="text-sm font-black text-primary">{t.revenueToday}</p>
            <p className="mt-3 text-3xl font-black text-foreground">{dashboard.revenueToday.toLocaleString()}</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">THB</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <p className="text-sm font-black text-primary">{t.thbSaved}</p>
            <p className="mt-3 text-3xl font-black text-foreground">{dashboard.moneySaved.toLocaleString()}</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">{t.savedThisWeek}</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <p className="text-sm font-black text-primary">{t.wasteReduced}</p>
            <p className="mt-3 text-3xl font-black text-foreground">{dashboard.wasteReduced}%</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">{t.lowWaste}</p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <p className="text-sm font-black text-primary">{t.co2Saved}</p>
            <p className="mt-3 text-3xl font-black text-foreground">{dashboard.co2Saved}</p>
            <p className="mt-1 text-sm font-bold text-muted-foreground">kg</p>
          </div>
        </section>

        <section className="mb-5 divide-y divide-secondary rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 pb-4">
            <p className="text-base font-black text-foreground">{t.productionStatus}</p>
            <p className="text-base font-black text-primary">{t.productionComplete}</p>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <p className="text-base font-black text-foreground">{t.teamStatus}</p>
            <p className="text-base font-black text-primary">{t.teamReady}</p>
          </div>
          <div className="pt-4">
            <p className="text-base font-black text-foreground">{t.topSellingProducts}</p>
            <p className="mt-2 text-sm font-bold text-muted-foreground">
              {prepList.slice(0, 3).map((item) => translateItemName(item.name, language)).join(', ')}
            </p>
          </div>
        </section>

        <section className="mb-7 rounded-[1.75rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
          <p className="text-base font-black text-foreground">{t.businessInsights}</p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {t.onTrack}. {t.weeklyTrend}: {t.lowWaste}.
          </p>
          {inviteCode && (
            <div className="mt-4 rounded-[1.25rem] bg-secondary/70 p-4">
              <p className="text-sm font-black text-primary">{t.staffInviteCode}</p>
              <p className="mt-1 text-2xl font-black tracking-normal text-foreground">{inviteCode}</p>
            </div>
          )}
        </section>
      </main>
    )
  }

  function toggleTask(itemName: string) {
    setDoneTasks((currentTasks) => ({
      ...currentTasks,
      [itemName]: !currentTasks[itemName],
    }))
  }

  function IngredientList({ ingredients }: { ingredients?: IngredientEstimate[] }) {
    if (!ingredients || ingredients.length === 0) {
      return null
    }

    return (
      <div className="mt-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {ingredients.map((ingredient) => (
            <span key={`${ingredient.name}-${ingredient.amount}`} className="text-sm font-bold text-muted-foreground">
              {ingredient.name}: {ingredient.amount}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'done') {
    return (
      <main className="py-7 md:py-6">
        <div className="pt-8 text-center md:pt-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/12 text-primary">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl md:text-5xl">{t.readyOpen}</h1>
          <p className="mx-auto mt-4 max-w-[22rem] text-lg font-bold leading-snug text-muted-foreground">
            {t.allPrepared}
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
            {t.backHome}
          </Button>
          <Button
            onClick={() => setView('list')}
            variant="secondary"
            className="h-16 w-full rounded-[1.4rem] bg-secondary text-lg font-bold text-foreground hover:bg-secondary/80"
          >
            {t.editList}
          </Button>
        </div>
      </main>
    )
  }

  if (view === 'list') {
    return (
      <main className="py-7 md:py-6">
        <div className="mb-7 pt-5 md:mb-6 md:pt-4">
          <p className="mb-2 text-sm font-bold text-primary">{t.today}</p>
          <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.bakingList}</h1>
          <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
            {t.prepareBeforeOpen}
          </p>
          <p className="mt-4 text-lg font-black text-primary">
            {doneCount} / {prepList.length} {t.done}
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-black text-foreground sm:text-xl">
                    {translateItemName(item.name, language)}
                  </span>
                  <IngredientList ingredients={item.ingredients} />
                </span>
                <span className="shrink-0 text-right text-base font-black text-primary sm:text-lg">
                  {item.quantity.toLocaleString()} {t.pieces}
                </span>
              </button>
            )
          })}
        </div>

        <Button
          onClick={() => setView('done')}
          className="mt-5 h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
        >
          {t.finishBakingList}
        </Button>
      </main>
    )
  }

  return (
    <main className="py-7 md:py-6">
      <div className="mb-7 pt-5 md:mb-6 md:pt-4">
        <p className="mb-2 text-sm font-bold text-primary">{t.today}</p>
        <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">
          {bakeryName ? t.bakeryReady.replace('{bakery}', bakeryName) : t.whatToBake}
        </h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          {t.startMainBake}
        </p>
      </div>

      <section className="mb-7 md:mb-6">
        {mainItem && (
          <div className="rounded-[1.75rem] bg-secondary/70 p-5 md:p-6">
            <div className="mb-5">
              <div className="min-w-0">
                <p className="mb-2 text-sm font-black text-primary">{t.priorityProducts}</p>
                <h3 className="truncate text-2xl font-black text-foreground sm:text-3xl md:text-4xl">{translateItemName(mainItem.name, language)}</h3>
              </div>
            </div>
            <div className="flex items-end gap-2 leading-none">
              <span className="text-5xl font-black text-primary md:text-6xl">{mainItem.quantity.toLocaleString()}</span>
              <span className="pb-1 text-xl font-black text-foreground sm:text-2xl md:pb-1.5 md:text-3xl">{t.pieces}</span>
            </div>
            <IngredientList ingredients={mainItem.ingredients} />
          </div>
        )}

        <div className="mt-4 rounded-[1.4rem] bg-white p-4 shadow-[0_12px_28px_rgba(41,91,67,0.08)]">
          <p className="text-sm font-black text-primary">{t.demandPrediction}</p>
          <p className="mt-1 text-base font-bold text-muted-foreground">{t.busy}. {t.startMainBake}</p>
        </div>

        <div className="mt-5 divide-y divide-secondary">
          {secondaryItems.slice(0, 5).map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-4 py-4 first:pt-1 last:pb-1">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-foreground">{translateItemName(item.name, language)}</p>
                <IngredientList ingredients={item.ingredients} />
              </div>
              <p className="shrink-0 text-right text-lg font-black text-primary">
                {item.quantity.toLocaleString()} {t.pieces}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Button
        onClick={() => setView('list')}
        className="h-16 w-full rounded-[1.4rem] bg-primary text-lg font-bold text-primary-foreground shadow-[0_16px_30px_rgba(68,179,126,0.24)] hover:bg-primary/90"
      >
        {t.startProduction}
      </Button>
      <Button
        onClick={() => setView('list')}
        variant="secondary"
        className="mt-3 h-14 w-full rounded-[1.25rem] bg-secondary text-base font-black text-foreground hover:bg-secondary/80"
      >
        {t.openKitchenChecklist}
      </Button>
    </main>
  )
}

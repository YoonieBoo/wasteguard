'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHome } from '@/components/dashboard-home'
import { MenuManagement } from '@/components/menu-management'
import { QuickInput } from '@/components/quick-input'
import { CarbonImpact } from '@/components/carbon-impact'
import { Navigation } from '@/components/navigation'
import { RecommendationsPreviewModal } from '@/components/recommendations-preview-modal'
import { RecommendationCenter } from '@/components/recommendation-center'
import { SavingsReport } from '@/components/savings-report'
import { EsgDashboard } from '@/components/esg-dashboard'
import { getText, type Language } from '@/lib/i18n'
import type { FoodRow, WasteGuardRole } from '@/lib/mock-data'
import { defaultRecommendations, type Recommendation, type RecommendationStatus } from '@/lib/recommendations'
import { transformFlaskToRecommendations, type FlaskAnalyticsResponse, type FlaskFoodPrepItem, type FlaskRecommendationsResponse } from '@/lib/ai-api'
import { deriveDailyRowsFromSalesHistory, fetchBusinessMenuData, type BusinessMenuItem, type BusinessSalesHistoryRow } from '@/lib/menu-data'
import { supabase } from '@/lib/supabase'
import { ensureOwnerOrStaffProfile } from '@/lib/profile'

// These keys cache per-business data in the browser for fast reloads. They must be
// scoped by bakeryId (via scopedKey below) — an unscoped key is a single shared slot
// for the whole device, so a second account signing in on the same browser/tablet
// (e.g. a shared staff counter) would see the first account's leftover cached data
// until every one of these happened to get overwritten. `languageKey` is the one
// exception — it's a device preference, not business data, so it stays global.
const dailyInputsKey = 'wasteGuardDailyInputs'
const languageKey = 'wasteGuardLanguage'
const recommendationsKey = 'wasteGuardRecommendations'
const recommendationsVersionKey = 'wasteGuardRecommendationsVersion'
const recommendationsVersion = 'v2'
const briefingDateKey = 'wasteGuardBriefingDate'
const approvedItemsKey = 'wasteGuardApprovedItems'
const isProPlanKey = 'wasteGuardIsPro'

function scopedKey(base: string, bakeryId: string) {
  return `${base}:${bakeryId}`
}

type AppScreen = 'home' | 'input' | 'impact' | 'recommendations' | 'report' | 'menu'

type AuthProfile = {
  fullName: string
  bakeryName: string
  email: string
  role: WasteGuardRole
  inviteCode: string
  bakeryId?: string
}

type DailyReportRow = {
  report_date: string
  orders: number | null
  food_prepared: number | null
  food_sold: number | null
  leftover: number | null
  waste_percentage: number | string | null
  money_saved: number | string | null
  co2_saved: number | string | null
  revenue: number | string | null
  weather: string | null
  is_weekend: number | null
  promotion: number | null
}

// Manual daily check-ins (real daily_reports rows) are more precise for any date
// they cover — they win. CSV-derived rows fill in every other date, so the
// dashboard reflects imported data immediately without requiring a check-in first.
function mergeDailyRows(derived: FoodRow[], manual: FoodRow[]): FoodRow[] {
  const byDate = new Map(derived.map((row) => [row.date, row]))
  for (const row of manual) {
    byDate.set(row.date, row)
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date))
}

function reportToFoodRow(report: DailyReportRow): FoodRow {
  return {
    date: report.report_date,
    orders: Number(report.orders ?? 0),
    food_prepared: Number(report.food_prepared ?? 0),
    food_sold: Number(report.food_sold ?? 0),
    leftover: Number(report.leftover ?? 0),
    waste_percent: Number(report.waste_percentage ?? 0),
    money_saved: Number(report.money_saved ?? 0),
    co2_saved: Number(report.co2_saved ?? 0),
    revenue: Number(report.revenue ?? 0),
    weather: report.weather || 'sunny',
    is_weekend: Number(report.is_weekend ?? 0),
    promotion: Number(report.promotion ?? 0),
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home')
  // dailyInputs (below) merges these two: manual check-ins win per-date, CSV-derived
  // rows fill in the rest — see mergeDailyRows.
  const [realDailyReports, setRealDailyReports] = useState<FoodRow[]>([])
  const [derivedDailyRows, setDerivedDailyRows] = useState<FoodRow[]>([])
  const dailyInputs = useMemo(
    () => mergeDailyRows(derivedDailyRows, realDailyReports),
    [derivedDailyRows, realDailyReports],
  )
  const [language, setLanguage] = useState<Language>('en')
  const [role, setRole] = useState<WasteGuardRole>('staff')
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null)
  const [completedBakeryItems, setCompletedBakeryItems] = useState<Record<string, boolean>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [rawFoodPrepItems, setRawFoodPrepItems] = useState<FlaskFoodPrepItem[]>([])
  const [aiRecsLoaded, setAiRecsLoaded] = useState(false)
  const [businessMenuItems, setBusinessMenuItems] = useState<BusinessMenuItem[]>([])
  const [businessSalesHistory, setBusinessSalesHistory] = useState<BusinessSalesHistoryRow[]>([])
  const [menuDataLoaded, setMenuDataLoaded] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<FlaskAnalyticsResponse | null>(null)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const [storedApprovedItems, setStoredApprovedItems] = useState<Record<string, number>>({})
  const [showMorningBriefing, setShowMorningBriefing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isProPlan, setIsProPlan] = useState(false)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)

    let cancelled = false

    // Supabase is the only source of truth for who's signed in — middleware
    // already gate-kept this route, but the page still needs the profile.
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      try {
        const profile = await ensureOwnerOrStaffProfile(data.user)
        if (cancelled) return

        setAuthProfile({
          fullName: profile.fullName,
          bakeryName: profile.bakeryName,
          email: data.user!.email || '',
          role: profile.role,
          inviteCode: profile.inviteCode,
          bakeryId: profile.bakeryId,
        })
        setRole(profile.role)
        if (profile.role === 'owner') {
          setShowMorningBriefing(true)
        }
      } catch (error) {
        console.error('Unable to load profile', error)
      } finally {
        if (!cancelled) setIsInitialized(true)
      }
    }).catch((error) => {
      console.error('Unable to load auth user', error)
      if (!cancelled) setIsInitialized(true)
    })

    return () => {
      cancelled = true
    }
  }, [router])

  // Load this business's cached data (instant paint) as soon as we know which
  // bakery is signed in — never before, so a different account's leftover cache
  // on a shared device can't bleed into this session.
  useEffect(() => {
    const bakeryId = authProfile?.bakeryId
    if (!bakeryId) return

    const savedInputs = window.localStorage.getItem(scopedKey(dailyInputsKey, bakeryId))
    if (savedInputs) {
      try { setRealDailyReports(JSON.parse(savedInputs) as FoodRow[]) } catch { /* ignore */ }
    }

    const savedApproved = window.localStorage.getItem(scopedKey(approvedItemsKey, bakeryId))
    if (savedApproved) {
      try { setStoredApprovedItems(JSON.parse(savedApproved) as Record<string, number>) } catch { /* ignore */ }
    }

    setIsProPlan(window.localStorage.getItem(scopedKey(isProPlanKey, bakeryId)) === 'true')

    const savedVersion = window.localStorage.getItem(scopedKey(recommendationsVersionKey, bakeryId))
    const savedRecs = window.localStorage.getItem(scopedKey(recommendationsKey, bakeryId))
    if (savedVersion === recommendationsVersion && savedRecs) {
      try {
        setRecommendations(JSON.parse(savedRecs) as Recommendation[])
        return
      } catch {
        // fall through to reset
      }
    }
    setRecommendations(defaultRecommendations)
    window.localStorage.setItem(scopedKey(recommendationsKey, bakeryId), JSON.stringify(defaultRecommendations))
    window.localStorage.setItem(scopedKey(recommendationsVersionKey, bakeryId), recommendationsVersion)
  }, [authProfile?.bakeryId])

  // Authoritative "approved by manager" state — read from Supabase (not just
  // localStorage) so it reaches staff regardless of which device they're on.
  // The localStorage load above already painted something instantly on the
  // owner's own browser; this overwrites it with the real cross-device state.
  useEffect(() => {
    const bakeryId = authProfile?.bakeryId
    if (!bakeryId) return

    supabase
      .from('approved_recommendations')
      .select('item_key, prep_quantity')
      .eq('business_id', bakeryId)
      .then(({ data, error }) => {
        if (error) {
          console.error('Unable to load approved recommendations', error)
          return
        }
        const approved: Record<string, number> = {}
        for (const row of data ?? []) {
          approved[row.item_key] = Number(row.prep_quantity)
        }
        setStoredApprovedItems(approved)
        window.localStorage.setItem(scopedKey(approvedItemsKey, bakeryId), JSON.stringify(approved))
      })
  }, [authProfile?.bakeryId])

  useEffect(() => {
    if (!authProfile?.bakeryId) {
      return
    }

    supabase
      .from('daily_reports')
      .select('report_date, orders, food_prepared, food_sold, leftover, waste_percentage, money_saved, co2_saved, revenue, weather, is_weekend, promotion')
      .eq('bakery_id', authProfile.bakeryId)
      .order('report_date', { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (error) {
          console.error('Unable to load daily reports', error)
          return
        }

        const reports = (data ?? []).map((report) => reportToFoodRow(report as DailyReportRow))
        setRealDailyReports(reports)
        window.localStorage.setItem(scopedKey(dailyInputsKey, authProfile.bakeryId!), JSON.stringify(reports))
      })
  }, [authProfile?.bakeryId])

  // Real per-business menu (from CSV import / Menu tab) — used to show the
  // owner's actual dishes instead of the 4 demo dishes wherever they've been added.
  useEffect(() => {
    if (!authProfile?.bakeryId) {
      return
    }

    fetchBusinessMenuData(authProfile.bakeryId)
      .then(({ menuItems, salesHistory }) => {
        setBusinessMenuItems(menuItems)
        setBusinessSalesHistory(salesHistory)
        setDerivedDailyRows(deriveDailyRowsFromSalesHistory(salesHistory))
      })
      .catch((error) => console.error('Unable to load menu items', error))
      .finally(() => setMenuDataLoaded(true))
  }, [authProfile?.bakeryId])

  useEffect(() => {
    if (role === 'owner' && currentScreen === 'input') {
      setCurrentScreen('home')
    }
  }, [currentScreen, role])

  // Fetch AI recommendations from the Python engine — both owner and staff run this
  // independently against the same real bakery data (menu_items/daily_operations/daily_reports
  // are all team-readable), so staff's Kitchen Prep quantities aren't stuck at 0 waiting on
  // an owner's browser-local "accepted" state that never leaves their device.
  // POSTs real dailyInputs so the full pipeline runs on actual bakery data.
  // Falls back to mock recommendations silently if the engine is offline.
  useEffect(() => {
    if (!isInitialized || aiRecsLoaded || !authProfile?.bakeryId || !menuDataLoaded) return
    const bakeryId = authProfile.bakeryId

    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_inputs: dailyInputs,
        menu_items: businessMenuItems,
        sales_history: businessSalesHistory,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FlaskRecommendationsResponse | null) => {
        if (!data || 'error' in data) return
        setRawFoodPrepItems(data.food_preparation_recommendations ?? [])
        if (role !== 'owner') return
        const pricingByName = Object.fromEntries(
          businessMenuItems
            .filter((item) => item.unitCost != null && item.sellingPrice != null)
            .map((item) => [item.name, { foodCost: item.unitCost!, sellingPrice: item.sellingPrice! }]),
        )
        const menuItemIdByName = Object.fromEntries(businessMenuItems.map((item) => [item.name, item.id]))
        const aiRecs = transformFlaskToRecommendations(data, pricingByName, menuItemIdByName)
        if (aiRecs.length > 0) {
          const nonFoodDefaults = defaultRecommendations.filter((r) => !r.affectedItemFileName)
          const merged = [...aiRecs, ...nonFoodDefaults]
          setRecommendations(merged)
          window.localStorage.setItem(scopedKey(recommendationsKey, bakeryId), JSON.stringify(merged))
          window.localStorage.setItem(scopedKey(recommendationsVersionKey, bakeryId), recommendationsVersion)
        }
      })
      .catch(() => undefined)
      .finally(() => setAiRecsLoaded(true))
  }, [isInitialized, role, aiRecsLoaded, dailyInputs, authProfile?.bakeryId, menuDataLoaded, businessMenuItems, businessSalesHistory])

  // Fetch the real analytics report (utility totals, costs, carbon, ESG score) from the
  // Python engine (owner only). Falls back silently to the local mock-based ESG dashboard
  // if the engine is offline.
  useEffect(() => {
    if (!isInitialized || role !== 'owner' || analyticsLoaded) return

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_inputs: dailyInputs }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FlaskAnalyticsResponse | { error: string } | null) => {
        if (!data || 'error' in data) return
        setAnalyticsData(data)
      })
      .catch(() => undefined)
      .finally(() => setAnalyticsLoaded(true))
  }, [isInitialized, role, analyticsLoaded, dailyInputs])

  function handleDailyInputSave(newInput: FoodRow) {
    const nextReports = [...realDailyReports.filter((input) => input.date !== newInput.date), newInput]
    setRealDailyReports(nextReports)
    if (authProfile?.bakeryId) {
      window.localStorage.setItem(scopedKey(dailyInputsKey, authProfile.bakeryId), JSON.stringify(nextReports))
    }

    if (!authProfile?.bakeryId) {
      return
    }

    const moneySaved = Math.round(newInput.money_saved ?? Math.max(0, newInput.food_sold - newInput.leftover) * 12)
    const co2Saved = Number(
      (newInput.co2_saved ?? newInput.food_sold * (1 - newInput.waste_percent / 100) * 0.1).toFixed(2),
    )
    const revenue = Math.round(newInput.revenue ?? newInput.food_sold * 75)

    supabase
      .from('daily_reports')
      .upsert(
        {
          bakery_id: authProfile.bakeryId,
          report_date: newInput.date,
          orders: newInput.orders,
          food_prepared: newInput.food_prepared,
          food_sold: newInput.food_sold,
          leftover: newInput.leftover,
          waste_percentage: newInput.waste_percent,
          money_saved: moneySaved,
          co2_saved: co2Saved,
          revenue,
          weather: newInput.weather,
          is_weekend: newInput.is_weekend,
          promotion: newInput.promotion,
          production_completed: true,
        },
        { onConflict: 'bakery_id,report_date' },
      )
      .then(({ error }) => {
        if (error) {
          console.error('Unable to save daily report', error)
        }
      })
  }

  function toggleLanguage() {
    const nextLanguage = language === 'en' ? 'th' : 'en'
    setLanguage(nextLanguage)
    window.localStorage.setItem(languageKey, nextLanguage)
  }

  function handleDismissBriefing() {
    const today = new Date().toISOString().slice(0, 10)
    if (authProfile?.bakeryId) {
      window.localStorage.setItem(scopedKey(briefingDateKey, authProfile.bakeryId), today)
    }
    setShowMorningBriefing(false)
  }

  function handleDismissBriefingAndGoToRecs() {
    handleDismissBriefing()
    setCurrentScreen('recommendations')
  }

  function handleToggleProPlan() {
    setIsProPlan((current) => {
      const next = !current
      if (authProfile?.bakeryId) {
        window.localStorage.setItem(scopedKey(isProPlanKey, authProfile.bakeryId), String(next))
      }
      return next
    })
  }

  function handleUpdateRecommendation(id: string, status: RecommendationStatus, modifiedQuantity?: number) {
    setRecommendations((current) => {
      const next = current.map((rec) =>
        rec.id === id ? { ...rec, status, ...(modifiedQuantity != null ? { modifiedQuantity } : {}) } : rec,
      )
      if (authProfile?.bakeryId) {
        window.localStorage.setItem(scopedKey(recommendationsKey, authProfile.bakeryId), JSON.stringify(next))
      }

      // Persist approved food-prep items separately so staff can see the badge on any device
      const approved: Record<string, number> = {}
      next.forEach((rec) => {
        if ((rec.status === 'accepted' || rec.status === 'modified') && rec.affectedItemFileName) {
          approved[rec.affectedItemFileName] = rec.status === 'modified' && rec.modifiedQuantity != null
            ? rec.modifiedQuantity
            : (rec.suggestedQuantity ?? 0)
        }
      })
      setStoredApprovedItems(approved)
      if (authProfile?.bakeryId) {
        window.localStorage.setItem(scopedKey(approvedItemsKey, authProfile.bakeryId), JSON.stringify(approved))
      }

      // Sync to Supabase so the approval reaches staff on any device, not just this browser.
      const changedRec = next.find((rec) => rec.id === id)
      if (authProfile?.bakeryId && changedRec?.affectedItemFileName) {
        const itemKey = changedRec.affectedItemFileName
        if (status === 'accepted' || status === 'modified') {
          supabase
            .from('approved_recommendations')
            .upsert(
              {
                business_id: authProfile.bakeryId,
                item_key: itemKey,
                prep_quantity: approved[itemKey] ?? 0,
                status,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'business_id,item_key' },
            )
            .then(({ error }) => {
              if (error) console.error('Unable to save approved recommendation', error)
            })
        } else {
          supabase
            .from('approved_recommendations')
            .delete()
            .eq('business_id', authProfile.bakeryId)
            .eq('item_key', itemKey)
            .then(({ error }) => {
              if (error) console.error('Unable to clear approved recommendation', error)
            })
        }
      }

      return next
    })

    // Notify Python engine when a food-prep rec is accepted/modified
    if (id.startsWith('ai-prep-') && (status === 'accepted' || status === 'modified')) {
      const idx = parseInt(id.replace('ai-prep-', ''), 10)
      const item = rawFoodPrepItems[idx]
      if (item) {
        fetch('/api/confirm-preparation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ ...item, final_prep_recommendation: modifiedQuantity ?? item.final_prep_recommendation }],
          }),
        }).catch(() => undefined)
      }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => undefined)

    // Belt-and-suspenders: these are already scoped per-bakeryId so a different
    // account signing in afterward can't see them regardless, but clear this
    // account's own cache too so a return visit doesn't show stale data.
    if (authProfile?.bakeryId) {
      window.localStorage.removeItem(scopedKey(dailyInputsKey, authProfile.bakeryId))
      window.localStorage.removeItem(scopedKey(recommendationsKey, authProfile.bakeryId))
      window.localStorage.removeItem(scopedKey(recommendationsVersionKey, authProfile.bakeryId))
      window.localStorage.removeItem(scopedKey(approvedItemsKey, authProfile.bakeryId))
      window.localStorage.removeItem(scopedKey(isProPlanKey, authProfile.bakeryId))
      window.localStorage.removeItem(scopedKey(briefingDateKey, authProfile.bakeryId))
    }

    router.push('/')
  }

  function handleScreenChange(screen: string) {
    setCurrentScreen(screen as AppScreen)
  }

  const isOwnerDashboard = currentScreen === 'home' && role === 'owner'

  const pendingRecommendations = recommendations.filter((r) => r.status === 'pending')
  const pendingCount = pendingRecommendations.length
  const approvedOverrides = {
    // storedApprovedItems is loaded from localStorage on init — works even on fresh staff sessions
    ...storedApprovedItems,
    // in-session state takes precedence (reflects latest accept/ignore actions this session)
    ...recommendations.reduce<Record<string, number>>((acc, rec) => {
      if ((rec.status === 'accepted' || rec.status === 'modified') && rec.affectedItemFileName) {
        acc[rec.affectedItemFileName] =
          rec.status === 'modified' && rec.modifiedQuantity != null
            ? rec.modifiedQuantity
            : (rec.suggestedQuantity ?? 0)
      }
      return acc
    }, {}),
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-white text-foreground lg:bg-[#f7fbf8]">
      <button
        onClick={toggleLanguage}
        className="fixed right-3 top-3 z-[60] rounded-full bg-secondary px-3 py-2 text-xs font-black leading-none text-primary shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition hover:bg-secondary/80 sm:right-4 sm:top-4 sm:px-4 md:right-6"
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <div
        className={`flex-1 flex w-full justify-center lg:justify-start lg:pl-64 ${
          currentScreen === 'impact' ? '' : 'pb-28 md:pb-30 lg:pb-8'
        }`}
      >
        <div
          key={currentScreen}
          className={`animate-in fade-in-0 duration-200 ${
            currentScreen === 'impact'
              ? 'w-full'
              : isOwnerDashboard || currentScreen === 'recommendations' || currentScreen === 'report' || currentScreen === 'menu'
                ? 'w-full max-w-[430px] px-4 pt-8 sm:px-5 md:max-w-[920px] md:px-5 md:pt-5 xl:max-w-[1180px] xl:px-10 xl:pt-7'
                : 'w-full max-w-[430px] px-4 pt-8 sm:px-5 md:max-w-[620px] md:px-6 lg:max-w-[1180px] lg:px-10 lg:pt-7'
          }`}
        >
          {currentScreen === 'home' && (
            <DashboardHome
              dailyInputs={dailyInputs}
              language={language}
              role={role}
              bakeryName={authProfile?.bakeryName}
              inviteCode={authProfile?.inviteCode}
              menuItems={businessMenuItems}
              foodPrepItems={rawFoodPrepItems}
              completedBakeryItems={completedBakeryItems}
              approvedOverrides={approvedOverrides}
              pendingRecommendationsCount={pendingCount}
              pendingRecommendations={pendingRecommendations}
              onCompleteBakeryItem={(fileName) =>
                setCompletedBakeryItems((current) => ({ ...current, [fileName]: true }))
              }
              onGoToRecommendations={() => setCurrentScreen('recommendations')}
              onUpdateRecommendation={handleUpdateRecommendation}
            />
          )}
          {currentScreen === 'recommendations' && (
            <RecommendationCenter
              recommendations={recommendations}
              language={language}
              onUpdate={handleUpdateRecommendation}
              rawFoodPrepItems={rawFoodPrepItems}
              menuItems={businessMenuItems}
            />
          )}
          {currentScreen === 'input' && (
            <QuickInput
              language={language}
              role={role}
              dailyInputs={dailyInputs}
              onSave={handleDailyInputSave}
              onViewResults={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'report' && (
            <SavingsReport
              recommendations={recommendations}
              dailyInputs={dailyInputs}
              language={language}
              bakeryName={authProfile?.bakeryName}
              menuItems={businessMenuItems}
              onGoToRecommendations={() => setCurrentScreen('recommendations')}
            />
          )}
          {currentScreen === 'menu' && role === 'owner' && authProfile?.bakeryId && (
            <MenuManagement
              businessId={authProfile.bakeryId}
              language={language}
              onMenuItemSaved={(item) =>
                setBusinessMenuItems((current) => {
                  const exists = current.some((existing) => existing.id === item.id)
                  return exists ? current.map((existing) => (existing.id === item.id ? item : existing)) : [...current, item]
                })
              }
            />
          )}
          {currentScreen === 'impact' && role === 'owner' && (
            <EsgDashboard
              dailyInputs={dailyInputs}
              language={language}
              recsTotal={recommendations.length}
              recsActed={recommendations.filter((r) => r.status === 'accepted' || r.status === 'modified').length}
              isProPlan={isProPlan}
              onUpgrade={handleToggleProPlan}
              analyticsData={analyticsData}
            />
          )}
          {currentScreen === 'impact' && role === 'staff' && (
            <CarbonImpact
              dailyInputs={dailyInputs}
              language={language}
              role={role}
              onAddToday={() => setCurrentScreen('input')}
            />
          )}
        </div>
      </div>

      {authProfile && (
        <Navigation
          currentScreen={currentScreen}
          language={language}
          role={role}
          pendingRecommendationsCount={role === 'owner' ? pendingCount : 0}
          isProPlan={isProPlan}
          onLogout={handleLogout}
          onScreenChange={handleScreenChange}
          onToggleProPlan={handleToggleProPlan}
        />
      )}

      {showMorningBriefing && role === 'owner' && pendingCount > 0 && aiRecsLoaded && (
        <RecommendationsPreviewModal
          language={language}
          recommendations={pendingRecommendations}
          onAccept={(id) => handleUpdateRecommendation(id, 'accepted')}
          onIgnore={(id) => handleUpdateRecommendation(id, 'ignored')}
          onModify={handleDismissBriefingAndGoToRecs}
          onViewAll={handleDismissBriefingAndGoToRecs}
          onClose={handleDismissBriefing}
        />
      )}
    </div>
  )
}

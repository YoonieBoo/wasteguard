'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHome } from '@/components/dashboard-home'
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
import { transformFlaskToRecommendations, type FlaskFoodPrepItem, type FlaskRecommendationsResponse } from '@/lib/ai-api'
import { supabase } from '@/lib/supabase'
import { ensureOwnerOrStaffProfile } from '@/lib/profile'

const dailyInputsKey = 'wasteGuardDailyInputs'
const languageKey = 'wasteGuardLanguage'
const recommendationsKey = 'wasteGuardRecommendations'
const recommendationsVersionKey = 'wasteGuardRecommendationsVersion'
const recommendationsVersion = 'v2'
const briefingDateKey = 'wasteGuardBriefingDate'
const approvedItemsKey = 'wasteGuardApprovedItems'
const isProPlanKey = 'wasteGuardIsPro'

type AppScreen = 'home' | 'input' | 'impact' | 'recommendations' | 'report'

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
  const [dailyInputs, setDailyInputs] = useState<FoodRow[]>([])
  const [language, setLanguage] = useState<Language>('en')
  const [role, setRole] = useState<WasteGuardRole>('staff')
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null)
  const [completedBakeryItems, setCompletedBakeryItems] = useState<Record<string, boolean>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [rawFoodPrepItems, setRawFoodPrepItems] = useState<FlaskFoodPrepItem[]>([])
  const [aiRecsLoaded, setAiRecsLoaded] = useState(false)
  const [storedApprovedItems, setStoredApprovedItems] = useState<Record<string, number>>({})
  const [showMorningBriefing, setShowMorningBriefing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isProPlan, setIsProPlan] = useState(false)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)

    const savedInputs = window.localStorage.getItem(dailyInputsKey)
    if (savedInputs) {
      try { setDailyInputs(JSON.parse(savedInputs) as FoodRow[]) } catch { /* ignore */ }
    }

    const savedApproved = window.localStorage.getItem(approvedItemsKey)
    if (savedApproved) {
      try { setStoredApprovedItems(JSON.parse(savedApproved) as Record<string, number>) } catch { /* ignore */ }
    }

    setIsProPlan(window.localStorage.getItem(isProPlanKey) === 'true')

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
        setDailyInputs(reports)
        window.localStorage.setItem(dailyInputsKey, JSON.stringify(reports))
      })
  }, [authProfile?.bakeryId])

  useEffect(() => {
    if (role === 'owner' && currentScreen === 'input') {
      setCurrentScreen('home')
    }
  }, [currentScreen, role])

  useEffect(() => {
    const savedVersion = window.localStorage.getItem(recommendationsVersionKey)
    const saved = window.localStorage.getItem(recommendationsKey)
    if (savedVersion === recommendationsVersion && saved) {
      try {
        setRecommendations(JSON.parse(saved) as Recommendation[])
        return
      } catch {
        // fall through to reset
      }
    }
    setRecommendations(defaultRecommendations)
    window.localStorage.setItem(recommendationsKey, JSON.stringify(defaultRecommendations))
    window.localStorage.setItem(recommendationsVersionKey, recommendationsVersion)
  }, [])

  // Fetch AI recommendations from the Python engine (owner only).
  // POSTs real dailyInputs so the full pipeline runs on actual bakery data.
  // Falls back to mock recommendations silently if the engine is offline.
  useEffect(() => {
    if (!isInitialized || role !== 'owner' || aiRecsLoaded) return

    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_inputs: dailyInputs }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FlaskRecommendationsResponse | null) => {
        if (!data || 'error' in data) return
        setRawFoodPrepItems(data.food_preparation_recommendations ?? [])
        const aiRecs = transformFlaskToRecommendations(data)
        if (aiRecs.length > 0) {
          const nonFoodDefaults = defaultRecommendations.filter((r) => !r.affectedItemFileName)
          const merged = [...aiRecs, ...nonFoodDefaults]
          setRecommendations(merged)
          window.localStorage.setItem(recommendationsKey, JSON.stringify(merged))
          window.localStorage.setItem(recommendationsVersionKey, recommendationsVersion)
        }
      })
      .catch(() => undefined)
      .finally(() => setAiRecsLoaded(true))
  }, [isInitialized, role, aiRecsLoaded, dailyInputs])

  function handleDailyInputSave(newInput: FoodRow) {
    const nextInputs = [...dailyInputs.filter((input) => input.date !== newInput.date), newInput]
    setDailyInputs(nextInputs)
    window.localStorage.setItem(dailyInputsKey, JSON.stringify(nextInputs))

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
    window.localStorage.setItem(briefingDateKey, today)
    setShowMorningBriefing(false)
  }

  function handleDismissBriefingAndGoToRecs() {
    handleDismissBriefing()
    setCurrentScreen('recommendations')
  }

  function handleToggleProPlan() {
    setIsProPlan((current) => {
      const next = !current
      window.localStorage.setItem(isProPlanKey, String(next))
      return next
    })
  }

  function handleUpdateRecommendation(id: string, status: RecommendationStatus, modifiedQuantity?: number) {
    setRecommendations((current) => {
      const next = current.map((rec) =>
        rec.id === id ? { ...rec, status, ...(modifiedQuantity != null ? { modifiedQuantity } : {}) } : rec,
      )
      window.localStorage.setItem(recommendationsKey, JSON.stringify(next))

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
      window.localStorage.setItem(approvedItemsKey, JSON.stringify(approved))

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

    window.localStorage.removeItem(dailyInputsKey)
    window.localStorage.removeItem(recommendationsKey)
    window.localStorage.removeItem(recommendationsVersionKey)
    window.localStorage.removeItem(approvedItemsKey)
    window.localStorage.removeItem(isProPlanKey)

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
              : isOwnerDashboard || currentScreen === 'recommendations' || currentScreen === 'report'
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
              onGoToRecommendations={() => setCurrentScreen('recommendations')}
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

      {showMorningBriefing && role === 'owner' && pendingCount > 0 && (
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

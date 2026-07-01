'use client'

import { useEffect, useState } from 'react'
import { DashboardHome } from '@/components/dashboard-home'
import { QuickInput } from '@/components/quick-input'
import { CarbonImpact } from '@/components/carbon-impact'
import { Navigation } from '@/components/navigation'
import { CreateAccountScreen, SignInScreen, WelcomeScreen } from '@/components/welcome-screen'
import { MorningBriefing } from '@/components/morning-briefing'
import { RecommendationCenter } from '@/components/recommendation-center'
import { SavingsReport } from '@/components/savings-report'
import { EsgDashboard } from '@/components/esg-dashboard'
import { getText, type Language } from '@/lib/i18n'
import { getBusinessInsightData, type FoodRow, type WasteGuardRole } from '@/lib/mock-data'
import { defaultRecommendations, type Recommendation, type RecommendationStatus } from '@/lib/recommendations'
import { transformFlaskToRecommendations, type FlaskFoodPrepItem, type FlaskRecommendationsResponse } from '@/lib/ai-api'
import { supabase } from '@/lib/supabase'

const dailyInputsKey = 'wasteGuardDailyInputs'
const languageKey = 'wasteGuardLanguage'
const roleKey = 'wasteGuardRole'
const authStateKey = 'wasteGuardAuthState'
const authProfileKey = 'wasteGuardAuthProfile'
const bakeryNameKey = 'wasteGuardBakeryName'
const inviteCodeKey = 'wasteGuardInviteCode'
const recommendationsKey = 'wasteGuardRecommendations'
const recommendationsVersionKey = 'wasteGuardRecommendationsVersion'
const recommendationsVersion = 'v2'
const briefingDateKey = 'wasteGuardBriefingDate'
const approvedItemsKey = 'wasteGuardApprovedItems'

type AuthScreen = 'welcome' | 'sign-in' | 'create-account'
type AppScreen = 'home' | 'input' | 'impact' | 'recommendations' | 'report'

type AuthProfile = {
  fullName: string
  bakeryName: string
  email: string
  role: WasteGuardRole
  inviteCode: string
  bakeryId?: string
}

type AccountForm = AuthProfile & {
  password: string
}

const demoAccountsKey = 'wasteGuardDemoAccounts'
type DemoAccount = AuthProfile & { password: string }

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

function getStoredDemoAccounts(): DemoAccount[] {
  try {
    const savedAccounts = window.localStorage.getItem(demoAccountsKey)
    const accounts = savedAccounts ? (JSON.parse(savedAccounts) as DemoAccount[]) : []

    return Array.isArray(accounts) ? accounts : []
  } catch {
    window.localStorage.removeItem(demoAccountsKey)
    return []
  }
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen | AppScreen>('welcome')
  const [dailyInputs, setDailyInputs] = useState<FoodRow[]>([])
  const [language, setLanguage] = useState<Language>('en')
  const [role, setRole] = useState<WasteGuardRole>('staff')
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null)
  const [signInEmail, setSignInEmail] = useState('')
  const [signInNotice, setSignInNotice] = useState('')
  const [completedBakeryItems, setCompletedBakeryItems] = useState<Record<string, boolean>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [rawFoodPrepItems, setRawFoodPrepItems] = useState<FlaskFoodPrepItem[]>([])
  const [aiRecsLoaded, setAiRecsLoaded] = useState(false)
  const [storedApprovedItems, setStoredApprovedItems] = useState<Record<string, number>>({})
  const [showMorningBriefing, setShowMorningBriefing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const showNavigation =
    currentScreen === 'home' ||
    currentScreen === 'input' ||
    currentScreen === 'impact' ||
    currentScreen === 'recommendations' ||
    currentScreen === 'report'

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

    // Restore from localStorage immediately — no network wait
    const savedState = window.localStorage.getItem(authStateKey)
    const savedProfile = window.localStorage.getItem(authProfileKey)
    if (savedState === 'signed-in' && savedProfile) {
      try {
        const profile = JSON.parse(savedProfile) as AuthProfile
        setAuthProfile(profile)
        setRole(profile.role)
        setCurrentScreen('home')
        if (profile.role === 'owner') {
          setShowMorningBriefing(true)
        }
      } catch {
        window.localStorage.removeItem(authStateKey)
        window.localStorage.removeItem(authProfileKey)
      }
    }

    // Mark ready now — Supabase session check runs silently in background
    setIsInitialized(true)

    // Background: validate / refresh Supabase session (real accounts only)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const user = data.session?.user
        const metadata = user?.user_metadata
        const metadataRole = metadata?.role
        if (user && metadata && (metadataRole === 'staff' || metadataRole === 'owner')) {
          saveAuthProfile({
            fullName: String(metadata.full_name || user.email?.split('@')[0] || 'Restaurant Team'),
            bakeryName: String(metadata.bakery_name || window.localStorage.getItem(bakeryNameKey) || 'My Restaurant'),
            email: user.email || '',
            role: metadataRole,
            inviteCode: String(metadata.invite_code || window.localStorage.getItem(inviteCodeKey) || ''),
            bakeryId: typeof metadata.bakery_id === 'string' ? metadata.bakery_id : undefined,
          })
        }
      })
      .catch(() => undefined)
  }, [])

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
    if (role === 'owner' && (currentScreen === 'input')) {
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
  }, [isInitialized, role, aiRecsLoaded])

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

  function generateInviteCode(bakeryName: string) {
    const prefix = bakeryName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'BAK'
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `${prefix}-${suffix}`
  }

  function saveAuthProfile(profile: AuthProfile) {
    setAuthProfile(profile)
    setRole(profile.role)
    setCurrentScreen('home')
    window.localStorage.setItem(authStateKey, 'signed-in')
    window.localStorage.setItem(authProfileKey, JSON.stringify(profile))
    window.localStorage.setItem(roleKey, profile.role)
    window.localStorage.setItem(bakeryNameKey, profile.bakeryName)
    window.localStorage.setItem(inviteCodeKey, profile.inviteCode)

    if (profile.role === 'owner') {
      setShowMorningBriefing(true)
    }
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

  function saveDemoAccount(profile: AuthProfile, password: string) {
    const accounts = getStoredDemoAccounts()
    const nextAccounts = [
      ...accounts.filter((account) => account.email.toLowerCase() !== profile.email.toLowerCase()),
      { ...profile, password },
    ]

    window.localStorage.setItem(demoAccountsKey, JSON.stringify(nextAccounts))
  }

  function getDemoAccount(email: string, password: string) {
    const accounts = getStoredDemoAccounts()
    const normalizedEmail = email.trim().toLowerCase()

    return accounts.find(
      (account) => account.email.toLowerCase() === normalizedEmail && account.password === password,
    )
  }

  function hasDemoAccount(email: string) {
    const accounts = getStoredDemoAccounts()
    const normalizedEmail = email.trim().toLowerCase()

    return accounts.some((account) => account.email.toLowerCase() === normalizedEmail)
  }

  async function handleCreateAccount(account: AccountForm) {
    const email = account.email.trim()
    const inviteCode = account.role === 'owner' ? generateInviteCode(account.bakeryName) : account.inviteCode
    let bakeryId: string | undefined
    if (hasDemoAccount(email)) {
      throw new Error('User already registered')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: account.password,
      options: {
        data: {
          full_name: account.fullName,
          bakery_name: account.bakeryName,
          role: account.role,
          invite_code: inviteCode,
        },
      },
    })

    if (error) {
      throw error
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('User already registered')
    }

    if (data.user?.id) {
      if (account.role === 'owner') {
        const { data: bakery } = await supabase
          .from('bakeries')
          .insert({
            bakery_name: account.bakeryName,
            owner_id: data.user.id,
            invite_code: inviteCode,
          })
          .select('id')
          .single()

        bakeryId = bakery?.id
      } else {
        const { data: bakery } = await supabase
          .from('bakeries')
          .select('id, bakery_name')
          .eq('invite_code', inviteCode)
          .single()

        bakeryId = bakery?.id
        account.bakeryName = bakery?.bakery_name || account.bakeryName
      }

      await supabase.from('users').upsert({
        id: data.user.id,
        full_name: account.fullName,
        email,
        role: account.role,
        bakery_id: bakeryId,
      })

      await supabase.auth.updateUser({
        data: {
          full_name: account.fullName,
          bakery_name: account.bakeryName,
          role: account.role,
          invite_code: inviteCode,
          bakery_id: bakeryId,
        },
      })
    }

    const profile = {
      fullName: account.fullName,
      bakeryName: account.bakeryName,
      email,
      role: account.role,
      inviteCode,
      bakeryId,
    }

    saveDemoAccount(profile, account.password)
    await supabase.auth.signOut().catch(() => undefined)
    saveAuthProfile(profile)
  }

  async function handleSignIn(email: string, password: string) {
    const normalizedEmail = email.trim()
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

    if (error) {
      const demoAccount = getDemoAccount(normalizedEmail, password)

      if (demoAccount) {
        saveAuthProfile(demoAccount)
        return
      }

      throw error
    }

    const metadata = data.user?.user_metadata
    const metadataRole = metadata?.role

    if (metadataRole === 'staff' || metadataRole === 'owner') {
      saveAuthProfile({
        fullName: String(metadata.full_name || normalizedEmail.split('@')[0] || 'Restaurant Team'),
        bakeryName: String(metadata.bakery_name || window.localStorage.getItem(bakeryNameKey) || 'My Restaurant'),
        email: normalizedEmail,
        role: metadataRole,
        inviteCode: String(metadata.invite_code || window.localStorage.getItem(inviteCodeKey) || ''),
        bakeryId: typeof metadata.bakery_id === 'string' ? metadata.bakery_id : undefined,
      })
      return
    }

    throw new Error('Missing account role')
  }

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => undefined)

    setAuthProfile(null)
    setRole('staff')
    setSignInEmail('')
    setSignInNotice('')
    setCurrentScreen('welcome')
    window.localStorage.removeItem(authStateKey)
    window.localStorage.removeItem(authProfileKey)
    window.localStorage.removeItem(roleKey)
    window.localStorage.removeItem(bakeryNameKey)
    window.localStorage.removeItem(inviteCodeKey)
  }

  function handleScreenChange(screen: string) {
    setCurrentScreen(screen as AppScreen)
  }

  function showSignIn(email: string, notice: string) {
    setSignInEmail(email)
    setSignInNotice(notice)
    setCurrentScreen('sign-in')
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
  const totalRecommendedSavings = recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0)
  const insights = getBusinessInsightData(dailyInputs)

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
        className={`fixed right-3 top-3 z-[60] rounded-full px-3 py-2 text-xs font-black leading-none shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition sm:right-4 sm:top-4 sm:px-4 md:right-6 ${
          currentScreen === 'welcome' || currentScreen === 'sign-in' || currentScreen === 'create-account'
            ? 'bg-white/90 text-emerald-800 hover:bg-white'
            : 'bg-secondary text-primary hover:bg-secondary/80'
        }`}
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <div
        className={`flex-1 flex w-full justify-center ${
          showNavigation ? 'lg:justify-start lg:pl-64' : ''
        } ${
          currentScreen === 'impact' ? '' : showNavigation ? 'pb-28 md:pb-30 lg:pb-8' : 'pb-6'
        }`}
      >
        <div
          key={currentScreen}
          className={`animate-in fade-in-0 duration-200 ${
            currentScreen === 'welcome' || currentScreen === 'sign-in' || currentScreen === 'create-account'
              ? 'w-full'
              : currentScreen === 'impact'
                ? 'w-full'
              : isOwnerDashboard || currentScreen === 'recommendations' || currentScreen === 'report'
                ? 'w-full max-w-[430px] px-4 pt-8 sm:px-5 md:max-w-[920px] md:px-5 md:pt-5 xl:max-w-[1180px] xl:px-10 xl:pt-7'
              : 'w-full max-w-[430px] px-4 pt-8 sm:px-5 md:max-w-[620px] md:px-6 lg:max-w-[1180px] lg:px-10 lg:pt-7'
          }`}
        >
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              language={language}
              onStart={() => {
                setSignInNotice('')
                setCurrentScreen('create-account')
              }}
              onSignIn={() => {
                setSignInNotice('')
                setSignInEmail('')
                setCurrentScreen('sign-in')
              }}
            />
          )}
          {currentScreen === 'sign-in' && (
            <SignInScreen
              language={language}
              initialEmail={signInEmail}
              notice={signInNotice}
              onSignIn={handleSignIn}
              onCreateAccount={() => {
                setSignInNotice('')
                setCurrentScreen('create-account')
              }}
            />
          )}
          {currentScreen === 'create-account' && (
            <CreateAccountScreen
              language={language}
              onAccountExists={(email) => showSignIn(email, getText(language).accountExists)}
              onAccountCreated={() => {}}
              onCreateAccount={handleCreateAccount}
              onSignIn={() => {
                setSignInNotice('')
                setCurrentScreen('sign-in')
              }}
            />
          )}
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
              onCompleteBakeryItem={(fileName) =>
                setCompletedBakeryItems((current) => ({ ...current, [fileName]: true }))
              }
              onGoToRecommendations={() => setCurrentScreen('recommendations')}
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
              recommendations={recommendations}
              onGoToRecommendations={() => setCurrentScreen('recommendations')}
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

      {showNavigation && authProfile && (
        <Navigation
          currentScreen={currentScreen}
          language={language}
          role={role}
          pendingRecommendationsCount={role === 'owner' ? pendingCount : 0}
          onLogout={handleLogout}
          onScreenChange={handleScreenChange}
        />
      )}

      {showMorningBriefing && role === 'owner' && (
        <MorningBriefing
          language={language}
          bakeryName={authProfile?.bakeryName}
          pendingRecommendations={pendingRecommendations}
          estimatedSavingsTotal={totalRecommendedSavings}
          wasteDelta={insights.wasteDelta}
          onReviewRecs={handleDismissBriefingAndGoToRecs}
          onDismiss={handleDismissBriefing}
        />
      )}
    </div>
  )
}

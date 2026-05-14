'use client'

import { useEffect, useState } from 'react'
import { DashboardHome } from '@/components/dashboard-home'
import { QuickInput } from '@/components/quick-input'
import { WeeklyInsights } from '@/components/weekly-insights'
import { CarbonImpact } from '@/components/carbon-impact'
import { Navigation } from '@/components/navigation'
import { CreateAccountScreen, SignInScreen, WelcomeScreen } from '@/components/welcome-screen'
import type { Language } from '@/lib/i18n'
import type { FoodRow, WasteGuardRole } from '@/lib/mock-data'
import { supabase } from '@/lib/supabase'

const dailyInputsKey = 'wasteGuardDailyInputs'
const languageKey = 'wasteGuardLanguage'
const roleKey = 'wasteGuardRole'
const authStateKey = 'wasteGuardAuthState'
const authProfileKey = 'wasteGuardAuthProfile'
const bakeryNameKey = 'wasteGuardBakeryName'
const inviteCodeKey = 'wasteGuardInviteCode'

type AuthScreen = 'welcome' | 'sign-in' | 'create-account'
type AppScreen = 'home' | 'input' | 'insights' | 'carbon' | 'analytics'

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

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen | AppScreen>('welcome')
  const [dailyInputs, setDailyInputs] = useState<FoodRow[]>([])
  const [language, setLanguage] = useState<Language>('en')
  const [role, setRole] = useState<WasteGuardRole>('staff')
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null)
  const showNavigation = currentScreen === 'home' || currentScreen === 'input' || currentScreen === 'insights' || currentScreen === 'carbon'

  useEffect(() => {
    const savedInputs = window.localStorage.getItem(dailyInputsKey)
    const savedLanguage = window.localStorage.getItem(languageKey)
    const savedRole = window.localStorage.getItem(roleKey)
    const savedAuthState = window.localStorage.getItem(authStateKey)
    const savedProfile = window.localStorage.getItem(authProfileKey)

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      const metadata = user?.user_metadata
      const metadataRole = metadata?.role

      if (user && metadata && (metadataRole === 'staff' || metadataRole === 'owner')) {
        saveAuthProfile({
          fullName: String(metadata.full_name || user.email?.split('@')[0] || 'Bakery Team'),
          bakeryName: String(metadata.bakery_name || window.localStorage.getItem(bakeryNameKey) || 'My Bakery'),
          email: user.email || '',
          role: metadataRole,
          inviteCode: String(metadata.invite_code || window.localStorage.getItem(inviteCodeKey) || ''),
          bakeryId: typeof metadata.bakery_id === 'string' ? metadata.bakery_id : undefined,
        })
      }
    })

    if (savedLanguage === 'en' || savedLanguage === 'th') {
      setLanguage(savedLanguage)
    }

    if (savedAuthState === 'signed-in' && savedProfile) {
      try {
        const profile = JSON.parse(savedProfile) as AuthProfile

        if (profile.role === 'staff' || profile.role === 'owner') {
          setAuthProfile(profile)
          setRole(profile.role)
          setCurrentScreen('home')
        }
      } catch {
        window.localStorage.removeItem(authStateKey)
        window.localStorage.removeItem(authProfileKey)
      }
    } else if (savedRole === 'staff' || savedRole === 'owner') {
      setRole(savedRole)
    }

    if (!savedInputs) {
      return
    }

    try {
      setDailyInputs(JSON.parse(savedInputs) as FoodRow[])
    } catch {
      setDailyInputs([])
    }
  }, [])

  function handleDailyInputSave(newInput: FoodRow) {
    const nextInputs = [...dailyInputs.filter((input) => input.date !== newInput.date), newInput]
    setDailyInputs(nextInputs)
    window.localStorage.setItem(dailyInputsKey, JSON.stringify(nextInputs))
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
  }

  async function handleCreateAccount(account: AccountForm) {
    const inviteCode = account.role === 'owner' ? generateInviteCode(account.bakeryName) : account.inviteCode
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
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

    let bakeryId: string | undefined

    if (account.role === 'owner') {
      const { data: bakery } = await supabase
        .from('bakeries')
        .insert({
          bakery_name: account.bakeryName,
          owner_id: data.user?.id,
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

    if (data.user?.id) {
      await supabase.from('users').insert({
        id: data.user.id,
        full_name: account.fullName,
        email: account.email,
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

    saveAuthProfile({
      fullName: account.fullName,
      bakeryName: account.bakeryName,
      email: account.email,
      role: account.role,
      inviteCode,
      bakeryId,
    })
  }

  async function handleSignIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }

    const metadata = data.user?.user_metadata
    const metadataRole = metadata?.role

    if (metadataRole === 'staff' || metadataRole === 'owner') {
      saveAuthProfile({
        fullName: String(metadata.full_name || email.split('@')[0] || 'Bakery Team'),
        bakeryName: String(metadata.bakery_name || window.localStorage.getItem(bakeryNameKey) || 'My Bakery'),
        email,
        role: metadataRole,
        inviteCode: String(metadata.invite_code || window.localStorage.getItem(inviteCodeKey) || ''),
        bakeryId: typeof metadata.bakery_id === 'string' ? metadata.bakery_id : undefined,
      })
      return
    }

    saveAuthProfile({
      fullName: email.split('@')[0] || 'Bakery Team',
      bakeryName: window.localStorage.getItem(bakeryNameKey) || 'My Bakery',
      email,
      role,
      inviteCode: window.localStorage.getItem(inviteCodeKey) || generateInviteCode('My Bakery'),
    })
  }

  function handleScreenChange(screen: string) {
    if ((screen === 'insights' || screen === 'analytics') && role === 'staff') {
      setCurrentScreen('home')
      return
    }

    setCurrentScreen(screen as AppScreen)
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-white text-foreground">
      <button
        onClick={toggleLanguage}
        className={`fixed right-3 top-3 z-[60] rounded-full px-3 py-2 text-xs font-black shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition sm:right-4 sm:top-4 sm:px-4 sm:text-sm md:right-6 ${
          currentScreen === 'welcome' || currentScreen === 'sign-in' || currentScreen === 'create-account' || currentScreen === 'carbon'
            ? 'bg-white/90 text-emerald-800 hover:bg-white'
            : 'bg-secondary text-primary hover:bg-secondary/80'
        }`}
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <div
        className={`flex-1 flex justify-center w-full ${
          currentScreen === 'carbon' ? 'pb-0' : showNavigation ? 'pb-28 md:pb-30' : 'pb-6'
        }`}
      >
        <div
          className={
            currentScreen === 'welcome' || currentScreen === 'sign-in' || currentScreen === 'create-account'
              ? 'w-full'
              : currentScreen === 'carbon'
                ? 'w-full'
              : 'w-full max-w-[430px] px-4 pt-10 sm:px-5 md:max-w-[620px] md:px-6'
          }
        >
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              language={language}
              onStart={() => setCurrentScreen('create-account')}
              onSignIn={() => setCurrentScreen('sign-in')}
            />
          )}
          {currentScreen === 'sign-in' && (
            <SignInScreen
              language={language}
              onSignIn={handleSignIn}
              onCreateAccount={() => setCurrentScreen('create-account')}
            />
          )}
          {currentScreen === 'create-account' && (
            <CreateAccountScreen
              language={language}
              onCreateAccount={handleCreateAccount}
              onSignIn={() => setCurrentScreen('sign-in')}
            />
          )}
          {currentScreen === 'home' && (
            <DashboardHome
              dailyInputs={dailyInputs}
              language={language}
              role={role}
              bakeryName={authProfile?.bakeryName}
              inviteCode={authProfile?.inviteCode}
            />
          )}
          {currentScreen === 'input' && (
            <QuickInput
              language={language}
              role={role}
              dailyInputs={dailyInputs}
              onSave={handleDailyInputSave}
              onViewResults={() => setCurrentScreen(role === 'owner' ? 'insights' : 'carbon')}
            />
          )}
          {currentScreen === 'insights' && <WeeklyInsights dailyInputs={dailyInputs} language={language} role={role} />}
          {currentScreen === 'analytics' && <WeeklyInsights dailyInputs={dailyInputs} language={language} role={role} />}
          {currentScreen === 'carbon' && (
            <CarbonImpact dailyInputs={dailyInputs} language={language} role={role} onAddToday={() => setCurrentScreen('input')} />
          )}
        </div>
      </div>

      {showNavigation && authProfile && (
        <Navigation currentScreen={currentScreen} language={language} role={role} onScreenChange={handleScreenChange} />
      )}
    </div>
  )
}

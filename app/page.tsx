'use client'

import { useEffect, useState } from 'react'
import { DashboardHome } from '@/components/dashboard-home'
import { QuickInput } from '@/components/quick-input'
import { WeeklyInsights } from '@/components/weekly-insights'
import { CarbonImpact } from '@/components/carbon-impact'
import { Navigation } from '@/components/navigation'
import { WelcomeScreen } from '@/components/welcome-screen'
import type { Language } from '@/lib/i18n'
import type { FoodRow } from '@/lib/mock-data'

const dailyInputsKey = 'wasteGuardDailyInputs'
const languageKey = 'wasteGuardLanguage'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [dailyInputs, setDailyInputs] = useState<FoodRow[]>([])
  const [language, setLanguage] = useState<Language>('en')
  const showNavigation = currentScreen !== 'welcome'

  useEffect(() => {
    const savedInputs = window.localStorage.getItem(dailyInputsKey)
    const savedLanguage = window.localStorage.getItem(languageKey)

    if (savedLanguage === 'en' || savedLanguage === 'th') {
      setLanguage(savedLanguage)
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

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-white text-foreground">
      <button
        onClick={toggleLanguage}
        className={`fixed right-3 top-3 z-[60] rounded-full px-3 py-2 text-xs font-black shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition sm:right-4 sm:top-4 sm:px-4 sm:text-sm md:right-6 ${
          currentScreen === 'welcome' || currentScreen === 'carbon'
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
            currentScreen === 'welcome'
              ? 'w-full'
              : currentScreen === 'carbon'
                ? 'w-full'
              : 'w-full max-w-[430px] px-4 pt-10 sm:px-5 md:max-w-[620px] md:px-6'
          }
        >
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              language={language}
              onStart={() => setCurrentScreen('home')}
              onSignIn={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'home' && <DashboardHome dailyInputs={dailyInputs} language={language} />}
          {currentScreen === 'input' && (
            <QuickInput language={language} onSave={handleDailyInputSave} onViewResults={() => setCurrentScreen('insights')} />
          )}
          {currentScreen === 'insights' && <WeeklyInsights dailyInputs={dailyInputs} language={language} />}
          {currentScreen === 'carbon' && (
            <CarbonImpact dailyInputs={dailyInputs} language={language} onAddToday={() => setCurrentScreen('input')} />
          )}
        </div>
      </div>

      {showNavigation && <Navigation currentScreen={currentScreen} language={language} onScreenChange={setCurrentScreen} />}
    </div>
  )
}

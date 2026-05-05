'use client'

import { useEffect, useState } from 'react'
import { DashboardHome } from '@/components/dashboard-home'
import { QuickInput } from '@/components/quick-input'
import { WeeklyInsights } from '@/components/weekly-insights'
import { CarbonImpact } from '@/components/carbon-impact'
import { Navigation } from '@/components/navigation'
import { WelcomeScreen } from '@/components/welcome-screen'
import type { FoodRow } from '@/lib/mock-data'

const dailyInputsKey = 'wasteGuardDailyInputs'

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [dailyInputs, setDailyInputs] = useState<FoodRow[]>([])
  const showNavigation = currentScreen !== 'welcome'

  useEffect(() => {
    const savedInputs = window.localStorage.getItem(dailyInputsKey)

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

  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col">
      <div className={`flex-1 flex justify-center w-full ${showNavigation ? 'pb-28 md:pb-30' : 'pb-6'}`}>
        <div
          className={
            currentScreen === 'welcome'
              ? 'w-full'
              : 'w-full max-w-[430px] px-4 sm:px-5 md:max-w-[620px] md:px-6'
          }
        >
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              onStart={() => setCurrentScreen('home')}
              onSignIn={() => setCurrentScreen('home')}
            />
          )}
          {currentScreen === 'home' && <DashboardHome dailyInputs={dailyInputs} />}
          {currentScreen === 'input' && (
            <QuickInput onSave={handleDailyInputSave} onViewResults={() => setCurrentScreen('insights')} />
          )}
          {currentScreen === 'insights' && <WeeklyInsights dailyInputs={dailyInputs} />}
          {currentScreen === 'carbon' && <CarbonImpact dailyInputs={dailyInputs} />}
        </div>
      </div>

      {showNavigation && <Navigation currentScreen={currentScreen} onScreenChange={setCurrentScreen} />}
    </div>
  )
}

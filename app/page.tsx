'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeScreen } from '@/components/welcome-screen'
import { type Language } from '@/lib/i18n'

const languageKey = 'wasteGuardLanguage'

// Public landing page. Authenticated visitors never render this — middleware
// sends them straight to /onboarding or /dashboard before this component mounts.
export default function Home() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)
  }, [])

  function toggleLanguage() {
    const nextLanguage = language === 'en' ? 'th' : 'en'
    setLanguage(nextLanguage)
    window.localStorage.setItem(languageKey, nextLanguage)
  }

  return (
    <div className="min-h-dvh bg-white">
      <button
        onClick={toggleLanguage}
        className="fixed right-3 top-3 z-[60] rounded-full bg-white/90 px-3 py-2 text-xs font-black leading-none text-emerald-800 shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition hover:bg-white sm:right-4 sm:top-4 sm:px-4 md:right-6"
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <WelcomeScreen
        language={language}
        onStart={() => router.push('/signup')}
        onSignIn={() => router.push('/login')}
      />
    </div>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SignInScreen } from '@/components/welcome-screen'
import { supabase } from '@/lib/supabase'
import { ensureOwnerOrStaffProfile } from '@/lib/profile'
import { friendlyAuthError } from '@/lib/auth-errors'
import type { Language } from '@/lib/i18n'

const languageKey = 'wasteGuardLanguage'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [language, setLanguage] = useState<Language>('en')
  const [notice, setNotice] = useState('')
  const [initialEmail, setInitialEmail] = useState('')

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)

    const emailParam = searchParams.get('email')
    if (emailParam) setInitialEmail(emailParam)

    if (searchParams.get('exists') === '1') {
      setNotice('This email is already registered. Please log in.')
    } else if (searchParams.get('verified') === '1') {
      setNotice('Email verified. Please log in.')
    }
  }, [searchParams])

  function toggleLanguage() {
    const nextLanguage = language === 'en' ? 'th' : 'en'
    setLanguage(nextLanguage)
    window.localStorage.setItem(languageKey, nextLanguage)
  }

  async function handleSignIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      throw new Error(friendlyAuthError(error.message))
    }
    if (!data.user) {
      throw new Error('Unable to sign in. Please try again.')
    }

    await ensureOwnerOrStaffProfile(data.user)
    router.push('/dashboard')
  }

  return (
    <main className="relative min-h-dvh bg-white">
      <button
        onClick={toggleLanguage}
        className="fixed right-3 top-3 z-[60] rounded-full bg-white/90 px-3 py-2 text-xs font-black leading-none text-emerald-800 shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition hover:bg-white sm:right-4 sm:top-4 sm:px-4 md:right-6"
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <SignInScreen
        language={language}
        initialEmail={initialEmail}
        notice={notice}
        onSignIn={handleSignIn}
        onCreateAccount={() => router.push('/signup')}
      />
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

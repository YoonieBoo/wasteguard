'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreateAccountScreen } from '@/components/welcome-screen'
import { supabase } from '@/lib/supabase'
import { ensureOwnerOrStaffProfile } from '@/lib/profile'
import { friendlyAuthError } from '@/lib/auth-errors'
import type { Language } from '@/lib/i18n'
import type { WasteGuardRole } from '@/lib/mock-data'

const languageKey = 'wasteGuardLanguage'

type AccountForm = {
  fullName: string
  bakeryName: string
  email: string
  password: string
  role: WasteGuardRole
  inviteCode: string
}

export default function SignupPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)
  }, [])

  function toggleLanguage() {
    const nextLanguage = language === 'en' ? 'th' : 'en'
    setLanguage(nextLanguage)
    window.localStorage.setItem(languageKey, nextLanguage)
  }

  async function handleCreateAccount(account: AccountForm) {
    const email = account.email.trim()
    const metadata: Record<string, string> = {
      full_name: account.fullName,
      bakery_name: account.bakeryName,
      role: account.role,
    }
    if (account.role === 'staff') {
      metadata.invite_code = account.inviteCode.trim().toUpperCase()
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: account.password,
      options: {
        data: metadata,
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    })

    if (error) {
      throw new Error(friendlyAuthError(error.message))
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists.')
    }

    if (data.session && data.user) {
      // Email confirmation disabled for this project — the session is
      // already live, so provision the profile and go straight in.
      await ensureOwnerOrStaffProfile(data.user)
      router.push(account.role === 'owner' ? '/onboarding' : '/dashboard')
      return
    }

    setPendingVerificationEmail(email)
  }

  if (pendingVerificationEmail) {
    return (
      <main className="flex min-h-dvh w-full justify-center bg-white px-4 py-14 sm:px-5 md:px-6 md:py-16">
        <div className="w-full max-w-[430px] md:max-w-[620px]">
          <div className="wg-page-header">
            <p className="wg-eyebrow">Waste Guard</p>
            <h1 className="wg-page-title">Check your email</h1>
            <p className="wg-page-subtitle">
              We sent a confirmation link to <span className="font-black text-foreground">{pendingVerificationEmail}</span>.
              Verify your email, then log in to continue.
            </p>
          </div>
          <section className="rounded-[0.75rem] bg-secondary/70 p-4 md:p-5">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Go to login
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-dvh bg-white">
      <button
        onClick={toggleLanguage}
        className="fixed right-3 top-3 z-[60] rounded-full bg-white/90 px-3 py-2 text-xs font-black leading-none text-emerald-800 shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition hover:bg-white sm:right-4 sm:top-4 sm:px-4 md:right-6"
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <CreateAccountScreen
        language={language}
        onAccountExists={(email) => router.push(`/login?email=${encodeURIComponent(email)}&exists=1`)}
        onAccountCreated={() => {}}
        onCreateAccount={handleCreateAccount}
        onSignIn={() => router.push('/login')}
      />
    </main>
  )
}

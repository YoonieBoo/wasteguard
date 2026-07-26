'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell } from '@/components/welcome-screen'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/auth-errors'
import { getText, type Language } from '@/lib/i18n'

const languageKey = 'wasteGuardLanguage'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [language] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = window.localStorage.getItem(languageKey)
    return saved === 'en' || saved === 'th' ? saved : 'en'
  })
  const t = getText(language)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!email || isLoading) return
    setError('')
    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    })

    setIsLoading(false)
    if (error) {
      setError(friendlyAuthError(error.message))
      return
    }
    setSent(true)
  }

  return (
    <AuthShell title={t.forgotPasswordTitle} subtitle={t.forgotPasswordSubtitle}>
      {sent ? (
        <p className="rounded-[0.5rem] bg-white px-4 py-3 text-sm font-bold leading-6 text-primary shadow-sm">
          {t.resetLinkSentNotice}
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t.email}
            className="wg-control border-secondary bg-white"
          />
          <Button
            type="submit"
            disabled={!email || isLoading}
            className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
          >
            {isLoading ? `${t.sendResetLink}...` : t.sendResetLink}
          </Button>
          {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
        </form>
      )}
      <Button
        type="button"
        onClick={() => router.push('/login')}
        variant="secondary"
        className="mt-3 h-[3.25rem] w-full rounded-[0.5rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80 sm:text-base"
      >
        {t.backToSignIn}
      </Button>
    </AuthShell>
  )
}

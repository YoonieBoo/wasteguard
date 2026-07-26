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

export default function ResetPasswordPage() {
  const router = useRouter()
  const [language] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = window.localStorage.getItem(languageKey)
    return saved === 'en' || saved === 'th' ? saved : 'en'
  })
  const t = getText(language)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submit() {
    if (!password || !confirmPassword || isLoading) return
    setError('')

    if (password.length < 6) {
      setError(t.passwordTooShort)
      return
    }
    if (password !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setIsLoading(false)
      setError(friendlyAuthError(error.message))
      return
    }

    // The recovery link's session exchange left us signed in — sign back out
    // so the flow stays "reset -> log in with the new password", matching
    // the rest of this app's auth flows.
    await supabase.auth.signOut()
    router.push('/login?reset=1')
  }

  return (
    <AuthShell title={t.resetPasswordTitle} subtitle={t.resetPasswordSubtitle}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="space-y-3">
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder={t.newPassword}
            className="wg-control border-secondary bg-white"
          />
          <Input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder={t.confirmPassword}
            className="wg-control border-secondary bg-white"
          />
        </div>
        <Button
          type="submit"
          disabled={!password || !confirmPassword || isLoading}
          className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
        >
          {isLoading ? `${t.resetPasswordButton}...` : t.resetPasswordButton}
        </Button>
        {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      </form>
    </AuthShell>
  )
}

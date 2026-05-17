'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, type Language } from '@/lib/i18n'
import type { WasteGuardRole } from '@/lib/mock-data'

interface WelcomeScreenProps {
  language: Language
  onStart: () => void
  onSignIn: () => void
}

type AccountForm = {
  fullName: string
  bakeryName: string
  email: string
  password: string
  role: WasteGuardRole
  inviteCode: string
}

interface SignInScreenProps {
  language: Language
  initialEmail?: string
  notice?: string
  onSignIn: (email: string, password: string) => Promise<void>
  onCreateAccount: () => void
}

interface CreateAccountScreenProps {
  language: Language
  onAccountExists: (email: string) => void
  onAccountCreated: (email: string) => void
  onCreateAccount: (account: AccountForm) => Promise<void>
  onSignIn: () => void
}

export function WelcomeScreen({ language, onStart, onSignIn }: WelcomeScreenProps) {
  const t = getText(language)

  return (
    <main className="relative flex min-h-dvh w-full flex-col justify-center overflow-hidden bg-[linear-gradient(180deg,#44b37e_0%,#78d6a8_52%,#e9f8ef_100%)] px-4 py-8 text-white sm:px-5 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[40%] -top-[6%] h-[78%] w-[105%] rounded-[50%] bg-[#2f9b6f]/40 blur-[1px]" />
        <div className="absolute -left-[26%] top-[28%] h-[72%] w-[74%] rounded-[50%] bg-[#5fc89c]/45 blur-[1px]" />
        <div className="absolute left-[20%] top-[6%] h-[110%] w-[72%] rotate-[-10deg] rounded-[50%] bg-[#349b72]/35 blur-[1px]" />
        <div className="absolute -right-[48%] top-[18%] h-[94%] w-[86%] rounded-[50%] bg-[#dff7ea]/40 blur-[1px]" />
        <div className="absolute -left-[36%] top-[62%] h-[62%] w-[58%] rounded-[50%] bg-[#91e0c2]/38 blur-[1px]" />
      </div>

      <div className="welcome-fade-up relative z-10 mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center text-center md:max-w-[620px]">
        <h1 className="text-4xl font-black leading-tight tracking-normal sm:text-5xl md:text-6xl">{t.welcomeTitle}</h1>
       
        <p className="mt-4 max-w-[22rem] text-base font-semibold leading-7 text-white/85 md:max-w-[28rem]">
          {t.welcomeSubtitle}
        </p>
      </div>

      <div className="welcome-fade-up welcome-delay relative z-10 mx-auto w-full max-w-[360px] pb-4 md:max-w-[420px]">
        <Button
          onClick={onStart}
          className="wg-action w-full bg-white text-base font-black text-emerald-700 shadow-[0_18px_40px_rgba(28,91,57,0.22)] hover:bg-white/90"
        >
          {t.createAccount}
        </Button>
        <Button
          onClick={onSignIn}
          variant="secondary"
          className="mt-3 h-[3.25rem] w-full rounded-[1.1rem] bg-white/20 text-base font-black text-white shadow-[0_12px_30px_rgba(28,91,57,0.14)] hover:bg-white/25"
        >
          {t.signIn}
        </Button>
      </div>
    </main>
  )
}

export function SignInScreen({ language, initialEmail = '', notice, onSignIn, onCreateAccount }: SignInScreenProps) {
  const t = getText(language)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submit() {
    if (!email || !password || isLoading) {
      return
    }

    setError('')
    setIsLoading(true)

    try {
      await onSignIn(email, password)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.accountError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title={t.welcomeBack} subtitle={t.continueToBakery}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="space-y-3">
          {notice && (
            <p className="rounded-[1rem] bg-white px-4 py-3 text-sm font-bold leading-6 text-primary shadow-sm">
              {notice}
            </p>
          )}
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder={t.email}
            className="wg-control border-secondary bg-white"
          />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder={t.password}
            className="wg-control border-secondary bg-white"
          />
        </div>
        <Button
          type="submit"
          disabled={!email || !password || isLoading}
          className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
        >
          {isLoading ? `${t.signIn}...` : t.signIn}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      <Button
        type="button"
        onClick={onCreateAccount}
        variant="secondary"
        className="mt-3 h-[3.25rem] w-full rounded-[1.1rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80 sm:text-base"
      >
        {t.needAccount}
      </Button>
    </AuthShell>
  )
}

export function CreateAccountScreen({
  language,
  onAccountExists,
  onAccountCreated,
  onCreateAccount,
  onSignIn,
}: CreateAccountScreenProps) {
  const t = getText(language)
  const [form, setForm] = useState<AccountForm>({
    fullName: '',
    bakeryName: '',
    email: '',
    password: '',
    role: 'owner',
    inviteCode: '',
  })
  const canContinue =
    form.fullName && form.bakeryName && form.email && form.password && (form.role === 'owner' || form.inviteCode)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function updateField(field: keyof AccountForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    if (!canContinue || isLoading) {
      return
    }

    setError('')
    setIsLoading(true)

    try {
      await onCreateAccount(form)
      onAccountCreated(form.email)
    } catch (error) {
      const message = error instanceof Error ? error.message : t.accountError
      const normalizedMessage = message.toLowerCase()

      if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
        onAccountExists(form.email)
        return
      }

      if (
        normalizedMessage.includes('rate') ||
        normalizedMessage.includes('too many') ||
        normalizedMessage.includes('security') ||
        normalizedMessage.includes('wait')
      ) {
        setError(t.signupRateLimit)
        return
      }

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title={t.newBakeryAccount} subtitle={form.role === 'owner' ? t.openBakery : t.joinBakery}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['owner', 'staff'] as WasteGuardRole[]).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setForm((current) => ({ ...current, role: option }))}
              className={`min-h-[3.25rem] rounded-[1rem] px-3 py-3 text-sm font-black transition ${
                form.role === option
                  ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(68,179,126,0.2)]'
                  : 'bg-white text-foreground shadow-sm hover:bg-secondary'
              }`}
            >
              {option === 'owner' ? t.bakeryOwner : t.staffMember}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <Input
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder={t.fullName}
            className="wg-control border-secondary bg-white"
          />
          <Input
            value={form.bakeryName}
            onChange={(event) => updateField('bakeryName', event.target.value)}
            placeholder={t.bakeryName}
            className="wg-control border-secondary bg-white"
          />
          {form.role === 'staff' && (
            <Input
              value={form.inviteCode}
              onChange={(event) => updateField('inviteCode', event.target.value.toUpperCase())}
              placeholder={t.enterInviteCode}
              className="wg-control border-secondary bg-white"
            />
          )}
          <Input
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            placeholder={t.email}
            className="wg-control border-secondary bg-white"
          />
          <Input
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            type="password"
            placeholder={t.password}
            className="wg-control border-secondary bg-white"
          />
        </div>

        <Button
          type="submit"
          disabled={!canContinue || isLoading}
          className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
        >
          {isLoading ? `${t.createAccount}...` : t.createAccount}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      <Button
        type="button"
        onClick={onSignIn}
        variant="secondary"
        className="mt-3 h-[3.25rem] w-full rounded-[1.1rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80 sm:text-base"
      >
        {t.alreadyHaveAccount}
      </Button>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full justify-center bg-white px-4 py-14 sm:px-5 md:px-6 md:py-16">
      <div className="w-full max-w-[430px] md:max-w-[620px]">
        <div className="wg-page-header">
          <p className="wg-eyebrow">Waste Guard</p>
          <h1 className="wg-page-title">{title}</h1>
          <p className="wg-page-subtitle">{subtitle}</p>
        </div>
        <section className="rounded-[1.5rem] bg-secondary/70 p-4 md:p-5">{children}</section>
      </div>
    </main>
  )
}

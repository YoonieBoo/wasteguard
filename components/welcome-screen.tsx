'use client'

import Image from 'next/image'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
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
          className="h-14 w-full rounded-[0.5rem] bg-white text-base font-black text-emerald-700 shadow-[0_18px_40px_rgba(28,91,57,0.22)] hover:bg-white/90"
        >
          {t.createAccount}
        </Button>
        <Button
          onClick={onSignIn}
          variant="secondary"
          className="mt-3 h-14 w-full rounded-[0.5rem] bg-white/20 text-base font-black text-white shadow-[0_12px_30px_rgba(28,91,57,0.14)] hover:bg-white/25"
        >
          {t.signIn}
        </Button>
      </div>
    </main>
  )
}

export function SignInScreen({ language, initialEmail = '', notice, onSignIn, onCreateAccount }: SignInScreenProps) {
  const t = getText(language)
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => setEmail(initialEmail), [initialEmail])

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
    <AuthShell title={`${t.welcomeBack}!`} subtitle={t.continueToBakery}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="space-y-2.5">
          {notice && (
            <p className="rounded-[0.5rem] bg-white px-4 py-3 text-sm font-bold leading-6 text-primary shadow-sm">
              {notice}
            </p>
          )}
          <AuthInput
            icon={<Mail />}
            value={email}
            onChange={(event) => setEmail(event.target.value.trim())}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t.email}
          />
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            autoComplete="current-password"
            placeholder={t.password}
          />
        </div>
        <button
          type="button"
          onClick={() => router.push('/forgot-password')}
          className="mt-2 text-sm font-bold text-[#167a50] hover:underline"
        >
          {t.forgotPassword}
        </button>
        <Button
          type="submit"
          disabled={!email || !password || isLoading}
          className="mt-4 h-14 w-full rounded-2xl bg-[#087447] text-base font-extrabold text-white shadow-[0_14px_30px_rgba(8,116,71,0.2)] hover:bg-[#06663e] disabled:opacity-45"
        >
          <span>{isLoading ? `${t.signIn}...` : t.signIn}</span>
          {!isLoading && <ArrowRight className="ml-auto size-5" />}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      <p className="mt-5 text-center text-sm font-semibold text-slate-500 sm:text-base">
        {language === 'th' ? 'ยังไม่มีบัญชี?' : "Don't have an account?"}{' '}
        <button type="button" onClick={onCreateAccount} className="font-extrabold text-[#087447] hover:underline">
          {language === 'th' ? 'สมัครสมาชิก' : 'Sign up'} <span aria-hidden>→</span>
        </button>
      </p>
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
  const [showPassword, setShowPassword] = useState(false)

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
    <AuthShell title={t.newBakeryAccount} subtitle={form.role === 'owner' ? t.openBakery : t.joinBakery} compact>
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
              className={`min-h-[3.25rem] rounded-[0.5rem] px-3 py-3 text-sm font-black transition ${
                form.role === option
                  ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(68,179,126,0.2)]'
                  : 'bg-white text-foreground shadow-sm hover:bg-secondary'
              }`}
            >
              {option === 'owner' ? t.bakeryOwner : t.staffMember}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <AuthInput
            icon={<UserRound />}
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder={t.fullName}
          />
          <AuthInput
            icon={<Building2 />}
            value={form.bakeryName}
            onChange={(event) => updateField('bakeryName', event.target.value)}
            placeholder={t.bakeryName}
          />
          {form.role === 'staff' && (
            <AuthInput
              icon={<LockKeyhole />}
              value={form.inviteCode}
              onChange={(event) => updateField('inviteCode', event.target.value.toUpperCase())}
              placeholder={t.enterInviteCode}
            />
          )}
          <AuthInput
            icon={<Mail />}
            value={form.email}
            onChange={(event) => updateField('email', event.target.value.trim())}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t.email}
          />
          <PasswordInput
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
            autoComplete="new-password"
            placeholder={t.password}
          />
        </div>

        <Button
          type="submit"
          disabled={!canContinue || isLoading}
          className="mt-4 h-14 w-full rounded-2xl bg-[#087447] text-base font-extrabold text-white shadow-[0_14px_30px_rgba(8,116,71,0.2)] hover:bg-[#06663e] disabled:opacity-45"
        >
          {isLoading ? `${t.createAccount}...` : t.createAccount}
        </Button>
      </form>
      {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      <p className="mt-4 text-center text-sm font-semibold text-slate-500 sm:text-base">
        {language === 'th' ? 'มีบัญชีแล้ว?' : 'Already have an account?'}{' '}
        <button type="button" onClick={onSignIn} className="font-extrabold text-[#087447] hover:underline">
          {t.signIn} <span aria-hidden>→</span>
        </button>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, subtitle, children, compact = false }: { title: string; subtitle: string; children: ReactNode; compact?: boolean }) {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#f8fbf8] px-4 py-6 sm:px-6 lg:py-8">
      <AuthBackdrop />
      <div className="relative z-10 flex w-full max-w-[1280px] justify-center lg:h-[calc(100dvh-4rem)] lg:justify-end">
        <Image
          src="/login-mascot.png"
          alt="Waste Guard mascot"
          width={1322}
          height={1190}
          priority
          className="pointer-events-none absolute right-[350px] top-1/2 z-10 hidden h-auto w-[470px] -translate-y-1/2 drop-shadow-[0_24px_28px_rgba(22,99,65,0.13)] lg:block xl:w-[520px]"
        />
        <section className={`relative z-20 w-full max-w-[560px] rounded-[2rem] border border-white/80 bg-white/95 px-5 shadow-[0_28px_80px_rgba(32,83,58,0.13)] backdrop-blur-sm sm:px-9 lg:absolute lg:right-0 lg:top-1/2 lg:max-h-full lg:w-[540px] lg:max-w-none lg:-translate-y-1/2 lg:overflow-hidden lg:px-10 xl:w-[560px] xl:px-12 ${compact ? 'py-5 sm:py-5 lg:py-5 xl:py-5' : 'py-7 sm:py-8 lg:py-7 xl:py-8'}`}>
          <div className={`${compact ? 'mb-3' : 'mb-5'} text-center`}>
            <Image src="/apple-icon.png" alt="Waste Guard" width={128} height={128} priority className={`mx-auto h-auto ${compact ? 'w-[72px] sm:w-[78px]' : 'w-[94px] sm:w-[108px]'}`} />
            <h1 className={`${compact ? 'mt-2 text-3xl' : 'mt-3 text-3xl sm:text-4xl'} font-black tracking-[-0.04em] text-[#075f3e]`}>{title}</h1>
            <p className={`${compact ? 'mt-1' : 'mt-2'} text-sm font-semibold text-slate-500 sm:text-base`}>{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}

function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-[9rem] -top-[10rem] size-[27rem] rounded-full bg-white/75" />
      <div className="absolute -left-[5rem] top-[36%] size-[28rem] rounded-full bg-[#dcefe1]/55" />
      <div className="absolute left-[21%] -top-[14rem] size-[35rem] rounded-full bg-[#e7f3e9]/70" />
      <div className="absolute bottom-[-18rem] left-[25%] size-[34rem] rounded-full bg-[#eaf5ed]/75" />
      <div className="absolute right-[-12rem] top-[12%] size-[25rem] rounded-full bg-white/80" />
      <span className="absolute left-[8%] top-[17%] rotate-[-28deg] text-4xl text-[#7fbd38]/65">●</span>
      <span className="absolute bottom-[11%] left-[20%] rotate-[18deg] text-5xl text-[#7fbd38]/45">●</span>
    </div>
  )
}

function AuthInput({ icon, className = '', ...props }: React.ComponentProps<typeof Input> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 [&_svg]:size-5">{icon}</span>
      <Input className={`h-14 rounded-2xl border-[#dce4df] bg-white pl-12 pr-4 text-base font-semibold shadow-none placeholder:font-medium focus-visible:border-[#4a9a72] focus-visible:ring-[#4a9a72]/15 ${className}`} {...props} />
    </div>
  )
}

function PasswordInput({ visible, onToggle, ...props }: Omit<React.ComponentProps<typeof Input>, 'type'> & { visible: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500"><LockKeyhole className="size-5" /></span>
      <Input type={visible ? 'text' : 'password'} className="h-14 rounded-2xl border-[#dce4df] bg-white pl-12 pr-12 text-base font-semibold shadow-none placeholder:font-medium focus-visible:border-[#4a9a72] focus-visible:ring-[#4a9a72]/15" {...props} />
      <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-[#087447]">
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  )
}

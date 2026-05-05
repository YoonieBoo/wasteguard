import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'

interface WelcomeScreenProps {
  language: Language
  onStart: () => void
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
        <h1 className="text-4xl font-black leading-tight tracking-normal min-[360px]:text-5xl sm:text-6xl md:text-7xl">{t.welcomeTitle}</h1>
       
        <p className="mt-4 max-w-[22rem] text-base font-bold leading-relaxed text-white/85 md:max-w-[28rem] md:text-lg">
          {t.welcomeSubtitle}
        </p>
      </div>

      <div className="welcome-fade-up welcome-delay relative z-10 mx-auto w-full max-w-[360px] pb-4 md:max-w-[420px]">
        <Button
          onClick={onStart}
          className="h-16 w-full rounded-[1.4rem] bg-white text-xl font-black text-emerald-700 shadow-[0_18px_40px_rgba(28,91,57,0.22)] hover:bg-white/90 md:text-2xl"
        >
          {t.startToday}
        </Button>
      </div>
    </main>
  )
}

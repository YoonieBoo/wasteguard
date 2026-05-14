import { Home, Leaf, PlusCircle } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import type { WasteGuardRole } from '@/lib/mock-data'

interface NavigationProps {
  currentScreen: string
  language: Language
  role?: WasteGuardRole
  onScreenChange: (screen: string) => void
}

export function Navigation({ currentScreen, language, role = 'staff', onScreenChange }: NavigationProps) {
  const t = getText(language)
  const navItems = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'input', label: t.navCheck, icon: PlusCircle },
    { id: 'carbon', label: t.navImpact, icon: Leaf },
  ]

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-50 hidden w-64 border-r border-secondary/80 bg-white/95 px-4 py-6 shadow-[14px_0_45px_rgba(35,88,62,0.08)] backdrop-blur lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <p className="text-2xl font-black leading-none text-primary">Waste Guard</p>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            {role === 'owner' ? t.bakeryOwner : t.staffMember}
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentScreen === item.id

            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`flex h-14 w-full items-center gap-3 rounded-[1.1rem] px-4 text-left text-sm font-black transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(68,179,126,0.2)]'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-3 sm:px-4 sm:pb-4 md:px-6 lg:hidden">
        <div className="mx-auto flex w-full max-w-[430px] justify-center rounded-[1.65rem] border border-white/80 bg-white/95 px-1.5 py-2 shadow-[0_18px_50px_rgba(35,88,62,0.16)] backdrop-blur sm:px-2 md:max-w-[620px] md:px-3">
          <div className="grid w-full grid-cols-3 gap-1 md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentScreen === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onScreenChange(item.id)}
                  className={`flex h-16 flex-col items-center justify-center rounded-[1.15rem] transition-all duration-200 md:h-[4.25rem] ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(68,179,126,0.22)]'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="mb-1 h-5 w-5" />
                  <span className="max-w-full truncate px-0.5 text-[10px] font-bold sm:text-[11px]">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}

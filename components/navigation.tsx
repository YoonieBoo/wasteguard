import { BarChart3, Home, Leaf, LineChart, PlusCircle } from 'lucide-react'
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
    ...(role === 'owner' ? [{ id: 'insights', label: t.navSaved, icon: BarChart3 }] : []),
    { id: 'carbon', label: t.navImpact, icon: Leaf },
    ...(role === 'owner' ? [{ id: 'analytics', label: t.navAnalytics, icon: LineChart }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-3 sm:px-4 sm:pb-4 md:px-6">
      <div className="mx-auto flex w-full max-w-[430px] justify-center rounded-[1.65rem] border border-white/80 bg-white/95 px-1.5 py-2 shadow-[0_18px_50px_rgba(35,88,62,0.16)] backdrop-blur sm:px-2 md:max-w-[620px] md:px-3">
        <div className={`grid w-full gap-1 md:gap-2 ${role === 'owner' ? 'grid-cols-5' : 'grid-cols-3'}`}>
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
  )
}

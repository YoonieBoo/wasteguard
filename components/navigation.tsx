import { Home, Leaf, LogOut, PlusCircle, Sparkles, type LucideIcon } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import type { WasteGuardRole } from '@/lib/mock-data'

interface NavigationProps {
  currentScreen: string
  language: Language
  role?: WasteGuardRole
  pendingRecommendationsCount?: number
  onLogout: () => void
  onScreenChange: (screen: string) => void
}

export function Navigation({
  currentScreen,
  language,
  role = 'staff',
  pendingRecommendationsCount = 0,
  onLogout,
  onScreenChange,
}: NavigationProps) {
  const t = getText(language)
  const navItems: Array<{ id: string; label: string; icon: LucideIcon; badge?: number }> = [
    { id: 'home', label: t.navHome, icon: Home },
    ...(role === 'staff' ? [{ id: 'input', label: t.navCheck, icon: PlusCircle }] : []),
    ...(role === 'owner'
      ? [
          {
            id: 'recommendations',
            label: t.navRecommendations,
            icon: Sparkles,
            badge: pendingRecommendationsCount > 0 ? pendingRecommendationsCount : undefined,
          },
        ]
      : []),
    ...(role === 'owner' ? [{ id: 'impact', label: t.navImpact, icon: Leaf }] : []),
  ]
  const gridColumns = role === 'owner' ? 'grid-cols-4' : 'grid-cols-3'

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-50 hidden w-64 border-r border-secondary/80 bg-white/95 px-4 py-6 shadow-[14px_0_45px_rgba(35,88,62,0.08)] backdrop-blur lg:flex lg:flex-col">
        <div className="mb-7 px-2">
          <p className="text-xl font-black leading-none text-primary">Waste Guard</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {role === 'owner' ? t.bakeryOwner : t.staffMember}
          </p>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentScreen === item.id

            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`relative flex h-[3.25rem] w-full items-center gap-3 rounded-[1rem] px-4 text-left text-sm font-black transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_22px_rgba(68,179,126,0.2)]'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-primary text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto flex h-[3.25rem] w-full items-center gap-3 rounded-[1rem] px-4 text-left text-sm font-black text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="truncate">{t.logOut}</span>
        </button>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-3 sm:px-4 sm:pb-4 md:px-6 lg:hidden">
        <div className="mx-auto flex w-full max-w-[430px] justify-center rounded-[1.45rem] border border-white/80 bg-white/95 px-1.5 py-2 shadow-[0_18px_50px_rgba(35,88,62,0.16)] backdrop-blur sm:px-2 md:max-w-[620px] md:px-3">
          <div className={`grid w-full ${gridColumns} gap-1 md:gap-2`}>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentScreen === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onScreenChange(item.id)}
                  className={`relative flex h-[3.75rem] flex-col items-center justify-center rounded-[1rem] transition-all duration-200 md:h-16 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(68,179,126,0.22)]'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <div className="relative">
                    <Icon className="mb-1 h-5 w-5" />
                    {item.badge != null && (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white ring-2 ring-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none sm:text-[11px]">
                    {item.label}
                  </span>
                </button>
              )
            })}
            <button
              onClick={onLogout}
              className="flex h-[3.75rem] flex-col items-center justify-center rounded-[1rem] text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground md:h-16"
            >
              <LogOut className="mb-1 h-5 w-5" />
              <span className="max-w-full truncate px-0.5 text-[10px] font-bold leading-none sm:text-[11px]">
                {t.logOut}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}

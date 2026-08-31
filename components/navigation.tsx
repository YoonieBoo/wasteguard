'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays,
  Home,
  Leaf,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react'
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

type NavItem = { id: string; label: string; icon: LucideIcon; badge?: number }

export function Navigation({
  currentScreen,
  language,
  role = 'staff',
  pendingRecommendationsCount = 0,
  onLogout,
  onScreenChange,
}: NavigationProps) {
  const t = getText(language)
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const recommendationsItem: NavItem = {
    id: 'recommendations',
    label: t.navRecommendations,
    icon: Sparkles,
    badge: pendingRecommendationsCount > 0 ? pendingRecommendationsCount : undefined,
  }
  const moreScreenItems: NavItem[] = [
    { id: 'menu', label: t.navMenu, icon: UtensilsCrossed },
    { id: 'impact', label: t.navEsg, icon: Leaf },
    { id: 'report', label: t.navReport, icon: TrendingUp },
  ]
  const isOnMoreScreen = moreScreenItems.some((item) => item.id === currentScreen)

  // The full flat list — used as-is for the desktop sidebar, which has
  // plenty of vertical room for every destination.
  const desktopNavItems: NavItem[] = [
    { id: 'home', label: t.navHome, icon: Home },
    ...(role === 'staff' ? [{ id: 'input', label: t.navCheck, icon: PlusCircle }] : []),
    { id: 'events', label: t.navEvents, icon: CalendarDays },
    ...(role === 'owner' ? [recommendationsItem] : []),
    ...(role === 'owner' ? moreScreenItems : []),
  ]

  // The owner's mobile bottom bar can't fit 6 destinations + Log out
  // without feeling cramped, so Menu/ESG/Report collapse into one "More"
  // tab that opens a sheet — staff only ever has 3 destinations, so their
  // bar is unaffected.
  const mobileNavItems: NavItem[] =
    role === 'owner'
      ? [
          { id: 'home', label: t.navHome, icon: Home },
          { id: 'events', label: t.navEvents, icon: CalendarDays },
          recommendationsItem,
          { id: 'more', label: t.navMore, icon: MoreHorizontal },
        ]
      : desktopNavItems
  const mobileGridColumns = role === 'owner' ? 'grid-cols-4' : 'grid-cols-3'

  function handleMobileItemTap(id: string) {
    if (id === 'more') {
      setShowMoreSheet(true)
      return
    }
    onScreenChange(id)
  }

  function handleMoreSheetSelect(id: string) {
    setShowMoreSheet(false)
    onScreenChange(id)
  }

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
          {desktopNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentScreen === item.id

            return (
              <button
                key={item.id}
                onClick={() => onScreenChange(item.id)}
                className={`relative flex h-[3.25rem] w-full items-center gap-3 rounded-[0.5rem] px-4 text-left text-sm font-black transition-all duration-200 ${
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
          className="mt-auto flex h-[3.25rem] w-full items-center gap-3 rounded-[0.5rem] px-4 text-left text-sm font-black text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="truncate">{t.logOut}</span>
        </button>

      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-3 sm:px-4 sm:pb-4 md:px-6 lg:hidden">
        <div className="mx-auto flex w-full max-w-[430px] justify-center rounded-[0.75rem] border border-white/80 bg-white/95 px-1.5 py-2 shadow-[0_18px_50px_rgba(35,88,62,0.16)] backdrop-blur sm:px-2 md:max-w-[620px] md:px-3">
          <div className={`grid w-full ${mobileGridColumns} gap-1 md:gap-2`}>
            {mobileNavItems.map((item) => {
              const Icon = item.icon
              const isActive = item.id === 'more' ? isOnMoreScreen : currentScreen === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => handleMobileItemTap(item.id)}
                  className={`relative flex h-[3.75rem] flex-col items-center justify-center rounded-[0.5rem] transition-all duration-200 md:h-16 ${
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
          </div>
        </div>
      </nav>

      {mounted && showMoreSheet &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMoreSheet(false)} />
            <div className="relative w-full max-w-[430px] rounded-t-[1rem] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(35,88,62,0.2)] animate-in slide-in-from-bottom-4 fade-in-0 duration-200 md:max-w-[620px]">
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="wg-eyebrow mb-0 font-black">{t.navMore}</p>
                <button
                  type="button"
                  onClick={() => setShowMoreSheet(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {moreScreenItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentScreen === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMoreSheetSelect(item.id)}
                      className={`flex h-[3.25rem] w-full items-center gap-3 rounded-[0.5rem] px-4 text-left text-sm font-black transition-all duration-200 ${
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
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

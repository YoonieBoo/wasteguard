import { BarChart3, Home, Leaf, PlusCircle } from 'lucide-react'

interface NavigationProps {
  currentScreen: string
  onScreenChange: (screen: string) => void
}

export function Navigation({ currentScreen, onScreenChange }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'input', label: 'Check', icon: PlusCircle },
    { id: 'insights', label: 'Saved', icon: BarChart3 },
    { id: 'carbon', label: 'Impact', icon: Leaf },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:px-6">
      <div className="mx-auto flex w-full max-w-[430px] justify-center rounded-[1.65rem] border border-white/80 bg-white/95 px-2 py-2 shadow-[0_18px_50px_rgba(35,88,62,0.16)] backdrop-blur md:max-w-[620px] md:px-3">
        <div className="grid w-full grid-cols-4 gap-1 md:gap-2">
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
              <span className="text-[11px] font-bold">{item.label}</span>
            </button>
          )
          })}
        </div>
      </div>
    </nav>
  )
}

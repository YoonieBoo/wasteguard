'use client'

import { useRef, useState } from 'react'
import { Check, ChevronDown, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import { bakeryImageFiles, cleanBakeryTitle, type BakeryImageFile } from '@/lib/bakery-catalog'
import type { Recommendation, RecommendationStatus, WasteType } from '@/lib/recommendations'
import type { FlaskFoodPrepItem } from '@/lib/ai-api'
import type { BusinessMenuItem } from '@/lib/menu-data'

type FilterType = 'all' | WasteType

const FILTER_OPTIONS: { value: FilterType; label: string; labelTh: string; emoji: string }[] = [
  { value: 'all',       label: 'All',       labelTh: 'ทั้งหมด',    emoji: '🔍' },
  { value: 'food',      label: 'Food',      labelTh: 'อาหาร',      emoji: '🍽️' },
  { value: 'energy',    label: 'Energy',    labelTh: 'พลังงาน',    emoji: '⚡' },
  { value: 'water',     label: 'Water',     labelTh: 'น้ำ',        emoji: '💧' },
  { value: 'packaging', label: 'Packaging', labelTh: 'บรรจุภัณฑ์', emoji: '📦' },
]

interface RecommendationCenterProps {
  recommendations: Recommendation[]
  language: Language
  onUpdate: (id: string, status: RecommendationStatus, modifiedQuantity?: number) => void
  rawFoodPrepItems?: FlaskFoodPrepItem[]
  menuItems?: BusinessMenuItem[]
}

// Recommendation ids for food-prep items are assigned as `ai-prep-${index}`
// (see transformFlaskToRecommendations) — this recovers that index so we can
// look up the raw Flask item's real menu_item name, independent of
// affectedItemFileName (which only covers the 4 demo dishes).
function getFoodPrepIndex(recId: string): number | null {
  if (!recId.startsWith('ai-prep-')) return null
  const index = Number(recId.slice('ai-prep-'.length))
  return Number.isInteger(index) ? index : null
}

// affectedItemFileName is either a real menu_items.id (arbitrary string) or
// one of the 4 mock BakeryImageFile keys — resolve real dishes via the raw
// Flask item's name (same index recovery as getIngredientNeeds) and only
// fall back to cleanBakeryTitle for the mock dataset.
function getAffectedItemLabel(rec: Recommendation, rawFoodPrepItems: FlaskFoodPrepItem[]): string | null {
  if (!rec.affectedItemFileName) return null

  const index = getFoodPrepIndex(rec.id)
  const foodPrepItem = index !== null ? rawFoodPrepItems[index] : null
  if (foodPrepItem) return foodPrepItem.menu_item

  if ((bakeryImageFiles as readonly string[]).includes(rec.affectedItemFileName)) {
    return cleanBakeryTitle(rec.affectedItemFileName as BakeryImageFile)
  }

  return null
}

function getIngredientNeeds(
  rec: Recommendation,
  rawFoodPrepItems: FlaskFoodPrepItem[],
  menuItems: BusinessMenuItem[],
): { name: string; amount: string }[] {
  const index = getFoodPrepIndex(rec.id)
  if (index === null) return []

  const foodPrepItem = rawFoodPrepItems[index]
  if (!foodPrepItem) return []

  const menuItem = menuItems.find((item) => item.name.trim().toLowerCase() === foodPrepItem.menu_item.trim().toLowerCase())
  if (!menuItem || menuItem.ingredients.length === 0) return []

  const quantity = rec.suggestedQuantity ?? foodPrepItem.final_prep_recommendation

  return menuItem.ingredients.map((ingredient) => ({
    name: ingredient.name,
    amount: `${parseFloat((ingredient.quantityPerPortion * quantity).toFixed(2))} ${ingredient.unit}`,
  }))
}

export function RecommendationCenter({
  recommendations,
  language,
  onUpdate,
  rawFoodPrepItems = [],
  menuItems = [],
}: RecommendationCenterProps) {
  const t = getText(language)
  const [modifyingId, setModifyingId] = useState<string | null>(null)
  const [modifyQuantity, setModifyQuantity] = useState('')
  const [showReviewed, setShowReviewed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  const allPendingRecs = recommendations.filter((r) => r.status === 'pending')
  const pendingRecs = activeFilter === 'all'
    ? allPendingRecs
    : allPendingRecs.filter((r) => r.wasteType === activeFilter)

  const activeFilterOption = FILTER_OPTIONS.find((o) => o.value === activeFilter)!
  const reviewedRecs = recommendations.filter((r) => r.status !== 'pending')
  const acceptedSavings = recommendations
    .filter((r) => r.status === 'accepted' || r.status === 'modified')
    .reduce((sum, r) => sum + r.estimatedSavings, 0)

  function startModify(rec: Recommendation) {
    setModifyingId(rec.id)
    setModifyQuantity(String(rec.suggestedQuantity ?? ''))
  }

  function saveModify(id: string) {
    const qty = Number(modifyQuantity)
    if (!isNaN(qty) && qty > 0) {
      onUpdate(id, 'modified', qty)
    }
    setModifyingId(null)
    setModifyQuantity('')
  }

  function cancelModify() {
    setModifyingId(null)
    setModifyQuantity('')
  }

  function adjustModifyQty(delta: number) {
    setModifyQuantity((current) => String(Math.max(1, Number(current || 0) + delta)))
  }

  return (
    <main className="wg-page">
      <div className="wg-page-header relative">
        <p className="wg-eyebrow">{t.today}</p>
        <h1 className="wg-page-title">{t.recommendationCenter}</h1>

        {/* Filter dropdown */}
        <div ref={filterRef} className="absolute right-0 top-0">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-[0.5rem] border border-secondary bg-white px-3 py-2 text-xs font-black text-foreground shadow-sm transition hover:bg-secondary/50"
          >
            <span>{language === 'th' ? activeFilterOption.labelTh : activeFilterOption.label}</span>
            <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-150 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-32 overflow-hidden rounded-[0.5rem] border border-secondary bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setActiveFilter(opt.value); setFilterOpen(false) }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-xs font-bold transition hover:bg-secondary/50 ${
                    activeFilter === opt.value ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                >
                  <span>{language === 'th' ? opt.labelTh : opt.label}</span>
                  {activeFilter === opt.value && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {acceptedSavings > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-[0.75rem] bg-primary/10 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Check className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">
              {language === 'th'
                ? `${t.recsSavedBanner}: ${acceptedSavings.toLocaleString()} บาท`
                : `${t.recsSavedBanner}: THB ${acceptedSavings.toLocaleString()}`}
            </p>
            <p className="wg-meta mt-0.5">{t.approvedByManager}</p>
          </div>
        </div>
      )}

      {pendingRecs.length === 0 ? (
        <div className="rounded-[0.75rem] bg-white p-10 text-center shadow-[0_18px_45px_rgba(41,91,67,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <p className="text-base font-black text-foreground">
            {activeFilter === 'all' ? t.noPendingRecs : `No ${activeFilterOption.label} recommendations pending`}
          </p>
          <p className="wg-meta mt-1">
            {activeFilter === 'all' ? t.allRecsReviewed : (
              <button type="button" onClick={() => setActiveFilter('all')} className="underline">
                Show all types
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRecs.map((rec) => {
            const isModifying = modifyingId === rec.id
            const title = language === 'th' ? rec.titleTh : rec.title
            const reason = language === 'th' ? rec.reasonTh : rec.reason
            const confidenceTone =
              rec.confidence >= 80
                ? 'bg-primary/12 text-primary'
                : rec.confidence >= 60
                  ? 'bg-primary/8 text-primary/70'
                  : 'bg-secondary text-muted-foreground'
            const confidenceLabel =
              rec.confidence >= 80
                ? t.confidenceHigh
                : rec.confidence >= 60
                  ? t.confidenceMedium
                  : t.confidenceLow
            const ingredientNeeds = getIngredientNeeds(rec, rawFoodPrepItems, menuItems)
            const affectedItemLabel = getAffectedItemLabel(rec, rawFoodPrepItems)

            return (
              <div
                key={rec.id}
                className="group overflow-hidden rounded-[0.75rem] bg-white shadow-[0_18px_45px_rgba(41,91,67,0.1)]"
              >
                <div className="p-6 md:p-7">
                  {/* Tap target on mobile — hover activates group on desktop */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(rec.id)}
                    className="w-full text-left focus:outline-none"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${confidenceTone}`}>
                        {confidenceLabel}
                      </span>
                      {affectedItemLabel && (
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
                          {translateItemName(affectedItemLabel, language)}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-base font-black leading-tight text-foreground sm:text-lg">
                      {title}
                    </h2>
                  </button>

                  <p
                    className={`text-sm font-medium leading-6 text-muted-foreground sm:text-base sm:leading-7 ${
                      expandedId === rec.id
                        ? 'mt-2 block'
                        : 'mt-0 hidden group-hover:mt-2 group-hover:block'
                    }`}
                  >
                    {reason}
                  </p>

                  {expandedId === rec.id && ingredientNeeds.length > 0 && (
                    <div className="mt-4 rounded-[0.5rem] bg-secondary/50 px-4 py-3">
                      <p className="wg-label mb-2">{t.ingredientsNeeded}</p>
                      <div className="space-y-1.5">
                        {ingredientNeeds.map((ingredient) => (
                          <div key={ingredient.name} className="flex items-center justify-between gap-3 text-xs font-bold">
                            <span className="text-muted-foreground">{ingredient.name}</span>
                            <span className="text-foreground">{ingredient.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-4 text-sm font-black">
                    {rec.estimatedSavings > 0 && (
                      <>
                        <span className="text-primary">
                          {language === 'th'
                            ? `ประหยัด ${rec.estimatedSavings.toLocaleString()} บาท`
                            : `Saves THB ${rec.estimatedSavings.toLocaleString()}`}
                        </span>
                        <span className="text-muted-foreground"> · </span>
                      </>
                    )}
                    <span className={rec.co2Impact >= 0 ? 'text-primary' : 'text-amber-600'}>
                      {rec.co2Impact >= 0 ? '↓' : '↑'}
                      {Math.abs(rec.co2Impact)} {t.kgCo2}
                    </span>
                  </p>

                  {isModifying && (
                    <div className="mt-5 border-t border-secondary/60 pt-5">
                      <p className="wg-label mb-2">{t.adjustQuantity}</p>
                      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustModifyQty(-1)}
                          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75"
                          aria-label="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          value={modifyQuantity}
                          onChange={(e) => setModifyQuantity(e.target.value)}
                          inputMode="numeric"
                          className="h-11 rounded-[0.5rem] border-secondary bg-secondary/45 text-center text-base font-black"
                        />
                        <button
                          type="button"
                          onClick={() => adjustModifyQty(1)}
                          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/75"
                          aria-label="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={`mt-5 grid gap-2 ${isModifying ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {isModifying ? (
                      <>
                        <Button
                          onClick={() => saveModify(rec.id)}
                          className="h-12 rounded-[0.5rem] bg-primary text-sm font-black text-primary-foreground hover:bg-primary/90"
                        >
                          {t.saveModification}
                        </Button>
                        <Button
                          onClick={cancelModify}
                          variant="secondary"
                          className="h-12 rounded-[0.5rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80"
                        >
                          {t.cancelModification}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => onUpdate(rec.id, 'accepted')}
                          className="h-12 rounded-[0.5rem] bg-primary text-sm font-black text-primary-foreground hover:bg-primary/90"
                        >
                          {t.accept}
                        </Button>
                        <Button
                          onClick={() => startModify(rec)}
                          variant="secondary"
                          className="h-12 rounded-[0.5rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80"
                        >
                          {t.modify}
                        </Button>
                        <Button
                          onClick={() => onUpdate(rec.id, 'ignored')}
                          variant="secondary"
                          className="h-12 rounded-[0.5rem] bg-secondary/50 text-sm font-black text-muted-foreground hover:bg-secondary"
                        >
                          {t.ignore}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reviewedRecs.length > 0 && (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setShowReviewed((v) => !v)}
            className="flex w-full items-center justify-between rounded-[0.5rem] bg-secondary/60 px-4 py-3 text-sm font-black text-foreground transition hover:bg-secondary"
          >
            <span>
              {t.reviewedRecsSection} ({reviewedRecs.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showReviewed ? 'rotate-180' : ''}`}
            />
          </button>

          {showReviewed && (
            <div className="mt-3 space-y-3">
              {reviewedRecs.map((rec) => {
                const title = language === 'th' ? rec.titleTh : rec.title
                const statusLabel =
                  rec.status === 'accepted'
                    ? t.acceptedBadge
                    : rec.status === 'modified'
                      ? t.modifiedBadge
                      : t.ignoredBadge
                const statusTone =
                  rec.status === 'accepted'
                    ? 'bg-primary/12 text-primary'
                    : rec.status === 'modified'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-secondary text-muted-foreground'

                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-3 rounded-[0.5rem] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(41,91,67,0.06)]"
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm font-black text-foreground ${rec.status === 'ignored' ? 'opacity-40' : ''}`}
                      >
                        {title}
                      </p>
                      {rec.status === 'modified' && rec.modifiedQuantity != null && (
                        <p className="wg-meta mt-0.5">
                          → {rec.modifiedQuantity} {language === 'th' ? 'หน่วย' : 'units'}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone}`}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdate(rec.id, 'pending')}
                        className="text-xs font-bold text-muted-foreground/50 transition hover:text-muted-foreground"
                      >
                        {t.undoAction}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

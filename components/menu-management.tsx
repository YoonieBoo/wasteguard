'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getText, type Language } from '@/lib/i18n'
import {
  createMenuItem,
  fetchMenuItems,
  updateMenuItem,
  uploadMenuItemPhoto,
  type BusinessMenuItem,
  type MenuItemIngredient,
} from '@/lib/menu-data'
import { uploadReferencePhoto } from '@/lib/leftover-scan'

interface MenuManagementProps {
  businessId: string
  language: Language
  onMenuItemSaved?: (item: BusinessMenuItem) => void
}

export function MenuManagement({ businessId, language, onMenuItemSaved }: MenuManagementProps) {
  const t = getText(language)
  const [items, setItems] = useState<BusinessMenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editingItem, setEditingItem] = useState<BusinessMenuItem | 'new' | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchMenuItems(businessId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load menu items')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId])

  function handleSaved(item: BusinessMenuItem) {
    setItems((current) => {
      const exists = current.some((i) => i.id === item.id)
      const next = exists ? current.map((i) => (i.id === item.id ? item : i)) : [...current, item]
      return next.sort((a, b) => a.name.localeCompare(b.name))
    })
    setEditingItem(null)
    onMenuItemSaved?.(item)
  }

  return (
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">{t.today}</p>
        <h1 className="wg-page-title">{t.menuTabTitle}</h1>
        <p className="wg-page-subtitle">{t.menuTabNote}</p>
      </div>

      {isLoading ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <p className="wg-meta">…</p>
        </div>
      ) : loadError ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <p className="text-sm font-bold text-destructive">{loadError}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[0.75rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <p className="text-sm font-black text-foreground">{t.noMenuItemsYet}</p>
          <p className="wg-meta mt-1 mb-5">{t.noMenuItemsYetNote}</p>
          <Button
            onClick={() => setEditingItem('new')}
            className="h-11 rounded-[0.5rem] bg-primary px-6 text-sm font-black text-primary-foreground hover:bg-primary/90"
          >
            {t.addDish}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => setEditingItem('new')}
              className="h-11 rounded-[0.5rem] bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t.addDish}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEditingItem(item)}
                className="flex items-center gap-3 rounded-[0.75rem] bg-white p-4 text-left shadow-[0_14px_35px_rgba(41,91,67,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(41,91,67,0.12)]"
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-14 w-14 shrink-0 rounded-[0.5rem] object-cover" />
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[0.5rem] bg-secondary text-muted-foreground">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{item.name}</p>
                  <p className="wg-meta mt-0.5 truncate">{item.category || '—'}</p>
                  {item.ingredients.length > 0 && (
                    <p className="mt-0.5 text-[11px] font-bold text-primary">
                      {item.ingredients.length} {item.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {editingItem && (
        <DishEditPanel
          businessId={businessId}
          language={language}
          item={editingItem === 'new' ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}
    </main>
  )
}

function DishEditPanel({
  businessId,
  language,
  item,
  onClose,
  onSaved,
}: {
  businessId: string
  language: Language
  item: BusinessMenuItem | null
  onClose: () => void
  onSaved: (item: BusinessMenuItem) => void
}) {
  const t = getText(language)
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [unitCost, setUnitCost] = useState(item?.unitCost != null ? String(item.unitCost) : '')
  const [sellingPrice, setSellingPrice] = useState(item?.sellingPrice != null ? String(item.sellingPrice) : '')
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [referencePhotoPreview, setReferencePhotoPreview] = useState<string | null>(item?.referencePhotoUrl ?? null)
  const [referencePhotoFile, setReferencePhotoFile] = useState<File | null>(null)
  const [ingredients, setIngredients] = useState<MenuItemIngredient[]>(item?.ingredients ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const referenceFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleReferencePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setReferencePhotoFile(file)
    setReferencePhotoPreview(URL.createObjectURL(file))
  }

  function addIngredientRow() {
    setIngredients((current) => [...current, { name: '', quantityPerPortion: 0, unit: '' }])
  }

  function updateIngredientRow(index: number, patch: Partial<MenuItemIngredient>) {
    setIngredients((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function removeIngredientRow(index: number) {
    setIngredients((current) => current.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim() || isSaving) return
    setError('')
    setIsSaving(true)

    try {
      const cleanIngredients = ingredients
        .filter((ingredient) => ingredient.name.trim())
        .map((ingredient) => ({
          name: ingredient.name.trim(),
          quantityPerPortion: Number(ingredient.quantityPerPortion) || 0,
          unit: ingredient.unit.trim(),
        }))

      let targetId = item?.id
      if (!targetId) {
        const created = await createMenuItem(businessId, {
          name: name.trim(),
          category: category.trim() || null,
          unit: unit.trim() || null,
        })
        targetId = created.id
      }

      let imageUrl = item?.imageUrl ?? null
      if (photoFile) {
        imageUrl = await uploadMenuItemPhoto(businessId, targetId, photoFile)
      }

      let referencePhotoUrl = item?.referencePhotoUrl ?? null
      if (referencePhotoFile) {
        referencePhotoUrl = await uploadReferencePhoto(businessId, targetId, referencePhotoFile)
      }

      const saved = await updateMenuItem(targetId, {
        name: name.trim(),
        category: category.trim() || null,
        unit: unit.trim() || null,
        unitCost: unitCost.trim() ? Number(unitCost) : null,
        sellingPrice: sellingPrice.trim() ? Number(sellingPrice) : null,
        imageUrl,
        referencePhotoUrl,
        ingredients: cleanIngredients,
      })

      onSaved(saved)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save dish.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted) {
    return null
  }

  return createPortal(
    <aside className="fixed inset-0 z-[70] flex flex-col overflow-hidden overscroll-contain bg-white animate-in slide-in-from-right-4 duration-300 xl:inset-x-auto xl:right-0 xl:w-[440px] xl:border-l xl:border-secondary/80 xl:shadow-[-24px_0_70px_rgba(35,88,62,0.14)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-secondary/70 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:hidden"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <p className="wg-eyebrow mb-0">{item ? t.editDishTitle : t.newDishTitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80 xl:grid"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        <div className="space-y-4">
          <div>
            <label className="wg-label">{t.dishPhoto}</label>
            <div className="mt-2 flex items-center gap-4">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-20 w-20 rounded-[0.5rem] object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-[0.5rem] bg-secondary text-muted-foreground">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-10 rounded-[0.5rem] text-xs font-black"
              >
                {imagePreview ? t.changePhoto : t.uploadPhoto}
              </Button>
            </div>
          </div>

          <div>
            <label className="wg-label">{t.referencePhoto}</label>
            <p className="wg-meta mt-1">{t.referencePhotoHelper}</p>
            <div className="mt-2 flex items-center gap-4">
              {referencePhotoPreview ? (
                <img src={referencePhotoPreview} alt="" className="h-20 w-20 rounded-[0.5rem] object-cover" />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-[0.5rem] bg-secondary text-muted-foreground">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
              )}
              <input
                ref={referenceFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReferencePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => referenceFileInputRef.current?.click()}
                className="h-10 rounded-[0.5rem] text-xs font-black"
              >
                {referencePhotoPreview ? t.changeReferencePhoto : t.uploadReferencePhoto}
              </Button>
            </div>
          </div>

          <div>
            <label className="wg-label">{t.dishName}</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} className="wg-control mt-2 border-secondary bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="wg-label">{t.dishCategory}</label>
              <Input value={category} onChange={(event) => setCategory(event.target.value)} className="wg-control mt-2 border-secondary bg-white" />
            </div>
            <div>
              <label className="wg-label">{t.dishUnit}</label>
              <Input value={unit} onChange={(event) => setUnit(event.target.value)} className="wg-control mt-2 border-secondary bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="wg-label">{t.dishUnitCost}</label>
              <Input
                type="number"
                inputMode="decimal"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className="wg-control mt-2 border-secondary bg-white"
              />
            </div>
            <div>
              <label className="wg-label">{t.dishSellingPrice}</label>
              <Input
                type="number"
                inputMode="decimal"
                value={sellingPrice}
                onChange={(event) => setSellingPrice(event.target.value)}
                className="wg-control mt-2 border-secondary bg-white"
              />
            </div>
          </div>

          <div>
            <label className="wg-label">{t.ingredientsLabel}</label>
            <p className="wg-meta mt-1">{t.ingredientsNote}</p>
            <div className="mt-3 space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={ingredient.name}
                    onChange={(event) => updateIngredientRow(index, { name: event.target.value })}
                    placeholder={t.ingredientNamePlaceholder}
                    className="wg-control border-secondary bg-white"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={ingredient.quantityPerPortion || ''}
                    onChange={(event) => updateIngredientRow(index, { quantityPerPortion: Number(event.target.value) })}
                    placeholder={t.ingredientQuantityPlaceholder}
                    className="wg-control w-20 shrink-0 border-secondary bg-white"
                  />
                  <Input
                    value={ingredient.unit}
                    onChange={(event) => updateIngredientRow(index, { unit: event.target.value })}
                    placeholder={t.ingredientUnitPlaceholder}
                    className="wg-control w-20 shrink-0 border-secondary bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredientRow(index)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[0.5rem] text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                    aria-label="Remove ingredient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={addIngredientRow} className="mt-3 h-10 rounded-[0.5rem] text-xs font-black">
              <Plus className="h-4 w-4" /> {t.addIngredient}
            </Button>
          </div>

          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        </div>
      </div>

      <div className="shrink-0 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_30px_rgba(41,91,67,0.08)] sm:px-6">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || isSaving}
          className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
        >
          {isSaving ? t.savingDish : t.saveDish}
        </Button>
      </div>
    </aside>,
    document.body,
  )
}

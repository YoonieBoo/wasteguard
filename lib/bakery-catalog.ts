import { getText, type Language } from '@/lib/i18n'
import type { FoodRow, IngredientEstimate } from '@/lib/mock-data'

// Widened from a closed union to `string` so real per-business menu items
// (arbitrary names/categories from CSV import or the Menu tab) can flow
// through the same BakeryItem shape as the 4 hardcoded demo dishes below.
export type BakeryCategory = string

export const bakeryImageFiles = [
  'breakfast_buffet',
  'fried_rice',
  'caesar_salad',
  'chicken_steak',
] as const

export const bakeryCategories: BakeryCategory[] = ['All', 'Buffet', 'Main Course', 'Salad']

export type BakeryImageFile = (typeof bakeryImageFiles)[number]
export type DemandLevel = 'High Demand' | 'Medium Demand' | 'Low Demand'
export type WasteRisk = 'Low waste risk' | 'Medium waste risk' | 'High waste risk'

type PreparationRecord = {
  category: Exclude<BakeryCategory, 'All'>
  prepQuantity: number
  prepUnit: string
  demandLevel: DemandLevel
  wasteRisk: WasteRisk
  ingredients: string[]
  usage: IngredientEstimate[]
  preparationNote: string
}

export type BakeryItem = {
  // Real dishes use their menu_items.id; the 4 demo dishes use their BakeryImageFile.
  fileName: string
  title: string
  // null when no photo has been uploaded yet (real dish with no Menu-tab photo) —
  // rendering code must fall back to a plain row/icon instead of an <img> tag.
  imageSrc: string | null
  category: Exclude<BakeryCategory, 'All'>
  demandRank: number
  prepQuantity: number
  prepUnit: string
  demandLevel: DemandLevel
  wasteRisk: WasteRisk
  ingredients: string[]
  ingredientUsage: IngredientEstimate[]
  preparationNote: string
}

const bakeryPreparationData: Record<Exclude<BakeryCategory, 'All'>, Partial<Record<BakeryImageFile, PreparationRecord>>> = {
  Buffet: {
    breakfast_buffet: {
      category: 'Buffet',
      prepQuantity: 320,
      prepUnit: 'portions',
      demandLevel: 'High Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Eggs', 'Bread', 'Fresh fruits', 'Yogurt', 'Cheese'],
      usage: [
        { name: 'Eggs', amount: '200 pcs' },
        { name: 'Bread', amount: '80 slices' },
        { name: 'Fresh fruits', amount: '15 kg' },
        { name: 'Yogurt', amount: '20 L' },
        { name: 'Cheese', amount: '5 kg' },
      ],
      preparationNote: 'Best set up before 7:00 AM',
    },
  },
  'Main Course': {
    fried_rice: {
      category: 'Main Course',
      prepQuantity: 95,
      prepUnit: 'plates',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Rice', 'Eggs', 'Spring onion', 'Soy sauce', 'Vegetables'],
      usage: [
        { name: 'Rice', amount: '9.5 kg' },
        { name: 'Eggs', amount: '95 pcs' },
        { name: 'Spring onion', amount: '1 kg' },
        { name: 'Soy sauce', amount: '2 L' },
        { name: 'Vegetables', amount: '4 kg' },
      ],
      preparationNote: 'Best prepared from 11:00 AM',
    },
    chicken_steak: {
      category: 'Main Course',
      prepQuantity: 72,
      prepUnit: 'plates',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Chicken breast', 'Butter', 'Garlic', 'Herbs', 'Black pepper sauce'],
      usage: [
        { name: 'Chicken breast', amount: '18 kg' },
        { name: 'Butter', amount: '1.5 kg' },
        { name: 'Garlic', amount: '500 g' },
        { name: 'Herbs', amount: '300 g' },
        { name: 'Black pepper sauce', amount: '4 L' },
      ],
      preparationNote: 'Best prepared from 11:30 AM',
    },
  },
  Salad: {
    caesar_salad: {
      category: 'Salad',
      prepQuantity: 55,
      prepUnit: 'plates',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Romaine lettuce', 'Parmesan', 'Croutons', 'Caesar dressing', 'Anchovies'],
      usage: [
        { name: 'Romaine lettuce', amount: '8 kg' },
        { name: 'Parmesan', amount: '2 kg' },
        { name: 'Croutons', amount: '3 kg' },
        { name: 'Caesar dressing', amount: '3 L' },
        { name: 'Anchovies', amount: '500 g' },
      ],
      preparationNote: 'Best prepared from 11:00 AM',
    },
  },
}

function getPreparationRecord(fileName: BakeryImageFile) {
  const category = bakeryCategories.find(
    (category): category is Exclude<BakeryCategory, 'All'> =>
      category !== 'All' && Boolean(bakeryPreparationData[category][fileName]),
  )

  if (!category) {
    throw new Error(`Missing preparation data for ${fileName}`)
  }

  return bakeryPreparationData[category][fileName] as PreparationRecord
}

export function cleanBakeryTitle(fileName: BakeryImageFile) {
  return fileName
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getBakeryItems(dailyInputs: FoodRow[] = [], prepDemand = 0): BakeryItem[] {
  void dailyInputs
  void prepDemand

  return bakeryImageFiles.map((fileName) => {
    const preparation = getPreparationRecord(fileName)

    return {
      fileName,
      title: cleanBakeryTitle(fileName),
      imageSrc: `/${fileName}.png`,
      category: preparation.category,
      demandRank: 0,
      prepQuantity: preparation.prepQuantity,
      prepUnit: preparation.prepUnit,
      demandLevel: preparation.demandLevel,
      wasteRisk: preparation.wasteRisk,
      ingredients: preparation.ingredients,
      ingredientUsage: preparation.usage,
      preparationNote: preparation.preparationNote,
    }
  })
    .sort((a, b) => b.prepQuantity - a.prepQuantity || getDemandWeight(b.demandLevel) - getDemandWeight(a.demandLevel))
    .map((item, index) => ({ ...item, demandRank: index + 1 }))
}

function getDemandWeight(level: DemandLevel) {
  if (level === 'High Demand') return 3
  if (level === 'Medium Demand') return 2
  return 1
}

export function translateCategory(category: BakeryCategory, language: Language) {
  const t = getText(language)
  const labels: Record<string, string> = {
    All: t.all,
    Buffet: t.buffet,
    'Main Course': t.mainCourse,
    Salad: t.salad,
  }
  // Real menu items can carry categories outside the 4 demo labels (e.g. "Dessert",
  // "Beverage") — show the raw category rather than an empty/undefined label.
  return labels[category] ?? category
}

export function translateDemandLevel(level: DemandLevel, language: Language) {
  const t = getText(language)

  if (level === 'High Demand') return t.highDemand
  if (level === 'Medium Demand') return t.mediumDemand
  return t.lowDemand
}

export function translateWasteRisk(risk: WasteRisk, language: Language) {
  const t = getText(language)

  if (risk === 'Low waste risk') return t.lowWasteRisk
  if (risk === 'Medium waste risk') return t.mediumWasteRisk
  return t.highWasteRisk
}

export function translatePrepUnit(unit: string, language: Language) {
  const t = getText(language)

  if (unit === 'portions') return t.portions
  if (unit === 'plates') return t.plates
  if (unit === 'pieces') return t.pieces
  if (unit === 'boxes') return t.boxes
  if (unit === 'slices') return t.slices
  return unit
}

export function translateIngredientName(name: string, language: Language) {
  if (language === 'en') {
    return name
  }

  const names: Record<string, string> = {
    Eggs: 'ไข่',
    Bread: 'ขนมปัง',
    'Fresh fruits': 'ผลไม้สด',
    Yogurt: 'โยเกิร์ต',
    Cheese: 'ชีส',
    Rice: 'ข้าว',
    'Spring onion': 'ต้นหอม',
    'Soy sauce': 'ซีอิ๊ว',
    Vegetables: 'ผัก',
    'Chicken breast': 'อกไก่',
    Butter: 'เนย',
    Garlic: 'กระเทียม',
    Herbs: 'สมุนไพร',
    'Black pepper sauce': 'ซอสพริกไทยดำ',
    'Romaine lettuce': 'ผักโรเมน',
    Parmesan: 'พาร์เมซาน',
    Croutons: 'ครูตอง',
    'Caesar dressing': 'ซีซาร์ดีสซิ่ง',
    Anchovies: 'ปลาแอนโชวี่',
  }

  return names[name] ?? name
}

export function translatePreparationNote(note: string, language: Language) {
  if (language === 'en') {
    return note
  }

  const notes: Record<string, string> = {
    'Best set up before 7:00 AM': 'ควรจัดเตรียมให้เสร็จก่อน 7:00 น.',
    'Best prepared from 11:00 AM': 'ควรเริ่มเตรียมตั้งแต่ 11:00 น.',
    'Best prepared from 11:30 AM': 'ควรเริ่มเตรียมตั้งแต่ 11:30 น.',
  }

  return notes[note] ?? note
}

// ── Real per-business menu data ────────────────────────────────────────────
// Builds the same BakeryItem shape the UI already knows how to render, but
// sourced from the owner's actual menu_items + the AI's real food-prep
// recommendations, instead of the 4 hardcoded demo dishes above.

export type RealMenuItemInput = {
  id: string
  name: string
  category: string | null
  unit?: string | null
  imageUrl?: string | null
  ingredients?: { name: string; quantityPerPortion: number; unit: string }[]
}

export type FoodPrepMatch = {
  menu_item: string
  category: string
  final_prep_recommendation: number
  demand_status: string
  waste_risk_status: string
}

function normalizeDemandLevel(status: string): DemandLevel {
  if (status === 'High Demand') return 'High Demand'
  if (status === 'Medium Demand') return 'Medium Demand'
  // Covers the engine's "Normal Demand" and any unrecognized status.
  return 'Low Demand'
}

function normalizeWasteRisk(status: string): WasteRisk {
  const normalized = status.toLowerCase()
  if (normalized.includes('high')) return 'High waste risk'
  if (normalized.includes('medium')) return 'Medium waste risk'
  return 'Low waste risk'
}

export function buildRealBakeryItems(menuItems: RealMenuItemInput[], foodPrepItems: FoodPrepMatch[]): BakeryItem[] {
  const foodPrepByName = new Map(foodPrepItems.map((item) => [item.menu_item.trim().toLowerCase(), item]))

  const items: BakeryItem[] = menuItems.map((menuItem) => {
    const match = foodPrepByName.get(menuItem.name.trim().toLowerCase())
    const ingredients = menuItem.ingredients ?? []

    return {
      fileName: menuItem.id,
      title: menuItem.name,
      imageSrc: menuItem.imageUrl ?? null,
      category: menuItem.category ?? match?.category ?? 'Uncategorized',
      demandRank: 0,
      prepQuantity: match?.final_prep_recommendation ?? 0,
      prepUnit: menuItem.unit ?? 'portions',
      demandLevel: match ? normalizeDemandLevel(match.demand_status) : 'Medium Demand',
      wasteRisk: match ? normalizeWasteRisk(match.waste_risk_status) : 'Low waste risk',
      ingredients: ingredients.map((i) => i.name),
      ingredientUsage: ingredients.map((i) => ({ name: i.name, amount: `${i.quantityPerPortion} ${i.unit}` })),
      preparationNote: '',
    }
  })

  return items
    .sort((a, b) => b.prepQuantity - a.prepQuantity || getDemandWeight(b.demandLevel) - getDemandWeight(a.demandLevel))
    .map((item, index) => ({ ...item, demandRank: index + 1 }))
}

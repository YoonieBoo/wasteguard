import { getText, type Language } from '@/lib/i18n'
import type { FoodRow, IngredientEstimate } from '@/lib/mock-data'

export type BakeryCategory = 'All' | 'Bread' | 'Cakes' | 'Snackbox' | 'Mealbox'

export const bakeryImageFiles = [
  'Assorted_8-Flavor_Cake',
  'Cereal_bun',
  'Classic_butter_cake',
  'Fresh_creaam_coconut_cake',
  'Hokkaido_milk',
  'Pandan_layer_cake',
  'Shio_pan',
  'snack_box1',
  'snack_box2',
  'meal_box1',
  'meal_box2',
] as const

export const bakeryCategories: BakeryCategory[] = ['All', 'Bread', 'Cakes', 'Snackbox', 'Mealbox']

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
  fileName: BakeryImageFile
  title: string
  imageSrc: string
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
  Bread: {
    Hokkaido_milk: {
      category: 'Bread',
      prepQuantity: 40,
      prepUnit: 'pieces',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Flour', 'Milk', 'Yeast', 'Butter', 'Sugar'],
      usage: [
        { name: 'Flour', amount: '4 kg' },
        { name: 'Milk', amount: '2 L' },
        { name: 'Yeast', amount: '180 g' },
        { name: 'Butter', amount: '1.2 kg' },
        { name: 'Sugar', amount: '650 g' },
      ],
      preparationNote: 'Best prepared before 8:00 AM',
    },
    Shio_pan: {
      category: 'Bread',
      prepQuantity: 48,
      prepUnit: 'pieces',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Flour', 'Milk', 'Yeast', 'Butter', 'Sugar', 'Sea salt'],
      usage: [
        { name: 'Flour', amount: '4.5 kg' },
        { name: 'Milk', amount: '1.8 L' },
        { name: 'Yeast', amount: '210 g' },
        { name: 'Butter', amount: '1.5 kg' },
        { name: 'Sugar', amount: '500 g' },
        { name: 'Sea salt', amount: '120 g' },
      ],
      preparationNote: 'Best prepared before 7:45 AM',
    },
    Cereal_bun: {
      category: 'Bread',
      prepQuantity: 36,
      prepUnit: 'pieces',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Flour', 'Milk', 'Yeast', 'Butter', 'Sugar', 'Cereal topping'],
      usage: [
        { name: 'Flour', amount: '3 kg' },
        { name: 'Milk', amount: '1.5 L' },
        { name: 'Yeast', amount: '150 g' },
        { name: 'Butter', amount: '900 g' },
        { name: 'Sugar', amount: '520 g' },
        { name: 'Cereal topping', amount: '900 g' },
      ],
      preparationNote: 'Best prepared before 8:15 AM',
    },
  },
  Cakes: {
    'Assorted_8-Flavor_Cake': {
      category: 'Cakes',
      prepQuantity: 24,
      prepUnit: 'slices',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Flour', 'Cream', 'Eggs', 'Butter', 'Sugar', 'Toppings'],
      usage: [
        { name: 'Flour', amount: '5 kg' },
        { name: 'Cream', amount: '3 L' },
        { name: 'Eggs', amount: '60 pcs' },
        { name: 'Butter', amount: '1.8 kg' },
        { name: 'Sugar', amount: '2.4 kg' },
        { name: 'Toppings', amount: '8 sets' },
      ],
      preparationNote: 'Best prepared before 9:00 AM',
    },
    Classic_butter_cake: {
      category: 'Cakes',
      prepQuantity: 32,
      prepUnit: 'slices',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Flour', 'Cream', 'Eggs', 'Butter', 'Sugar', 'Vanilla'],
      usage: [
        { name: 'Flour', amount: '4 kg' },
        { name: 'Cream', amount: '1 L' },
        { name: 'Eggs', amount: '42 pcs' },
        { name: 'Butter', amount: '2.2 kg' },
        { name: 'Sugar', amount: '1.8 kg' },
        { name: 'Vanilla', amount: '120 ml' },
      ],
      preparationNote: 'Best prepared before 8:30 AM',
    },
    Fresh_creaam_coconut_cake: {
      category: 'Cakes',
      prepQuantity: 28,
      prepUnit: 'slices',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Flour', 'Cream', 'Eggs', 'Butter', 'Sugar', 'Coconut topping'],
      usage: [
        { name: 'Flour', amount: '3.5 kg' },
        { name: 'Cream', amount: '2.4 L' },
        { name: 'Eggs', amount: '48 pcs' },
        { name: 'Butter', amount: '1.6 kg' },
        { name: 'Sugar', amount: '1.9 kg' },
        { name: 'Coconut topping', amount: '2 kg' },
      ],
      preparationNote: 'Best prepared before 10:00 AM',
    },
    Pandan_layer_cake: {
      category: 'Cakes',
      prepQuantity: 30,
      prepUnit: 'slices',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Flour', 'Cream', 'Eggs', 'Butter', 'Sugar', 'Pandan'],
      usage: [
        { name: 'Flour', amount: '3 kg' },
        { name: 'Cream', amount: '1.8 L' },
        { name: 'Eggs', amount: '44 pcs' },
        { name: 'Butter', amount: '1.4 kg' },
        { name: 'Sugar', amount: '1.7 kg' },
        { name: 'Pandan', amount: '800 g' },
      ],
      preparationNote: 'Best prepared before 9:30 AM',
    },
  },
  Snackbox: {
    snack_box1: {
      category: 'Snackbox',
      prepQuantity: 45,
      prepUnit: 'boxes',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Sandwiches', 'Snacks', 'Fruits', 'Dessert items', 'Packaging'],
      usage: [
        { name: 'Sandwiches', amount: '45 pcs' },
        { name: 'Snacks', amount: '90 packs' },
        { name: 'Fruits', amount: '45 cups' },
        { name: 'Dessert items', amount: '45 pcs' },
        { name: 'Packaging', amount: '45 boxes' },
      ],
      preparationNote: 'Best assembled before 10:30 AM',
    },
    snack_box2: {
      category: 'Snackbox',
      prepQuantity: 38,
      prepUnit: 'boxes',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Sandwiches', 'Snacks', 'Fruits', 'Dessert items', 'Packaging'],
      usage: [
        { name: 'Sandwiches', amount: '38 pcs' },
        { name: 'Snacks', amount: '76 packs' },
        { name: 'Fruits', amount: '38 cups' },
        { name: 'Dessert items', amount: '38 pcs' },
        { name: 'Packaging', amount: '38 boxes' },
      ],
      preparationNote: 'Best assembled before 10:00 AM',
    },
  },
  Mealbox: {
    meal_box1: {
      category: 'Mealbox',
      prepQuantity: 55,
      prepUnit: 'boxes',
      demandLevel: 'High Demand',
      wasteRisk: 'Low waste risk',
      ingredients: ['Rice', 'Salmon', 'Mixed vegetables', 'Sauce packets', 'Egg'],
      usage: [
        { name: 'Rice', amount: '6 kg' },
        { name: 'Salmon', amount: '55 fillets' },
        { name: 'Vegetables', amount: '4 kg' },
        { name: 'Sauce', amount: '55 packs' },
        { name: 'Eggs', amount: '55 pcs' },
      ],
      preparationNote: 'Best assembled before 11:00 AM',
    },
    meal_box2: {
      category: 'Mealbox',
      prepQuantity: 50,
      prepUnit: 'boxes',
      demandLevel: 'Medium Demand',
      wasteRisk: 'Medium waste risk',
      ingredients: ['Fried chicken', 'Rice', 'Salad', 'Sauce', 'Egg'],
      usage: [
        { name: 'Fried chicken', amount: '50 pcs' },
        { name: 'Rice', amount: '5.5 kg' },
        { name: 'Salad', amount: '3.5 kg' },
        { name: 'Sauce', amount: '50 cups' },
        { name: 'Eggs', amount: '50 pcs' },
      ],
      preparationNote: 'Best assembled before 11:15 AM',
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
    .replace(/creaam/gi, 'cream')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])(\d)/gi, '$1 $2')
    .replace(/\s+/g, ' ')
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
  const labels: Record<BakeryCategory, string> = {
    All: t.all,
    Bread: t.bread,
    Cakes: t.cakes,
    Snackbox: t.snackbox,
    Mealbox: t.mealbox,
  }

  return labels[category]
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
    Flour: 'แป้ง',
    Milk: 'นม',
    Yeast: 'ยีสต์',
    Butter: 'เนย',
    Sugar: 'น้ำตาล',
    'Sea salt': 'เกลือทะเล',
    'Cereal topping': 'ซีเรียลท็อปปิง',
    Cream: 'ครีม',
    Eggs: 'ไข่',
    Toppings: 'ท็อปปิง',
    Vanilla: 'วานิลลา',
    'Coconut topping': 'มะพร้าวท็อปปิง',
    Pandan: 'ใบเตย',
    Sandwiches: 'แซนด์วิช',
    Snacks: 'ขนมขบเคี้ยว',
    Fruits: 'ผลไม้',
    'Dessert items': 'ของหวาน',
    Packaging: 'บรรจุภัณฑ์',
    Rice: 'ข้าว',
    Salmon: 'แซลมอน',
    Vegetables: 'ผัก',
    Sauce: 'ซอส',
    'Fried chicken': 'ไก่ทอด',
    Salad: 'สลัด',
  }

  return names[name] ?? name
}

export function translatePreparationNote(note: string, language: Language) {
  if (language === 'en') {
    return note
  }

  const notes: Record<string, string> = {
    'Best prepared before 8:00 AM': 'ควรเตรียมให้เสร็จก่อน 8:00 น.',
    'Best prepared before 7:45 AM': 'ควรเตรียมให้เสร็จก่อน 7:45 น.',
    'Best prepared before 8:15 AM': 'ควรเตรียมให้เสร็จก่อน 8:15 น.',
    'Best prepared before 9:00 AM': 'ควรเตรียมให้เสร็จก่อน 9:00 น.',
    'Best prepared before 8:30 AM': 'ควรเตรียมให้เสร็จก่อน 8:30 น.',
    'Best prepared before 10:00 AM': 'ควรเตรียมให้เสร็จก่อน 10:00 น.',
    'Best prepared before 9:30 AM': 'ควรเตรียมให้เสร็จก่อน 9:30 น.',
    'Best assembled before 10:30 AM': 'ควรประกอบให้เสร็จก่อน 10:30 น.',
    'Best assembled before 10:00 AM': 'ควรประกอบให้เสร็จก่อน 10:00 น.',
    'Best assembled before 11:00 AM': 'ควรประกอบให้เสร็จก่อน 11:00 น.',
    'Best assembled before 11:15 AM': 'ควรประกอบให้เสร็จก่อน 11:15 น.',
  }

  return notes[note] ?? note
}

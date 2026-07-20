'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getText, type Language } from '@/lib/i18n'

// Values stay in English (stored as-is in bakeries.business_type) — only the
// displayed label is translated, via BUSINESS_TYPE_LABEL_KEYS below.
const BUSINESS_TYPES = ['Restaurant', 'Hotel', 'Café', 'Bakery', 'Food Stall', 'Other'] as const

const BUSINESS_TYPE_LABEL_KEYS: Record<(typeof BUSINESS_TYPES)[number], 'businessTypeRestaurant' | 'businessTypeHotel' | 'businessTypeCafe' | 'businessTypeBakeryType' | 'businessTypeFoodStall' | 'businessTypeOther'> = {
  Restaurant: 'businessTypeRestaurant',
  Hotel: 'businessTypeHotel',
  Café: 'businessTypeCafe',
  Bakery: 'businessTypeBakeryType',
  'Food Stall': 'businessTypeFoodStall',
  Other: 'businessTypeOther',
}

export type BusinessDetailsFormValues = {
  businessName: string
  businessType: string
  numberOfBranches: string
  operatingHours: string
  numberOfStaff: string
  seatingCapacity: string
}

interface BusinessDetailsStepProps {
  language: Language
  initialValues: BusinessDetailsFormValues
  isSaving: boolean
  error: string
  onContinue: (values: BusinessDetailsFormValues) => void
}

export function BusinessDetailsStep({ language, initialValues, isSaving, error, onContinue }: BusinessDetailsStepProps) {
  const t = getText(language)
  const [values, setValues] = useState(initialValues)

  function update<K extends keyof BusinessDetailsFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const canContinue = Boolean(
    values.businessName.trim() &&
      values.businessType &&
      values.numberOfBranches.trim() &&
      values.operatingHours.trim() &&
      values.numberOfStaff.trim(),
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canContinue && !isSaving) onContinue(values)
      }}
      className="rounded-[0.75rem] bg-secondary/70 p-4 md:p-5"
    >
      <div className="space-y-3">
        <div>
          <label className="wg-label mb-1.5 block" htmlFor="business-name">
            {t.businessNameLabel}
          </label>
          <Input
            id="business-name"
            value={values.businessName}
            onChange={(event) => update('businessName', event.target.value)}
            placeholder={t.businessNamePlaceholder}
            className="wg-control border-secondary bg-white"
          />
        </div>

        <div>
          <label className="wg-label mb-1.5 block" htmlFor="business-type">
            {t.businessTypeLabel}
          </label>
          <Select value={values.businessType} onValueChange={(value) => update('businessType', value)}>
            <SelectTrigger id="business-type" className="wg-control w-full border-secondary bg-white">
              <SelectValue placeholder={t.businessTypePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t[BUSINESS_TYPE_LABEL_KEYS[type]]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="wg-label mb-1.5 block" htmlFor="branches">
              {t.numberOfBranchesLabel}
            </label>
            <Input
              id="branches"
              type="number"
              min="1"
              inputMode="numeric"
              value={values.numberOfBranches}
              onChange={(event) => update('numberOfBranches', event.target.value)}
              placeholder="1"
              className="wg-control border-secondary bg-white"
            />
          </div>
          <div>
            <label className="wg-label mb-1.5 block" htmlFor="staff">
              {t.numberOfStaffLabel}
            </label>
            <Input
              id="staff"
              type="number"
              min="0"
              inputMode="numeric"
              value={values.numberOfStaff}
              onChange={(event) => update('numberOfStaff', event.target.value)}
              placeholder="5"
              className="wg-control border-secondary bg-white"
            />
          </div>
        </div>

        <div>
          <label className="wg-label mb-1.5 block" htmlFor="hours">
            {t.operatingHoursLabel}
          </label>
          <Input
            id="hours"
            value={values.operatingHours}
            onChange={(event) => update('operatingHours', event.target.value)}
            placeholder={t.operatingHoursPlaceholder}
            className="wg-control border-secondary bg-white"
          />
        </div>

        <div>
          <label className="wg-label mb-1.5 block" htmlFor="seating">
            {t.seatingCapacityLabel}
          </label>
          <Input
            id="seating"
            type="number"
            min="0"
            inputMode="numeric"
            value={values.seatingCapacity}
            onChange={(event) => update('seatingCapacity', event.target.value)}
            placeholder={t.seatingCapacityPlaceholder}
            className="wg-control border-secondary bg-white"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={!canContinue || isSaving}
        className="wg-action mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45"
      >
        {isSaving ? t.savingEllipsis : t.continueButton}
      </Button>
    </form>
  )
}

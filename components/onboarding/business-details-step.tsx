'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const BUSINESS_TYPES = ['Restaurant', 'Hotel', 'Café', 'Bakery', 'Food Stall', 'Other']

export type BusinessDetailsFormValues = {
  businessName: string
  businessType: string
  numberOfBranches: string
  operatingHours: string
  numberOfStaff: string
  seatingCapacity: string
}

interface BusinessDetailsStepProps {
  initialValues: BusinessDetailsFormValues
  isSaving: boolean
  error: string
  onContinue: (values: BusinessDetailsFormValues) => void
}

export function BusinessDetailsStep({ initialValues, isSaving, error, onContinue }: BusinessDetailsStepProps) {
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
            Business name
          </label>
          <Input
            id="business-name"
            value={values.businessName}
            onChange={(event) => update('businessName', event.target.value)}
            placeholder="e.g. Green Leaf Restaurant"
            className="wg-control border-secondary bg-white"
          />
        </div>

        <div>
          <label className="wg-label mb-1.5 block" htmlFor="business-type">
            Business type
          </label>
          <Select value={values.businessType} onValueChange={(value) => update('businessType', value)}>
            <SelectTrigger id="business-type" className="wg-control w-full border-secondary bg-white">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="wg-label mb-1.5 block" htmlFor="branches">
              Number of branches
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
              Number of staff
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
            Operating hours
          </label>
          <Input
            id="hours"
            value={values.operatingHours}
            onChange={(event) => update('operatingHours', event.target.value)}
            placeholder="e.g. 9:00 AM - 10:00 PM"
            className="wg-control border-secondary bg-white"
          />
        </div>

        <div>
          <label className="wg-label mb-1.5 block" htmlFor="seating">
            Seating capacity (optional)
          </label>
          <Input
            id="seating"
            type="number"
            min="0"
            inputMode="numeric"
            value={values.seatingCapacity}
            onChange={(event) => update('seatingCapacity', event.target.value)}
            placeholder="e.g. 40"
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
        {isSaving ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  )
}

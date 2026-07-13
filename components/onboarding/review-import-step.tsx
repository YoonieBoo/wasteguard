'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WASTE_GUARD_FIELDS, REQUIRED_FIELDS, type ColumnMapping, type ImportSummary, type ParsedFile } from '@/lib/onboarding/types'
import { FIELD_LABELS, autoDetectColumnMapping } from '@/lib/onboarding/field-mapping'
import { buildValidatedRows, summarizeValidation, getImportableRows } from '@/lib/onboarding/validate-rows'
import { importValidatedRows, type ImportProgress } from '@/lib/onboarding/import-data'

interface ReviewImportStepProps {
  parsedFile: ParsedFile
  businessId: string
  onCancel: () => void
  onChangeFile: () => void
  onImported: (summary: ImportSummary) => void
}

export function ReviewImportStep({ parsedFile, businessId, onCancel, onChangeFile, onImported }: ReviewImportStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => autoDetectColumnMapping(parsedFile.headers))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const validatedRows = useMemo(() => buildValidatedRows(parsedFile.rows, mapping), [parsedFile.rows, mapping])
  const summary = useMemo(() => summarizeValidation(validatedRows), [validatedRows])
  const importableRows = useMemo(() => getImportableRows(validatedRows), [validatedRows])
  const previewRows = validatedRows.slice(0, 10)

  function updateMapping(field: (typeof WASTE_GUARD_FIELDS)[number], header: string) {
    setMapping((current) => ({ ...current, [field]: header === '__none__' ? null : header }))
  }

  async function handleConfirm() {
    if (isSubmitting || importableRows.length === 0) return
    setIsSubmitting(true)
    setError('')
    try {
      const result = await importValidatedRows({
        businessId,
        fileName: parsedFile.fileName,
        fileType: parsedFile.fileType,
        totalRows: validatedRows.length,
        importableRows,
        onProgress: setProgress,
      })
      onImported(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  const skippedCount = summary.invalidRows + summary.duplicateRows

  return (
    <div className="space-y-4">
      <div className="rounded-[0.75rem] bg-white p-4 shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
        <p className="wg-card-title">
          {skippedCount === 0
            ? `${summary.validRows} of ${summary.totalRows} rows are ready to import.`
            : `${summary.validRows} of ${summary.totalRows} rows are ready to import — ${skippedCount} will be skipped.`}
        </p>
        <p className="wg-body mt-1">
          {skippedCount === 0
            ? "Waste Guard matched your file's columns automatically."
            : 'Some rows had missing or invalid data and will be skipped automatically.'}
        </p>
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          className="mt-3 text-xs font-black text-primary underline underline-offset-2"
        >
          {showDetails ? 'Hide column mapping & row details' : 'Show column mapping & row details'}
        </button>
      </div>

      {showDetails && (
        <>
          <div className="rounded-[0.75rem] bg-white p-4 shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            <p className="wg-card-title mb-3">Match your columns</p>
            <div className="space-y-2.5">
              {WASTE_GUARD_FIELDS.map((field) => (
                <div key={field} className="flex items-center justify-between gap-3">
                  <label className="wg-label">
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
                  </label>
                  <Select value={mapping[field] ?? '__none__'} onValueChange={(value) => updateMapping(field, value)}>
                    <SelectTrigger className="h-10 w-[55%] border-secondary bg-white text-xs font-bold">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not mapped</SelectItem>
                      {parsedFile.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip label="Valid rows" value={summary.validRows} tone="good" />
            <SummaryChip label="Invalid rows" value={summary.invalidRows} tone="bad" />
            <SummaryChip label="Duplicates" value={summary.duplicateRows} tone="warn" />
            <SummaryChip label="Total rows" value={summary.totalRows} tone="neutral" />
          </div>

          {(summary.missingRequiredCount > 0 ||
            summary.negativeQuantityCount > 0 ||
            summary.soldExceedsPreparedCount > 0 ||
            summary.invalidDateCount > 0) && (
            <div className="space-y-1 rounded-[0.75rem] bg-white p-4 text-sm font-bold text-muted-foreground shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
              {summary.missingRequiredCount > 0 && <p>• {summary.missingRequiredCount} row(s) missing a required field</p>}
              {summary.invalidDateCount > 0 && <p>• {summary.invalidDateCount} row(s) with an invalid date</p>}
              {summary.negativeQuantityCount > 0 && <p>• {summary.negativeQuantityCount} row(s) with a negative quantity</p>}
              {summary.soldExceedsPreparedCount > 0 && (
                <p>• {summary.soldExceedsPreparedCount} row(s) where sold is greater than prepared (still imported)</p>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-[0.75rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-secondary text-muted-foreground">
                  <th className="px-3 py-2 font-black">Status</th>
                  <th className="px-3 py-2 font-black">Date</th>
                  <th className="px-3 py-2 font-black">Menu Item</th>
                  <th className="px-3 py-2 font-black">Prepared</th>
                  <th className="px-3 py-2 font-black">Sold</th>
                  <th className="px-3 py-2 font-black">Leftover</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.normalized.rowNumber} className="border-b border-secondary/60 last:border-0">
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          row.validation.isDuplicate
                            ? 'bg-amber-100 text-amber-700'
                            : row.validation.isValid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.validation.isDuplicate ? 'Duplicate' : row.validation.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.normalized.date ?? '—'}</td>
                    <td className="px-3 py-2">{row.normalized.menu_item ?? '—'}</td>
                    <td className="px-3 py-2">{row.normalized.prepared_quantity ?? '—'}</td>
                    <td className="px-3 py-2">{row.normalized.sold_quantity ?? '—'}</td>
                    <td className="px-3 py-2">{row.normalized.leftover_quantity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="wg-meta">
            Showing first {previewRows.length} of {summary.totalRows} rows. Invalid and duplicate rows are skipped automatically.
          </p>
        </>
      )}

      {isSubmitting && progress && (
        <div className="rounded-[0.75rem] bg-white p-4 shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
          <p className="wg-meta mb-2">
            {progress.phase === 'menu-items' && 'Saving menu items...'}
            {progress.phase === 'daily-operations' && 'Saving historical data...'}
            {progress.phase === 'finalizing' && 'Finishing up...'}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm font-bold text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-[3.25rem] flex-1 rounded-[0.5rem] bg-white text-sm font-black text-foreground shadow-sm hover:bg-secondary"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onChangeFile}
          disabled={isSubmitting}
          className="h-[3.25rem] flex-1 rounded-[0.5rem] bg-white text-sm font-black text-foreground shadow-sm hover:bg-secondary"
        >
          Change file
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting || importableRows.length === 0}
          className="h-[3.25rem] flex-1 rounded-[0.5rem] bg-primary text-sm font-black text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-45"
        >
          {isSubmitting ? 'Importing...' : `Confirm import (${importableRows.length})`}
        </Button>
      </div>
    </div>
  )
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: 'good' | 'bad' | 'warn' | 'neutral' }) {
  const toneClass = {
    good: 'bg-emerald-50 text-emerald-700',
    bad: 'bg-red-50 text-red-700',
    warn: 'bg-amber-50 text-amber-700',
    neutral: 'bg-secondary text-foreground',
  }[tone]

  return (
    <div className={`rounded-[0.75rem] p-3 text-center ${toneClass}`}>
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-normal">{label}</p>
    </div>
  )
}

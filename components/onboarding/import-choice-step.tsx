'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ACCEPTED_EXTENSIONS, validateFileBeforeParse } from '@/lib/onboarding/parse-file'
import { downloadSampleTemplate } from '@/lib/onboarding/sample-template'

interface ImportChoiceStepProps {
  onFileSelected: (file: File) => void
  onStartManually: () => void
  isProcessing: boolean
}

export function ImportChoiceStep({ onFileSelected, onStartManually, isProcessing }: ImportChoiceStepProps) {
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined | null) {
    if (!file) return
    const validationError = validateFileBeforeParse(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    onFileSelected(file)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
        className={`rounded-[0.75rem] border-2 border-dashed p-6 text-center transition ${
          isDragging ? 'border-primary bg-secondary/40' : 'border-secondary bg-secondary/20'
        }`}
      >
        <p className="wg-card-title">Import existing data</p>
        <p className="wg-body mt-1">Drag and drop a file here, or choose one from your computer.</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="wg-action mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-45 sm:w-auto sm:px-8"
        >
          {isProcessing ? 'Reading file...' : 'Choose file'}
        </Button>

        <p className="wg-meta mt-3">Supported formats: .csv, .xlsx, .xls (up to 5 MB)</p>
        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="mt-2 text-xs font-black text-primary underline underline-offset-2"
        >
          Download sample template
        </button>

        {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-secondary" />
        <span className="wg-meta">or</span>
        <div className="h-px flex-1 bg-secondary" />
      </div>

      <button
        type="button"
        onClick={onStartManually}
        disabled={isProcessing}
        className="w-full rounded-[0.75rem] bg-secondary/70 p-4 text-left shadow-sm transition hover:bg-secondary disabled:opacity-45"
      >
        <p className="wg-card-title">Start manually</p>
        <p className="wg-body mt-1">Skip the upload — enter daily data in Waste Guard whenever you&apos;re ready.</p>
      </button>
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ACCEPTED_EXTENSIONS, validateFileBeforeParse } from '@/lib/onboarding/parse-file'
import { downloadSampleTemplate } from '@/lib/onboarding/sample-template'
import { getText, type Language } from '@/lib/i18n'

interface ImportChoiceStepProps {
  language: Language
  onFileSelected: (file: File) => void
  onStartManually: () => void
  isProcessing: boolean
}

export function ImportChoiceStep({ language, onFileSelected, onStartManually, isProcessing }: ImportChoiceStepProps) {
  const t = getText(language)
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
        <p className="wg-card-title">{t.importExistingData}</p>
        <p className="wg-body mt-1">{t.importDragDrop}</p>

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
          {isProcessing ? t.readingFile : t.chooseFile}
        </Button>

        <p className="wg-meta mt-3">{t.supportedFormats}</p>
        <button
          type="button"
          onClick={downloadSampleTemplate}
          className="mt-2 text-xs font-black text-primary underline underline-offset-2"
        >
          {t.downloadSampleTemplateLabel}
        </button>

        {error && <p className="mt-3 text-sm font-bold text-destructive">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-secondary" />
        <span className="wg-meta">{t.orDivider}</span>
        <div className="h-px flex-1 bg-secondary" />
      </div>

      <button
        type="button"
        onClick={onStartManually}
        disabled={isProcessing}
        className="w-full rounded-[0.75rem] bg-secondary/70 p-4 text-left shadow-sm transition hover:bg-secondary disabled:opacity-45"
      >
        <p className="wg-card-title">{t.startManuallyTitle}</p>
        <p className="wg-body mt-1">{t.startManuallyNote}</p>
      </button>
    </div>
  )
}

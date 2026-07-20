'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureOwnerOrStaffProfile } from '@/lib/profile'
import { OnboardingShell } from '@/components/onboarding/onboarding-progress'
import { BusinessDetailsStep, type BusinessDetailsFormValues } from '@/components/onboarding/business-details-step'
import { ImportChoiceStep } from '@/components/onboarding/import-choice-step'
import { ReviewImportStep } from '@/components/onboarding/review-import-step'
import { SetupCompleteStep } from '@/components/onboarding/setup-complete-step'
import { parseImportFile } from '@/lib/onboarding/parse-file'
import type { ImportSummary, ParsedFile } from '@/lib/onboarding/types'
import { getText, type Language } from '@/lib/i18n'

type OnboardingStepNumber = 1 | 2 | 3 | 4

const languageKey = 'wasteGuardLanguage'

const EMPTY_DETAILS: BusinessDetailsFormValues = {
  businessName: '',
  businessType: '',
  numberOfBranches: '',
  operatingHours: '',
  numberOfStaff: '',
  seatingCapacity: '',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const t = getText(language)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [step, setStep] = useState<OnboardingStepNumber>(1)

  const [detailsValues, setDetailsValues] = useState<BusinessDetailsFormValues>(EMPTY_DETAILS)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const [isParsingFile, setIsParsingFile] = useState(false)
  const [isStartingManually, setIsStartingManually] = useState(false)
  const [fileError, setFileError] = useState('')
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageKey)
    if (savedLanguage === 'en' || savedLanguage === 'th') setLanguage(savedLanguage)
  }, [])

  function toggleLanguage() {
    const nextLanguage = language === 'en' ? 'th' : 'en'
    setLanguage(nextLanguage)
    window.localStorage.setItem(languageKey, nextLanguage)
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      setIsLoading(true)
      setLoadError('')

      try {
        const { data } = await supabase.auth.getUser()
        if (cancelled) return
        if (!data.user) {
          router.replace('/login')
          return
        }

        // Defensive: guarantees a bakery row exists even if this is the very
        // first request after signup, before any other page has provisioned it.
        const profile = await ensureOwnerOrStaffProfile(data.user)
        if (cancelled) return

        if (profile.role === 'staff' || profile.onboardingCompleted) {
          router.replace('/dashboard')
          return
        }

        setBusinessId(profile.bakeryId)

        const { data: bakery } = await supabase
          .from('bakeries')
          .select('bakery_name, business_type, number_of_branches, operating_hours, number_of_staff, seating_capacity')
          .eq('id', profile.bakeryId)
          .single()

        if (bakery && !cancelled) {
          setDetailsValues({
            businessName: bakery.bakery_name ?? '',
            businessType: bakery.business_type ?? '',
            numberOfBranches: bakery.number_of_branches != null ? String(bakery.number_of_branches) : '',
            operatingHours: bakery.operating_hours ?? '',
            numberOfStaff: bakery.number_of_staff != null ? String(bakery.number_of_staff) : '',
            seatingCapacity: bakery.seating_capacity != null ? String(bakery.seating_capacity) : '',
          })
        }
      } catch (error) {
        console.error('Unable to load onboarding profile', error)
        if (!cancelled) setLoadError(t.onboardingLoadError)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [router, retryCount])

  async function handleDetailsContinue(values: BusinessDetailsFormValues) {
    if (!businessId) return
    setIsSavingDetails(true)
    setDetailsError('')

    const { error } = await supabase
      .from('bakeries')
      .update({
        bakery_name: values.businessName.trim(),
        business_type: values.businessType,
        number_of_branches: Number(values.numberOfBranches),
        operating_hours: values.operatingHours.trim(),
        number_of_staff: Number(values.numberOfStaff),
        seating_capacity: values.seatingCapacity.trim() ? Number(values.seatingCapacity) : null,
      })
      .eq('id', businessId)

    setIsSavingDetails(false)

    if (error) {
      setDetailsError(t.onboardingDetailsError)
      return
    }

    setDetailsValues(values)
    setStep(2)
  }

  async function handleStartManually() {
    if (!businessId || isStartingManually) return
    setIsStartingManually(true)
    setFileError('')

    const { error } = await supabase.from('bakeries').update({ onboarding_completed: true }).eq('id', businessId)

    if (error) {
      setIsStartingManually(false)
      setFileError(t.onboardingStartManuallyError)
      return
    }

    router.push('/dashboard')
  }

  async function handleFileSelected(file: File) {
    setIsParsingFile(true)
    setFileError('')
    try {
      const parsed = await parseImportFile(file)
      if (parsed.rows.length === 0) {
        setFileError(t.onboardingNoRowsFound)
        return
      }
      setParsedFile(parsed)
      setStep(3)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : t.onboardingFileReadError)
    } finally {
      setIsParsingFile(false)
    }
  }

  function handleImported(summary: ImportSummary) {
    setImportSummary(summary)
    setStep(4)
  }

  function backToImportChoice() {
    setParsedFile(null)
    setStep(2)
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-sm font-bold text-destructive">{loadError}</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="h-[3.25rem] rounded-[0.5rem] bg-primary px-6 text-sm font-black text-primary-foreground shadow-sm sm:text-base"
        >
          {t.onboardingTryAgain}
        </button>
      </div>
    )
  }

  if (isLoading || !businessId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    )
  }

  if (step === 1) {
    return (
      <OnboardingShell
        step={1}
        totalSteps={4}
        title={t.onboardingStep1Title}
        subtitle={t.onboardingStep1Subtitle}
        language={language}
        onToggleLanguage={toggleLanguage}
      >
        <BusinessDetailsStep
          language={language}
          initialValues={detailsValues}
          isSaving={isSavingDetails}
          error={detailsError}
          onContinue={handleDetailsContinue}
        />
      </OnboardingShell>
    )
  }

  if (step === 2) {
    return (
      <OnboardingShell
        step={2}
        totalSteps={4}
        title={t.onboardingStep2Title}
        subtitle={t.onboardingStep2Subtitle}
        language={language}
        onToggleLanguage={toggleLanguage}
      >
        <ImportChoiceStep
          language={language}
          onFileSelected={handleFileSelected}
          onStartManually={handleStartManually}
          isProcessing={isParsingFile || isStartingManually}
        />
        {fileError && <p className="mt-3 text-sm font-bold text-destructive">{fileError}</p>}
        <button
          type="button"
          onClick={() => setStep(1)}
          className="mt-4 h-[3.25rem] w-full rounded-[0.5rem] bg-white text-sm font-black text-foreground shadow-sm hover:bg-secondary sm:text-base"
        >
          {t.onboardingBack}
        </button>
      </OnboardingShell>
    )
  }

  if (step === 3 && parsedFile) {
    return (
      <OnboardingShell
        step={3}
        totalSteps={4}
        title={t.onboardingStep3Title}
        subtitle={t.onboardingStep3Subtitle}
        language={language}
        onToggleLanguage={toggleLanguage}
      >
        <ReviewImportStep
          language={language}
          parsedFile={parsedFile}
          businessId={businessId}
          onCancel={backToImportChoice}
          onChangeFile={backToImportChoice}
          onImported={handleImported}
        />
      </OnboardingShell>
    )
  }

  if (step === 4 && importSummary) {
    return (
      <OnboardingShell
        step={4}
        totalSteps={4}
        title={t.onboardingStep4Title}
        subtitle={
          importSummary.distinctDayCount > 0
            ? t.onboardingStep4SubtitleWithData
                .replace('{count}', String(importSummary.distinctDayCount))
                .replace('{plural}', importSummary.distinctDayCount === 1 ? '' : 's')
            : t.onboardingStep4SubtitleNoData
        }
        language={language}
        onToggleLanguage={toggleLanguage}
      >
        <SetupCompleteStep
          language={language}
          summary={importSummary}
          onContinue={() => router.push('/dashboard')}
          onAddMoreData={backToImportChoice}
        />
      </OnboardingShell>
    )
  }

  return null
}

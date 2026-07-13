import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { ParsedFile, RawImportRow } from './types'

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

export function getFileExtension(fileName: string): 'csv' | 'xlsx' | 'xls' | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx')) return 'xlsx'
  if (lower.endsWith('.xls')) return 'xls'
  return null
}

/** Cheap checks before we touch the file contents at all. */
export function validateFileBeforeParse(file: File): string | null {
  const fileType = getFileExtension(file.name)
  if (!fileType) {
    return 'Unsupported file type. Please upload a .csv, .xlsx, or .xls file.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File is too large. Please upload a file under 5 MB.'
  }
  if (file.size === 0) {
    return 'This file is empty.'
  }
  return null
}

function parseCsv(file: File): Promise<{ headers: string[]; rows: RawImportRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? []
        resolve({ headers, rows: results.data })
      },
      error: (error) => reject(error),
    })
  })
}

async function parseExcel(file: File): Promise<{ headers: string[]; rows: RawImportRow[] }> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '', raw: false })
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  return { headers, rows }
}

/** Parses the file entirely in the browser — nothing is uploaded to a server for this step. */
export async function parseImportFile(file: File): Promise<ParsedFile> {
  const fileType = getFileExtension(file.name)
  if (!fileType) {
    throw new Error('Unsupported file type.')
  }

  const { headers, rows } = fileType === 'csv' ? await parseCsv(file) : await parseExcel(file)

  return {
    fileName: file.name,
    fileType,
    headers,
    rows,
  }
}

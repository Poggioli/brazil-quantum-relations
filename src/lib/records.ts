import { format, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { z } from 'zod'

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = parseISO(value)
  return isValid(date) && format(date, 'yyyy-MM-dd') === value
}, 'Data inválida')

const recordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  link: z.url().refine(value => /^https?:\/\//.test(value), 'Use HTTP ou HTTPS'),
  type: z.enum(['news', 'agreement']),
  date: calendarDate,
  country: z.string().regex(/^[A-Z]{2}$/),
  description: z.string().optional(),
  source: z.string().optional(),
})

export type RecordItem = z.infer<typeof recordSchema>
export type RecordType = 'all' | RecordItem['type']
export type Filters = { year: string; month: string; type: RecordType }
export const allFilters: Filters = { year: '', month: '', type: 'all' }

export function parseRecords(value: unknown, knownCountries: Set<string>): RecordItem[] {
  const records = z.array(recordSchema).parse(value)
  const ids = new Set<string>()
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`ID duplicado: ${record.id}`)
    if (!knownCountries.has(record.country)) throw new Error(`País não reconhecido: ${record.country}`)
    ids.add(record.id)
  }
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

export function formatDate(value: string) {
  return format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search)
  const year = params.get('year') ?? ''
  const month = params.get('month') ?? ''
  const type = params.get('type') ?? 'all'
  return {
    year: /^\d{4}$/.test(year) ? year : '',
    month: /^(0[1-9]|1[0-2])$/.test(month) && /^\d{4}$/.test(year) ? month : '',
    type: type === 'news' || type === 'agreement' ? type : 'all',
  }
}

export function writeFilters(filters: Filters, replace = false) {
  const params = new URLSearchParams()
  if (filters.year) params.set('year', filters.year)
  if (filters.month && filters.year) params.set('month', filters.month)
  if (filters.type !== 'all') params.set('type', filters.type)
  const url = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url)
  }
}

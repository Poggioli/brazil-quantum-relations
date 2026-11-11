import { Filter, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'
import { BottomSheet } from './bottom-sheet'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import type { Filters } from '../lib/records'

function FiltersContent({ filters, years, onChange, onClear }: { filters: Filters; years: string[]; onChange: (next: Filters) => void; onClear: () => void }) {
  const period = !filters.year ? 'all' : filters.month ? 'month' : 'year'
  return <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">Período
      <NativeSelect className="w-full [&_select]:h-10" aria-label="Período" value={period} onChange={event => {
        const value = event.target.value
        onChange({ ...filters, year: value === 'all' ? '' : (filters.year || years[0] || ''), month: value === 'month' ? (filters.month || '01') : '' })
      }}>
        <NativeSelectOption value="all">Todo o período</NativeSelectOption><NativeSelectOption value="year">Ano específico</NativeSelectOption><NativeSelectOption value="month">Mês e ano</NativeSelectOption>
      </NativeSelect>
    </label>
    {period !== 'all' && <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">Ano
      <NativeSelect className="w-full [&_select]:h-10" aria-label="Ano" value={filters.year} onChange={event => onChange({ ...filters, year: event.target.value })}>
        {years.map(year => <NativeSelectOption key={year} value={year}>{year}</NativeSelectOption>)}
      </NativeSelect>
    </label>}
    {period === 'month' && <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">Mês
      <NativeSelect className="w-full [&_select]:h-10" aria-label="Mês" value={filters.month} onChange={event => onChange({ ...filters, month: event.target.value })}>
        {Array.from({ length: 12 }, (_, index) => <NativeSelectOption key={index} value={String(index + 1).padStart(2, '0')}>{new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, index, 1))}</NativeSelectOption>)}
      </NativeSelect>
    </label>}
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">Tipo
      <NativeSelect className="w-full [&_select]:h-10" aria-label="Tipo de registro" value={filters.type} onChange={event => onChange({ ...filters, type: event.target.value as Filters['type'] })}>
        <NativeSelectOption value="all">Todos</NativeSelectOption><NativeSelectOption value="news">Notícias</NativeSelectOption><NativeSelectOption value="agreement">Acordos</NativeSelectOption>
      </NativeSelect>
    </label>
    <Button variant="ghost" size="sm" className="h-10" onClick={onClear} disabled={!filters.year && filters.type === 'all'}><RotateCcw size={14} /> Limpar filtros</Button>
  </div>
}

export function MapFilters({ filters, years, onChange, onClear, mobileOpen, setMobileOpen }: { filters: Filters; years: string[]; onChange: (next: Filters) => void; onClear: () => void; mobileOpen: boolean; setMobileOpen: (value: boolean) => void }) {
  return <>
    <div className="hidden xl:block surface rounded-xl px-3 py-2 shadow-sm"><FiltersContent filters={filters} years={years} onChange={onChange} onClear={onClear} /></div>
    <Button className="xl:hidden h-10" variant="outline" size="sm" onClick={() => setMobileOpen(true)}><Filter size={16} /> Filtros</Button>
    <BottomSheet open={mobileOpen} onOpenChange={setMobileOpen} title="Filtros"><FiltersContent filters={filters} years={years} onChange={onChange} onClear={onClear} /></BottomSheet>
  </>
}

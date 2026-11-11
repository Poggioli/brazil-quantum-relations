import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe2, Minus, Plus, RotateCcw, Sun, Moon, Monitor } from 'lucide-react'
import { normalizeCountries, type Countries } from './lib/countries'
import { allFilters, parseRecords, readFilters, writeFilters, type Filters, type RecordItem } from './lib/records'
import { Button } from './components/ui/button'
import { Skeleton } from './components/ui/skeleton'
import { WorldMap, type MapActions } from './components/world-map'
import { MapFilters } from './components/map-filters'
import { CountryDetails } from './components/country-details'

type Theme = 'light' | 'dark' | 'system'
type Data = { countries: Countries; positions: Map<string, [number, number]>; names: Map<string, string>; continents: Map<string, string>; records: RecordItem[] }

function getTheme(): Theme {
  const stored = localStorage.getItem('bqr-theme')
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export default function App() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [loadingMap, setLoadingMap] = useState(true)
  const [retry, setRetry] = useState(0)
  const [filters, setFilters] = useState<Filters>(readFilters)
  const [selected, setSelected] = useState<string | null>(null)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [systemDark, setSystemDark] = useState(matchMedia('(prefers-color-scheme: dark)').matches)
  const mapActions = useRef<MapActions | null>(null)
  const dark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('bqr-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f172a' : '#f1f5f9')
  }, [dark, theme])
  useEffect(() => {
    const onPop = () => setFilters(readFilters())
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setLoadingMap(true)
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}geo/countries.geojson`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Não foi possível carregar o mapa.'); return response.json() }),
      fetch(`${import.meta.env.BASE_URL}data/records.json`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Não foi possível carregar os registros.'); return response.json() }),
    ]).then(([geo, rawRecords]) => {
      const normalized = normalizeCountries(geo)
      const records = parseRecords(rawRecords, normalized.codes)
      setData({ countries: normalized.geojson, positions: normalized.positions, names: normalized.names, continents: normalized.continents, records })
    }).catch(reason => {
      if (controller.signal.aborted) return
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.')
      setLoadingMap(false)
    })
    return () => controller.abort()
  }, [retry])

  const years = useMemo(() => [...new Set(data?.records.map(record => record.date.slice(0, 4)) ?? [])].sort().reverse(), [data])
  useEffect(() => {
    if (!data) return
    if (filters.year && !years.includes(filters.year)) {
      const next = { ...filters, year: '', month: '' }
      setFilters(next)
      writeFilters(next, true)
    } else {
      writeFilters(filters, true)
    }
  // Canonicalize only when data has loaded; user changes write their own history entries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  const filtered = useMemo(() => data?.records.filter(record =>
    (!filters.year || record.date.startsWith(filters.year)) &&
    (!filters.month || record.date.slice(5, 7) === filters.month) &&
    (filters.type === 'all' || record.type === filters.type)
  ) ?? [], [data, filters])
  const grouped = useMemo(() => {
    const groups = new Map<string, RecordItem[]>()
    for (const record of filtered) groups.set(record.country, [...(groups.get(record.country) ?? []), record])
    return groups
  }, [filtered])
  useEffect(() => { if (selected && !grouped.has(selected)) setSelected(null) }, [grouped, selected])

  function changeFilters(next: Filters) { setFilters(next); writeFilters(next) }
  const selectedRecords = selected ? grouped.get(selected) : undefined

  return <main className="relative h-[100dvh] w-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
    {data && !error && <WorldMap countries={data.countries} positions={data.positions} names={data.names} continents={data.continents} groups={grouped} selected={selected} dark={dark} actionsRef={mapActions} onSelect={setSelected} onReady={() => setLoadingMap(false)} onError={message => { setError(message); setLoadingMap(false) }} />}

    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] xl:flex-row xl:items-start xl:justify-between md:p-6">
      <header className="surface pointer-events-auto max-w-[440px] rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Globe2 size={18} /><span className="text-[11px] font-bold uppercase tracking-[.18em]">Pesquisa e cooperação</span></div>
        <h1 className="mt-1 text-base font-semibold tracking-tight md:text-lg">Brazil's Quantum Relations</h1>
        <p className="mt-0.5 hidden text-xs leading-relaxed text-slate-600 dark:text-slate-300 sm:block">Explorando a cooperação internacional do Brasil em tecnologias quânticas.</p>
      </header>
      <div className="pointer-events-auto flex items-start gap-2 xl:justify-end">
        {data && <MapFilters filters={filters} years={years} onChange={changeFilters} onClear={() => changeFilters(allFilters)} mobileOpen={mobileFilters} setMobileOpen={setMobileFilters} />}
        <div className="surface flex items-center rounded-xl p-1 shadow-sm" role="group" aria-label="Tema">
          {([['light', Sun, 'Claro'], ['dark', Moon, 'Escuro'], ['system', Monitor, 'Sistema']] as const).map(([value, Icon, label]) => <Button key={value} variant={theme === value ? 'default' : 'ghost'} size="icon" className="h-10 w-10" aria-label={`Tema ${label.toLowerCase()}`} title={label} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={16} /></Button>)}
        </div>
      </div>
    </div>

    {loadingMap && !error && <div className="surface absolute left-1/2 top-1/2 z-20 w-[min(320px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-5 shadow-lg" role="status"><Skeleton className="mb-3 h-5 w-2/3" /><Skeleton className="h-3 w-full" /><p className="mt-4 text-sm">Carregando mapa e registros…</p></div>}
    {error && <div className="surface absolute left-1/2 top-1/2 z-20 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 text-center shadow-xl" role="alert"><h2 className="font-semibold">Não foi possível exibir o mapa</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p><Button className="mt-4" onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button></div>}

    {data && !error && !loadingMap && <>
      <div className="surface absolute bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-4 z-10 flex flex-col rounded-xl p-1 shadow-sm md:bottom-20 md:right-6">
        <Button variant="ghost" size="icon" className="h-10 w-10" title="Aproximar" aria-label="Aproximar mapa" onClick={() => mapActions.current?.zoomIn()}><Plus size={18} /></Button>
        <Button variant="ghost" size="icon" className="h-10 w-10" title="Afastar" aria-label="Afastar mapa" onClick={() => mapActions.current?.zoomOut()}><Minus size={18} /></Button>
        <Button variant="ghost" size="icon" className="h-10 w-10" title="Redefinir posição" aria-label="Redefinir posição do mapa" onClick={() => mapActions.current?.reset()}><RotateCcw size={16} /></Button>
      </div>
      {filtered.length === 0 && <div className="surface absolute bottom-28 left-1/2 z-10 w-[min(310px,85vw)] -translate-x-1/2 rounded-xl p-4 text-center shadow-sm"><p className="text-sm">Nenhum registro encontrado.</p><Button variant="ghost" size="sm" className="mt-1" onClick={() => changeFilters(allFilters)}>Limpar filtros</Button></div>}
      <footer className="surface absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-[11px] shadow-sm md:bottom-6 md:left-6 md:right-auto">
        <span><strong>{filtered.length}</strong> {filtered.length === 1 ? 'registro' : 'registros'}</span>
        <span><strong>{grouped.size}</strong> {grouped.size === 1 ? 'país' : 'países'}</span>
        <span className="text-slate-500 dark:text-slate-400">Registros da pesquisa · Mapa: <a className="underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth 1:50m</a></span>
      </footer>
    </>}
    {selected && selectedRecords && data && <CountryDetails name={data.names.get(selected) ?? selected} records={selectedRecords} onClose={() => setSelected(null)} />}
  </main>
}

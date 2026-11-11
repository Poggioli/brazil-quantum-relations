import type { FeatureCollection, Geometry } from 'geojson'

export type CountryProperties = { ISO_A2?: string; ISO_A2_EH?: string; ADM0_A3?: string; NAME?: string; NAME_PT?: string; LABEL_X?: number; LABEL_Y?: number; CONTINENT?: string; code?: string }
export type Countries = FeatureCollection<Geometry, CountryProperties>

// Natural Earth has exceptional ISO values for a few territories. Keep these explicit.
const codeOverrides: Record<string, string> = { KOS: 'XK', SOL: 'SO', SAH: 'EH', NOR: 'NO' }

export function normalizeCountries(data: unknown): { geojson: Countries; codes: Set<string>; positions: Map<string, [number, number]>; names: Map<string, string>; continents: Map<string, string> } {
  if (!data || typeof data !== 'object' || !('type' in data) || data.type !== 'FeatureCollection' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('O arquivo geográfico é inválido.')
  }
  const geojson = data as Countries
  const codes = new Set<string>()
  const positions = new Map<string, [number, number]>()
  const names = new Map<string, string>()
  const continents = new Map<string, string>()
  const displayNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' })
  for (const feature of geojson.features) {
    const p = feature.properties
    if (!p) continue
    const candidate = [p.ISO_A2, p.ISO_A2_EH].find(code => code && /^[A-Z]{2}$/.test(code))
    const code = candidate ?? (p.ADM0_A3 ? codeOverrides[p.ADM0_A3] : undefined)
    if (!code) continue
    p.code = code
    codes.add(code)
    if (typeof p.LABEL_X === 'number' && typeof p.LABEL_Y === 'number') positions.set(code, [p.LABEL_X, p.LABEL_Y])
    names.set(code, displayNames.of(code) === code ? (p.NAME_PT || p.NAME || code) : displayNames.of(code) || code)
    if (p.CONTINENT) continents.set(code, code === 'RU' ? 'Asia' : p.CONTINENT)
  }
  return { geojson, codes, positions, names, continents }
}

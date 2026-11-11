import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl'
import type { Countries } from '../lib/countries'
import type { RecordItem } from '../lib/records'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'
import { RecordList } from './record-list'

export type MapActions = { zoomIn: () => void; zoomOut: () => void; reset: () => void }

type Props = {
  countries: Countries
  positions: Map<string, [number, number]>
  names: Map<string, string>
  continents: Map<string, string>
  groups: Map<string, RecordItem[]>
  selected: string | null
  dark: boolean
  actionsRef: React.RefObject<MapActions | null>
  onSelect: (code: string) => void
  onReady: () => void
  onError: (message: string) => void
}

type MarkerView = {
  id: string
  kind: 'continent' | 'cluster' | 'country'
  codes: string[]
  count: number
  position: [number, number]
  label: string
}

type Camera = { center: [number, number]; zoom: number; bearing: number; pitch: number }

const continentNames: Record<string, string> = {
  Africa: 'África', Asia: 'Ásia', Europe: 'Europa', 'North America': 'América do Norte',
  'South America': 'América do Sul', Oceania: 'Oceania', Antarctica: 'Antártida',
}

function colors(dark: boolean) {
  return dark
    ? { ocean: '#0f172a', land: '#1e293b', border: '#475569', selected: '#334155' }
    : { ocean: '#f1f5f9', land: '#e2e8f0', border: '#b8c6d8', selected: '#bfdbfe' }
}

function centerOf(codes: string[], positions: Map<string, [number, number]>): [number, number] {
  const points = codes.map(code => positions.get(code)).filter((point): point is [number, number] => Boolean(point))
  const longitude = points.map(point => point[0]).sort((a, b) => a - b)
  const latitude = points.map(point => point[1]).sort((a, b) => a - b)
  const middle = Math.floor(points.length / 2)
  return [longitude[middle] ?? 0, latitude[middle] ?? 0]
}

function markerViews(map: MapLibreMap, groups: Map<string, RecordItem[]>, positions: Map<string, [number, number]>, names: Map<string, string>, continents: Map<string, string>): MarkerView[] {
  const points = [...groups].flatMap(([code, records]) => {
    const position = positions.get(code)
    return position ? [{ code, count: records.length, position, continent: continents.get(code) ?? 'Other', pixel: map.project(position) }] : []
  })
  if (map.getZoom() <= 2.1) {
    const byContinent = new Map<string, typeof points>()
    for (const point of points) byContinent.set(point.continent, [...(byContinent.get(point.continent) ?? []), point])
    return [...byContinent].map(([continent, members]) => {
      const codes = members.map(member => member.code)
      return { id: `continent:${continent}`, kind: 'continent', codes, count: members.reduce((sum, member) => sum + member.count, 0), position: centerOf(codes, positions), label: continentNames[continent] ?? continent }
    })
  }
  const radius = map.getZoom() >= 6 ? 0 : Math.max(28, 88 - map.getZoom() * 10)
  const clusters: Array<{ continent: string; members: typeof points; x: number; y: number }> = []
  for (const point of points.sort((a, b) => a.continent.localeCompare(b.continent) || a.position[0] - b.position[0])) {
    let best: (typeof clusters)[number] | undefined
    let bestDistance = Infinity
    for (const cluster of clusters) {
      if (cluster.continent !== point.continent) continue
      const distance = Math.hypot(cluster.x - point.pixel.x, cluster.y - point.pixel.y)
      if (distance < radius && distance < bestDistance && cluster.members.every(member => Math.hypot(member.pixel.x - point.pixel.x, member.pixel.y - point.pixel.y) < radius * 1.6)) {
        best = cluster
        bestDistance = distance
      }
    }
    if (best) {
      best.members.push(point)
      best.x = best.members.reduce((sum, member) => sum + member.pixel.x, 0) / best.members.length
      best.y = best.members.reduce((sum, member) => sum + member.pixel.y, 0) / best.members.length
    } else clusters.push({ continent: point.continent, members: [point], x: point.pixel.x, y: point.pixel.y })
  }
  return clusters.map(cluster => {
    const codes = cluster.members.map(member => member.code)
    const country = cluster.members[0]
    return codes.length === 1
      ? { id: `country:${country.code}`, kind: 'country', codes, count: country.count, position: country.position, label: names.get(country.code) ?? country.code }
      : { id: `cluster:${codes.slice().sort().join('-')}`, kind: 'cluster', codes, count: cluster.members.reduce((sum, member) => sum + member.count, 0), position: centerOf(codes, positions), label: `${codes.length} países` }
  })
}

function countryZoom(map: MapLibreMap, countries: Countries, code: string) {
  const geometry = countries.features.find(feature => feature.properties?.code === code)?.geometry
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return 4
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const rings = polygons.map(polygon => polygon[0]).filter(Boolean)
  const area = (ring: number[][]) => Math.abs(ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0))
  const ring = rings.sort((a, b) => area(b) - area(a))[0]
  if (!ring) return 4
  const longitude = ring.map(point => point[0])
  const latitude = ring.map(point => point[1])
  const bounds: [[number, number], [number, number]] = [[Math.min(...longitude), Math.min(...latitude)], [Math.max(...longitude), Math.max(...latitude)]]
  if (bounds[1][0] - bounds[0][0] > 200) return 3
  return map.cameraForBounds(bounds, { padding: 100, maxZoom: 5.7 })?.zoom ?? 4
}

function CountryMarker({ count, name, records, onClick }: { count: number; name: string; records: RecordItem[]; onClick: () => void }) {
  const label = `${name}: ${count} ${count === 1 ? 'registro' : 'registros'}`
  return <HoverCard>
    <HoverCardTrigger delay={150} closeDelay={150} render={<button type="button" className="map-marker" aria-label={label} onClick={onClick} />}>{count}</HoverCardTrigger>
    <HoverCardContent side="top" sideOffset={10} className="w-[min(370px,calc(100vw-24px))] p-4">
      <div className="mb-2"><h3 className="font-semibold">{name}</h3><p className="text-xs text-muted-foreground">{count} {count === 1 ? 'registro' : 'registros'}</p></div>
      <RecordList records={records} compact />
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">Clique no marcador para ampliar e abrir os detalhes.</p>
    </HoverCardContent>
  </HoverCard>
}

function ClusterMarker({ view, onClick }: { view: MarkerView; onClick: () => void }) {
  const label = `${view.label}: ${view.count} ${view.count === 1 ? 'registro' : 'registros'} em ${view.codes.length} ${view.codes.length === 1 ? 'país' : 'países'}. Ampliar agrupamento.`
  return <button type="button" className={`map-cluster ${view.kind === 'continent' ? 'map-continent' : ''}`} aria-label={label} title={label} onClick={onClick}>
    <span className="text-base font-bold leading-none">{view.count}</span>
    {view.kind === 'continent' && <span className="map-cluster-label">{view.label}</span>}
  </button>
}

export function WorldMap({ countries, positions, names, continents, groups, selected, dark, actionsRef, onSelect, onReady, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef(new Map<string, maplibregl.Marker>())
  const [views, setViews] = useState<MarkerView[]>([])
  const previousCameraRef = useRef<Camera | null>(null)
  const callbacksRef = useRef({ onSelect, onReady, onError })
  const refreshRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  callbacksRef.current = { onSelect, onReady, onError }

  refreshRef.current = () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const views = markerViews(map, groups, positions, names, continents)
    const ids = new Set(views.map(view => view.id))
    for (const [id, marker] of markersRef.current) {
      if (!ids.has(id)) { marker.remove(); markersRef.current.delete(id) }
    }
    for (const view of views) {
      let marker = markersRef.current.get(view.id)
      if (!marker) {
        const element = document.createElement('div')
        marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(view.position).addTo(map)
        element.removeAttribute('role')
        element.removeAttribute('tabindex')
        markersRef.current.set(view.id, marker)
      } else marker.setLngLat(view.position)
    }
    setViews(views)
  }

  useEffect(() => {
    if (!containerRef.current) return
    if (!document.createElement('canvas').getContext('webgl2') && !document.createElement('canvas').getContext('webgl')) {
      callbacksRef.current.onError('Este navegador não oferece suporte a WebGL, necessário para exibir o mapa.')
      return
    }
    const palette = colors(dark)
    const style: StyleSpecification = {
      version: 8,
      sources: { countries: { type: 'geojson', data: countries } },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': palette.ocean } },
        { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': palette.land } },
        { id: 'selected', type: 'fill', source: 'countries', filter: ['==', ['get', 'code'], ''], paint: { 'fill-color': palette.selected } },
        { id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': palette.border, 'line-width': 0.75 } },
      ],
    }
    try {
      const map = new maplibregl.Map({
        container: containerRef.current, style, center: [0, 14], zoom: 1, minZoom: -1,
        maxZoom: 7, renderWorldCopies: true, attributionControl: false,
      })
      mapRef.current = map
      const reset = () => {
        const width = map.getContainer().clientWidth
        const height = map.getContainer().clientHeight
        const zoom = Math.max(-1, Math.min(Math.log2(Math.max(width - 48, 160) / 512), Math.log2(Math.max(height - 48, 160) / 410)))
        map.easeTo({ center: [0, 5], zoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450 })
      }
      actionsRef.current = { zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut(), reset }
      map.on('load', () => { reset(); setReady(true); refreshRef.current(); callbacksRef.current.onReady() })
      map.on('moveend', () => {
        const center = map.getCenter()
        const lat = Math.max(-75, Math.min(80, center.lat))
        const lng = Math.max(-180, Math.min(180, center.lng))
        if (lat !== center.lat || lng !== center.lng) map.setCenter([lng, lat])
        refreshRef.current()
      })
      map.on('zoomend', () => refreshRef.current())
      map.on('error', () => callbacksRef.current.onError('O mapa encontrou um erro de renderização. Tente recarregar a página.'))
      const resize = () => { map.resize(); if (map.getZoom() <= 1.2) reset(); else refreshRef.current() }
      window.addEventListener('resize', resize)
      return () => {
        window.removeEventListener('resize', resize)
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current.clear()
        map.remove()
        mapRef.current = null
        actionsRef.current = null
      }
    } catch (reason) {
      console.error('Map initialization failed:', reason)
      callbacksRef.current.onError('Não foi possível iniciar o mapa. Tente recarregar a página.')
    }
  // The MapLibre instance is intentionally created once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.isStyleLoaded()) return
    const palette = colors(dark)
    map.setPaintProperty('ocean', 'background-color', palette.ocean)
    map.setPaintProperty('land', 'fill-color', palette.land)
    map.setPaintProperty('selected', 'fill-color', palette.selected)
    map.setPaintProperty('borders', 'line-color', palette.border)
  }, [dark, ready])

  useEffect(() => {
    const map = mapRef.current
    if (map && ready && map.isStyleLoaded()) map.setFilter('selected', ['==', ['get', 'code'], selected ?? ''])
    if (map && selected === null && previousCameraRef.current) {
      const camera = previousCameraRef.current
      previousCameraRef.current = null
      map.easeTo({ ...camera, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 })
    }
  }, [selected, ready])

  useEffect(() => { if (ready) refreshRef.current() }, [groups, positions, names, continents, ready])

  const selectCountry = (view: MarkerView) => {
    const map = mapRef.current
    if (!map) return
    if (!previousCameraRef.current) {
      const center = map.getCenter()
      previousCameraRef.current = { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }
    }
    const code = view.codes[0]
    const targetZoom = Math.min(6, Math.max(map.getZoom() + 0.9, countryZoom(map, countries, code)))
    map.easeTo({ center: view.position, zoom: targetZoom, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 })
    callbacksRef.current.onSelect(code)
  }
  const expandCluster = (view: MarkerView) => {
    const map = mapRef.current
    if (!map) return
    const zoom = view.kind === 'continent' ? Math.max(2.25, map.getZoom() + 1.6) : map.getZoom() + 1.6
    map.easeTo({ center: view.position, zoom: Math.min(zoom, 6.5), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 })
  }
  return <>
    <div ref={containerRef} className="absolute inset-x-0 top-1/2 h-[min(100dvh,400px)] -translate-y-1/2 md:inset-0 md:h-auto md:translate-y-0" role="application" aria-label="Mapa interativo das relações quânticas do Brasil" />
    {views.map(view => {
      const element = markersRef.current.get(view.id)?.getElement()
      if (!element) return null
      return createPortal(view.kind === 'country'
        ? <CountryMarker count={view.count} name={names.get(view.codes[0]) ?? view.codes[0]} records={groups.get(view.codes[0]) ?? []} onClick={() => selectCountry(view)} />
        : <ClusterMarker view={view} onClick={() => expandCluster(view)} />, element, view.id)
    })}
  </>
}

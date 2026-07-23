import { useEffect, useState } from 'react'
import type { ThriftStore } from '../api/client'
import MapFiltersPanel from './MapFiltersPanel'
import MapView from './MapView'
import type { MapFilters } from '../utils/storeFilters'

type Props = {
  stores: ThriftStore[]
  filteredStores: ThriftStore[]
  filters: MapFilters
  selectedId: string | null
  dimmed: boolean
  onFiltersChange: (patch: Partial<MapFilters>) => void
  onSelect: (id: string) => void
  onClearSelection: () => void
}

export default function MapExplorer({
  stores,
  filteredStores,
  filters,
  selectedId,
  dimmed,
  onFiltersChange,
  onSelect,
  onClearSelection,
}: Props) {
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    if (expanded) {
      const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 320)
      return () => window.clearTimeout(t)
    }
  }, [expanded])

  return (
    <section
      className={`overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] ring-1 ring-white/[0.03] transition ${
        dimmed ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="group flex w-full items-center justify-center gap-2 border-b border-[color:var(--border)] bg-[color:var(--surface-raised)] px-4 py-2.5 transition hover:bg-[color:var(--surface-hover)]"
        aria-expanded={expanded}
      >
        <Chevron expanded={expanded} />
        <span className="text-xs font-medium text-[color:var(--muted-light)] group-hover:text-white">
          {expanded ? 'Zwiń mapę i filtry' : 'Rozwiń mapę i filtry'}
        </span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[color:var(--muted)]">
          {filteredStores.length} / {stores.length}
        </span>
        <Chevron expanded={expanded} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_300px] lg:items-stretch">
            <div className="flex min-h-[260px] flex-col border-b border-[color:var(--border)] lg:min-h-0 lg:border-b-0 lg:border-r">
              <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--border)] px-4 py-2">
                <span className="text-xs font-medium text-[color:var(--muted-light)]">Mapa Warszawy</span>
                {selectedId && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-xs text-[color:var(--muted)] transition hover:text-white"
                  >
                    Odznacz
                  </button>
                )}
              </div>
              <div className="relative min-h-[220px] flex-1 sm:min-h-[240px]">
                <MapView stores={filteredStores} selectedId={selectedId} onSelect={onSelect} />
              </div>
            </div>

            <div className="bg-[color:var(--surface)]">
              <MapFiltersPanel filters={filters} onChange={onFiltersChange} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-[color:var(--muted)] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

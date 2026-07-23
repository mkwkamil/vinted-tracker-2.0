import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type ThriftStore } from '../api/client'
import MapExplorer from '../components/MapExplorer'
import StoreCard from '../components/StoreCard'
import StoreInfoPanel from '../components/StoreInfoPanel'
import StoreModal from '../components/StoreModal'
import { useToast } from '../components/Toast'
import { filterAndSortStores, type MapFilters } from '../utils/storeFilters'

function mapsUrl(lat: number, lng: number) {
  const isApple =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) || navigator.platform === 'MacIntel')
  if (isApple) {
    return `http://maps.apple.com/?q=${lat},${lng}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function openNavigation(lat: number, lng: number) {
  window.open(mapsUrl(lat, lng), '_blank', 'noopener,noreferrer')
}

const DEFAULT_FILTERS: MapFilters = {
  query: '',
  districtId: 'all',
  upcomingOnly: false,
  unverifiedOnly: false,
  sortMode: 'hotness',
}

export default function MapPage() {
  const { toast } = useToast()
  const [stores, setStores] = useState<ThriftStore[]>([])
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [infoStore, setInfoStore] = useState<ThriftStore | null>(null)
  const [editing, setEditing] = useState<ThriftStore | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await api.listStores()
      setStores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać sklepów')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredStores = useMemo(() => filterAndSortStores(stores, filters), [stores, filters])

  const handleFiltersChange = useCallback((patch: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  async function handleSave(payload: {
    name: string
    lat: number
    lng: number
    next_delivery: string | null
    delivery_enabled: boolean
    delivery_verified: boolean
    delivery_frequency: string
    hotness: number
    notes: string
    opening_time: string
    delivery_time: string
    facebook_url: string
    instagram_url: string
  }) {
    try {
      if (editing) {
        await api.updateStore(editing.id, payload)
        toast(`Zaktualizowano „${payload.name}"`)
      } else {
        await api.createStore(payload)
        toast(`Dodano „${payload.name}"`)
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Zapis nieudany', 'error')
      throw err
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć ten lumpeks?')) return
    setError(null)
    const store = stores.find((s) => s.id === id)
    try {
      await api.deleteStore(id)
      if (selectedId === id) setSelectedId(null)
      await load()
      toast(store ? `Usunięto „${store.name}"` : 'Sklep usunięty')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się usunąć sklepu'
      setError(message)
      toast(message, 'error')
    }
  }

  function openAddModal() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEditModal(store: ThriftStore) {
    setInfoStore(null)
    setEditing(store)
    setModalOpen(true)
  }

  const overlayOpen = modalOpen || infoStore !== null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Lumpeksy
            <span className="ml-2 text-base font-normal text-[color:var(--muted)]">({stores.length})</span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--muted)]">
            Mapa, filtry i lista — Warszawa, dostawy i priorytet gorąca.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] transition hover:bg-[color:var(--accent-hover)]"
        >
          <PlusIcon />
          Dodaj lumpeks
        </button>
      </div>

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <MapExplorer
        stores={stores}
        filteredStores={filteredStores}
        filters={filters}
        selectedId={selectedId}
        dimmed={overlayOpen}
        onFiltersChange={handleFiltersChange}
        onSelect={setSelectedId}
        onClearSelection={() => setSelectedId(null)}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted-light)]">
            Lista sklepów
            {filteredStores.length !== stores.length && (
              <span className="ml-2 font-normal normal-case text-[color:var(--muted)]">
                ({filteredStores.length} po filtrach)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-[color:var(--muted)]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" /> Niski</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Średni</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Wysoki</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Must visit</span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface)]" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-strong)] px-6 py-16 text-center">
            <p className="text-sm text-[color:var(--muted-light)]">
              {stores.length === 0 ? 'Brak punktów na mapie.' : 'Brak wyników dla wybranych filtrów.'}
            </p>
            {stores.length === 0 ? (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Dodaj pierwszy lumpeks
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 rounded-xl border border-[color:var(--border-strong)] px-4 py-2 text-sm text-[color:var(--muted-light)] hover:text-white"
              >
                Wyczyść filtry
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                selected={selectedId === store.id}
                onSelect={() => setSelectedId(store.id)}
                onInfo={() => setInfoStore(store)}
                onEdit={() => openEditModal(store)}
                onDelete={() => void handleDelete(store.id)}
                onNavigate={() => openNavigation(store.lat, store.lng)}
              />
            ))}
          </div>
        )}
      </section>

      {infoStore && (
        <StoreInfoPanel
          store={infoStore}
          onClose={() => setInfoStore(null)}
          onEdit={() => openEditModal(infoStore)}
          onNavigate={() => openNavigation(infoStore.lat, infoStore.lng)}
        />
      )}

      {modalOpen && (
        <StoreModal
          initial={editing}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

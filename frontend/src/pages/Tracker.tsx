import { useCallback, useEffect, useState } from 'react'
import { api, type SearchFilter, type TrackedItem } from '../api/client'
import ItemCard from '../components/ItemCard'
import { useToast } from '../components/Toast'

export default function TrackerPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<TrackedItem[]>([])
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterId, setFilterId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [catalogUrl, setCatalogUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [itemsRes, filtersRes] = await Promise.all([
        api.listItems(page, 20, filterId || undefined),
        api.listFilters(),
      ])
      setItems(itemsRes.items)
      setTotal(itemsRes.total)
      setFilters(filtersRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać danych')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [page, filterId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const interval = setInterval(() => void load(true), 30_000)
    return () => clearInterval(interval)
  }, [load])

  async function handleCreateFilter(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !catalogUrl.trim()) return
    const filterName = name.trim()
    setSaving(true)
    setError(null)
    try {
      await api.createFilter({ name: filterName, catalog_url: catalogUrl.trim(), is_active: true })
      setName('')
      setCatalogUrl('')
      setShowForm(false)
      await load()
      toast(`Dodano filtr „${filterName}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się dodać filtra'
      setError(message)
      toast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleFilter(filt: SearchFilter) {
    setError(null)
    try {
      await api.updateFilter(filt.id, { is_active: !filt.is_active })
      await load(true)
      toast(filt.is_active ? `Wyłączono „${filt.name}"` : `Włączono „${filt.name}"`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się zmienić filtra'
      setError(message)
      toast(message, 'error')
    }
  }

  async function removeFilter(id: string) {
    if (!confirm('Usunąć ten filtr?')) return
    const filt = filters.find((f) => f.id === id)
    setError(null)
    try {
      await api.deleteFilter(id)
      if (filterId === id) setFilterId('')
      await load()
      toast(filt ? `Usunięto filtr „${filt.name}"` : 'Filtr usunięty')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się usunąć filtra'
      setError(message)
      toast(message, 'error')
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / 20))
  const activeCount = filters.filter((f) => f.is_active).length

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar — filters */}
      <aside className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">
        <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Filtry Vinted</h2>
            <span className="rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 text-xs font-medium text-[color:var(--accent)]">
              {activeCount} aktywne
            </span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Worker odpytuje API co 7–15 s i wysyła powiadomienia na Telegram.
          </p>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="mt-4 w-full rounded-xl bg-[color:var(--accent)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-hover)]"
          >
            {showForm ? 'Anuluj' : '+ Dodaj filtr'}
          </button>

          {showForm && (
            <form onSubmit={handleCreateFilter} className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nazwa (np. Bluzy Nike M)"
                className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg)] px-3 py-2 text-sm text-white outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
              />
              <textarea
                value={catalogUrl}
                onChange={(e) => setCatalogUrl(e.target.value)}
                placeholder="URL catalog/items?..."
                rows={3}
                className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--bg)] px-3 py-2 text-sm text-white outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--accent)]"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--surface-hover)] disabled:opacity-50"
              >
                {saving ? 'Zapisywanie…' : 'Zapisz filtr'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-2">
          {filters.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-strong)] px-4 py-6 text-center text-sm text-[color:var(--muted)]">
              Brak filtrów. Dodaj pierwszy, żeby zacząć śledzić oferty.
            </p>
          ) : (
            filters.map((filt) => (
              <div
                key={filt.id}
                className={`rounded-[var(--radius-lg)] border p-3 transition ${
                  filterId === filt.id
                    ? 'border-[color:var(--accent)]/40 bg-[color:var(--accent)]/[0.06]'
                    : 'border-[color:var(--border)] bg-[color:var(--surface)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPage(1)
                    setFilterId(filterId === filt.id ? '' : filt.id)
                  }}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{filt.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        filt.is_active
                          ? 'bg-[color:var(--success)]/15 text-[color:var(--success)]'
                          : 'bg-white/5 text-[color:var(--muted)]'
                      }`}
                    >
                      {filt.is_active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </button>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleFilter(filt)}
                    className="rounded-lg border border-[color:var(--border)] px-2.5 py-1 text-xs text-[color:var(--muted-light)] transition hover:text-white"
                  >
                    {filt.is_active ? 'Wyłącz' : 'Włącz'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeFilter(filt.id)}
                    className="rounded-lg border border-red-500/25 px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main — items list */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Oferty
              <span className="ml-2 text-base font-normal text-[color:var(--muted)]">({total})</span>
            </h1>
            <p className="text-xs text-[color:var(--muted)]">Odświeżanie co 30 s</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterId}
              onChange={(e) => {
                setPage(1)
                setFilterId(e.target.value)
              }}
              className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--accent)]"
            >
              <option value="">Wszystkie filtry</option>
              {filters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--muted-light)] transition hover:text-white"
              title="Odśwież"
            >
              ↻
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[color:var(--surface)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--border-strong)] px-6 py-16 text-center">
            <p className="text-sm text-[color:var(--muted-light)]">Brak ofert do wyświetlenia.</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Dodaj aktywny filtr i poczekaj na synchronizację workera (pierwsze odpytanie = seed bez powiadomień).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <PaginationButton disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ‹
            </PaginationButton>
            {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
              let pageNum: number
              if (pageCount <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= pageCount - 3) {
                pageNum = pageCount - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <PaginationButton key={pageNum} active={pageNum === page} onClick={() => setPage(pageNum)}>
                  {pageNum}
                </PaginationButton>
              )
            })}
            <PaginationButton disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              ›
            </PaginationButton>
          </div>
        )}
      </section>
    </div>
  )
}

function PaginationButton({
  children,
  disabled,
  active,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition disabled:opacity-30 ${
        active
          ? 'bg-[color:var(--accent)] font-semibold text-white'
          : 'border border-[color:var(--border)] text-[color:var(--muted-light)] hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

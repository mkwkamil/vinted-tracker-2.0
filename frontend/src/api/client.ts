export type SearchFilter = {
  id: string
  name: string
  catalog_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TrackedItem = {
  id: string
  vinted_id: number
  filter_id: string | null
  title: string
  brand: string
  size: string
  price: string
  total_price: string
  currency: string
  photo_url: string
  item_url: string
  listed_at: string | null
  seen_at: string
  notified: boolean
}

export type PaginatedItems = {
  items: TrackedItem[]
  total: number
  page: number
  page_size: number
}

export type ThriftStore = {
  id: string
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
  created_at: string
  updated_at: string
}

const API_KEY = import.meta.env.VITE_API_KEY || 'change-me'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-Api-Key', API_KEY)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, { ...init, headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export const api = {
  listFilters: () => request<SearchFilter[]>('/api/filters'),
  createFilter: (body: { name: string; catalog_url: string; is_active?: boolean }) =>
    request<SearchFilter>('/api/filters', { method: 'POST', body: JSON.stringify(body) }),
  updateFilter: (id: string, body: Partial<{ name: string; catalog_url: string; is_active: boolean }>) =>
    request<SearchFilter>(`/api/filters/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteFilter: (id: string) => request<void>(`/api/filters/${id}`, { method: 'DELETE' }),

  listItems: (page = 1, pageSize = 24, filterId?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (filterId) params.set('filter_id', filterId)
    return request<PaginatedItems>(`/api/items?${params}`)
  },

  listStores: () => request<ThriftStore[]>('/api/thrift-stores'),
  createStore: (body: Omit<ThriftStore, 'id' | 'created_at' | 'updated_at'>) =>
    request<ThriftStore>('/api/thrift-stores', { method: 'POST', body: JSON.stringify(body) }),
  updateStore: (id: string, body: Partial<Omit<ThriftStore, 'id' | 'created_at' | 'updated_at'>>) =>
    request<ThriftStore>(`/api/thrift-stores/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteStore: (id: string) => request<void>(`/api/thrift-stores/${id}`, { method: 'DELETE' }),
}

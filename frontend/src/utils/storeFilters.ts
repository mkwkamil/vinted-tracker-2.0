import type { ThriftStore } from '../api/client'
import { daysUntil } from '../utils/dates'
import type { SortMode } from '../utils/warsawDistricts'
import { storeInDistrict } from '../utils/warsawDistricts'

export type MapFilters = {
  query: string
  districtId: string
  upcomingOnly: boolean
  unverifiedOnly: boolean
  sortMode: SortMode
}

export function filterAndSortStores(stores: ThriftStore[], filters: MapFilters): ThriftStore[] {
  const q = filters.query.trim().toLowerCase()

  let result = stores.filter((store) => {
    if (q && !store.name.toLowerCase().includes(q)) return false
    if (!storeInDistrict(store.lat, store.lng, filters.districtId)) return false
    if (filters.unverifiedOnly && store.delivery_verified) return false
    if (filters.upcomingOnly) {
      if (!store.delivery_enabled || !store.delivery_verified || !store.next_delivery) return false
      const days = daysUntil(store.next_delivery)
      if (days === null || days < 0) return false
    }
    return true
  })

  result = result.slice().sort((a, b) => {
    if (filters.sortMode === 'hotness') {
      return b.hotness - a.hotness || a.name.localeCompare(b.name, 'pl')
    }
    const da = daysUntil(a.next_delivery)
    const db = daysUntil(b.next_delivery)
    const aDays = da === null ? 9999 : da < 0 ? 9998 : da
    const bDays = db === null ? 9999 : db < 0 ? 9998 : db
    return aDays - bDays || b.hotness - a.hotness
  })

  return result
}

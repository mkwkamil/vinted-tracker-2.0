import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { ThriftStore } from '../api/client'
import { hotnessStyles } from '../utils/hotness'

const WARSAW: L.LatLngExpression = [52.2297, 21.0122]

type Props = {
  stores: ThriftStore[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function MapView({ stores, selectedId, onSelect }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper || mapRef.current) return

    const map = L.map(container, {
      center: WARSAW,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const refreshSize = () => {
      const { clientWidth, clientHeight } = wrapper
      if (clientWidth < 2 || clientHeight < 2) return
      map.invalidateSize({ animate: false, pan: false })
    }

    map.whenReady(refreshSize)
    requestAnimationFrame(refreshSize)
    const t1 = window.setTimeout(refreshSize, 50)
    const t2 = window.setTimeout(refreshSize, 250)
    const t3 = window.setTimeout(refreshSize, 500)

    const observer = new ResizeObserver(() => {
      refreshSize()
    })
    observer.observe(wrapper)

    const onWindowResize = () => refreshSize()
    window.addEventListener('resize', onWindowResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onWindowResize)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = markersRef.current
    if (!map || !group) return

    group.clearLayers()

    stores.forEach((store) => {
      const isSelected = store.id === selectedId
      const colors = hotnessStyles(store.hotness).marker
      const marker = L.circleMarker([store.lat, store.lng], {
        radius: isSelected ? 12 : 8,
        color: isSelected ? '#3b82f6' : colors.stroke,
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? '#3b82f6' : colors.fill,
        fillOpacity: 0.9,
      })
      marker.bindTooltip(`<strong>${store.name}</strong><br/>★ ${store.hotness}/10`, {
        direction: 'top',
        opacity: 1,
      })
      marker.on('click', () => onSelect(store.id))
      marker.addTo(group)
    })
  }, [stores, selectedId, onSelect])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.invalidateSize({ animate: false, pan: false })

    if (stores.length === 0) {
      map.setView(WARSAW, 12)
      return
    }

    const bounds = L.latLngBounds(stores.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.15))
    window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 50)
  }, [stores])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const store = stores.find((s) => s.id === selectedId)
    if (!store) return
    map.panTo([store.lat, store.lng], { animate: true })
  }, [selectedId, stores])

  return (
    <div ref={wrapperRef} className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

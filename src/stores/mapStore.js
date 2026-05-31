import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveItem, deleteItem, listByType, getItem, generateId } from '../utils/storage'
import { isLandmarkGalleryWalk } from '../data/mapNodeGallerySeeds.js'

export const MAP_DEFAULT_ZOOM = 15
/** 无用户路线时的默认地图中心（中国中部） */
export const DEFAULT_MAP_CENTER = { lat: 35, lng: 105 }
export const DEFAULT_MAP_ZOOM_FALLBACK = 5

export const useMapStore = defineStore('map', () => {
  const markers = ref([])
  const colorCards = ref([])
  const savedWalks = ref([])
  const dateFilter = ref(null)
  const selectedWalkId = ref(null)

  const filteredMarkers = computed(() => {
    if (!dateFilter.value) return markers.value
    const day = new Date(dateFilter.value).toDateString()
    return markers.value.filter((m) => new Date(m.createdAt).toDateString() === day)
  })

  async function hydrate() {
    markers.value = await listByType('marker')
    colorCards.value = await listByType('card')
    savedWalks.value = (await listByType('walk')).filter((w) => !isLandmarkGalleryWalk(w))
  }

  async function refreshWalks() {
    savedWalks.value = (await listByType('walk')).filter((w) => !isLandmarkGalleryWalk(w))
  }

  function setSelectedWalk(id) {
    selectedWalkId.value = id
  }

  async function addMarker({ lat, lng, color, colorCardId = null, photoId = null }) {
    const marker = {
      id: generateId(),
      lat,
      lng,
      color,
      colorCardId,
      photoId,
      createdAt: Date.now(),
    }
    await saveItem('marker', marker.id, marker)
    markers.value.unshift(marker)
    return marker
  }

  async function removeMarker(id) {
    await deleteItem('marker', id)
    markers.value = markers.value.filter((m) => m.id !== id)
  }

  /** 删除与给定色卡 / 照片关联的地图标记（例如删除路线或照片后同步清理） */
  async function removeMarkersForAssets({ cardIds = [], photoIds = [] } = {}) {
    const cset = new Set(cardIds)
    const pset = new Set(photoIds)
    const next = []
    for (const m of markers.value) {
      if ((m.photoId && pset.has(m.photoId)) || (m.colorCardId && cset.has(m.colorCardId))) {
        await deleteItem('marker', m.id)
      } else {
        next.push(m)
      }
    }
    markers.value = next
  }

  async function saveColorCard(card) {
    await saveItem('card', card.id, card)
    colorCards.value.unshift(card)
    if (card.location && !card.sourcePhotoId) {
      await addMarker({
        lat: card.location.lat,
        lng: card.location.lng,
        color: card.hex,
        colorCardId: card.id,
        photoId: null,
      })
    }
    return card
  }

  async function removeColorCard(id) {
    await deleteItem('card', id)
    colorCards.value = colorCards.value.filter((c) => c.id !== id)
  }

  function setDateFilter(date) {
    dateFilter.value = date
  }

  async function updateWalkPathName(walkId, pathName) {
    const trimmed = String(pathName || '').trim()
    if (!walkId) return { ok: false, message: '未找到路线' }
    if (!trimmed) return { ok: false, message: '名称不能为空' }

    let walk = savedWalks.value.find((w) => w.id === walkId)
    if (!walk) walk = await getItem('walk', walkId)
    if (!walk) return { ok: false, message: '未找到路线' }

    const updated = { ...walk, pathName: trimmed }
    await saveItem('walk', walkId, updated)
    const idx = savedWalks.value.findIndex((w) => w.id === walkId)
    if (idx >= 0) savedWalks.value[idx] = updated
    else await refreshWalks()
    return { ok: true, walk: updated }
  }

  return {
    markers,
    colorCards,
    savedWalks,
    dateFilter,
    selectedWalkId,
    filteredMarkers,
    hydrate,
    refreshWalks,
    addMarker,
    removeMarker,
    removeMarkersForAssets,
    saveColorCard,
    removeColorCard,
    setDateFilter,
    setSelectedWalk,
    updateWalkPathName,
  }
})

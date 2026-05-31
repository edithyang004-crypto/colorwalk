import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listByType, deleteItem, saveItem } from '../utils/storage'
import { hexToHsl } from '../utils/colorUtils'
const HUE_BUCKETS = 12

export const useGalleryStore = defineStore('gallery', () => {
  const cards = ref([])
  const walks = ref([])
  const collages = ref([])
  const loading = ref(false)

  const hueCoverage = computed(() => {
    const covered = new Set()
    for (const card of cards.value) {
      const [h] = card.hsl || hexToHsl(card.hex)
      const bucket = Math.floor(h / 30) % HUE_BUCKETS
      covered.add(bucket)
    }
    return covered.size
  })

  const cardsByHue = computed(() => {
    const map = {}
    for (let i = 0; i < HUE_BUCKETS; i++) map[i] = []
    for (const card of cards.value) {
      const [h] = card.hsl || hexToHsl(card.hex)
      const bucket = Math.floor(h / 30) % HUE_BUCKETS
      map[bucket].push(card)
    }
    return map
  })

  async function hydrate() {
    loading.value = true
    try {
      const rawCards = await listByType('card')
      const seen = new Set()
      cards.value = rawCards.filter((c) => {
        if (!c?.id || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      walks.value = await listByType('walk')
      collages.value = await listByType('collage')
    } finally {
      loading.value = false
    }
  }

  async function removeCard(id) {
    await deleteItem('card', id)
    cards.value = cards.value.filter((c) => c.id !== id)
    const { useMapStore } = await import('./mapStore')
    const mapStore = useMapStore()
    await mapStore.removeMarkersForAssets({ cardIds: [id] })
    for (const w of walks.value) {
      if (!w.cardIds?.includes(id)) continue
      const nextCardIds = w.cardIds.filter((cid) => cid !== id)
      const nextColorNodes = (w.colorNodes || []).filter((n) => n.cardId !== id)
      const nextWalk = { ...w, cardIds: nextCardIds, colorNodes: nextColorNodes }
      await saveItem('walk', w.id, nextWalk)
      walks.value = walks.value.map((x) => (x.id === w.id ? nextWalk : x))
    }
  }

  async function removeWalk(id) {
    await deleteItem('walk', id)
    walks.value = walks.value.filter((w) => w.id !== id)
  }

  /** 删除路线及其在画廊中的色卡、照片，并清理关联地图标记 */
  async function removeWalkCascade(walk) {
    const cardIds = [...(walk.cardIds || [])]
    const photoIds = [...(walk.photoIds || [])]
    for (const cid of cardIds) {
      await deleteItem('card', cid)
    }
    for (const pid of photoIds) {
      await deleteItem('photo', pid)
    }
    await deleteItem('walk', walk.id)
    walks.value = walks.value.filter((w) => w.id !== walk.id)
    const cardSet = new Set(cardIds)
    cards.value = cards.value.filter((c) => !cardSet.has(c.id))
    const { useMapStore } = await import('./mapStore')
    await useMapStore().removeMarkersForAssets({ cardIds, photoIds })
  }

  /** 从已保存路线中移除一张照片及其仅依赖该照片的色卡，并写回路线 */
  async function removePhotoFromWalk(walk, photoId) {
    const cardIdsToRemove = (walk.cardIds || [])
      .map((cid) => cards.value.find((c) => c.id === cid))
      .filter((c) => c && c.sourcePhotoId === photoId)
      .map((c) => c.id)
    for (const cid of cardIdsToRemove) {
      await deleteItem('card', cid)
    }
    await deleteItem('photo', photoId)
    const remainingCardIds = (walk.cardIds || []).filter((cid) => !cardIdsToRemove.includes(cid))
    const colorNodes = (walk.colorNodes || []).filter((n) => n.photoId !== photoId)
    const photoIds = (walk.photoIds || []).filter((pid) => pid !== photoId)
    const updated = {
      ...walk,
      cardIds: remainingCardIds,
      photoIds,
      colorNodes,
      stats: {
        ...(walk.stats || {}),
        colorCount: remainingCardIds.length,
      },
    }
    await saveItem('walk', walk.id, updated)
    const removeSet = new Set(cardIdsToRemove)
    cards.value = cards.value.filter((c) => !removeSet.has(c.id))
    walks.value = walks.value.map((w) => (w.id === walk.id ? updated : w))
    const { useMapStore } = await import('./mapStore')
    await useMapStore().removeMarkersForAssets({ cardIds: cardIdsToRemove, photoIds: [photoId] })
    return updated
  }

  async function removeCollage(id) {
    await deleteItem('collage', id)
    collages.value = collages.value.filter((c) => c.id !== id)
  }

  async function updateCard(card) {
    await saveItem('card', card.id, card)
    const idx = cards.value.findIndex((c) => c.id === card.id)
    if (idx >= 0) cards.value[idx] = { ...card }
  }

  function getWalk(id) {
    return walks.value.find((w) => w.id === id)
  }

  return {
    cards,
    walks,
    collages,
    loading,
    hueCoverage,
    cardsByHue,
    hydrate,
    removeCard,
    removeWalk,
    removeWalkCascade,
    removePhotoFromWalk,
    removeCollage,
    updateCard,
    getWalk,
  }
})

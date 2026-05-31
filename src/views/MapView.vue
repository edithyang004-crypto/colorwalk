<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  useMapStore,
  MAP_DEFAULT_ZOOM,
} from '../stores/mapStore'
import { useWalkStore } from '../stores/walkStore'
import { useGalleryStore } from '../stores/galleryStore'
import { usePhotoStore } from '../stores/photoStore'
import {
  createMap,
  createOverlayGroup,
  addGradientPolyline,
  addColorNodeMarker,
  nodesWithinMeters,
  distanceMeters,
  fitMapToNodes,
  bindMapResize,
  waitForMapContainer,
  refreshMapDisplay,
  invalidateMapSize,
  waitForLayout,
} from '../utils/leafletMap'
import { buildGradientPolylines } from '../utils/trailRender'
import { DEMO_MAP_CENTER } from '../data/demoWalk.js'
import { getDemoMapWalk, getDemoNodeDetail, findExhibitionNodeForDemoNode } from '../utils/demoMapWalk.js'
import { getDemoSummary } from '../data/demoWalk.js'
import { MAIN_MAP_NODES } from '../data/mainMapNodes.js'
import ColorPointPopup from '../components/ColorPointPopup.vue'
import ExhibitionCardModal from '../components/ExhibitionCardModal.vue'
import { getNodeCardSections } from '../data/exhibitionNodes.js'
import ColorWheel from '../components/ColorWheel.vue'
import HomeSheet from '../components/HomeSheet.vue'
import FloatingButtons from '../components/FloatingButtons.vue'
import AboutSheet from '../components/AboutSheet.vue'
import WalkResult from '../components/WalkResult.vue'
import WalkingPanel from '../components/WalkingPanel.vue'
import { getItem } from '../utils/storage'
import { Trash2 } from 'lucide-vue-next'

const router = useRouter()
const mapStore = useMapStore()
const walkStore = useWalkStore()
const galleryStore = useGalleryStore()
const photoStore = usePhotoStore()
const demoMapWalk = getDemoMapWalk()
const demoCard = getDemoSummary()
const sheetState = ref('peek')

/** color-select | map | walking | result */
const pagePhase = ref('map')
/** 从成果页返回地图时跳过转盘 */
const skipColorSelect = ref(false)

const mapPageRef = ref(null)
const mapContainer = ref(null)
const mapInstance = ref(null)
const overlayGroup = ref(null)
const mapReady = ref(false)
const showAbout = ref(false)
const detailWalk = ref(null)
const gpsError = ref('')
const gpsWarning = ref('')
const saveHint = ref('')
const mapInitStarted = ref(false)

const popup = ref({
  show: false,
  colorEntries: [],
  description: '',
})

/** 从成果页返回地图时，短暂聚焦刚完成的路线 */
const focusWalkId = ref(null)

const showExhibitionCard = ref(false)
const exhibitionPopupNode = ref(null)

let unbindMapResize = () => {}

const sortedWalks = computed(() =>
  [...mapStore.savedWalks].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
)

const mapWalks = computed(() => [demoMapWalk, ...mapStore.savedWalks])

const showMapChrome = computed(
  () => pagePhase.value === 'map' && !detailWalk.value
)

const showLeafletMap = computed(() =>
  ['map', 'color-select'].includes(pagePhase.value)
)

function resolvePagePhase() {
  if (walkStore.phase === 'walking') return 'walking'
  if (walkStore.phase === 'result') return 'result'
  return 'map'
}

function clearOverlays() {
  overlayGroup.value?.clearLayers()
}

function updateMapLayers() {
  const map = mapInstance.value
  const group = overlayGroup.value
  if (!map || !group || !mapReady.value) return

  clearOverlays()

  const walks = [...mapWalks.value].sort((a, b) => (a.savedAt || a.startedAt || 0) - (b.savedAt || b.startedAt || 0))

  const placedNodes = []
  const drawnTrailWalks = []
  const allWalkNodeItems = []

  function isDuplicateTrail(walk, other) {
    if (walk.isDemo || other.isDemo) return false
    const a = walk.trailPoints
    const b = other.trailPoints
    if (!a?.length || !b?.length) return false
    return (
      distanceMeters(a[0], b[0]) < 45 &&
      distanceMeters(a[a.length - 1], b[b.length - 1]) < 45 &&
      Math.abs(a.length - b.length) < 10
    )
  }

  walks.forEach((walk) => {
    const isDemo = walk.isDemo
    const dimmed = mapStore.selectedWalkId && mapStore.selectedWalkId !== walk.id
    const skipTrail =
      !isDemo && drawnTrailWalks.some((d) => isDuplicateTrail(walk, d))

    if (!skipTrail) {
      drawnTrailWalks.push(walk)
      const lines = buildGradientPolylines(walk.trailPoints || [], walk.colorNodes || [])
      lines.forEach((line) => {
        addGradientPolyline(group, line, {
          opacity: dimmed ? 0.35 : isDemo ? 0.65 : 0.7,
          onClick: () => {
            if (!isDemo) mapStore.setSelectedWalk(walk.id)
          },
        })
      })
    }

    for (const node of walk.colorNodes || []) {
      if (typeof node.lat === 'number' && typeof node.lng === 'number') {
        allWalkNodeItems.push({ walk, node })
      }
    }
  })

  const locationGroups = groupColocatedWalkNodes(allWalkNodeItems)
  locationGroups.forEach((locationGroup) => {
    const primary = locationGroup[0].node
    placedNodes.push(primary)
    const colorCount = locationGroup.length
    addColorNodeMarker(group, primary, {
      onClick: () => openLocationPopup(locationGroup),
      compact: locationGroup.every(({ walk }) => walk.isDemo),
      label: colorCount > 1 ? `${colorCount} 色` : undefined,
    })
  })

  MAIN_MAP_NODES.forEach((node) => {
    if (placedNodes.some((n) => nodesWithinMeters(node, n))) return
    addColorNodeMarker(group, node, {
      onClick: () => openMainMapNodePopup(node),
    })
  })
}

/** 主地图默认只适配洞头示范；路线详情或刚结束漫步返回时跟随该路线（勿用 selectedWalkId，避免误缩放） */
function getWalksForViewport() {
  if (detailWalk.value?.id) {
    const w = mapWalks.value.find((x) => x.id === detailWalk.value.id)
    if (w) return [w]
  }
  if (focusWalkId.value) {
    const w = mapWalks.value.find((x) => x.id === focusWalkId.value)
    if (w) return [w]
  }
  return [demoMapWalk]
}

function collectViewportNodes(walks) {
  const nodes = []
  for (const walk of walks) {
    for (const node of walk.colorNodes || []) {
      if (typeof node.lat === 'number' && typeof node.lng === 'number') {
        nodes.push(node)
      }
    }
    const trail = walk.trailPoints || []
    if (trail.length) {
      const end = trail[trail.length - 1]
      if (
        typeof end?.lat === 'number' &&
        typeof end?.lng === 'number' &&
        !nodes.some((n) => nodesWithinMeters(n, end, 5))
      ) {
        nodes.push(end)
      }
    }
  }
  return nodes
}

function applyMapViewport(map) {
  if (!map) return
  const walks = getWalksForViewport()
  let nodes = collectViewportNodes(walks)
  if (!detailWalk.value && !focusWalkId.value) {
    for (const node of MAIN_MAP_NODES) {
      if (!nodes.some((n) => nodesWithinMeters(n, node))) nodes.push(node)
    }
  }
  if (nodes.length) {
    const fitted = fitMapToNodes(map, nodes, getMapFitPadding(), {
      maxZoom: 16,
      defaultZoom: MAP_DEFAULT_ZOOM,
    })
    if (fitted) return
  }
  map.setView([DEMO_MAP_CENTER.lat, DEMO_MAP_CENTER.lng], MAP_DEFAULT_ZOOM, { animate: false })
}

async function syncMapDisplay({ fitViewport = false } = {}) {
  const map = mapInstance.value
  const el = mapContainer.value
  if (!map || !el || !mapReady.value) return

  await refreshMapDisplay(map, el, {
    fit: fitViewport ? () => applyMapViewport(map) : undefined,
  })
  if (!fitViewport) {
    invalidateMapSize(map)
  }
}

function getMapFitPadding() {
  // iPad 横屏：HomeSheet 改为右侧固定面板，不再遮挡地图底部。
  const isLandscape = window.matchMedia?.('(min-width: 1024px) and (orientation: landscape)')?.matches
  if (isLandscape) return [48, 48, 48, 48]

  const screenH = window.innerHeight || 800
  const isExpanded = sheetState.value === 'expanded'
  const ratio = isExpanded ? 0.75 : 0.4
  const bottom = Math.round(screenH * ratio + (isExpanded ? 24 : 72))
  return [48, 48, bottom, 48]
}

async function initMap() {
  if (mapInstance.value) return
  if (mapInitStarted.value) return
  if (!showLeafletMap.value) return

  await nextTick()
  const el = mapContainer.value
  if (!el) return

  const sized = await waitForMapContainer(el)
  if (!sized) return

  mapInitStarted.value = true
  try {
    const map = createMap(el, {
      center: DEMO_MAP_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
    })
    mapInstance.value = map
    overlayGroup.value = createOverlayGroup(map)
    unbindMapResize = bindMapResize(map, el)

    map.whenReady(async () => {
      await refreshMapDisplay(map, el)
      mapReady.value = true
      updateMapLayers()
      await syncMapDisplay({ fitViewport: true })
    })
  } catch (e) {
    console.error('地图加载失败', e)
    mapInitStarted.value = false
    mapInstance.value = null
    overlayGroup.value = null
  }
}

function destroyMap() {
  unbindMapResize()
  unbindMapResize = () => {}
  clearOverlays()
  if (mapInstance.value) {
    try {
      mapInstance.value.remove()
    } catch {
      /* ignore */
    }
  }
  mapInstance.value = null
  overlayGroup.value = null
  mapReady.value = false
  mapInitStarted.value = false
}

function hexToRgb(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return ''
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function formatNodeTimeLabel(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 跨路线合并同一位置的采色点（含不同漫步路线重合节点） */
function groupColocatedWalkNodes(items, thresholdM = 15) {
  const groups = []
  for (const item of items) {
    const { node } = item
    const match = groups.find((g) => nodesWithinMeters(g[0].node, node, thresholdM))
    if (match) match.push(item)
    else groups.push([item])
  }
  return groups
}

async function resolveUserColorEntry(node) {
  let photoUrl = ''
  let cardName = ''
  let hex = node.colorHex || node.color || ''
  if (node.cardId) {
    const card = await getItem('card', node.cardId)
    if (card) {
      cardName = card.name
      hex = card.hex || hex
    }
  }
  if (node.photoId) {
    const photo = await getItem('photo', node.photoId)
    if (photo?.thumbnail) photoUrl = photo.thumbnail
    else if (photo?.blob) photoUrl = URL.createObjectURL(photo.blob)
  }
  return {
    colorName: cardName,
    hex,
    photoUrl,
    photoUrls: photoUrl ? [photoUrl] : [],
    cardId: node.cardId || '',
    editable: Boolean(node.cardId),
    timeLabel: formatNodeTimeLabel(node.ts),
    description: '',
  }
}

function resolveDemoColorEntry(node) {
  const d = getDemoNodeDetail(node)
  return {
    colorName: d.colorName,
    hex: d.hex,
    rgb: d.rgb,
    photoUrl: d.photoUrl,
    photoUrls: d.photoUrls || [],
    cardId: '',
    editable: false,
    timeLabel: d.timeLabel,
    description: d.description || '',
  }
}

function openMainMapNodePopup(node) {
  const hex = node.colorHex || node.color || ''
  const photoUrls = node.photoUrls?.length ? node.photoUrls : []
  popup.value = {
    show: true,
    description: node.description || '',
    colorEntries: [
      {
        colorName: node.colorName || node.name || '',
        hex,
        rgb: hexToRgb(hex),
        photoUrl: photoUrls[0] || '',
        photoUrls,
        cardId: '',
        editable: false,
        timeLabel: '',
        description: '',
      },
    ],
  }
}

async function openLocationPopup(group) {
  const items = (group || []).filter(Boolean)
  if (!items.length) return

  if (items.length === 1 && items[0].walk.isDemo) {
    const exhibitionNode = findExhibitionNodeForDemoNode(items[0].node)
    if (exhibitionNode) {
      popup.value.show = false
      exhibitionPopupNode.value = exhibitionNode
      showExhibitionCard.value = true
      return
    }
  }

  const colorEntries = []
  for (const { walk, node } of items) {
    const walkLabel = walk.pathName || walk.name || (walk.isDemo ? '示范路线' : '漫步')
    if (walk.isDemo) {
      colorEntries.push({
        ...resolveDemoColorEntry(node),
        walkId: walk.id,
        walkLabel,
        sortTs: node.ts || walk.startedAt || 0,
      })
    } else {
      colorEntries.push({
        ...(await resolveUserColorEntry(node)),
        walkId: walk.id,
        walkLabel,
        sortTs: node.ts || walk.startedAt || 0,
      })
    }
  }
  colorEntries.sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0))

  popup.value = {
    show: true,
    description: '',
    colorEntries: colorEntries.map(({ sortTs, ...entry }) => entry),
  }

  const userWalkIds = [...new Set(items.filter((i) => !i.walk.isDemo).map((i) => i.walk.id))]
  mapStore.setSelectedWalk(userWalkIds.length === 1 ? userWalkIds[0] : null)
}

async function onPopupRenameColor({ cardId, name }) {
  if (!cardId) return
  const trimmed = String(name || '').trim()
  if (!trimmed) return
  try {
    const card = await getItem('card', cardId)
    if (!card) return
    const updated = { ...card, name: trimmed }
    await galleryStore.updateCard(updated)
    const entry = popup.value.colorEntries.find((e) => e.cardId === cardId)
    if (entry) entry.colorName = trimmed
  } catch (e) {
    console.error('修改色名失败', e)
    alert('修改名称失败，请重试')
  }
}

function closePopup() {
  popup.value.show = false
}

function closeExhibitionCard() {
  showExhibitionCard.value = false
  exhibitionPopupNode.value = null
}

function onSheetStateChange(state) {
  sheetState.value = state === 'landscape' ? 'peek' : state
  const isLandscape = window.matchMedia?.(
    '(min-width: 1024px) and (orientation: landscape)'
  )?.matches
  const bottom = isLandscape
    ? 'calc(16px + env(safe-area-inset-bottom, 0px))'
    : state === 'expanded'
      ? 'calc(var(--sheet-expanded-height) + 12px)'
      : 'calc(var(--sheet-peek-height) + 12px)'
  mapPageRef.value?.style.setProperty('--float-buttons-bottom', bottom)
  nextTick(() => {
    if (!mapReady.value) return
    updateMapLayers()
    void syncMapDisplay({ fitViewport: pagePhase.value === 'map' })
  })
}

function goGallery() {
  router.push('/gallery')
}

async function onDeleteWalk(walk) {
  try {
    await galleryStore.removeWalkCascade(walk)
    await mapStore.hydrate()
    await galleryStore.hydrate()
    await photoStore.hydrate()
    if (detailWalk.value?.id === walk.id) {
      detailWalk.value = null
      mapStore.setSelectedWalk(null)
    } else if (mapStore.selectedWalkId === walk.id) {
      mapStore.setSelectedWalk(null)
    }
    if (mapReady.value) updateMapLayers()
  } catch (e) {
    console.error('删除路线失败', e)
    alert('删除失败，请重试')
  }
}

async function onRenameWalk(walk, name) {
  try {
    const trimmed = String(name || '').trim()
    const result = await mapStore.updateWalkPathName(walk.id, trimmed)
    if (!result.ok) {
      alert(result.message || '修改名称失败')
      return
    }
    const gIdx = galleryStore.walks.findIndex((w) => w.id === walk.id)
    if (gIdx >= 0) {
      galleryStore.walks[gIdx] = { ...galleryStore.walks[gIdx], pathName: trimmed }
    }
    if (detailWalk.value?.id === walk.id) {
      detailWalk.value = { ...detailWalk.value, pathName: trimmed }
    }
  } catch (e) {
    console.error('修改路线名称失败', e)
    alert('修改名称失败，请重试')
  }
}

async function onResultRenamePath(name) {
  const trimmed = String(name || '').trim()
  const result = await walkStore.renamePathName(trimmed)
  if (!result.ok) {
    alert(result.message || '修改名称失败')
    return
  }
  if (walkStore.lastSavedWalkId) {
    await mapStore.refreshWalks()
    const gIdx = galleryStore.walks.findIndex((w) => w.id === walkStore.lastSavedWalkId)
    if (gIdx >= 0) {
      galleryStore.walks[gIdx] = { ...galleryStore.walks[gIdx], pathName: trimmed }
    }
  }
}

async function onDetailRenamePath(name) {
  if (!detailWalk.value?.id || detailWalk.value.isDemo) return
  await onRenameWalk(detailWalk.value, name)
}

async function openWalkDetail(walk) {
  focusWalkId.value = null
  const cards = []
  for (const id of walk.cardIds || []) {
    const c = galleryStore.cards.find((x) => x.id === id)
    if (c) cards.push(c)
  }
  const photos = []
  for (const id of walk.photoIds || []) {
    const p = await getItem('photo', id)
    if (p) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }
  detailWalk.value = { ...walk, cards, photos }
  mapStore.setSelectedWalk(walk.id)
  updateMapLayers()
  void syncMapDisplay({ fitViewport: true })
}

function onSelectWalk(walk) {
  openWalkDetail(walk)
}

function onSelectDemo() {
  router.push('/demo')
}

async function rebuildDetailWalk(walkBase) {
  const cards = []
  for (const id of walkBase.cardIds || []) {
    const c = galleryStore.cards.find((x) => x.id === id)
    if (c) cards.push(c)
  }
  const photos = []
  for (const id of walkBase.photoIds || []) {
    const p = await getItem('photo', id)
    if (p) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }
  return { ...walkBase, cards, photos }
}

async function onDetailWalkDeletePhoto(photoId) {
  if (!detailWalk.value?.id || detailWalk.value.isDemo) return
  const w = galleryStore.walks.find((x) => x.id === detailWalk.value.id) || detailWalk.value
  const updated = await galleryStore.removePhotoFromWalk(w, photoId)
  detailWalk.value = await rebuildDetailWalk(updated)
  await mapStore.refreshWalks()
  if (mapReady.value) updateMapLayers()
}

async function deleteDetailWalk() {
  if (!detailWalk.value?.id || detailWalk.value.isDemo) return
  if (!confirm('确定删除整条路线及其色卡、照片？')) return
  const w = detailWalk.value
  await galleryStore.removeWalkCascade(w)
  detailWalk.value = null
  mapStore.setSelectedWalk(null)
  await mapStore.hydrate()
  await galleryStore.hydrate()
  await photoStore.hydrate()
  if (mapReady.value) {
    updateMapLayers()
    void syncMapDisplay({ fitViewport: true })
  }
}

function closeWalkDetail() {
  detailWalk.value = null
  mapStore.setSelectedWalk(null)
  focusWalkId.value = null
  if (mapReady.value) {
    updateMapLayers()
    void syncMapDisplay({ fitViewport: true })
  }
}

async function onStartWalk() {
  gpsError.value = ''
  gpsWarning.value = ''
  walkStore.lockTargetColors()
  const result = await walkStore.startWalk()
  if (!result.ok) {
    gpsError.value = result.message
    return
  }
  if (result.locationWarning) gpsWarning.value = result.locationWarning
  pagePhase.value = 'walking'
}

async function onEndWalk() {
  try {
    await walkStore.endWalk()
    await nextTick()
    pagePhase.value = 'result'
    const result = await walkStore.saveWalkToGallery()
    if (result.ok) {
      try {
        await galleryStore.hydrate()
        await mapStore.refreshWalks()
      } catch (e) {
        console.error('刷新数据失败', e)
      }
      saveHint.value = result.message || '已保存至地图与画廊'
      if (mapReady.value) updateMapLayers()
    } else {
      saveHint.value = result.message || '保存失败，可在成果页重试'
    }
  } catch (e) {
    console.error('结束漫步失败', e)
    saveHint.value = '结束失败，请刷新页面后重试'
    pagePhase.value = 'result'
  }
}

async function onSaveGallery() {
  saveHint.value = ''
  const result = await walkStore.saveWalkToGallery()
  if (!result.ok) {
    saveHint.value = result.message || '保存失败，请重试'
    return
  }
  try {
    await galleryStore.hydrate()
    await mapStore.refreshWalks()
  } catch (e) {
    console.error('刷新画廊列表失败', e)
  }
  saveHint.value = result.message || (result.already ? '已在画廊中' : '已保存色卡与路线')
  if (mapReady.value) updateMapLayers()
}

function onNewWalkFromResult() {
  saveHint.value = ''
  focusWalkId.value = null
  walkStore.newWalk()
  skipColorSelect.value = false
  pagePhase.value = 'color-select'
}

function onBackToMap() {
  const justFinishedId = walkStore.lastSavedWalkId
  skipColorSelect.value = true
  saveHint.value = ''
  if (justFinishedId) {
    focusWalkId.value = justFinishedId
    mapStore.setSelectedWalk(justFinishedId)
  }
  // 先切回地图并设置 focus，再 reset 会话，避免 phase 监听抢先触发 resume 时 focus 尚未就绪
  pagePhase.value = 'map'
  walkStore.newWalk()
}

/** 从 overlay 回到地图：重建 Leaflet（漫步/成果阶段已卸载容器，避免瓦片无法恢复） */
async function resumeMapAfterOverlay(fromPhase) {
  await nextTick()
  await waitForLayout()

  if (fromPhase === 'result' || fromPhase === 'walking') {
    destroyMap()
    await nextTick()
    await waitForLayout()
    await initMap()
    return
  }

  if (!mapInstance.value && showLeafletMap.value) {
    await initMap()
    return
  }

  if (!mapInstance.value || !mapReady.value) return

  updateMapLayers()
  await syncMapDisplay({ fitViewport: true })
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void syncMapDisplay({ fitViewport: false })
    })
  })
}

function onNewWalkFromMap() {
  if (walkStore.phase === 'walking') return
  focusWalkId.value = null
  walkStore.newWalk()
  skipColorSelect.value = false
  pagePhase.value = 'color-select'
}

watch([() => mapStore.savedWalks, () => mapStore.selectedWalkId], () => {
  if (mapReady.value) updateMapLayers()
})

watch(
  () => walkStore.phase,
  (phase) => {
    if (phase === 'walking') pagePhase.value = 'walking'
    else if (phase === 'result') pagePhase.value = 'result'
    else if (phase === 'idle' && (pagePhase.value === 'walking' || pagePhase.value === 'result')) {
      pagePhase.value = skipColorSelect.value ? 'map' : 'color-select'
    }
  }
)

watch(pagePhase, (phase) => {
  if (phase === 'walking' || phase === 'result') {
    destroyMap()
  }
}, { flush: 'sync' })

watch(pagePhase, async (phase, prev) => {
  if (!showLeafletMap.value) return

  if (phase === 'map' && prev !== 'map') {
    await resumeMapAfterOverlay(prev)
    return
  }

  if (!mapInstance.value) {
    await initMap()
  }
}, { flush: 'post' })

watch(showLeafletMap, async (visible) => {
  if (!visible) return
  if (!mapInstance.value) {
    await initMap()
    return
  }
  if (mapReady.value && pagePhase.value === 'map') {
    await syncMapDisplay({ fitViewport: true })
  } else if (mapInstance.value) {
    await syncMapDisplay({ fitViewport: false })
  }
})

watch(
  () => walkStore.openColorSelectOnHome,
  (open) => {
    if (!open || walkStore.phase === 'walking') return
    skipColorSelect.value = false
    pagePhase.value = 'color-select'
    walkStore.consumeColorSelectRequest()
  }
)

let layoutMql = null
let onLayoutChange = null

onMounted(async () => {
  pagePhase.value = resolvePagePhase()
  if (showLeafletMap.value) {
    await initMap()
  }

  layoutMql = window.matchMedia?.('(min-width: 1024px) and (orientation: landscape)')
  onLayoutChange = () => {
    if (!mapReady.value) return
    void syncMapDisplay({ fitViewport: pagePhase.value === 'map' })
  }
  layoutMql?.addEventListener?.('change', onLayoutChange)
  window.addEventListener('orientationchange', onLayoutChange)
})

onUnmounted(() => {
  layoutMql?.removeEventListener?.('change', onLayoutChange)
  window.removeEventListener('orientationchange', onLayoutChange)
  destroyMap()
})
</script>

<template>
  <div ref="mapPageRef" class="page map-page" :class="`map-page--${pagePhase}`">
    <!-- 地图层：漫步/成果全屏时卸载，返回后重建，避免 Leaflet 瓦片在隐藏后无法恢复 -->
    <div
      v-if="showLeafletMap"
      ref="mapContainer"
      class="map-container map-pastel"
      :class="{ 'map-container--dimmed': pagePhase === 'color-select' }"
    />

    <!-- 选色寻色 -->
    <section v-if="pagePhase === 'color-select'" class="color-select-phase">
      <div class="color-select-column">
        <header class="color-select-header">
          <h2 class="wheel-headline">
            转动转盘，抽取你的
            <span class="wheel-headline-accent">今日寻色</span>
          </h2>
          <p class="color-select-hint">指针所指即为本次漫步要寻找的一种颜色</p>
        </header>

        <div class="wheel-area">
          <ColorWheel
            :rotation="walkStore.wheelRotation"
            :spinning="walkStore.isSpinning"
            :disabled="walkStore.locating"
            @spin="walkStore.spinToRandom"
          />
        </div>

        <footer class="color-select-footer">
          <div v-if="walkStore.selectedColor" class="color-preview">
            <span class="color-preview-label">指针选中</span>
            <span class="color-preview-chip">
              <i :style="{ background: walkStore.selectedColor.hex }" />
              {{ walkStore.selectedColor.name }}
            </span>
          </div>

          <button
            v-if="walkStore.selectedColor"
            type="button"
            class="btn-start-walk"
            :disabled="walkStore.locating"
            @click="onStartWalk"
          >
            {{ walkStore.locating ? '定位中…' : '开始漫步' }}
          </button>

          <p v-if="gpsError" class="gps-msg gps-msg--error">
            {{ gpsError }}
            <button type="button" class="gps-retry" @click="onStartWalk">重试</button>
          </p>
          <p v-if="gpsWarning" class="gps-msg gps-msg--warn">{{ gpsWarning }}</p>
        </footer>
      </div>

    </section>

    <!-- 漫步采色 -->
    <div v-if="pagePhase === 'walking'" class="walk-phase-overlay">
      <WalkingPanel @end="onEndWalk" />
    </div>

    <!-- 成果展示 -->
    <div v-if="pagePhase === 'result'" class="result-phase-overlay">
      <div class="result-phase-scroll">
        <WalkResult
          :walk="walkStore.currentWalk"
          :saved="walkStore.savedToGallery"
          :saving="walkStore.savingGallery"
          :save-hint="saveHint"
          :location-label="walkStore.pathName"
          @save="onSaveGallery"
          @new-walk="onNewWalkFromResult"
          @back-map="onBackToMap"
          @delete-photo="walkStore.removeSessionPhoto"
          @rename-path="onResultRenamePath"
        />
      </div>
    </div>

    <FloatingButtons
      v-if="showMapChrome"
      @new-walk="onNewWalkFromMap"
      @gallery="goGallery"
    />

    <HomeSheet
      v-if="showMapChrome"
      :walks="sortedWalks"
      :demo-card="{
        title: `${demoCard.title} Colorwalk`,
        date: demoCard.date,
        meta: demoCard.meta,
      }"
      @select-walk="onSelectWalk"
      @delete-walk="onDeleteWalk"
      @rename-walk="onRenameWalk"
      @select-demo="onSelectDemo"
      @state-change="onSheetStateChange"
      @about="showAbout = true"
    />

    <ColorPointPopup
      :show="popup.show"
      :color-entries="popup.colorEntries"
      :description="popup.description"
      @close="closePopup"
      @rename="onPopupRenameColor"
    />

    <ExhibitionCardModal
      :show="showExhibitionCard"
      :name="exhibitionPopupNode?.name ?? ''"
      :main-color="exhibitionPopupNode?.mainColor ?? ''"
      :location-label="exhibitionPopupNode?.cardLocation ?? exhibitionPopupNode?.name ?? ''"
      :sections="exhibitionPopupNode ? getNodeCardSections(exhibitionPopupNode) : []"
      @close="closeExhibitionCard"
    />

    <AboutSheet :show="showAbout" @close="showAbout = false" />

    <div v-if="detailWalk" class="walk-overlay" @click.self="closeWalkDetail">
      <div class="walk-detail-scroll walk-detail-inner" @click.stop>
        <button type="button" class="float-panel-del" aria-label="删除整条路线" @click="deleteDetailWalk">
          <Trash2 :size="15" :stroke-width="2" />
        </button>
        <WalkResult
          :walk="detailWalk"
          embedded
          readonly
          allow-path-rename
          @delete-photo="onDetailWalkDeletePhoto"
          @rename-path="onDetailRenamePath"
        />
        <button type="button" class="btn-close" @click="closeWalkDetail">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  padding: 0;
  height: 100vh;
  max-height: 100dvh;
  position: relative;
  overflow: hidden;
}

.map-page--color-select {
  background: var(--bg-app);
  overflow: hidden;
}

.color-select-phase {
  position: relative;
  z-index: 20;
  height: 100%;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  background: var(--bg-app);
  padding: calc(env(safe-area-inset-top, 0px) + 20px) var(--page-padding)
    calc(env(safe-area-inset-bottom, 0px) + var(--safe-bottom, 0px) + 16px);
  color: var(--text-primary);
}

.color-select-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: min(92vw, 360px);
  flex: 1;
  min-height: 0;
}

.color-select-phase > * {
  position: relative;
  z-index: 1;
}

.color-select-header {
  flex-shrink: 0;
  width: 100%;
  text-align: center;
}

.wheel-headline {
  margin: 0 0 6px;
  text-align: center;
  font-size: clamp(20px, 5.5vw, 26px);
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.wheel-headline-accent {
  color: var(--brand-ink);
}

.color-select-hint {
  max-width: 300px;
  margin: 0 auto;
  text-align: center;
  font-size: var(--font-footnote);
  line-height: 1.45;
  color: var(--text-secondary);
}

.wheel-area {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  container-type: size;
  container-name: wheel-slot;
}

.wheel-area :deep(.wheel-panel) {
  width: min(100cqw, calc(100cqh - 8px), 100%);
  max-width: 100%;
  margin-inline: auto;
  padding-top: clamp(6px, 2cqh, 16px);
}

.color-select-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.color-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 340px;
  padding: 12px 18px;
  margin: 0;
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  box-shadow: none;
}

.color-preview-label {
  font-size: var(--font-footnote);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.color-preview-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-headline);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.color-preview-chip i {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.btn-start-walk {
  width: 100%;
  max-width: 340px;
  min-height: 52px;
  border: none;
  border-radius: var(--radius-button);
  background: var(--brand-ink);
  color: var(--brand-label);
  font-size: var(--font-headline);
  font-weight: var(--font-weight-semibold);
  box-shadow: none;
  transition: transform var(--transition-bounce), box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .btn-start-walk:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}

.btn-start-walk:not(:disabled):active {
  transform: scale(0.97);
}

.btn-start-walk:disabled {
  opacity: 0.45;
}

.gps-msg {
  margin: 0;
  font-size: var(--font-footnote);
  text-align: center;
  line-height: 1.5;
  max-width: 300px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: none;
}

.gps-msg--error {
  color: var(--system-red);
  background: color-mix(in srgb, var(--system-red) 10%, transparent);
}

.gps-msg--warn {
  color: var(--brand-stone);
  background: color-mix(in srgb, var(--brand-sage) 18%, var(--brand-cream));
}

.gps-retry {
  display: block;
  margin: 8px auto 0;
  color: var(--brand-primary);
  font-weight: var(--font-weight-medium);
}

.map-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.map-container--dimmed {
  /* 用 opacity 而非 visibility，避免 Leaflet 在恢复显示时瓦片/尺寸计算异常 */
  opacity: 0;
  pointer-events: none;
}

@media (min-width: 1024px) and (orientation: landscape) {
  /* iPad 横屏：右侧固定历史面板占位，避免 Leaflet 覆盖到右栏。 */
  .map-container {
    inset: 0 var(--right-panel-width) 0 0;
  }
}

.walk-phase-overlay,
.result-phase-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--bg-app);
  /* 脱离 app-shell 的 430px 限宽，始终铺满视口 */
  width: 100%;
  max-width: none;
  margin: 0;
  left: 0;
  right: 0;
}

.result-phase-scroll {
  height: 100%;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--page-padding);
  padding-bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px) + 16px);
  box-sizing: border-box;
  width: 100%;
  max-width: none;
}

@media (min-width: 768px) {
  .result-phase-scroll {
    padding: 24px 28px;
    padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  }

  .result-phase-scroll :deep(.walk-result:not(.walk-result--embedded)) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}

.result-phase-scroll :deep(.walk-result) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0;
}

.walk-overlay {
  position: fixed;
  inset: 0;
  z-index: 250;
  background: var(--overlay-dim);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.walk-detail-scroll {
  width: 100%;
  max-width: var(--max-width);
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  border-top: 1px solid var(--border);
  padding: var(--page-padding);
  box-shadow: var(--shadow-sheet);
  animation: slide-up var(--duration-normal) var(--ease-spring);
}

.walk-detail-inner {
  position: relative;
  padding-top: 8px;
}

@media (min-width: 1024px) and (orientation: landscape) {
  .walk-detail-scroll {
    max-width: min(920px, 92vw);
  }
}

.float-panel-del {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-app);
  color: var(--accent-coral);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.float-panel-del:active {
  transform: scale(0.94);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-close {
  width: 100%;
  padding: 14px;
  margin-top: 12px;
  color: var(--brand-primary);
  font-size: var(--font-headline);
  font-weight: var(--font-weight-medium);
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createMap,
  createOverlayGroup,
  addExhibitionNodeMarker,
  addGradientPolyline,
  bindMapResize,
  waitForLayout,
  invalidateMapSize,
  lngLatCenter,
} from '../utils/leafletMap'
import { buildExhibitionRoutePolylines } from '../utils/exhibitionMapRoutes.js'
import {
  MAP_CENTER,
  MAP_INITIAL_ZOOM,
  EXHIBITION_PLANNED_TOTAL,
  findNodeByNfcPayload,
  findNodeById,
  getNodeCardSections,
  NFC_URL_QUERY_KEY,
} from '../data/exhibitionNodes.js'
import {
  isNfcSupported,
  extractTextFromNdefMessage,
  mapNfcError,
} from '../utils/nfc.js'
import {
  loadCheckedNodeIds,
  saveCheckedNodeIds,
  clearExhibitionCheckIns,
} from '../utils/exhibitionStorage.js'
import ExhibitionCardModal from '../components/ExhibitionCardModal.vue'

const route = useRoute()
const router = useRouter()

const mapContainer = ref(null)
const mapInstance = ref(null)
const overlayGroup = ref(null)
const mapReady = ref(false)

/**
 * 打卡记录：已打卡节点 id 集合
 * - 只增不减，支持任意顺序打卡
 * - 用 Set 防止重复打卡时重复计入进度
 */
/** 打卡顺序（先打卡在前）；Set 仅用于快速查重 */
const checkedNodeOrder = ref([])
const checkedNodes = ref(new Set())

/**
 * 地图标记缓存：key = 节点 id，value = Leaflet 图层对象
 * - 防止同一节点重复 addLayer
 * - 关闭卡片不影响此 Map 中的标记
 */
const mapMarkers = ref(new Map())
/** 展览路线渐变折线图层 */
const routePolylines = ref([])

/** 当前弹窗展示的节点；关闭弹窗不影响地图标记 */
const selectedNode = ref(null)
const showCard = ref(false)

/** NFC / 交互提示（不支持、读取失败、未知节点等） */
const statusMessage = ref('')
const statusType = ref('info') // info | error | warn

let unbindMapResize = () => {}
let nfcAbortController = null
let statusTimer = null

/** 进度分母（计划 20 个点位，与已配置节点数可不一致） */
const totalNodes = EXHIBITION_PLANNED_TOTAL

const checkedCount = computed(() => checkedNodeOrder.value.length)

const progressPercent = computed(() =>
  totalNodes > 0 ? Math.round((checkedCount.value / totalNodes) * 100) : 0,
)

/** Vue 3 对 Set 的变更不自动触发依赖，赋值新 Set 以刷新 computed */
function notifyCheckedNodesChanged() {
  checkedNodes.value = new Set(checkedNodeOrder.value)
}

/** 将打卡顺序写入 localStorage（NFC URL 重载后仍可累积） */
function persistCheckedNodes() {
  saveCheckedNodeIds(checkedNodeOrder.value)
}

/**
 * 页面挂载时从 localStorage 恢复打卡记录
 * 须在 processUrlCheckIn 之前调用，避免 iPhone 每次碰芯片整页重载后只剩 1 个点位
 */
function restoreCheckedNodesFromStorage() {
  const ids = loadCheckedNodeIds()
  if (!ids.length) return
  checkedNodeOrder.value = [...ids]
  checkedNodes.value = new Set(ids)
}

/** 显示临时提示，若干秒后自动消失 */
function showStatus(message, type = 'info', durationMs = 4000) {
  statusMessage.value = message
  statusType.value = type
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusMessage.value = ''
  }, durationMs)
}

/** 打开节点信息卡片 */
function showCardModal(node) {
  selectedNode.value = node
  showCard.value = true
}

/** 关闭卡片；地图上的标记保留 */
function closeCardModal() {
  showCard.value = false
  selectedNode.value = null
}

/**
 * 为单个已打卡节点添加地图标记（仅新增，不清除已有标记）
 * 1. 查 mapMarkers 是否已有该节点
 * 2. 无则创建 Leaflet 标记并写入缓存
 * @param {import('../data/exhibitionNodes.js').EXHIBITION_NODES[0]} node
 */
function addMarkerToMap(node) {
  const group = overlayGroup.value
  if (!group || !mapReady.value || !node?.id) return
  if (mapMarkers.value.has(node.id)) return

  const marker = addExhibitionNodeMarker(group, node, {
    onClick: () => showCardModal(node),
  })
  mapMarkers.value.set(node.id, marker)
}

/** 将 checkedNodes 中尚未落图的节点全部补上标记（地图就绪或 URL 先打卡时调用） */
function syncMarkersFromCheckedNodes() {
  checkedNodeOrder.value.forEach((nodeId) => {
    const node = findNodeById(nodeId)
    if (node) addMarkerToMap(node)
  })
  syncRoutePolylines()
}

function clearRoutePolylines() {
  const group = overlayGroup.value
  if (!group) return
  routePolylines.value.forEach((layer) => {
    try {
      group.removeLayer(layer)
    } catch {
      /* already removed */
    }
  })
  routePolylines.value = []
}

/** 按展览顺序，为相邻且均已打卡的节点直线连接（同主地图采色点连线） */
function syncRoutePolylines() {
  const group = overlayGroup.value
  if (!group || !mapReady.value) return

  clearRoutePolylines()

  if (checkedNodeOrder.value.length < 2) return

  const lines = buildExhibitionRoutePolylines(checkedNodeOrder.value)
  const layers = []
  lines.forEach((line) => {
    const layer = addGradientPolyline(group, line, { opacity: 1 })
    if (layer) {
      layer.bringToBack()
      layers.push(layer)
    }
  })
  mapMarkers.value.forEach((marker) => {
    try {
      marker.bringToFront()
    } catch {
      /* ignore */
    }
  })
  routePolylines.value = layers
}

/**
 * 打卡核心：记录节点 + 落图 + 弹卡片
 * - 新节点：加入 checkedNodes，必要时 addMarkerToMap
 * - 重复打卡：只弹卡片，Set/Map 均不重复写入
 * @param {import('../data/exhibitionNodes.js').EXHIBITION_NODES[0]} node
 */
function checkInNode(node) {
  if (!node?.id) {
    showStatus('节点数据无效', 'error')
    return
  }

  const isNewCheckIn = !checkedNodes.value.has(node.id)
  if (isNewCheckIn) {
    checkedNodeOrder.value.push(node.id)
    notifyCheckedNodesChanged()
    persistCheckedNodes()
    addMarkerToMap(node)
    syncRoutePolylines()
  }
  showCardModal(node)
}

/**
 * NFC 触碰 / URL 打卡入口
 * 1. 解析 payload 得到 nfcId（如「02三角梅」或 ?nfc=02三角梅）
 * 2. 查找节点 → checkInNode
 * @param {string} payload - 芯片文本、NDEF URL 或纯 nfcId
 */
function handleNFCTap(payload) {
  const text = String(payload ?? '').trim()
  if (!text) {
    showStatus('未读取到有效内容，请重试', 'error')
    return
  }

  const node = findNodeByNfcPayload(text)
  if (!node) {
    showStatus(`未知节点：${text}`, 'warn')
    return
  }

  checkInNode(node)
}

/**
 * iPhone 备用：芯片写入 URL 打开本页时，从 ?nfc= 参数打卡（无需 Web NFC）
 * 处理完成后清除 URL 参数，避免刷新重复弹窗
 */
function processUrlCheckIn() {
  const raw = route.query[NFC_URL_QUERY_KEY]
  if (raw == null || raw === '') return

  const nfcId = decodeURIComponent(Array.isArray(raw) ? raw[0] : String(raw))
  handleNFCTap(nfcId)

  const restQuery = { ...route.query }
  delete restQuery[NFC_URL_QUERY_KEY]
  router.replace({
    path: route.path,
    query: Object.keys(restQuery).length ? restQuery : undefined,
  })
}

/** 启动 Web NFC 持续扫描（需 HTTPS；Android Chrome 支持） */
async function startNfcScan() {
  if (!isNfcSupported()) return

  nfcAbortController?.abort()
  nfcAbortController = new AbortController()

  try {
    const reader = new NDEFReader()
    await reader.scan({ signal: nfcAbortController.signal })

    reader.addEventListener('reading', ({ message }) => {
      const text = extractTextFromNdefMessage(message)
      handleNFCTap(text)
    })

    reader.addEventListener('readingerror', () => {
      showStatus('NFC 读取失败，请靠近芯片后重试', 'error')
    })
  } catch (err) {
    if (err?.name === 'AbortError') return
    showStatus(mapNfcError(err), 'error', 6000)
  }
}

function stopNfcScan() {
  nfcAbortController?.abort()
  nfcAbortController = null
}

async function initMap() {
  try {
    await nextTick()
    await waitForLayout()
    if (!mapContainer.value) return

    const map = createMap(mapContainer.value, {
      center: MAP_CENTER,
      zoom: MAP_INITIAL_ZOOM,
    })
    mapInstance.value = map
    overlayGroup.value = createOverlayGroup(map)
    unbindMapResize = bindMapResize(map, mapContainer.value)

    map.whenReady(() => {
      invalidateMapSize(map)
      mapReady.value = true
      // 初始地图无标记；若 URL 已先打卡，在此补全标记
      map.setView(lngLatCenter(MAP_CENTER), MAP_INITIAL_ZOOM, { animate: false })
      syncMarkersFromCheckedNodes()
    })
  } catch (e) {
    console.error('展览地图加载失败', e)
    showStatus('地图加载失败', 'error')
  }
}

/** 开发环境：控制台模拟 NFC 打卡与查看状态 */
function attachDevDebugHelpers() {
  if (!import.meta.env.DEV) return
  window.__exhibitionDebug = {
    /** 模拟触碰芯片：__exhibitionDebug.tap('01杨府殿') */
    tap: (nfcId) => handleNFCTap(nfcId),
    getCheckedNodes: () => [...checkedNodeOrder.value],
    getMapMarkerIds: () => [...mapMarkers.value.keys()],
    getMapMarkers: () => mapMarkers.value,
    clearStorage: () => {
      clearExhibitionCheckIns()
      checkedNodeOrder.value = []
      checkedNodes.value = new Set()
      notifyCheckedNodesChanged()
      syncRoutePolylines()
    },
  }
}

onMounted(async () => {
  attachDevDebugHelpers()
  restoreCheckedNodesFromStorage()
  processUrlCheckIn()
  await initMap()
  startNfcScan()
})

onUnmounted(() => {
  stopNfcScan()
  if (statusTimer) clearTimeout(statusTimer)
  unbindMapResize()
  routePolylines.value = []
  overlayGroup.value?.clearLayers()
  mapInstance.value?.remove()
  mapInstance.value = null
  overlayGroup.value = null
  mapMarkers.value.clear()
  if (import.meta.env.DEV) {
    delete window.__exhibitionDebug
  }
})
</script>

<template>
  <div class="page exhibition-map">
    <div ref="mapContainer" class="map-container" />

    <header class="map-header">
      <p class="map-title">七彩洞头村</p>
      <p class="map-progress">
        已打卡 <strong>{{ checkedCount }}</strong> / {{ totalNodes }}
      </p>
      <div
        class="progress-bar"
        role="progressbar"
        :aria-valuenow="checkedCount"
        :aria-valuemin="0"
        :aria-valuemax="totalNodes"
        :aria-label="`打卡进度 ${checkedCount} / ${totalNodes}`"
      >
        <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
      <p class="map-subtitle">碰一碰彩色圆点采色</p>
    </header>

    <transition name="toast">
      <p
        v-if="statusMessage"
        class="status-toast"
        :class="`status-toast--${statusType}`"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage }}
      </p>
    </transition>

    <ExhibitionCardModal
      :show="showCard"
      :name="selectedNode?.name ?? ''"
      :main-color="selectedNode?.mainColor ?? ''"
      :location-label="selectedNode?.cardLocation ?? selectedNode?.name ?? ''"
      :sections="selectedNode ? getNodeCardSections(selectedNode) : []"
      @close="closeCardModal"
    />
  </div>
</template>

<style scoped>
.exhibition-map {
  padding: 0;
  height: 100vh;
  max-height: 100dvh;
  position: relative;
  overflow: hidden;
}

.map-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.map-header {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: 16px;
  right: 16px;
  z-index: 2;
  padding: 10px 14px;
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: none;
  text-align: center;
  pointer-events: none;
}

.map-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.map-progress {
  margin: 6px 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.map-progress strong {
  color: var(--text-primary);
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--bg-secondary);
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--brand-ink);
  transition: width var(--duration-normal) var(--ease-material);
}

.map-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
}

.status-toast {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 3;
  margin: 0;
  padding: 12px 16px;
  border-radius: var(--radius-card);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  border: 1px solid var(--border);
  box-shadow: none;
}

.status-toast--info {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-left: 3px solid var(--brand-primary);
}

.status-toast--warn {
  background: var(--bg-surface);
  color: var(--brand-stone);
  border-left: 3px solid var(--brand-sage);
}

.status-toast--error {
  background: var(--bg-surface);
  color: var(--system-red);
  border-left: 3px solid var(--system-red);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

<style>
/* Leaflet 展览标记名称标签（非 scoped，作用于 tooltip DOM） */
.exhibition-marker-label {
  background: rgba(255, 255, 255, 0.92);
  border: none;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  color: #1a1a1a;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
}

.exhibition-marker-label::before {
  border-top-color: rgba(255, 255, 255, 0.92) !important;
}
</style>

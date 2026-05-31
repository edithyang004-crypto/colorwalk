<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import {
  createMap,
  createOverlayGroup,
  addGradientPolyline,
  addColorNodeMarker,
  addPositionMarker,
  fitMapToGroup,
  bindMapResize,
  waitForLayout,
  invalidateMapSize,
  lngLatCenter,
} from '../utils/leafletMap'
import { buildGradientPolylines } from '../utils/trailRender'

const props = defineProps({
  trailPoints: { type: Array, default: () => [] },
  colorNodes: { type: Array, default: () => [] },
  currentPosition: { type: Object, default: null },
  interactive: { type: Boolean, default: true },
  follow: { type: Boolean, default: true },
  height: { type: String, default: '100%' },
  zoom: { type: Number, default: 17 },
  center: { type: Object, default: null },
})

const mapEl = ref(null)
const mapInstance = ref(null)
const overlayGroup = ref(null)
const waitingCenter = ref(false)
const ready = ref(false)
let positionMarker = null
let lastTrailCount = 0
let unbindMapResize = () => {}

const resolvedCenter = computed(() => {
  if (props.center) return props.center
  if (props.currentPosition) return props.currentPosition
  if (props.trailPoints.length) {
    const p = props.trailPoints[0]
    return { lat: p.lat, lng: p.lng }
  }
  return null
})

const canInitMap = computed(() => !!resolvedCenter.value)

async function initMap() {
  if (!mapEl.value) return
  if (!canInitMap.value) {
    waitingCenter.value = true
    return
  }
  waitingCenter.value = false
  try {
    await nextTick()
    await waitForLayout()
    if (!mapEl.value) return

    const c = resolvedCenter.value
    const map = createMap(mapEl.value, {
      center: c,
      zoom: props.zoom,
      interactive: props.interactive,
    })
    mapInstance.value = map
    overlayGroup.value = createOverlayGroup(map)
    unbindMapResize = bindMapResize(map, mapEl.value)

    map.whenReady(() => {
      invalidateMapSize(map)
      ready.value = true
      drawTrailLayers()
    })
  } catch (e) {
    console.error('地图加载失败', e)
  }
}

function clearTrailOverlays() {
  overlayGroup.value?.clearLayers()
}

function updatePositionMarker() {
  const map = mapInstance.value
  const pos = props.currentPosition
  if (!map || !ready.value || !pos) return

  const latlng = lngLatCenter(pos)
  if (!positionMarker) {
    positionMarker = addPositionMarker(map, pos, { radius: 6, strokeWeight: 2 })
  } else {
    positionMarker.setLatLng(latlng)
  }

  if (props.follow) {
    map.panTo(latlng)
  }
}

function drawTrailLayers() {
  const map = mapInstance.value
  const group = overlayGroup.value
  if (!map || !group || !ready.value) return
  clearTrailOverlays()

  const lines = buildGradientPolylines(
    props.trailPoints,
    props.colorNodes,
    props.currentPosition
  )

  lines.forEach((line) => {
    addGradientPolyline(group, line, { opacity: 1 })
  })

  props.colorNodes.forEach((node) => {
    addColorNodeMarker(group, node)
  })

  updatePositionMarker()

  const shouldFit =
    props.trailPoints.length >= 2 &&
    props.trailPoints.length !== lastTrailCount &&
    !props.follow
  lastTrailCount = props.trailPoints.length
  if (shouldFit && group.getLayers().length) {
    fitMapToGroup(map, group, [40, 40, 40, 40])
  }
}

watch(
  () => [props.trailPoints, props.colorNodes],
  () => drawTrailLayers(),
  { deep: true }
)

watch(
  () => props.currentPosition,
  () => {
    updatePositionMarker()
    if (props.trailPoints.length) drawTrailLayers()
  },
  { deep: true }
)

watch(canInitMap, (ok) => {
  if (ok && !mapInstance.value) initMap()
})

onMounted(() => initMap())
onUnmounted(() => {
  unbindMapResize()
  if (positionMarker && mapInstance.value) {
    mapInstance.value.removeLayer(positionMarker)
    positionMarker = null
  }
  mapInstance.value?.remove()
  mapInstance.value = null
  overlayGroup.value = null
})
</script>

<template>
  <div class="trail-map" :style="{ height }">
    <div v-if="waitingCenter" class="map-placeholder">
      <p>等待定位…</p>
      <p class="hint">开始漫步后将显示地图</p>
    </div>
    <div v-else ref="mapEl" class="map-canvas" />
  </div>
</template>

<style scoped>
.trail-map {
  position: relative;
  width: 100%;
  min-height: 200px;
  background: var(--bg-secondary);
}
.map-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  min-height: 200px;
}
.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 14px;
  padding: 24px;
  text-align: center;
}
.hint {
  font-size: 12px;
  margin-top: 8px;
}
</style>

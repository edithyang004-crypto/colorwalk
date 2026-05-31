import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// 避免打包后默认图钉路径 404，触发 window error（iPad 上会误报「无法加载应用」）
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/**
 * 全端统一底图（iPad / PC 一致）
 * Voyager 在国内网络通常比 OSM 官方瓦片更稳，且避免 PC 用 OSM、iPad 退回浅色 light 图。
 */
const BASEMAP_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>'

function addBasemapLayer(map) {
  L.tileLayer(BASEMAP_URL, {
    subdomains: 'abcd',
    attribution: BASEMAP_ATTRIBUTION,
    maxZoom: 20,
    errorTileUrl: '',
  }).addTo(map)
}

/** AMap / trailRender paths use [lng, lat]; Leaflet uses [lat, lng]. */
export function toLatLng([lng, lat]) {
  return [lat, lng]
}

export function pathToLatLngs(path) {
  return (path || []).map(toLatLng)
}

export function lngLatCenter({ lng, lat }) {
  return [lat, lng]
}

/** Haversine distance in meters (WGS84 lat/lng). */
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function nodesWithinMeters(a, b, thresholdM = 15) {
  if (!a?.lat || !b?.lat) return false
  return distanceMeters(a, b) < thresholdM
}

/** 将距离 thresholdM 内的采色点合并为一组（同位置多色 / 多照片） */
export function groupColocatedNodes(nodes, thresholdM = 15) {
  const groups = []
  for (const node of nodes || []) {
    if (typeof node.lat !== 'number' || typeof node.lng !== 'number') continue
    const match = groups.find((g) => nodesWithinMeters(g[0], node, thresholdM))
    if (match) match.push(node)
    else groups.push([node])
  }
  return groups
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 图钉：标签 + 尖角 + 地图锚点圆（圆心对准坐标） */
const COLOR_MARKER_W = 108
const COLOR_MARKER_POINTER_H = 9
const COLOR_MARKER_DOT = 18
const COLOR_MARKER_ANCHOR_X = COLOR_MARKER_W / 2

const COMPACT_MARKER_W = 72
const COMPACT_MARKER_POINTER_H = 6
const COMPACT_MARKER_DOT = 11

function colorMarkerLayout(hasPlaceName, compact = false, customWidth = null) {
  if (customWidth != null) {
    const bodyH = 34
    const totalH = bodyH + COLOR_MARKER_POINTER_H + COLOR_MARKER_DOT
    return {
      bodyH,
      totalH,
      anchorY: totalH - COLOR_MARKER_DOT / 2,
      width: customWidth,
      dot: COLOR_MARKER_DOT,
    }
  }
  if (compact) {
    const bodyH = 24
    const totalH = bodyH + COMPACT_MARKER_POINTER_H + COMPACT_MARKER_DOT
    return {
      bodyH,
      totalH,
      anchorY: totalH - COMPACT_MARKER_DOT / 2,
      width: COMPACT_MARKER_W,
      dot: COMPACT_MARKER_DOT,
    }
  }
  const bodyH = hasPlaceName ? 46 : 34
  const totalH = bodyH + COLOR_MARKER_POINTER_H + COLOR_MARKER_DOT
  return {
    bodyH,
    totalH,
    anchorY: totalH - COLOR_MARKER_DOT / 2,
    width: COLOR_MARKER_W,
    dot: COLOR_MARKER_DOT,
  }
}

/** 展览地图：按地点全名估算标签宽度，避免长名被截断 */
function exhibitionMarkerWidth(label) {
  const len = String(label ?? '').length
  return Math.min(Math.max(88, 36 + len * 14), 168)
}

/** Create map with OSM tiles (auto-fallback to CARTO if OSM unreachable) and metric scale. */
export function createMap(containerEl, { center, zoom, interactive = true }) {
  const map = L.map(containerEl, {
    center: lngLatCenter(center),
    zoom,
    zoomControl: interactive,
    dragging: interactive,
    scrollWheelZoom: interactive,
    doubleClickZoom: interactive,
    touchZoom: interactive,
  })

  addBasemapLayer(map)

  L.control.scale({ metric: true, imperial: false }).addTo(map)

  return map
}

export function createOverlayGroup(map) {
  const group = L.layerGroup().addTo(map)
  return group
}

export function addGradientPolyline(group, line, options = {}) {
  const latlngs = pathToLatLngs(line.path)
  if (latlngs.length < 2) return null

  const opts = {
    color: line.color,
    weight: line.weight || 8,
    opacity: options.opacity ?? 1,
    lineCap: line.lineCap || 'round',
    lineJoin: 'round',
  }
  if (line.strokeStyle === 'dashed') {
    opts.dashArray = '8, 8'
  }

  const pl = L.polyline(latlngs, opts)
  if (options.onClick) {
    pl.on('click', options.onClick)
  }
  group.addLayer(pl)
  return pl
}

/**
 * 采色点标记：大圆点 + 永久色名标签（与弹窗色卡一致），触控热区 ≥ 52px
 */
export function addColorNodeMarker(group, node, options = {}) {
  const latlng = lngLatCenter({ lng: node.lng, lat: node.lat })
  const color = node.colorHex || node.color || node.mainColor || '#888888'
  const compact = Boolean(options.compact)
  const placeNameOnly = Boolean(options.placeNameOnly)
  const colorLabel = options.label ?? node.colorName ?? node.name ?? '采色点'
  const placeName =
    !compact &&
    !placeNameOnly &&
    node.colorName &&
    node.name &&
    node.name !== node.colorName
      ? node.name
      : ''
  const safeColor = escapeHtml(color)
  const aria = placeName
    ? `${colorLabel}，${placeName}`
    : colorLabel

  const customWidth = options.markerWidth ?? null
  const layout = colorMarkerLayout(Boolean(placeName), compact, customWidth)
  const markerW = layout.width
  const anchorX = markerW / 2
  const tallClass = placeName ? ' color-node-marker--tall' : ''
  const compactClass = compact ? ' color-node-marker--compact' : ''
  const placeOnlyClass = placeNameOnly ? ' color-node-marker--place-only' : ''

  const html = `
    <div class="color-node-marker${tallClass}${compactClass}${placeOnlyClass}" style="width:${markerW}px" role="button" tabindex="-1" aria-label="${escapeHtml(aria)}">
      <div class="color-node-marker__body" style="--marker-color:${safeColor}">
        <span class="color-node-marker__swatch" style="background:${safeColor}" aria-hidden="true"></span>
        <span class="color-node-marker__text">
          <span class="color-node-marker__color-name">${escapeHtml(colorLabel)}</span>
          ${placeName ? `<span class="color-node-marker__place">${escapeHtml(placeName)}</span>` : ''}
        </span>
      </div>
      <span class="color-node-marker__dot" style="background:${safeColor}" aria-hidden="true"></span>
    </div>
  `

  const marker = L.marker(latlng, {
    icon: L.divIcon({
      className: 'color-node-marker-leaflet',
      html,
      iconSize: [markerW, layout.totalH],
      iconAnchor: [anchorX, layout.anchorY],
    }),
    keyboard: false,
    riseOnHover: true,
    riseOffset: 400,
    interactive: true,
  })

  if (options.onClick) {
    marker.on('click', options.onClick)
  }

  group.addLayer(marker)
  return marker
}

/**
 * 展览模式节点标记：圆点颜色为 mainColor，永久显示节点名称
 * @param {L.LayerGroup} group
 * @param {object} node - 需含 lat/lng/mainColor/name
 * @param {{ radius?: number, onClick?: () => void }} options
 */
export function addExhibitionNodeMarker(group, node, options = {}) {
  const placeName = node.name || node.colorName || '展览点'
  return addColorNodeMarker(
    group,
    { ...node, name: placeName, colorName: '' },
    {
      ...options,
      compact: false,
      placeNameOnly: true,
      label: placeName,
      markerWidth: exhibitionMarkerWidth(placeName),
    },
  )
}

export function addPositionMarker(map, pos, options = {}) {
  const latlng = lngLatCenter(pos)
  const marker = L.circleMarker(latlng, {
    radius: options.radius ?? 6,
    fillColor: options.fillColor ?? '#1A1A1A',
    fillOpacity: 1,
    color: '#fff',
    weight: options.strokeWeight ?? 2,
  }).addTo(map)
  return marker
}

/** Fit map to layers; padding is [top, right, bottom, left] like AMap setFitView. */
export function fitMapToLayers(map, layers, padding = [48, 48, 48, 48]) {
  if (!map || !layers?.length) return

  const bounds = L.latLngBounds([])
  let hasPoint = false

  for (const layer of layers) {
    if (typeof layer.getLatLng === 'function') {
      const ll = layer.getLatLng()
      if (ll) {
        bounds.extend(ll)
        hasPoint = true
      }
    }
    if (typeof layer.getLatLngs === 'function') {
      const latlngs = layer.getLatLngs()
      const flat = Array.isArray(latlngs[0]) ? latlngs.flat(Infinity) : latlngs
      flat.forEach((ll) => {
        if (ll && typeof ll.lat === 'number') {
          bounds.extend(ll)
          hasPoint = true
        }
      })
    }
  }

  if (!hasPoint) return
  map.fitBounds(bounds, { padding })
}

export function fitMapToGroup(map, group, padding = [48, 48, 48, 48]) {
  if (!group) return
  fitMapToLayers(map, group.getLayers(), padding)
}

/**
 * 按采色点/坐标点适配视野（各端一致），避免把无关远点路线纳入 fitBounds
 * @param {{ lat: number, lng: number }[]} nodes
 * @param {{ maxZoom?: number }} options
 */
export function fitMapToNodes(
  map,
  nodes,
  padding = [48, 48, 48, 48],
  options = {}
) {
  if (!map || !nodes?.length) return false

  const valid = nodes.filter(
    (n) =>
      typeof n?.lat === 'number' &&
      typeof n?.lng === 'number' &&
      !Number.isNaN(n.lat) &&
      !Number.isNaN(n.lng) &&
      Math.abs(n.lat) <= 90 &&
      Math.abs(n.lng) <= 180 &&
      !(Math.abs(n.lat) < 0.001 && Math.abs(n.lng) < 0.001)
  )
  if (!valid.length) return false

  invalidateMapSize(map)

  if (valid.length === 1) {
    map.setView(
      [valid[0].lat, valid[0].lng],
      options.defaultZoom ?? options.maxZoom ?? 15,
      { animate: false }
    )
    return true
  }

  const bounds = L.latLngBounds([])
  for (const n of valid) {
    bounds.extend([n.lat, n.lng])
  }
  if (!bounds.isValid()) return false

  map.fitBounds(bounds, {
    padding,
    maxZoom: options.maxZoom ?? 16,
    animate: false,
  })
  return true
}

export function invalidateMapSize(map, options) {
  if (!map) return
  try {
    map.invalidateSize(options)
  } catch {
    /* ignore */
  }
}

/** 容器从隐藏恢复后，强制底图瓦片重绘 */
export function redrawBasemapTiles(map) {
  if (!map) return
  map.eachLayer((layer) => {
    if (typeof layer.redraw === 'function') layer.redraw()
  })
}

export async function waitForMapContainer(containerEl, maxAttempts = 16) {
  for (let i = 0; i < maxAttempts; i++) {
    await waitForLayout()
    if (containerEl?.clientWidth >= 2 && containerEl?.clientHeight >= 2) return true
    await new Promise((resolve) => window.setTimeout(resolve, 40))
  }
  return containerEl?.clientWidth >= 2 && containerEl?.clientHeight >= 2
}

/** 容器从隐藏恢复可见后，刷新瓦片尺寸并可选重算视野 */
export async function refreshMapDisplay(map, containerEl, { fit } = {}) {
  if (!map || !containerEl) return false
  await waitForMapContainer(containerEl, 12)
  invalidateMapSize(map, { animate: false, pan: true })
  redrawBasemapTiles(map)
  await waitForLayout()
  invalidateMapSize(map, { animate: false, pan: true })
  redrawBasemapTiles(map)
  if (typeof fit === 'function') {
    fit()
  }
  await waitForLayout()
  invalidateMapSize(map, { animate: false, pan: true })
  return true
}

export function bindMapResize(map, containerEl) {
  if (!map || !containerEl) return () => {}

  const run = () => invalidateMapSize(map)
  run()
  requestAnimationFrame(() => requestAnimationFrame(run))
  const t = window.setTimeout(run, 250)

  window.addEventListener('resize', run)
  let ro = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(run)
    ro.observe(containerEl)
  }

  return () => {
    window.clearTimeout(t)
    window.removeEventListener('resize', run)
    ro?.disconnect()
  }
}

export function waitForLayout() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

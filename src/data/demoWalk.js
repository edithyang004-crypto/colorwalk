/**
 * 七彩洞头村范例路线：与展览模式 EXHIBITION_NODES 同步（15 个采色点）
 */
import {
  EXHIBITION_NODES,
  MAP_CENTER,
  getNodeCardSections,
  getNodeColors,
} from './exhibitionNodes.js'
import { slideMediaType } from '../utils/videoMedia.js'

export const DEMO_MAP_CENTER = { ...MAP_CENTER }

function placeholderSvg(hex, label = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect fill="${hex}" width="400" height="300"/>
    <text x="200" y="155" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="18" font-family="sans-serif">${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Haversine distance in meters */
function haversineM(a, b) {
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

function totalPathDistanceM(waypoints) {
  let sum = 0
  for (let i = 1; i < waypoints.length; i++) {
    sum += haversineM(waypoints[i - 1], waypoints[i])
  }
  return Math.round(sum)
}

/** 沿折线均匀采样 n 个点（含起终点），时间戳在 durationMs 内均匀递增 */
function buildTrackAlongWaypoints(waypoints, nPoints, startedAt, durationMs) {
  if (waypoints.length < 2 || nPoints < 2) {
    throw new Error('buildTrackAlongWaypoints: need at least 2 waypoints and 2 points')
  }
  const segLens = []
  for (let i = 1; i < waypoints.length; i++) {
    segLens.push(haversineM(waypoints[i - 1], waypoints[i]))
  }
  const cum = [0]
  for (let i = 0; i < segLens.length; i++) {
    cum.push(cum[cum.length - 1] + segLens[i])
  }
  const total = cum[cum.length - 1]
  const points = []
  for (let i = 0; i < nPoints; i++) {
    const dist = total * (i / (nPoints - 1))
    let j = 0
    while (j < segLens.length && cum[j + 1] < dist) j++
    const segStart = waypoints[j]
    const segEnd = waypoints[j + 1]
    const segLen = segLens[j] || 1
    const t = Math.min(1, Math.max(0, segLen > 0 ? (dist - cum[j]) / segLen : 0))
    const lat = segStart.lat + t * (segEnd.lat - segStart.lat)
    const lng = segStart.lng + t * (segEnd.lng - segStart.lng)
    const timestamp = startedAt + Math.round((i * durationMs) / (nPoints - 1))
    points.push({ lat, lng, ts: timestamp, timestamp })
  }
  return points
}

function collectNodePhotoUrls(node) {
  const sections = getNodeCardSections(node)
  const urls = []
  for (const section of sections) {
    for (const slide of section.photoSlides || []) {
      if (slide?.url && slideMediaType(slide) !== 'video' && !urls.includes(slide.url)) {
        urls.push(slide.url)
      }
    }
  }
  return urls
}

function collectNodeDescription(node) {
  return getNodeCardSections(node)
    .map((s) => s.story)
    .filter(Boolean)
    .join('\n\n')
}

function buildNodeSpecs() {
  return EXHIBITION_NODES.map((node) => {
    const sections = getNodeCardSections(node)
    const primary = sections[0] || node
    const photoUrls = collectNodePhotoUrls(node)
    const dominantFromSections = sections.flatMap((s) => getNodeColors(s))
    const dominantColors = [...new Set(dominantFromSections)].slice(0, 5)

    return {
      id: node.id,
      name: node.name,
      colorName: node.colorName || node.name,
      color: node.mainColor,
      photoId: `photo-${node.number}`,
      photoUrls: photoUrls.length
        ? photoUrls
        : [placeholderSvg(node.mainColor, node.name)],
      cardId: `demo-card-${node.number}`,
      description: collectNodeDescription(node) || node.name,
      dominantColors: dominantColors.length
        ? dominantColors
        : [node.mainColor],
      cardSections: sections,
      lat: node.lat,
      lng: node.lng,
    }
  })
}

const DEMO_WAYPOINTS_WGS84 = EXHIBITION_NODES.map((node) => ({
  lat: node.lat,
  lng: node.lng,
}))

const NODE_SPECS = buildNodeSpecs()

const STARTED_AT = 1716129600000
const DEMO_DISTANCE_M = totalPathDistanceM(DEMO_WAYPOINTS_WGS84)
/** 按约 4 km/h 估算全程时长，至少 45 分钟 */
const DURATION_SEC = Math.max(
  2700,
  Math.round((DEMO_DISTANCE_M / 1000 / 4) * 3600),
)
const DURATION_MS = DURATION_SEC * 1000
const TRACK_POINT_COUNT = Math.max(45, EXHIBITION_NODES.length * 4)

const trackPoints = buildTrackAlongWaypoints(
  DEMO_WAYPOINTS_WGS84,
  TRACK_POINT_COUNT,
  STARTED_AT,
  DURATION_MS,
)

const NODE_TRACK_INDEX = EXHIBITION_NODES.map((_, i) =>
  i === EXHIBITION_NODES.length - 1
    ? TRACK_POINT_COUNT - 1
    : Math.round((i / (EXHIBITION_NODES.length - 1)) * (TRACK_POINT_COUNT - 1)),
)

function buildColorNodes() {
  return NODE_SPECS.map((spec, idx) => {
    const tpi = NODE_TRACK_INDEX[idx]
    const tp = trackPoints[tpi]
    return {
      id: spec.id,
      name: spec.name,
      colorName: spec.colorName || spec.name,
      lat: spec.lat,
      lng: spec.lng,
      timestamp: tp.timestamp,
      ts: tp.ts,
      colorHex: spec.color,
      color: spec.color,
      photoId: spec.photoId,
      photoUrls: spec.photoUrls,
      cardId: spec.cardId,
      description: spec.description,
      cardSections: spec.cardSections,
      trackPointIndex: tpi,
    }
  })
}

const colorNodes = buildColorNodes()

function buildPhotos() {
  return NODE_SPECS.map((spec, idx) => {
    const tpi = NODE_TRACK_INDEX[idx]
    const tp = trackPoints[tpi]
    const urls = spec.photoUrls?.length
      ? spec.photoUrls
      : [placeholderSvg(spec.color, spec.name)]
    return {
      id: spec.photoId,
      url: urls[0],
      urls,
      timestamp: tp.timestamp,
      lat: spec.lat,
      lng: spec.lng,
      dominantColors: spec.dominantColors,
      description: spec.description || spec.name,
      placeName: spec.name,
    }
  })
}

const photos = buildPhotos()

const targetColors = EXHIBITION_NODES.map((node) => ({
  hex: node.mainColor,
  name: node.colorName || node.name,
}))

export const demoWalk = {
  id: 'demo-walk-dongtou-exhibition',
  title: '七彩洞头村 Colorwalk',
  location: '温州洞头村',
  date: '2024-05-19',
  duration: DURATION_SEC,
  distance: DEMO_DISTANCE_M,
  coordinateSystem: 'WGS84',
  startedAt: STARTED_AT,

  targetColors,

  trackPoints,

  colorNodes,

  photos,

  collages: [
    {
      id: 'collage-1',
      url: '/images/demo/collages/dongtou-collage-1.png',
      template: 'G',
      photoIds: ['photo-15'],
      colors: ['#835852'],
      description: '洞头红石滩',
    },
    {
      id: 'collage-2',
      url: '/images/demo/collages/dongtou-collage-2.png',
      template: 'A',
      photoIds: ['photo-9', 'photo-10'],
      colors: ['#E5AE79', '#4DC4EB', '#C92828'],
      description: '海上阳台',
    },
    {
      id: 'collage-3',
      url: '/images/demo/collages/dongtou-collage-3.png',
      template: 'H',
      photoIds: ['photo-7', 'photo-5'],
      colors: ['#FCDF5E'],
      description: '七彩楼梯',
    },
  ],
}

/** 将示范数据转换为 WalkResult 所需的 walk 对象 */
export function demoWalkToResultWalk(demo = demoWalk) {
  const cards = demo.colorNodes.map((node) => ({
    id: node.cardId || node.id,
    hex: node.colorHex || node.color,
    name: node.colorName || node.name,
    sourcePhotoId: node.photoId,
    createdAt: node.timestamp || node.ts,
    location: { lat: node.lat, lng: node.lng },
    /** 对应展览节点，用于在主页面弹出展览卡片 */
    exhibitionNodeId: node.id,
  }))

  const h = Math.floor(demo.duration / 3600)
  const m = Math.floor((demo.duration % 3600) / 60)
  const s = Math.floor(demo.duration % 60)
  const durationLabel = [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')

  let distanceLabel = `${demo.distance}m`
  if (demo.distance >= 1000) {
    distanceLabel = `${(demo.distance / 1000).toFixed(1)}km`
  }

  return {
    isDemo: true,
    id: demo.id,
    targetColors: demo.targetColors,
    startedAt: demo.startedAt || new Date(demo.date).getTime(),
    trailPoints: demo.trackPoints,
    colorNodes: demo.colorNodes.map((n) => ({
      lat: n.lat,
      lng: n.lng,
      colorHex: n.colorHex || n.color,
      colorName: n.colorName,
      name: n.name,
      cardId: n.cardId,
      photoId: n.photoId,
      photoUrls: n.photoUrls,
      description: n.description,
      ts: n.ts || n.timestamp,
    })),
    cards,
    photos: demo.photos.map((p) => ({
      id: p.id,
      thumbnail: p.url,
      dominantColors: p.dominantColors,
      createdAt: p.timestamp,
      location: p.lat != null ? { lat: p.lat, lng: p.lng } : null,
    })),
    stats: {
      durationSec: demo.duration,
      distanceM: demo.distance,
      colorCount: cards.length,
      durationLabel,
      distanceLabel,
    },
    locationLabel: demo.location,
  }
}

/** 关于页卡片用的摘要 */
export function getDemoSummary() {
  const m = Math.floor(demoWalk.duration / 60)
  const distPart =
    demoWalk.distance >= 1000
      ? `${(demoWalk.distance / 1000).toFixed(1)} km`
      : `${demoWalk.distance} m`
  return {
    title: demoWalk.location,
    date: demoWalk.date.replace(/-/g, '.'),
    meta: `${m} 分钟 · ${distPart} · ${demoWalk.colorNodes.length} 色`,
  }
}

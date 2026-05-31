import { demoWalk } from '../data/demoWalk.js'
import { findNodeById } from '../data/exhibitionNodes.js'

/** 示范地图采色点 → 展览节点（兼容缺少 id 的旧数据） */
export function findExhibitionNodeForDemoNode(node) {
  if (!node) return undefined
  if (node.id) {
    const byId = findNodeById(node.id)
    if (byId) return byId
  }
  const cardMatch = /^demo-card-(\d+)$/.exec(String(node.cardId || ''))
  if (cardMatch) return findNodeById(`node-${cardMatch[1]}`)
  const photoMatch = /^photo-(\d+)$/.exec(String(node.photoId || ''))
  if (photoMatch) return findNodeById(`node-${photoMatch[1]}`)
  return undefined
}

/** 将示范数据转为地图页可渲染的 walk 结构 */
export function getDemoMapWalk() {
  return {
    id: 'demo-walk',
    isDemo: true,
    startedAt: demoWalk.startedAt,
    trailPoints: demoWalk.trackPoints,
    colorNodes: demoWalk.colorNodes.map((n) => ({
      id: n.id,
      lat: n.lat,
      lng: n.lng,
      colorHex: n.colorHex || n.color,
      colorName: n.colorName,
      cardId: n.cardId,
      photoId: n.photoId,
      photoUrls: n.photoUrls,
      name: n.name,
      description: n.description,
      cardSections: n.cardSections,
      ts: n.ts || n.timestamp,
    })),
    name: `${demoWalk.location} Colorwalk`,
    pathName: `${demoWalk.location} Colorwalk`,
    stats: (() => {
      const m = Math.floor(demoWalk.duration / 60)
      const km =
        demoWalk.distance >= 1000
          ? `${(demoWalk.distance / 1000).toFixed(1)}km`
          : `${demoWalk.distance}m`
      const h = Math.floor(demoWalk.duration / 3600)
      const min = Math.floor((demoWalk.duration % 3600) / 60)
      const s = Math.floor(demoWalk.duration % 60)
      const durationLabel = [h, min, s].map((n) => String(n).padStart(2, '0')).join(':')
      return {
        colorCount: demoWalk.colorNodes.length,
        durationLabel: `${m}分钟`,
        distanceLabel: km,
        durationLabelFull: durationLabel,
      }
    })(),
  }
}

function formatDemoTimeLabel(ts) {
  const t = ts || demoWalk.startedAt
  const d = new Date(t)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${mo}.${day} ${h}:${min}`
}

export function getDemoNodeDetail(node) {
  const photo = demoWalk.photos.find((p) => p.id === node.photoId)
  const hex = node.colorHex || node.color
  const rgb = hexToRgb(hex)
  const ts = node.ts ?? node.timestamp
  const photoUrls =
    node.photoUrls?.length > 0
      ? node.photoUrls
      : photo?.urls?.length
        ? photo.urls
        : photo?.url
          ? [photo.url]
          : []
  return {
    photoUrl: photoUrls[0] || photo?.url || '',
    photoUrls,
    cardName: node.name || '',
    colorName: node.colorName || node.name || '',
    hex,
    rgb,
    timeLabel: formatDemoTimeLabel(ts),
    description: node.description || photo?.description || '',
    cardSections: node.cardSections || [],
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return ''
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

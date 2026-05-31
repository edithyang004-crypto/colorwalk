import { findNodeById } from '../data/exhibitionNodes.js'
import { distanceMeters } from './leafletMap.js'
import { buildNodePairGradientPolylines } from './trailRender.js'

/** 直线加密，保证短线段也有可见渐变 */
function densifyNodePair(from, to, minSteps = 12) {
  const dist = distanceMeters(from, to)
  const steps = Math.max(minSteps, Math.min(48, Math.ceil(dist / 6) + 1))
  const points = []
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    points.push({
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    })
  }
  return points
}

/**
 * 按打卡顺序，为相邻两次打卡生成渐变直线（每打卡一个新增一段）
 * @param {string[]} checkedOrderIds - 打卡先后顺序的节点 id
 */
export function buildExhibitionRoutePolylines(checkedOrderIds) {
  const lines = []
  const ids = Array.isArray(checkedOrderIds) ? checkedOrderIds : []

  for (let i = 1; i < ids.length; i++) {
    const from = findNodeById(ids[i - 1])
    const to = findNodeById(ids[i])
    if (!from || !to) continue
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) continue

    const points = densifyNodePair(from, to)
    const segmentLines = buildNodePairGradientPolylines(
      points,
      from.mainColor || '#888888',
      to.mainColor || '#888888',
      { weight: 8, opacity: 1 },
    )
    lines.push(...segmentLines)
  }

  return lines
}

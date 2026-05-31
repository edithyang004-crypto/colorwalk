import chroma from 'chroma-js'
import { distanceMeters, totalPathDistance } from './gps'

const SEGMENT_LENGTH_M = 15
const MAX_SEGMENTS = 200

/** Split path into sub-segments for gradient polylines */
export function splitPathForGradient(points) {
  if (points.length < 2) return []
  const segments = []
  let current = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prev = current[current.length - 1]
    const next = points[i]
    const dist = distanceMeters(prev, next)

    if (dist <= SEGMENT_LENGTH_M) {
      current.push(next)
      continue
    }

    const steps = Math.min(Math.ceil(dist / SEGMENT_LENGTH_M), MAX_SEGMENTS)
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      current.push({
        lat: prev.lat + (next.lat - prev.lat) * t,
        lng: prev.lng + (next.lng - prev.lng) * t,
        ts: prev.ts,
      })
    }
    if (current.length >= 2) segments.push([...current])
    current = [next]
  }
  if (current.length >= 2) segments.push(current)
  return segments
}

function resolveNodeTrackIndex(trailPoints, node) {
  if (typeof node.trackPointIndex === 'number') {
    return Math.max(0, Math.min(node.trackPointIndex, trailPoints.length - 1))
  }
  return findNearestPointIndex(trailPoints, node)
}

/** 主地图：采色点之间直连，每段用目标色，避免沿轨迹折返时出现两条蓝线 */
function buildNodeToNodePolylines(nodes) {
  const lines = []
  for (let n = 1; n < nodes.length; n++) {
    const prev = nodes[n - 1]
    const curr = nodes[n]
    const a = prev.lng ?? prev.longitude
    const b = curr.lng ?? curr.longitude
    const latA = prev.lat ?? prev.latitude
    const latB = curr.lat ?? curr.latitude
    if (a == null || b == null || latA == null || latB == null) continue
    lines.push({
      path: [
        [a, latA],
        [b, latB],
      ],
      color: curr.colorHex || curr.color || '#888888',
      weight: 8,
      lineCap: 'round',
    })
  }
  return lines
}

export function buildGradientPolylines(trailPoints, colorNodes, currentPosition = null) {
  const lines = []
  if (!trailPoints.length) return lines

  const nodes = [...colorNodes].sort((a, b) => a.ts - b.ts)

  /** 无实时定位时（主地图总览）用采色点连线，不走完整轨迹 */
  if (nodes.length >= 2 && !currentPosition) {
    return buildNodeToNodePolylines(nodes)
  }

  if (!nodes.length) {
    const path = currentPosition ? [...trailPoints, currentPosition] : trailPoints
    if (path.length >= 2) {
      lines.push({
        path: path.map((p) => [p.lng, p.lat]),
        color: '#CCCCCC',
        strokeStyle: 'dashed',
        weight: 4,
      })
    }
    return lines
  }

  let segmentStart = 0
  for (let n = 0; n < nodes.length; n++) {
    const node = nodes[n]
    const nodeIdx = resolveNodeTrackIndex(trailPoints, node)
    const slice = trailPoints.slice(segmentStart, Math.max(nodeIdx, segmentStart) + 1)
    const colorA = n === 0 ? nodes[0].colorHex : nodes[n - 1].colorHex
    const colorB = node.colorHex

    if (slice.length >= 2) {
      addGradientLines(lines, slice, colorA, colorB)
    }
    segmentStart = nodeIdx
  }

  const lastColor = nodes[nodes.length - 1].colorHex
  const lastIdx = resolveNodeTrackIndex(trailPoints, nodes[nodes.length - 1])
  const tail = trailPoints.slice(segmentStart)
  const tailPath = currentPosition ? [...tail, currentPosition] : tail

  // 末段已在「到最后一个采色点」的渐变里画完，勿再画半透明尾线（易与上一段重叠）
  const tailStartsAfterLastNode = segmentStart > lastIdx
  if (tailPath.length >= 2 && tailStartsAfterLastNode) {
    addGradientLines(lines, tailPath, lastColor, lastColor, 0.4)
  }

  return lines
}

function findNearestPointIndex(points, target) {
  let best = 0
  let min = Infinity
  points.forEach((p, i) => {
    const d = distanceMeters(p, target)
    if (d < min) {
      min = d
      best = i
    }
  })
  return best
}

/**
 * 两点间渐变折线（展览路线等）
 * @param {{ lat: number, lng: number }[]} points
 * @param {string} colorA
 * @param {string} colorB
 * @param {{ opacity?: number, weight?: number }} [options]
 */
export function buildNodePairGradientPolylines(points, colorA, colorB, options = {}) {
  const lines = []
  const opacity = options.opacity ?? 1
  const weight = options.weight ?? 6
  addGradientLines(lines, points, colorA, colorB, opacity)
  return lines.map((line) => ({ ...line, weight: line.weight ?? weight }))
}

function addGradientLines(lines, points, colorA, colorB, opacity = 1) {
  const segs = splitPathForGradient(points)
  if (!segs.length && points.length >= 2) {
    segs.push(points)
  }
  const flat = segs.flat()
  if (flat.length < 2) return

  const dists = cumulativeDistances(flat)
  const total = dists[dists.length - 1] || 1
  const scale = chroma.scale([colorA, colorB]).mode('lab')
  const weight = opacity < 1 ? 6 : 8

  for (let i = 0; i < flat.length - 1; i++) {
    const t = ((dists[i] + dists[i + 1]) / 2) / total
    const c = scale(t).alpha(opacity).css()
    lines.push({
      path: [
        [flat[i].lng, flat[i].lat],
        [flat[i + 1].lng, flat[i + 1].lat],
      ],
      color: c,
      weight,
      lineCap: 'round',
    })
  }
}

function cumulativeDistances(points) {
  const dist = [0]
  for (let i = 1; i < points.length; i++) {
    dist.push(dist[i - 1] + distanceMeters(points[i - 1], points[i]))
  }
  return dist
}

function resolveNodeColor(node) {
  return node?.colorHex || node?.color || node?.hex || null
}

function distributeNodesEvenly(nodes) {
  const colors = nodes.map(resolveNodeColor).filter(Boolean)
  if (!colors.length) return []
  if (colors.length === 1) {
    return [
      { offset: 0, color: colors[0] },
      { offset: 1, color: colors[0] },
    ]
  }
  return colors.map((color, i) => ({
    offset: i / (colors.length - 1),
    color,
  }))
}

function stopsLackSpread(stops) {
  const normalized = normalizeStops(stops)
  if (normalized.length < 2) return true
  const uniqueOffsets = new Set(normalized.map((s) => s.offset.toFixed(3)))
  return uniqueOffsets.size < 2
}

function normalizeStops(stops) {
  if (!stops.length) return []
  const sorted = [...stops].sort((a, b) => a.offset - b.offset)
  const out = []
  for (const s of sorted) {
    const offset = Math.max(0, Math.min(1, s.offset))
    const last = out[out.length - 1]
    if (last && Math.abs(last.offset - offset) < 0.001) {
      last.color = s.color
    } else {
      out.push({ offset, color: s.color })
    }
  }
  if (out.length === 1) {
    out.push({ offset: 1, color: out[0].color })
  }
  return out
}

function stopsFromFallbackColors(fallbackColors) {
  const colors = fallbackColors.filter(Boolean)
  if (!colors.length) return []
  if (colors.length === 1) {
    return [
      { offset: 0, color: colors[0] },
      { offset: 1, color: colors[0] },
    ]
  }
  return colors.map((color, i) => ({
    offset: i / (colors.length - 1),
    color,
  }))
}

/**
 * Build gradient stops for GradientBar by distance along trail.
 * @param {Array} trailPoints
 * @param {Array} colorNodes
 * @param {string[]} [fallbackColors] - target walk colors when no photo nodes yet
 */
export function buildGradientStops(trailPoints, colorNodes, fallbackColors = []) {
  const fallbacks = (fallbackColors || []).filter(Boolean)
  const sortedNodes = [...(colorNodes || [])].sort((a, b) => (a.ts || 0) - (b.ts || 0))

  if (!trailPoints?.length) {
    if (sortedNodes.length) {
      return normalizeStops(distributeNodesEvenly(sortedNodes))
    }
    return normalizeStops(stopsFromFallbackColors(fallbacks))
  }

  const total = totalPathDistance(trailPoints)

  if (total <= 0) {
    if (sortedNodes.length) {
      return normalizeStops(distributeNodesEvenly(sortedNodes))
    }
    return normalizeStops(stopsFromFallbackColors(fallbacks))
  }

  const distAt = cumulativeDistances(trailPoints)
  const stops = []

  if (sortedNodes.length) {
    const firstColor = resolveNodeColor(sortedNodes[0])
    if (firstColor) stops.push({ offset: 0, color: firstColor })
    for (const node of sortedNodes) {
      const color = resolveNodeColor(node)
      if (!color) continue
      const idx = resolveNodeTrackIndex(trailPoints, node)
      stops.push({
        offset: Math.min(1, distAt[idx] / total),
        color,
      })
    }
    const lastColor = resolveNodeColor(sortedNodes[sortedNodes.length - 1])
    if (lastColor) stops.push({ offset: 1, color: lastColor })

    if (stopsLackSpread(stops)) {
      const even = distributeNodesEvenly(sortedNodes)
      if (even.length) return normalizeStops(even)
    }
  } else if (fallbacks.length >= 2) {
    fallbacks.forEach((color, i) => {
      stops.push({ offset: i / (fallbacks.length - 1), color })
    })
  } else {
    const base = fallbacks[0] || '#CCCCCC'
    stops.push({ offset: 0, color: base })
    stops.push({ offset: 1, color: base })
  }

  if (!normalizeStops(stops).filter((s) => s.color).length && fallbacks.length) {
    return normalizeStops(stopsFromFallbackColors(fallbacks))
  }

  return normalizeStops(stops)
}

export function gradientCssFromStops(stops) {
  const normalized = normalizeStops(stops).filter((s) => s.color)
  if (!normalized.length) return 'linear-gradient(90deg, #ccc 0%, #ccc 100%)'
  const parts = normalized.map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`)
  return `linear-gradient(90deg, ${parts.join(', ')})`
}

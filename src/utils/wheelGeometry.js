import colorsData from '../assets/colors.json'

const defaultCount = colorsData.length

/** SVG 转盘几何常量（画布 400×400） */
export const WHEEL_SIZE = 400
export const WHEEL_CX = 200
export const WHEEL_CY = 200
export const WHEEL_INNER_R = 52
export const WHEEL_OUTER_R = 168
export const WHEEL_GAP_DEG = 2.5

/**
 * 标准环形扇区路径（4 段：径向 + 外弧 + 径向 + 内弧）。
 * 圆角由 SVG stroke-linejoin/linecap: round 配合 paint-order: stroke fill 在外侧呈现。
 */
export function sectorPath(
  i,
  n = defaultCount,
  cx = WHEEL_CX,
  cy = WHEEL_CY,
  innerR = WHEEL_INNER_R,
  outerR = WHEEL_OUTER_R,
  gapDeg = WHEEL_GAP_DEG
) {
  const sectorRad = (2 * Math.PI) / n
  const gap = (gapDeg * Math.PI) / 180
  const a0 = i * sectorRad - Math.PI / 2 + gap
  const a1 = (i + 1) * sectorRad - Math.PI / 2 - gap
  const span = a1 - a0
  if (span <= 0) return ''
  const large = span > Math.PI ? 1 : 0
  const pt = (r, a) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  return [
    `M ${pt(innerR, a0)}`,
    `L ${pt(outerR, a0)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${pt(outerR, a1)}`,
    `L ${pt(innerR, a1)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${pt(innerR, a0)}`,
    'Z',
  ].join(' ')
}

/**
 * 生成 12 色圆锥渐变（12 点钟起为第一色，缝隙为 transparent）。
 * @param {{ hex: string }[]} colors
 * @param {number} gapDeg 每色两侧总留白（度）
 */
export function buildConicGradient(colors, gapDeg = 1.5) {
  const n = colors.length
  if (!n) return 'conic-gradient(from -90deg, #f4efe4 0deg 360deg)'

  const slice = 360 / n
  const halfGap = gapDeg / 2
  const stops = []

  for (let i = 0; i < n; i++) {
    const segStart = i * slice
    const colorStart = segStart + halfGap
    const colorEnd = (i + 1) * slice - halfGap
    stops.push(`${colors[i].hex} ${colorStart}deg ${colorEnd}deg`)
    if (gapDeg > 0) {
      stops.push(`transparent ${colorEnd}deg ${segStart + slice}deg`)
    }
  }

  return `conic-gradient(from -90deg, ${stops.join(', ')})`
}

/**
 * 指针固定在 12 点钟，转盘 CSS rotate(deg) 为顺时针。
 * 返回当前指向的色段索引。
 */
export function indexAtPointer(rotationDeg, n = defaultCount) {
  const sector = 360 / n
  const normalized = ((rotationDeg % 360) + 360) % 360
  const k = Math.floor((normalized + sector / 2) / sector) % n
  return (n - k) % n
}

/** 让色段 index 对准指针时的旋转角（0–360） */
export function rotationForIndex(index, n = defaultCount) {
  const sector = 360 / n
  const i = ((index % n) + n) % n
  const deg = (n - i) * sector - sector / 2
  return ((deg % 360) + 360) % 360
}

/** 吸附到最近的合法色段角度 */
export function snapWheelRotation(deg, n = defaultCount) {
  return rotationForIndex(indexAtPointer(deg, n), n)
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  return [h * 360, s * 100, l * 100]
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

export function hueCategory(h, s, l) {
  if (l > 88 && s < 15) return 'neutral'
  if (s < 12) return l < 35 ? 'gray' : 'neutral'
  if (h < 15 || h >= 345) return 'red'
  if (h < 45) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 150) return 'green'
  if (h < 190) return 'teal'
  if (h < 250) return 'blue'
  if (h < 280) return 'indigo'
  if (h < 320) return 'purple'
  if (h < 345) return 'pink'
  return 'red'
}

/** Simplified color distance (weighted RGB + hue) */
export function colorDistance(hex1, hex2) {
  const a = hexToRgb(hex1)
  const b = hexToRgb(hex2)
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  const rgbDist = Math.sqrt(dr * dr + dg * dg + db * db)

  const [h1] = hexToHsl(hex1)
  const [h2] = hexToHsl(hex2)
  let dh = Math.abs(h1 - h2)
  if (dh > 180) dh = 360 - dh
  return rgbDist + dh * 0.8
}

export function findBestMatch(extractedHex, targets) {
  let best = targets[0]
  let min = Infinity
  for (const t of targets) {
    const d = colorDistance(extractedHex, t.hex || t)
    if (d < min) {
      min = d
      best = typeof t === 'string' ? { hex: t } : t
    }
  }
  return best
}

export { extractDominantColors } from './colorExtract'
export { compressImage, loadImageFromFile } from './imageCompress'
export { extractColorsFromBlob } from './colorExtract'

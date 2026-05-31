import { rgbToHex } from './colorUtils'

function channelRange(pixels) {
  let minR = 255,
    maxR = 0,
    minG = 255,
    maxG = 0,
    minB = 255,
    maxB = 0
  for (const [r, g, b] of pixels) {
    minR = Math.min(minR, r)
    maxR = Math.max(maxR, r)
    minG = Math.min(minG, g)
    maxG = Math.max(maxG, g)
    minB = Math.min(minB, b)
    maxB = Math.max(maxB, b)
  }
  const ranges = [
    { channel: 0, max: maxR - minR },
    { channel: 1, max: maxG - minG },
    { channel: 2, max: maxB - minB },
  ]
  return ranges.reduce((a, b) => (b.max > a.max ? b : a))
}

/** Median-cut dominant colors from ImageData (100x100 recommended) */
export function extractDominantColors(imageData, count = 5) {
  const pixels = []
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 128) continue
    if (r > 250 && g > 250 && b > 250) continue
    if (r < 10 && g < 10 && b < 10) continue
    pixels.push([r, g, b])
  }
  if (pixels.length === 0) return ['#888888']

  const buckets = [{ pixels }]
  while (buckets.length < count && buckets.some((b) => b.pixels.length > 1)) {
    buckets.sort((a, b) => channelRange(b.pixels).max - channelRange(a.pixels).max)
    const idx = buckets.findIndex((b) => b.pixels.length > 1)
    if (idx === -1) break
    const bucket = buckets.splice(idx, 1)[0]
    const channel = channelRange(bucket.pixels).channel
    bucket.pixels.sort((a, b) => a[channel] - b[channel])
    const mid = Math.floor(bucket.pixels.length / 2)
    buckets.push({ pixels: bucket.pixels.slice(0, mid) })
    buckets.push({ pixels: bucket.pixels.slice(mid) })
  }

  const colors = buckets
    .filter((b) => b.pixels.length > 0)
    .map((b) => {
      const n = b.pixels.length
      const sum = b.pixels.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
      return rgbToHex(sum[0] / n, sum[1] / n, sum[2] / n)
    })

  return colors.slice(0, count)
}

export async function extractColorsFromImageSource(img, size = 100) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const scale = Math.min(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  const imageData = ctx.getImageData(0, 0, size, size)
  return extractDominantColors(imageData, 5)
}

export async function extractColorsFromBlob(blob) {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = rej
    img.src = url
  })
  const colors = await extractColorsFromImageSource(img, 100)
  URL.revokeObjectURL(url)
  return colors
}

export async function extractColorsFromFile(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = rej
    img.src = url
  })
  const colors = await extractColorsFromImageSource(img, 100)
  URL.revokeObjectURL(url)
  return colors
}

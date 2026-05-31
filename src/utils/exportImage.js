export const COLLAGE_SIZE = { width: 1080, height: 1350 }

/** 拼贴内照片圆角（导出画布像素，须 < 8px） */
export const COLLAGE_PHOTO_RADIUS = 6

const WATERMARK_H = 72
const WATERMARK_INSET_X = 24
const WATERMARK_INSET_Y = 10

/** @typedef {Object} CollageWatermarkOptions */
/** @typedef {Object} CollageRenderOptions */

export const DEFAULT_COLLAGE_RENDER_OPTIONS = {
  padding: 24,
  gap: 8,
  backgroundColor: '#FFFFFF',
  watermark: {
    enabled: true,
    prefix: 'Colorwalk',
    showDate: true,
    fontFamily: '"Source Sans 3", "Noto Sans SC", sans-serif',
    fontSize: 28,
    fontWeight: '400',
    fontStyle: 'normal',
    textColor: '#444444',
  },
}

/** 第 4 参可为 boolean（兼容旧调用）或完整选项对象 */
export function normalizeRenderOptions(fourth) {
  const base = {
    padding: DEFAULT_COLLAGE_RENDER_OPTIONS.padding,
    gap: DEFAULT_COLLAGE_RENDER_OPTIONS.gap,
    backgroundColor: DEFAULT_COLLAGE_RENDER_OPTIONS.backgroundColor,
    watermark: { ...DEFAULT_COLLAGE_RENDER_OPTIONS.watermark },
  }
  if (fourth === false) {
    base.watermark.enabled = false
    return base
  }
  if (fourth === true || fourth === undefined || fourth === null) {
    return base
  }
  if (typeof fourth === 'object') {
    const wm = fourth.watermark || {}
    const padding = Number(fourth.padding)
    const gap = Number(fourth.gap)
    return {
      padding: Number.isFinite(padding) ? Math.max(0, padding) : base.padding,
      gap: Number.isFinite(gap) ? Math.max(0, gap) : base.gap,
      backgroundColor: fourth.backgroundColor ?? base.backgroundColor,
      watermark: {
        enabled: wm.enabled ?? base.watermark.enabled,
        prefix: wm.prefix ?? base.watermark.prefix,
        showDate: wm.showDate ?? base.watermark.showDate,
        fontFamily: wm.fontFamily ?? base.watermark.fontFamily,
        fontSize: wm.fontSize ?? base.watermark.fontSize,
        fontWeight: wm.fontWeight ?? base.watermark.fontWeight,
        fontStyle: wm.fontStyle ?? base.watermark.fontStyle,
        textColor: wm.textColor ?? base.watermark.textColor,
      },
    }
  }
  return base
}

export async function blobToImage(blob) {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = rej
    img.src = url
  })
  URL.revokeObjectURL(url)
  return img
}

/** JPEG Blob；兼容 toBlob 返回 null 的浏览器 */
export async function canvasToJpegBlob(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob)
            return
          }
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality)
            const arr = dataUrl.split(',')
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
            const bstr = atob(arr[1])
            const n = bstr.length
            const u8 = new Uint8Array(n)
            for (let i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i)
            const out = new Blob([u8], { type: mime })
            if (out.size > 0) resolve(out)
            else reject(new Error('JPEG 编码结果为空'))
          } catch (e) {
            reject(e)
          }
        },
        'image/jpeg',
        quality
      )
    } catch (e) {
      reject(e)
    }
  })
}

export function downloadCanvas(canvas, filename = 'colorwalk-collage.jpg') {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/jpeg', 0.92)
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** 触发浏览器下载 JPEG Blob（比整幅 canvas data URL 更省内存） */
export function downloadImageBlob(blob, filename = 'colorwalk-collage.jpg') {
  const safeName = String(filename).replace(/[/\\]/g, '-')
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.download = safeName
    link.href = url
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
}

/**
 * 尽量把拼贴交给本机：File System Access → Web Share（文件）→ a[download]
 * @returns {'picker'|'share'|'download'|'skipped'}
 */
export async function saveCollageBlobToDevice(blob, filename = 'colorwalk-collage.jpg') {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('无效图片数据')
  }
  const safeName = String(filename).replace(/[/\\]/g, '-')
  const w = typeof window !== 'undefined' ? window : null

  if (w?.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: safeName,
        types: [
          {
            description: 'JPEG 图片',
            accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'picker'
    } catch (e) {
      if (e?.name === 'AbortError') return 'skipped'
    }
  }

  const nav = w?.navigator
  const mime = blob.type || 'image/jpeg'
  const file = new File([blob], safeName, { type: mime })
  if (typeof nav?.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
    try {
      await nav.share({ files: [file], title: 'Colorwalk 拼贴' })
      return 'share'
    } catch (e) {
      if (e?.name === 'AbortError') return 'skipped'
    }
  }

  downloadImageBlob(blob, safeName)
  return 'download'
}

/** 从采色照片对象得到可绘制的 Image（优先 Blob，否则用缩略图 dataURL / blob URL） */
export async function photoToDrawableImage(photo) {
  if (!photo) return null
  if (photo.blob instanceof Blob) {
    try {
      return await blobToImage(photo.blob)
    } catch {
      /* fall through */
    }
  }
  const thumb = photo.thumbnail
  if (typeof thumb === 'string' && thumb.length > 8) {
    try {
      const img = new Image()
      img.decoding = 'async'
      await new Promise((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('thumb'))
        img.src = thumb
      })
      return img
    } catch {
      return null
    }
  }
  return null
}

function getColorHex(c) {
  return c?.hex || c || '#1A1A1A'
}

function getColorLabelLines(c) {
  const cn = c?.name || '采色'
  const en = c?.nameEn || c?.english || getColorHex(c).toUpperCase()
  return { cn, en }
}

function drawColorBlockLabel(ctx, W, topY, topH, colorEntry) {
  const { cn, en } = getColorLabelLines(colorEntry)
  const cnSize = Math.min(20, Math.max(13, Math.round(topH * 0.036)))
  const enSize = Math.min(15, Math.max(10, Math.round(topH * 0.026)))
  const lineGap = Math.max(3, Math.round(cnSize * 0.28))
  const blockMidY = topY + topH / 2
  const cnY = blockMidY - (enSize + lineGap) / 2
  const enY = blockMidY + (cnSize + lineGap) / 2

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.font = `500 ${cnSize}px "Noto Sans SC", "PingFang SC", sans-serif`
  ctx.fillText(cn, W / 2, cnY)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = `400 ${enSize}px "Source Sans 3", ui-monospace, Menlo, monospace`
  ctx.fillText(en, W / 2, enY)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawImageCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height
  const r = w / h
  let sw, sh, sx, sy
  if (ir > r) {
    sh = img.height
    sw = sh * r
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / r
    sx = 0
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawRoundedImageCover(ctx, img, x, y, w, h, radius) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.clip()
  drawImageCover(ctx, img, x, y, w, h)
  ctx.restore()
}

function drawPhotoCover(ctx, img, x, y, w, h) {
  drawRoundedImageCover(ctx, img, x, y, w, h, COLLAGE_PHOTO_RADIUS)
}

function drawRoundedRectFill(ctx, x, y, w, h, radius, fillStyle) {
  ctx.save()
  roundRectPath(ctx, x, y, w, h, radius)
  ctx.fillStyle = fillStyle
  ctx.fill()
  ctx.restore()
}

function drawThreeColorBar(ctx, colors, x, y, w, h) {
  const list = colors.slice(0, 3)
  const seg = w / 3
  list.forEach((c, i) => {
    ctx.fillStyle = getColorHex(c)
    ctx.fillRect(x + i * seg, y, seg, h)
  })
}

function resolveCollageSpacing(pad, gap) {
  return {
    inset: Math.max(0, pad),
    photoGap: Math.max(0, gap),
  }
}

function gridCellSize(cols, rows, gridW, gridH, photoGap) {
  return {
    cellW: (gridW - photoGap * (cols - 1)) / cols,
    cellH: (gridH - photoGap * (rows - 1)) / rows,
  }
}

function buildWatermarkText(wm) {
  const parts = []
  if (wm.prefix) parts.push(wm.prefix)
  if (wm.showDate) parts.push(new Date().toLocaleDateString('zh-CN'))
  return parts.join('  ')
}

function drawWatermark(ctx, W, H, pad, wm, stripTop = null) {
  const top = stripTop ?? H - WATERMARK_H
  const stripH = H - top
  if (stripH <= 0) return

  const text = buildWatermarkText(wm)
  const fontSize = wm.fontSize || 28
  const fontFamily = wm.fontFamily || DEFAULT_COLLAGE_RENDER_OPTIONS.watermark.fontFamily
  const fontWeight = wm.fontWeight || '400'
  const fontStyle = wm.fontStyle || 'normal'
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
  const insetX = Math.max(WATERMARK_INSET_X, pad)
  const insetY = WATERMARK_INSET_Y
  const textX = insetX
  const textY = top + insetY + (stripH - insetY * 2) / 2
  ctx.fillStyle = wm.textColor || '#444444'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, textX, textY)
}

export async function renderCollage(templateId, photos, colors, options = true) {
  const opts = normalizeRenderOptions(options)
  const pad = Math.max(0, opts.padding ?? 24)
  const gap = Math.max(0, opts.gap ?? 8)
  const { inset: photoInset, photoGap } = resolveCollageSpacing(pad, gap)
  const wm = opts.watermark
  const watermarkOn = wm?.enabled !== false

  const canvas = document.createElement('canvas')
  canvas.width = COLLAGE_SIZE.width
  canvas.height = COLLAGE_SIZE.height
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const contentBottom = watermarkOn ? H - WATERMARK_H : H
  const accent = getColorHex(colors[0])

  ctx.fillStyle = opts.backgroundColor || '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  const photoLimit = templateId === 'C' ? 9 : 8
  const images = await Promise.all(
    photos.slice(0, photoLimit).map(async (p) => {
      try {
        return await photoToDrawableImage(p)
      } catch {
        return null
      }
    })
  )
  const validImages = images.filter(Boolean)

  switch (templateId) {
    case 'G': {
      const innerH = contentBottom - photoInset * 2
      const topH = Math.round((innerH - photoGap) * 0.46)
      const bottomH = innerH - topH - photoGap
      const topY = photoInset
      const bottomY = photoInset + topH + photoGap
      const blockW = W - photoInset * 2

      ctx.fillStyle = accent
      ctx.fillRect(photoInset, topY, blockW, topH)

      drawColorBlockLabel(ctx, W, topY, topH, colors[0])

      if (validImages[0]) {
        drawPhotoCover(ctx, validImages[0], photoInset, bottomY, blockW, bottomH)
      }
      break
    }
    case 'A': {
      const leftW = W * 0.36
      ctx.fillStyle = accent
      ctx.fillRect(photoInset, photoInset, leftW, contentBottom - photoInset * 2)
      drawThreeColorBar(ctx, colors, photoInset, photoInset + (contentBottom - photoInset * 2) * 0.72, leftW, 48)
      const rightX = photoInset + leftW + photoGap
      const rightW = W - rightX - photoInset
      const photoH = (contentBottom - photoInset * 2 - photoGap) / 2
      if (validImages[0]) drawPhotoCover(ctx, validImages[0], rightX, photoInset, rightW, photoH)
      if (validImages[1]) {
        drawPhotoCover(ctx, validImages[1], rightX, photoInset + photoH + photoGap, rightW, photoH)
      }
      break
    }
    case 'B': {
      const barH = 72
      drawThreeColorBar(ctx, colors, photoInset, photoInset, W - photoInset * 2, barH)
      const photoY = photoInset + barH + photoGap
      const photoH = contentBottom - photoY - photoInset
      const cellW = (W - photoInset * 2 - photoGap * 2) / 3
      validImages.slice(0, 3).forEach((img, i) => {
        const x = photoInset + i * (cellW + photoGap)
        drawPhotoCover(ctx, img, x, photoY, cellW, photoH)
      })
      break
    }
    case 'C': {
      const stripH = watermarkOn ? WATERMARK_H : 0
      const contentH = H - stripH
      const gridBg =
        opts.backgroundColor && opts.backgroundColor !== '#FFFFFF'
          ? opts.backgroundColor
          : accent

      ctx.fillStyle = gridBg
      ctx.fillRect(0, 0, W, contentH)

      if (watermarkOn) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, contentH, W, stripH)
      }

      const gridW = W - photoInset * 2
      const gridH = contentH - photoInset * 2
      const { cellW, cellH } = gridCellSize(3, 3, gridW, gridH, photoGap)
      const cornerRadius = COLLAGE_PHOTO_RADIUS

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col
          const x = photoInset + col * (cellW + photoGap)
          const y = photoInset + row * (cellH + photoGap)
          const img = validImages[idx]
          if (img) {
            drawRoundedImageCover(ctx, img, x, y, cellW, cellH, cornerRadius)
          } else {
            drawRoundedRectFill(ctx, x, y, cellW, cellH, cornerRadius, 'rgba(255,255,255,0.22)')
          }
        }
      }
      break
    }
    case 'D': {
      const mainW = W * 0.56
      const sideW = W - mainW - photoInset * 2 - photoGap
      const photoStackH = contentBottom - photoInset * 2
      const sidePhotoH = (photoStackH - photoGap) / 2
      if (validImages[0]) drawPhotoCover(ctx, validImages[0], photoInset, photoInset, mainW, photoStackH)
      if (validImages[1]) {
        drawPhotoCover(ctx, validImages[1], photoInset + mainW + photoGap, photoInset, sideW, sidePhotoH)
      }
      if (validImages[2]) {
        drawPhotoCover(
          ctx,
          validImages[2],
          photoInset + mainW + photoGap,
          photoInset + sidePhotoH + photoGap,
          sideW,
          sidePhotoH
        )
      }
      break
    }
    case 'E': {
      // 旧版「瀑布流」：保留渲染兼容，布局同分栏但改为顶大图 + 底双图 + 色条（无色彩名字）
      const barH = 56
      const stackH = contentBottom - photoInset * 2 - barH - photoGap
      const bigH = Math.round((stackH - photoGap) * 0.58)
      const smallH = stackH - photoGap - bigH
      if (validImages[0]) drawPhotoCover(ctx, validImages[0], photoInset, photoInset, W - photoInset * 2, bigH)
      const halfW = (W - photoInset * 2 - photoGap) / 2
      const smallY = photoInset + bigH + photoGap
      if (validImages[1]) drawPhotoCover(ctx, validImages[1], photoInset, smallY, halfW, smallH)
      if (validImages[2]) {
        drawPhotoCover(ctx, validImages[2], photoInset + halfW + photoGap, smallY, halfW, smallH)
      }
      drawThreeColorBar(ctx, colors, photoInset, contentBottom - barH - photoInset, W - photoInset * 2, barH)
      break
    }
    case 'H': {
      const innerH = contentBottom - photoInset * 2
      const photoH = (innerH - photoGap) / 2
      const blockW = W - photoInset * 2
      if (validImages[0]) drawPhotoCover(ctx, validImages[0], photoInset, photoInset, blockW, photoH)
      if (validImages[1]) {
        drawPhotoCover(ctx, validImages[1], photoInset, photoInset + photoH + photoGap, blockW, photoH)
      }
      break
    }
    case 'F': {
      const barH = 52
      drawThreeColorBar(ctx, colors, photoInset, photoInset, W - photoInset * 2, barH)
      const photoY = photoInset + barH + photoGap
      const photoH = contentBottom - photoY - photoInset
      const halfW = (W - photoInset * 2 - photoGap) / 2
      if (validImages[0]) drawPhotoCover(ctx, validImages[0], photoInset, photoY, halfW, photoH)
      if (validImages[1]) {
        drawPhotoCover(ctx, validImages[1], photoInset + halfW + photoGap, photoY, halfW, photoH)
      }
      break
    }
    default: {
      if (validImages[0]) {
        drawPhotoCover(ctx, validImages[0], photoInset, photoInset, W - photoInset * 2, contentBottom - photoInset * 2)
      }
      break
    }
  }

  if (watermarkOn) drawWatermark(ctx, W, H, pad, wm, H - WATERMARK_H)
  return canvas
}

export async function exportColorCard(card, photoBlob) {
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = card.hex
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4)
  ctx.fillStyle = '#1A1A1A'
  ctx.font = 'bold 36px sans-serif'
  ctx.fillText(card.name, 32, canvas.height * 0.6 + 60)
  ctx.font = '24px sans-serif'
  ctx.fillStyle = '#666'
  ctx.fillText(card.hex.toUpperCase(), 32, canvas.height * 0.6 + 100)
  if (card.location) {
    ctx.fillText(`${card.location.lat.toFixed(4)}, ${card.location.lng.toFixed(4)}`, 32, canvas.height * 0.6 + 140)
  }
  if (photoBlob) {
    const img = await blobToImage(photoBlob)
    ctx.drawImage(img, canvas.width - 120 - 24, canvas.height * 0.6 + 24, 120, 90)
  }
  return canvas
}

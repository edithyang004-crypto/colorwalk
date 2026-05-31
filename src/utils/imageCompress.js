export async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  const img = await loadImageFromFile(file)
  const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
  const thumbnail = await new Promise((res) => {
    const tc = document.createElement('canvas')
    const tw = 300
    const th = Math.round((h / w) * tw)
    tc.width = tw
    tc.height = th
    tc.getContext('2d').drawImage(canvas, 0, 0, tw, th)
    res(tc.toDataURL('image/jpeg', 0.7))
  })
  return { blob, thumbnail, width: w, height: h }
}

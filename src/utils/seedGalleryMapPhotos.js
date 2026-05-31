import {
  MAP_NODE_GALLERY_SEEDS,
  MAP_NODE_GALLERY_WALK_ID,
} from '../data/mapNodeGallerySeeds.js'
import { demoWalk } from '../data/demoWalk.js'
import { getItem, saveItem, deleteItem, listByType } from './storage'
import { compressImage } from './imageCompress'
import { extractColorsFromBlob } from './colorExtract'
import { hexToHsl } from './colorUtils'
import { isLandmarkGalleryCard, isLandmarkGalleryPhoto } from '../data/mapNodeGallerySeeds.js'

async function fetchImageAsFile(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`无法加载图片 ${url}`)
  const blob = await res.blob()
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg'
  const name = url.split('/').pop() || 'photo.jpg'
  return new File([blob], name, { type })
}

/** 清理旧版「每张图一张卡」的废弃 id */
async function purgeObsoleteLandmarkCardsAndPhotos() {
  const validCardIds = new Set(MAP_NODE_GALLERY_SEEDS.map((s) => s.cardId))
  const validPhotoIds = new Set(MAP_NODE_GALLERY_SEEDS.map((s) => s.photoId))
  let removedCards = 0
  let removedPhotos = 0

  for (const card of await listByType('card')) {
    const id = card?.id
    if (!isLandmarkGalleryCard(card)) continue
    if (validCardIds.has(id)) continue
    await deleteItem('card', id)
    removedCards++
  }

  for (const photo of await listByType('photo')) {
    const id = photo?.id
    if (!isLandmarkGalleryPhoto(photo)) continue
    if (validPhotoIds.has(id)) continue
    await deleteItem('photo', id)
    removedPhotos++
  }

  return { removedCards, removedPhotos }
}

/**
 * 将洞头村地标色卡、照片、路线写入画廊（IndexedDB）。
 * 画廊「色卡」「路线」页均展示；半屏「历史路径」通过 mapStore 过滤地标路线。
 */
export async function seedGalleryMapPhotos() {
  const purge = await purgeObsoleteLandmarkCardsAndPhotos()

  const photoIds = []
  const cardIds = []
  let addedPhotos = 0
  let addedCards = 0
  const baseTime = Date.now() - MAP_NODE_GALLERY_SEEDS.length * 1000

  for (let i = 0; i < MAP_NODE_GALLERY_SEEDS.length; i++) {
    const spec = MAP_NODE_GALLERY_SEEDS[i]
    const createdAt = baseTime + i * 1000
    const location = { lat: spec.lat, lng: spec.lng }
    const targetColors = [{ hex: spec.colorHex, name: spec.colorName }]

    let photo = await getItem('photo', spec.photoId)
    if (!photo?.blob || !photo?.thumbnail) {
      const file = await fetchImageAsFile(spec.url)
      const { blob, thumbnail } = await compressImage(file)
      const dominantColors = await extractColorsFromBlob(blob)
      photo = {
        id: spec.photoId,
        blob,
        thumbnail,
        dominantColors,
        targetColors: targetColors.map((c) => c.hex),
        matchHex: spec.colorHex,
        matchName: spec.colorName,
        createdAt,
        location,
        placeName: spec.placeName,
        sourceUrl: spec.url,
        isLandmarkSeed: true,
      }
      await saveItem('photo', spec.photoId, photo)
      addedPhotos++
    }
    photoIds.push(spec.photoId)

    let card = await getItem('card', spec.cardId)
    const cardPayload = {
      id: spec.cardId,
      hex: spec.colorHex,
      hsl: hexToHsl(spec.colorHex),
      name: `${spec.placeName} · ${spec.colorName}`,
      sourcePhotoId: spec.photoId,
      createdAt: card?.createdAt ?? createdAt,
      location,
      walkId: MAP_NODE_GALLERY_WALK_ID,
      isLandmarkSeed: true,
    }
    if (!card) {
      await saveItem('card', spec.cardId, cardPayload)
      addedCards++
    } else if (card.walkId !== MAP_NODE_GALLERY_WALK_ID || !card.isLandmarkSeed) {
      await saveItem('card', spec.cardId, { ...card, ...cardPayload })
    }
    cardIds.push(spec.cardId)
  }

  const colorNodes = MAP_NODE_GALLERY_SEEDS.map((s, idx) => ({
    lat: s.lat,
    lng: s.lng,
    colorHex: s.colorHex,
    cardId: s.cardId,
    photoId: s.photoId,
    name: s.placeName,
    colorName: s.colorName,
    ts: baseTime + idx * 1000,
  }))

  const walkPayload = {
    id: MAP_NODE_GALLERY_WALK_ID,
    pathName: '七彩洞头村地标采色',
    targetColors: demoWalk.targetColors,
    startedAt: baseTime,
    endedAt: baseTime + MAP_NODE_GALLERY_SEEDS.length * 1000,
    trailPoints: MAP_NODE_GALLERY_SEEDS.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      ts: baseTime,
    })),
    colorNodes,
    cardIds: [...cardIds],
    photoIds: [...photoIds],
    stats: {
      durationSec: 0,
      distanceM: 0,
      colorCount: cardIds.length,
      durationLabel: '地标采色',
      distanceLabel: '—',
    },
    savedAt: Date.now(),
    isLandmarkSeed: true,
  }

  await saveItem('walk', MAP_NODE_GALLERY_WALK_ID, walkPayload)

  return {
    addedPhotos,
    addedCards,
    removedCards: purge.removedCards,
    removedPhotos: purge.removedPhotos,
    walkId: MAP_NODE_GALLERY_WALK_ID,
  }
}

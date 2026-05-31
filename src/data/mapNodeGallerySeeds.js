/**
 * 画廊种子：洞头村展览节点 → 色卡 + 照片 + 路线（画廊「色卡」「路线」页）。
 * 半屏「历史路径」不展示地标路线（见 mapStore 过滤）；完整范例见 /demo。
 */
import {
  EXHIBITION_NODES,
  getNodeCardSections,
} from './exhibitionNodes.js'

export const MAP_NODE_GALLERY_WALK_ID = 'walk-map-landmarks'

function buildGallerySeeds() {
  const seeds = []
  for (const node of EXHIBITION_NODES) {
    const sections = getNodeCardSections(node)
    sections.forEach((section, sectionIndex) => {
      const firstSlide = section.photoSlides?.find((s) => s?.url)
      if (!firstSlide?.url) return
      seeds.push({
        photoId: `gallery-${node.id}-s${sectionIndex}`,
        cardId: `gallery-card-${node.id}-s${sectionIndex}`,
        url: firstSlide.url,
        placeName: node.name,
        colorHex: section.mainColor || node.mainColor,
        colorName: section.colorName || node.colorName || node.name,
        lat: node.lat,
        lng: node.lng,
      })
    })
  }
  return seeds
}

export const MAP_NODE_GALLERY_SEEDS = buildGallerySeeds()

export function isLandmarkGalleryWalk(walk) {
  if (!walk) return false
  if (walk.id === MAP_NODE_GALLERY_WALK_ID) return true
  if (walk.isLandmarkSeed) return true
  return walk.pathName === '七彩洞头村地标采色'
}

export function isLandmarkGalleryCard(card) {
  if (!card?.id) return false
  if (card.isLandmarkSeed) return true
  return card.id.startsWith('gallery-card-')
}

export function isLandmarkGalleryPhoto(photo) {
  if (!photo?.id) return false
  return photo.id.startsWith('gallery-')
}

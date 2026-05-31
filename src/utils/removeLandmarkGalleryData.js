import { listByType, deleteItem } from './storage'
import { isLandmarkGalleryWalk } from '../data/mapNodeGallerySeeds.js'

/**
 * 仅移除写入「历史路径 / 画廊路线」的地标漫步记录。
 * 画廊色卡、照片保留（由 seedGalleryMapPhotos 维护）。
 */
export async function removeLandmarkHistoryWalks() {
  let removedWalks = 0
  for (const walk of await listByType('walk')) {
    if (!isLandmarkGalleryWalk(walk)) continue
    await deleteItem('walk', walk.id)
    removedWalks++
  }
  return { removedWalks }
}

/** @deprecated 使用 removeLandmarkHistoryWalks */
export const removeLandmarkGalleryData = removeLandmarkHistoryWalks

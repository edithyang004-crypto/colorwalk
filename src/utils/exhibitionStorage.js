import { EXHIBITION_NODES } from '../data/exhibitionNodes.js'

/** localStorage 键：展览已打卡节点 id 列表 */
export const EXHIBITION_CHECKED_STORAGE_KEY = 'colorwalk:exhibition:checked'

const validNodeIds = new Set(EXHIBITION_NODES.map((n) => n.id))

/**
 * 从 localStorage 恢复已打卡节点 id（仅保留当前配置中存在的 id）
 * @returns {string[]}
 */
export function loadCheckedNodeIds() {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = localStorage.getItem(EXHIBITION_CHECKED_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((id) => typeof id === 'string' && validNodeIds.has(id))
  } catch {
    return []
  }
}

/**
 * 持久化已打卡节点 id 列表（iPhone NFC URL 整页重载后仍可累积）
 * @param {string[]} ids
 * @returns {boolean} 是否写入成功
 */
export function saveCheckedNodeIds(ids) {
  if (typeof localStorage === 'undefined') return false

  try {
    const safe = [...new Set(ids)].filter(
      (id) => typeof id === 'string' && validNodeIds.has(id),
    )
    localStorage.setItem(EXHIBITION_CHECKED_STORAGE_KEY, JSON.stringify(safe))
    return true
  } catch (e) {
    console.warn('展览打卡记录保存失败', e)
    return false
  }
}

/** 清除本地展览打卡记录（调试用） */
export function clearExhibitionCheckIns() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(EXHIBITION_CHECKED_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

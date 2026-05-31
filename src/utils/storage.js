import { get, set, del, keys, createStore } from 'idb-keyval'
import { toRaw } from 'vue'

const customStore = createStore('colorwalk-db', 'colorwalk-store')

/** 递归剥离 Vue Proxy，否则 structuredClone / IndexedDB 会报 DataCloneError */
export function deepToRaw(value) {
  const raw = toRaw(value)
  if (raw === undefined) return undefined
  if (raw === null || typeof raw !== 'object') return raw
  if (typeof raw === 'function' || typeof raw === 'symbol') return undefined
  if (raw instanceof Date) return new Date(raw.getTime())
  if (raw instanceof Blob || raw instanceof File) return raw
  /** IndexedDB 常用；勿按普通 object 遍历否则会变成 {} */
  if (raw instanceof ArrayBuffer) return raw
  if (ArrayBuffer.isView(raw)) return raw
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const v = deepToRaw(item)
      return v === undefined ? null : v
    })
  }
  const out = {}
  for (const key of Object.keys(raw)) {
    const v = deepToRaw(raw[key])
    if (v !== undefined) out[key] = v
  }
  return out
}

export function formatStorageError(error) {
  if (!error) return '未知错误'
  if (error.name === 'QuotaExceededError') {
    return '浏览器存储空间已满，请清理网站数据或减少照片后重试'
  }
  if (error.name === 'DataCloneError') {
    return '数据格式无法写入本地库，请刷新页面后重试'
  }
  return error.message || String(error)
}

const PREFIX = {
  photo: 'photo:',
  card: 'card:',
  collage: 'collage:',
  marker: 'marker:',
  walk: 'walk:',
  walkDraft: 'walkDraft:',
}

const DRAFT_KEY = 'walkDraft:current'

export async function saveItem(type, id, data) {
  await set(PREFIX[type] + id, deepToRaw(data), customStore)
  return id
}

export async function getItem(type, id) {
  const item = await get(PREFIX[type] + id, customStore)
  if (type === 'collage') return normalizeCollageRecord(item)
  if (type === 'photo') return normalizePhotoRecord(item)
  return item
}

export async function deleteItem(type, id) {
  await del(PREFIX[type] + id, customStore)
}

export async function listByType(type) {
  const allKeys = await keys(customStore)
  const prefix = PREFIX[type]
  const items = []
  for (const key of allKeys) {
    if (String(key).startsWith(prefix)) {
      const item = await get(key, customStore)
      if (item) {
        if (type === 'collage') items.push(normalizeCollageRecord(item))
        else if (type === 'photo') items.push(normalizePhotoRecord(item))
        else items.push(item)
      }
    }
  }
  return items.sort(
    (a, b) =>
      (b.savedAt || b.createdAt || b.startedAt || 0) - (a.savedAt || a.createdAt || a.startedAt || 0)
  )
}

export function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* 非安全上下文等 */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 从 IndexedDB 读出的照片：兼容仅存 videoArrayBuffer 的展示视频 */
export function normalizePhotoRecord(record) {
  if (!record || typeof record !== 'object') return record
  if (record.videoBlob instanceof Blob && record.videoBlob.size > 0) return record
  const buf = record.videoArrayBuffer
  if (buf instanceof ArrayBuffer && buf.byteLength > 0) {
    const mime = record.videoMime || 'video/mp4'
    const { videoArrayBuffer: _a, ...rest } = record
    return {
      ...rest,
      videoBlob: new Blob([buf], { type: mime }),
    }
  }
  return record
}

/** 从 IndexedDB 读出的拼贴：兼容仅存 ArrayBuffer 的旧数据 */
export function normalizeCollageRecord(record) {
  if (!record || typeof record !== 'object') return record
  if (record.imageBlob instanceof Blob && record.imageBlob.size > 0) return record
  const buf = record.imageArrayBuffer ?? record.imageBuffer
  if (buf instanceof ArrayBuffer && buf.byteLength > 0) {
    const mime = record.imageMime || 'image/jpeg'
    const { imageArrayBuffer: _a, imageBuffer: _b, imageMime: _m, ...rest } = record
    return {
      ...rest,
      imageBlob: new Blob([buf], { type: mime }),
    }
  }
  return record
}

export async function saveWalkDraft(data) {
  await set(
    DRAFT_KEY,
    deepToRaw({ ...data, draft: true, updatedAt: Date.now() }),
    customStore
  )
}

export async function getWalkDraft() {
  return get(DRAFT_KEY, customStore)
}

export async function clearWalkDraft() {
  await del(DRAFT_KEY, customStore)
}

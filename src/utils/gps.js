import { DEMO_MAP_CENTER } from '../data/demoWalk.js'

/** 无法获取 GPS 时的起点（洞头村示范区域，便于室内调试与演示） */
export const FALLBACK_START_POSITION = {
  lat: DEMO_MAP_CENTER.lat,
  lng: DEMO_MAP_CENTER.lng,
  ts: Date.now(),
  accuracy: null,
}

/** Haversine distance in meters */
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function movingAverage(points, window = 3) {
  if (points.length === 0) return []
  if (points.length < window) return [...points]
  const result = []
  for (let i = 0; i < points.length; i++) {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1)
    const lat = slice.reduce((s, p) => s + p.lat, 0) / slice.length
    const lng = slice.reduce((s, p) => s + p.lng, 0) / slice.length
    result.push({ lat, lng, ts: points[i].ts })
  }
  return result
}

export function totalPathDistance(points) {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += distanceMeters(points[i - 1], points[i])
  }
  return d
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

/** 轨迹点最小间距（米），过滤 GPS 抖动，又比旧版 3s 节流更易积累有效路径 */
export const MIN_TRAIL_POINT_DISTANCE_M = 2

/** 浏览器要求 HTTPS 或 localhost 才允许定位；手机用 http://192.168.x.x 会被拒绝 */
export function geolocationBlockedReason() {
  if (typeof window === 'undefined') return 'NO_GEOLOCATION'
  if (!window.isSecureContext) return 'INSECURE_CONTEXT'
  if (!navigator.geolocation) return 'NO_GEOLOCATION'
  return null
}

export function canUseGeolocation() {
  return geolocationBlockedReason() === null
}

function positionFromGeolocation(pos) {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    ts: pos.timestamp || Date.now(),
    accuracy: pos.coords.accuracy,
  }
}

function requestCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(positionFromGeolocation(pos)),
      reject,
      options
    )
  })
}

/** 新建漫步时最多等待 GPS 的毫秒数，超时则用默认坐标 */
export const START_POSITION_MAX_WAIT_MS = 6000

/**
 * 快速尝试一次定位（用于新建漫步，避免长时间卡在「定位中」）
 */
export async function tryQuickPosition(maxWaitMs = START_POSITION_MAX_WAIT_MS) {
  if (geolocationBlockedReason()) return null
  try {
    return await Promise.race([
      requestCurrentPosition({
        enableHighAccuracy: false,
        timeout: maxWaitMs,
        maximumAge: 600000,
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          const e = new Error('TIMEOUT')
          e.code = 3
          reject(e)
        }, maxWaitMs)
      }),
    ])
  } catch {
    return null
  }
}

/**
 * 依次尝试高精度 / 普通精度，适配户外与室内。
 * 权限被拒绝时不重试。
 */
export async function getCurrentPositionReliable() {
  const blocked = geolocationBlockedReason()
  if (blocked) {
    const err = new Error(blocked)
    err.code = blocked
    throw err
  }

  // 先低精度/可复用缓存：桌面与室内更易成功；再尝试高精度户外定位
  const attempts = [
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 },
  ]

  let lastError = null
  for (const options of attempts) {
    try {
      return await requestCurrentPosition(options)
    } catch (e) {
      lastError = e
      if (e?.code === 1) throw e
    }
  }
  throw lastError || new Error('POSITION_UNAVAILABLE')
}

/** 将 Geolocation 错误转为用户可读文案 */
export function formatGeolocationError(error) {
  const blocked = geolocationBlockedReason()
  if (blocked === 'INSECURE_CONTEXT') {
    return '当前页面不是安全连接，手机浏览器无法定位。请用 https:// 开头的地址打开（开发时见终端里的 https 局域网地址），或部署到 HTTPS 网站。'
  }
  if (blocked === 'NO_GEOLOCATION') {
    return '当前浏览器不支持定位。'
  }

  const code = error?.code
  const msg = String(error?.message || '')

  if (
    code === 1 ||
    code === 'PERMISSION_DENIED' ||
    msg === 'PERMISSION_DENIED' ||
    /denied|permission/i.test(msg)
  ) {
    return '未获得定位权限。请在系统设置中允许浏览器使用位置，并在弹出提示时选择「允许」。'
  }
  if (code === 3 || code === 'TIMEOUT' || msg === 'TIMEOUT' || /timeout/i.test(msg)) {
    return '定位超时。请到开阔处重试，或确认已开启手机的 GPS/定位服务。'
  }
  if (
    code === 2 ||
    code === 'POSITION_UNAVAILABLE' ||
    msg === 'POSITION_UNAVAILABLE' ||
    /unavailable/i.test(msg)
  ) {
    return '暂时无法获取位置，请检查 GPS 是否开启后重试。'
  }
  if (code === 'INSECURE_CONTEXT' || /secure|https/i.test(msg)) {
    return '当前页面不是安全连接，手机浏览器无法定位。请用 https:// 开头的地址打开（开发时见终端里的 https 局域网地址），或部署到 HTTPS 网站。'
  }
  if (code === 'NO_GEOLOCATION') {
    return '当前浏览器不支持定位。'
  }
  return '无法获取位置，请检查定位权限与网络后重试。'
}

function fallbackStartPosition(reason) {
  return {
    ...FALLBACK_START_POSITION,
    ts: Date.now(),
    fallback: true,
    warning: `${reason}，已从洞头村示范区域开始；开启定位并使用 https:// 后轨迹将自动更新。`,
  }
}

/**
 * 新建漫步起点：优先快速 GPS；任何情况都返回可用坐标（不抛错阻断新建）。
 */
export async function resolveStartPosition({ skipGps = false } = {}) {
  if (skipGps) {
    return fallbackStartPosition('已跳过定位')
  }

  const blocked = geolocationBlockedReason()
  const quick = blocked ? null : await tryQuickPosition()
  if (quick) return { ...quick, fallback: false }

  const reason = blocked
    ? formatGeolocationError({ code: blocked })
    : '暂时无法获取位置'
  return fallbackStartPosition(reason)
}

/**
 * 持续 watchPosition，节流 + 滑动平均；始终回调 onPoint 以更新地图上的当前位置。
 */
export function createGpsTracker({
  onPoint,
  onError,
  throttleMs = 1000,
} = {}) {
  let watchId = null
  let lastEmit = 0
  let lastPoint = null

  function handlePosition(pos) {
    const point = positionFromGeolocation(pos)
    const now = Date.now()
    if (now - lastEmit < throttleMs) return
    lastEmit = now

    const smoothed = movingAverage([...(lastPoint ? [lastPoint] : []), point], 3)
    const out = smoothed[smoothed.length - 1]
    lastPoint = out
    onPoint?.(out)
  }

  function start() {
    const blocked = geolocationBlockedReason()
    if (blocked) {
      onError?.(new Error(blocked))
      return false
    }
    watchId = navigator.geolocation.watchPosition(handlePosition, (e) => onError?.(e), {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    })
    return true
  }

  function stop() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    lastPoint = null
    lastEmit = 0
  }

  function getCurrentPosition() {
    return getCurrentPositionReliable()
  }

  return { start, stop, getCurrentPosition }
}

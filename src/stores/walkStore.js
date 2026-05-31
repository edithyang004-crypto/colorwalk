import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import colorsData from '../assets/colors.json'
import { indexAtPointer, rotationForIndex, snapWheelRotation } from '../utils/wheelGeometry.js'
import {
  saveItem,
  saveWalkDraft,
  getWalkDraft,
  clearWalkDraft,
  getItem,
  generateId,
  deepToRaw,
  formatStorageError,
} from '../utils/storage'
import {
  createGpsTracker,
  totalPathDistance,
  distanceMeters,
  formatDuration,
  formatDistance,
  resolveStartPosition,
  MIN_TRAIL_POINT_DISTANCE_M,
} from '../utils/gps'
import { hexToHsl } from '../utils/colorUtils'
import { generatePoeticName } from '../utils/nameGenerator'
import { compressImage } from '../utils/imageCompress'
import { extractColorsFromBlob } from '../utils/colorExtract'
import { defaultPathName } from '../utils/pathName.js'

export const useWalkStore = defineStore('walk', () => {
  const phase = ref('idle') // idle | walking | result
  const pathName = ref('')
  const wheelRotation = ref(0)
  /** 画廊/关于等入口请求进入选色页（由 MapView 消费） */
  const openColorSelectOnHome = ref(false)
  const targetColors = ref(null)
  const trailPoints = ref([])
  const colorNodes = ref([])
  const sessionCards = ref([])
  const sessionPhotos = ref([])
  const startedAt = ref(null)
  const endedAt = ref(null)
  const currentPosition = ref(null)
  const locating = ref(false)
  const savedToGallery = ref(false)
  const savingGallery = ref(false)
  /** 最近一次成功写入画廊的路线 id，用于成果页跳转拼贴 */
  const lastSavedWalkId = ref(null)

  let gpsTracker = null
  let timerInterval = null

  function serializeWalkForSave(walkId) {
    return {
      id: walkId,
      pathName: pathName.value || defaultPathName(new Date(startedAt.value || Date.now())),
      targetColors: deepToRaw(targetColors.value || []),
      startedAt: startedAt.value,
      endedAt: endedAt.value || Date.now(),
      trailPoints: deepToRaw(trailPoints.value),
      colorNodes: deepToRaw(colorNodes.value),
      cardIds: [],
      photoIds: [],
      stats: deepToRaw(stats.value),
      savedAt: Date.now(),
    }
  }

  function serializeCard(card, walkId) {
    const c = deepToRaw(card)
    return {
      id: c.id,
      hex: c.hex,
      hsl: Array.isArray(c.hsl) ? [...c.hsl] : c.hsl,
      name: c.name,
      sourcePhotoId: c.sourcePhotoId ?? null,
      createdAt: c.createdAt,
      location: c.location ? { lat: c.location.lat, lng: c.location.lng } : null,
      walkId,
    }
  }

  function serializePhoto(photo) {
    const p = deepToRaw(photo)
    return {
      id: p.id,
      blob: p.blob instanceof Blob ? p.blob : null,
      thumbnail: p.thumbnail || '',
      dominantColors: Array.isArray(p.dominantColors) ? [...p.dominantColors] : [],
      targetColors: Array.isArray(p.targetColors) ? [...p.targetColors] : [],
      createdAt: p.createdAt,
      location: p.location ? { lat: p.location.lat, lng: p.location.lng } : null,
      videoBlob: p.videoBlob instanceof Blob ? p.videoBlob : null,
      videoMime: p.videoMime || '',
    }
  }
  let persistInterval = null
  const elapsedSec = ref(0)

  const colors = ref(colorsData)

  const selectedColor = computed(() => {
    const idx = indexAtPointer(wheelRotation.value, colors.value.length)
    return colors.value[idx]
  })

  /** 兼容旧模板：长度为 1 的数组 */
  const windowColors = computed(() => (selectedColor.value ? [selectedColor.value] : []))

  const accentHex = computed(() => {
    const fromNode = colorNodes.value[colorNodes.value.length - 1]?.colorHex
    if (fromNode) return fromNode
    return targetColors.value?.[0]?.hex || windowColors.value[0]?.hex || '#1A1A1A'
  })

  const collectedCount = computed(() => colorNodes.value.length)

  function trailPointsForStats() {
    const pts = trailPoints.value
    if (!pts.length) return []
    if (phase.value === 'walking' && currentPosition.value) {
      const last = pts[pts.length - 1]
      const cp = currentPosition.value
      if (distanceMeters(last, cp) >= 0.5) return [...pts, cp]
    }
    return pts
  }

  const stats = computed(() => {
    // 步行中必须用 elapsedSec（由定时器每秒更新）；computed 里用 Date.now() 不会自动重算
    const durationSec = startedAt.value
      ? endedAt.value
        ? Math.floor((endedAt.value - startedAt.value) / 1000)
        : elapsedSec.value
      : 0
    const distanceM = totalPathDistance(trailPointsForStats())
    return {
      durationSec,
      distanceM,
      colorCount: sessionCards.value.length,
      durationLabel: formatDuration(durationSec),
      distanceLabel: formatDistance(distanceM),
    }
  })

  const currentWalk = computed(() => ({
    id: null,
    pathName: pathName.value,
    targetColors: targetColors.value,
    startedAt: startedAt.value,
    endedAt: endedAt.value,
    trailPoints: trailPoints.value,
    colorNodes: colorNodes.value,
    cardIds: sessionCards.value.map((c) => c.id),
    photoIds: sessionPhotos.value.map((p) => p.id),
    cards: sessionCards.value,
    photos: sessionPhotos.value,
    stats: stats.value,
  }))

  let spinAnimFrame = null
  const isSpinning = ref(false)

  function setRotation(deg) {
    if (phase.value === 'idle') wheelRotation.value = deg
  }

  function cancelSpinAnimation() {
    if (spinAnimFrame) {
      cancelAnimationFrame(spinAnimFrame)
      spinAnimFrame = null
    }
    isSpinning.value = false
  }

  /** 随机旋转转盘并吸附到色段中心，用于选色寻色阶段 */
  function spinToRandom() {
    if (phase.value !== 'idle' || isSpinning.value) return
    cancelSpinAnimation()
    const n = colors.value.length
    const idx = Math.floor(Math.random() * n)
    const extraTurns = 4 + Math.floor(Math.random() * 3)
    const target = rotationForIndex(idx, n) + extraTurns * 360
    const from = wheelRotation.value
    const duration = 2800
    const start = performance.now()
    isSpinning.value = true

    /** ease-out quart + 轻微回弹，转盘停止更柔和 */
    function spinEase(t) {
      if (t >= 1) return 1
      const out = 1 - Math.pow(1 - t, 4)
      if (t < 0.88) return out
      const bounceT = (t - 0.88) / 0.12
      const overshoot = Math.sin(bounceT * Math.PI) * 0.018 * (1 - bounceT)
      return out + overshoot
    }

    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const ease = spinEase(t)
      wheelRotation.value = from + (target - from) * ease
      if (t < 1) {
        spinAnimFrame = requestAnimationFrame(tick)
      } else {
        wheelRotation.value = snapRotation(target)
        spinAnimFrame = null
        isSpinning.value = false
      }
    }
    spinAnimFrame = requestAnimationFrame(tick)
  }

  function snapRotation(deg) {
    return snapWheelRotation(deg, colors.value.length)
  }

  function lockTargetColors() {
    const c = selectedColor.value
    targetColors.value = c ? [{ hex: c.hex, name: c.name }] : []
  }

  function requestColorSelect() {
    if (phase.value === 'walking') return
    openColorSelectOnHome.value = true
  }

  function consumeColorSelectRequest() {
    openColorSelectOnHome.value = false
  }

  function resetIdle() {
    cancelSpinAnimation()
    phase.value = 'idle'
    pathName.value = ''
    targetColors.value = null
    trailPoints.value = []
    colorNodes.value = []
    sessionCards.value = []
    sessionPhotos.value = []
    startedAt.value = null
    endedAt.value = null
    currentPosition.value = null
    savedToGallery.value = false
    lastSavedWalkId.value = null
    elapsedSec.value = 0
    stopTracking()
  }

  async function persistDraft() {
    if (phase.value !== 'walking') return
    await saveWalkDraft({
      phase: 'walking',
      pathName: pathName.value,
      targetColors: deepToRaw(targetColors.value),
      trailPoints: deepToRaw(trailPoints.value),
      colorNodes: deepToRaw(colorNodes.value),
      sessionCards: deepToRaw(sessionCards.value),
      sessionPhotos: deepToRaw(
        sessionPhotos.value.map((p) => ({
          id: p.id,
          thumbnail: p.thumbnail,
          dominantColors: p.dominantColors,
          createdAt: p.createdAt,
          location: p.location,
        }))
      ),
      startedAt: startedAt.value,
      wheelRotation: wheelRotation.value,
    })
  }

  async function restoreDraft() {
    const draft = await getWalkDraft()
    if (!draft || draft.phase !== 'walking') return false
    pathName.value = draft.pathName || ''
    targetColors.value = draft.targetColors
    trailPoints.value = draft.trailPoints || []
    colorNodes.value = draft.colorNodes || []
    sessionCards.value = draft.sessionCards || []
    sessionPhotos.value = draft.sessionPhotos || []
    startedAt.value = draft.startedAt
    wheelRotation.value = draft.wheelRotation || 0
    lastSavedWalkId.value = null
    phase.value = 'walking'
    startTracking()
    return true
  }

  function startTimers() {
    if (startedAt.value) {
      elapsedSec.value = Math.floor((Date.now() - startedAt.value) / 1000)
    }
    timerInterval = setInterval(() => {
      if (startedAt.value && phase.value === 'walking') {
        elapsedSec.value = Math.floor((Date.now() - startedAt.value) / 1000)
      }
    }, 1000)
    persistInterval = setInterval(() => persistDraft(), 30000)
  }

  function stopTracking() {
    gpsTracker?.stop()
    gpsTracker = null
    if (timerInterval) clearInterval(timerInterval)
    if (persistInterval) clearInterval(persistInterval)
    timerInterval = null
    persistInterval = null
  }

  function appendTrailPoint(point) {
    const last = trailPoints.value[trailPoints.value.length - 1]
    if (!last || distanceMeters(last, point) >= MIN_TRAIL_POINT_DISTANCE_M) {
      trailPoints.value.push({ ...point })
    }
  }

  function startTracking() {
    stopTracking()
    gpsTracker = createGpsTracker({
      onPoint: (point) => {
        currentPosition.value = point
        appendTrailPoint(point)
      },
    })
    const started = gpsTracker.start()
    if (!started) {
      console.warn('GPS watch 未启动，请使用 https 访问并允许定位')
    }
    startTimers()
  }

  async function startWalk(name, options = {}) {
    locating.value = true
    try {
      const pos = await resolveStartPosition({ skipGps: options.skipGps })
      const locationWarning = pos.fallback ? pos.warning : ''

      pathName.value = (name && String(name).trim()) || defaultPathName()
      const c = selectedColor.value
      targetColors.value = c ? [{ hex: c.hex, name: c.name }] : []
      trailPoints.value = [{ lat: pos.lat, lng: pos.lng, ts: pos.ts, accuracy: pos.accuracy }]
      currentPosition.value = { lat: pos.lat, lng: pos.lng, ts: pos.ts, accuracy: pos.accuracy }
      colorNodes.value = []
      sessionCards.value = []
      sessionPhotos.value = []
      startedAt.value = Date.now()
      endedAt.value = null
      savedToGallery.value = false
      lastSavedWalkId.value = null
      phase.value = 'walking'
      startTracking()
      await persistDraft()
      return { ok: true, locationWarning }
    } catch (e) {
      gpsTracker?.stop()
      gpsTracker = null
      return { ok: false, message: formatStorageError(e) || '启动失败，请重试' }
    } finally {
      locating.value = false
    }
  }

  async function endWalk() {
    stopTracking()
    endedAt.value = Date.now()
    if (startedAt.value) {
      elapsedSec.value = Math.floor((endedAt.value - startedAt.value) / 1000)
    }
    const last = trailPoints.value[trailPoints.value.length - 1]
    if (last && currentPosition.value && distanceMeters(last, currentPosition.value) >= MIN_TRAIL_POINT_DISTANCE_M) {
      trailPoints.value.push({ ...currentPosition.value })
    }
    phase.value = 'result'
    try {
      await clearWalkDraft()
    } catch (e) {
      console.warn('清除漫步草稿失败', e)
    }
  }

  async function addPhotoWithColors(file, selectedHexes, location) {
    const { blob, thumbnail } = await compressImage(file)
    const dominantColors = await extractColorsFromBlob(blob)
    const photo = {
      id: generateId(),
      blob,
      thumbnail,
      dominantColors,
      targetColors: (targetColors.value || []).map((c) => c.hex),
      createdAt: Date.now(),
      location,
    }
    sessionPhotos.value.push(photo)

    const loc = location || currentPosition.value
    const cards = []
    for (const hex of [...new Set(selectedHexes)]) {
      const card = {
        id: generateId(),
        hex,
        hsl: hexToHsl(hex),
        name: generatePoeticName(hex),
        sourcePhotoId: photo.id,
        createdAt: Date.now(),
        location: loc ? { lat: loc.lat, lng: loc.lng } : null,
        walkId: null,
      }
      sessionCards.value.push(card)
      cards.push(card)
      if (loc) {
        colorNodes.value.push({
          lat: loc.lat,
          lng: loc.lng,
          colorHex: hex,
          cardId: card.id,
          photoId: photo.id,
          ts: Date.now(),
        })
      }
    }
    await persistDraft()
    return { photo, cards }
  }

  async function saveWalkToGallery() {
    if (savedToGallery.value) return { ok: true, already: true }
    if (savingGallery.value) return { ok: false, message: '正在保存，请稍候…' }

    savingGallery.value = true
    const walkId = generateId()
    const walk = serializeWalkForSave(walkId)
    const photoWarnings = []

    try {
      for (const card of sessionCards.value) {
        const plain = serializeCard(card, walkId)
        await saveItem('card', plain.id, plain)
        walk.cardIds.push(plain.id)
      }

      for (const photo of sessionPhotos.value) {
        try {
          const plain = serializePhoto(photo)
          if (!plain.blob && !plain.thumbnail) {
            throw new Error('照片数据为空')
          }
          await saveItem('photo', plain.id, plain)
          walk.photoIds.push(plain.id)
        } catch (e) {
          console.warn('单张照片保存失败', e)
          photoWarnings.push(formatStorageError(e))
        }
      }

      await saveItem('walk', walk.id, walk)
      savedToGallery.value = true
      lastSavedWalkId.value = walk.id

      if (photoWarnings.length && walk.cardIds.length) {
        return {
          ok: true,
          walk,
          message: '色卡与路线已保存；部分照片未能写入本地（可能过大）',
        }
      }
      if (photoWarnings.length && !walk.cardIds.length) {
        return {
          ok: true,
          walk,
          message: '路线已保存；照片未能写入本地，色卡可在画廊中查看已保存项',
        }
      }
      return { ok: true, walk }
    } catch (e) {
      console.error('保存到画廊失败', e)
      return { ok: false, message: `保存失败：${formatStorageError(e)}` }
    } finally {
      savingGallery.value = false
    }
  }

  function newWalk() {
    resetIdle()
  }

  /** 未保存到画廊前：从当前会话移除一张照片及其关联色卡与地图采色点 */
  function removeSessionPhoto(photoId) {
    sessionPhotos.value = sessionPhotos.value.filter((p) => p.id !== photoId)
    sessionCards.value = sessionCards.value.filter((c) => c.sourcePhotoId !== photoId)
    colorNodes.value = colorNodes.value.filter((n) => n.photoId !== photoId)
    void persistDraft().catch((e) => console.warn('persistDraft', e))
  }

  async function renamePathName(name) {
    const trimmed = String(name || '').trim()
    if (!trimmed) return { ok: false, message: '名称不能为空' }
    pathName.value = trimmed
    if (lastSavedWalkId.value) {
      try {
        const walk = await getItem('walk', lastSavedWalkId.value)
        if (walk) {
          await saveItem('walk', lastSavedWalkId.value, { ...walk, pathName: trimmed })
        }
      } catch (e) {
        console.warn('更新已保存路线名称失败', e)
        return { ok: false, message: formatStorageError(e) || '保存名称失败' }
      }
    }
    return { ok: true }
  }

  return {
    phase,
    pathName,
    wheelRotation,
    openColorSelectOnHome,
    targetColors,
    trailPoints,
    colorNodes,
    sessionCards,
    sessionPhotos,
    startedAt,
    endedAt,
    currentPosition,
    locating,
    savedToGallery,
    savingGallery,
    lastSavedWalkId,
    colors,
    selectedColor,
    windowColors,
    isSpinning,
    accentHex,
    collectedCount,
    stats,
    currentWalk,
    elapsedSec,
    setRotation,
    spinToRandom,
    requestColorSelect,
    consumeColorSelectRequest,
    lockTargetColors,
    resetIdle,
    persistDraft,
    restoreDraft,
    startWalk,
    endWalk,
    addPhotoWithColors,
    saveWalkToGallery,
    newWalk,
    removeSessionPhoto,
    renamePathName,
  }
})

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import CollageTemplates from './CollageTemplates.vue'
import {
  renderCollage,
  canvasToJpegBlob,
  saveCollageBlobToDevice,
  DEFAULT_COLLAGE_RENDER_OPTIONS,
} from '../utils/exportImage'
import { generateId, formatStorageError } from '../utils/storage'
import { usePhotoStore } from '../stores/photoStore'
import { useGalleryStore } from '../stores/galleryStore'
import colorsData from '../assets/colors.json'
import { ChevronRight, X } from 'lucide-vue-next'

const RENDER_OPTIONS_KEY = 'colorwalk:collage-render-options'

const TEMPLATE_LABELS = {
  G: '色块单图',
  H: '横排双图',
  A: '色块侧栏',
  B: '色条横排',
  C: '九宫格',
  D: '分栏布局',
  E: '瀑布流', // 旧版式，仅用于历史拼贴展示
  F: '色带双图',
}

/** 含顶部/侧栏色带的版式：背景色可选白色 */
const TEMPLATES_WITH_COLOR_BAR = new Set(['A', 'B', 'F'])

const PHOTOS_NEEDED_MAP = { G: 1, H: 2, A: 2, B: 3, C: 9, D: 3, F: 2 }

const STEP_LABELS = ['版式', '选图']
const PREVIEW_STEP = 3

const props = defineProps({
  photos: { type: Array, default: () => [] },
  colors: { type: Array, default: () => [] },
  cards: { type: Array, default: () => [] },
  preselectAll: { type: Boolean, default: false },
})
const emit = defineEmits(['saved', 'close'])

const photoStore = usePhotoStore()
const galleryStore = useGalleryStore()
const step = ref(1)
const templateId = ref('G')
const saving = ref(false)
const saveError = ref('')
const saveOkHint = ref('')
const previewUrl = ref(null)
const previewing = ref(false)
const orderedPhotos = ref([])
const selectedIds = ref([])
const dragIndex = ref(null)
const walkFilterId = ref('')
const exportStyleOpen = ref(false)
const stepHint = ref('')

const watermarkPresets = [
  { id: 'minimal', label: '简约', fontWeight: '400', fontStyle: 'normal' },
  { id: 'card', label: '常规', fontWeight: '500', fontStyle: 'normal' },
  { id: 'bold', label: '粗体', fontWeight: '700', fontStyle: 'normal' },
  { id: 'italic', label: '斜体', fontWeight: '400', fontStyle: 'italic' },
]

const fontOptions = [
  { id: 'default', label: '默认', family: '"Source Sans 3", "Noto Sans SC", sans-serif' },
  { id: 'mono', label: '等宽', family: 'ui-monospace, "SF Mono", Menlo, monospace' },
  { id: 'serif', label: '衬线', family: 'Georgia, "Songti SC", "Noto Serif SC", serif' },
]

function loadRenderOptions() {
  try {
    const raw = localStorage.getItem(RENDER_OPTIONS_KEY)
    if (!raw) return structuredClone(DEFAULT_COLLAGE_RENDER_OPTIONS)
    const parsed = JSON.parse(raw)
    const wm = parsed.watermark || {}
    let textColor = wm.textColor ?? DEFAULT_COLLAGE_RENDER_OPTIONS.watermark.textColor
    if (typeof textColor === 'string' && textColor.startsWith('rgba')) {
      textColor = '#444444'
    }
    const padding = Number(parsed.padding)
    const gap = Number(parsed.gap)
    return {
      padding: Number.isFinite(padding)
        ? Math.min(32, Math.max(0, Math.round(padding)))
        : DEFAULT_COLLAGE_RENDER_OPTIONS.padding,
      gap: Number.isFinite(gap)
        ? Math.min(16, Math.max(0, Math.round(gap)))
        : DEFAULT_COLLAGE_RENDER_OPTIONS.gap,
      backgroundColor: parsed.backgroundColor ?? DEFAULT_COLLAGE_RENDER_OPTIONS.backgroundColor,
      watermark: {
        ...DEFAULT_COLLAGE_RENDER_OPTIONS.watermark,
        ...wm,
        textColor,
      },
    }
  } catch {
    return structuredClone(DEFAULT_COLLAGE_RENDER_OPTIONS)
  }
}

const renderOptions = ref(loadRenderOptions())
const activeWatermarkPreset = ref('card')
let previewGeneration = 0

function clampSpacing(value, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(0, Math.round(n)))
}

function normalizeRenderOptionsState() {
  renderOptions.value.padding = clampSpacing(
    renderOptions.value.padding,
    32,
    DEFAULT_COLLAGE_RENDER_OPTIONS.padding
  )
  renderOptions.value.gap = clampSpacing(
    renderOptions.value.gap,
    16,
    DEFAULT_COLLAGE_RENDER_OPTIONS.gap
  )
}

function fontIdFromFamily(family) {
  const hit = fontOptions.find((f) => f.family === family)
  return hit?.id || 'default'
}

const watermarkFontId = ref(fontIdFromFamily(renderOptions.value.watermark.fontFamily))

function persistRenderOptions() {
  try {
    localStorage.setItem(RENDER_OPTIONS_KEY, JSON.stringify(renderOptions.value))
  } catch {
    /* ignore quota errors */
  }
}

const pool = computed(() => (props.photos.length ? props.photos : photoStore.photos))

const photoWalkIds = computed(() => {
  const map = new Map()
  for (const card of props.cards || []) {
    if (!card.sourcePhotoId || !card.walkId) continue
    const set = map.get(card.sourcePhotoId) || new Set()
    set.add(card.walkId)
    map.set(card.sourcePhotoId, set)
  }
  for (const walk of galleryStore.walks) {
    for (const photoId of walk.photoIds || []) {
      if (!pool.value.some((p) => p.id === photoId)) continue
      const set = map.get(photoId) || new Set()
      set.add(walk.id)
      map.set(photoId, set)
    }
  }
  return map
})

const walkFilterOptions = computed(() => {
  const walkIds = new Set()
  for (const p of pool.value) {
    for (const id of photoWalkIds.value.get(p.id) || []) {
      walkIds.add(id)
    }
  }
  if (walkIds.size < 2) return []
  return [...walkIds].map((id) => {
    const walk = galleryStore.getWalk(id)
    return { id, label: walk?.pathName || walk?.name || `路线 ${String(id).slice(0, 6)}` }
  })
})

const showRouteFilter = computed(() => walkFilterOptions.value.length >= 2)

const filteredPool = computed(() => {
  let list = [...pool.value]
  if (walkFilterId.value) {
    list = list.filter((p) => photoWalkIds.value.get(p.id)?.has(walkFilterId.value))
  }
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return list
})

function normPaletteEntry(c) {
  if (c == null) return null
  if (typeof c === 'string') return { hex: c, name: c }
  const hex = c.hex || c
  if (!hex) return null
  return { hex, name: c.name || hex }
}

function hexFromDominant(dc) {
  if (dc == null) return null
  if (typeof dc === 'string') return dc.startsWith('#') ? dc : `#${dc}`
  return dc.hex || null
}

const defaultStripPalette = computed(() => {
  const fromColors = (props.colors || []).map(normPaletteEntry).filter(Boolean)
  if (fromColors.length) return fromColors
  const fromCards = (props.cards || []).map((c) => ({ hex: c.hex, name: c.name || c.hex }))
  return fromCards
})

/** 从已选照片 / 路线色卡聚合可选色（去重） */
function buildPhotoLinkedPalette() {
  const cards = props.cards || []
  const list = []
  const seen = new Set()
  for (const p of orderedPhotos.value) {
    const related = cards.filter((c) => c.sourcePhotoId === p.id)
    for (const c of related) {
      const key = (c.hex || '').toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        list.push({ hex: c.hex, name: c.name || c.hex })
      }
    }
    if (!related.length) {
      const h = hexFromDominant(p.dominantColors?.[0])
      const key = (h || '').toLowerCase()
      if (h && !seen.has(key)) {
        seen.add(key)
        list.push({ hex: h, name: '照片取色' })
      }
    }
  }
  for (const c of defaultStripPalette.value) {
    const key = (c.hex || '').toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      list.push({ hex: c.hex, name: c.name || c.hex })
    }
  }
  return list
}

function padToThree(list) {
  const out = list.map((x) => ({ hex: x.hex, name: x.name || x.hex })).filter((x) => x.hex)
  let i = 0
  while (out.length < 3 && colorsData[i]) {
    const d = colorsData[i]
    if (!out.some((x) => x.hex === d.hex)) out.push({ hex: d.hex, name: d.name })
    i++
  }
  return out.slice(0, 3)
}

const paletteForRender = computed(() => {
  const cards = props.cards || []
  if (orderedPhotos.value.length) {
    const list = []
    const seen = new Set()
    for (const p of orderedPhotos.value) {
      const related = cards.filter((c) => c.sourcePhotoId === p.id)
      for (const c of related) {
        if (c.hex && !seen.has(c.hex)) {
          seen.add(c.hex)
          list.push({ hex: c.hex, name: c.name || c.hex })
        }
      }
      if (!related.length) {
        const h = hexFromDominant(p.dominantColors?.[0])
        if (h && !seen.has(h)) {
          seen.add(h)
          list.push({ hex: h, name: '照片取色' })
        }
      }
      if (list.length >= 9) break
    }
    if (list.length) return padToThree(list)
  }
  return padToThree(defaultStripPalette.value)
})

/** 色块单图：用户选中的色块 hex（对应预览行三个色点） */
const blockColorHex = ref(null)

/** 实际传给 renderCollage 的色板（G 版式将选中色置于首项作为色块色） */
const renderPalette = computed(() => {
  const base = paletteForRender.value
  if (templateId.value !== 'G') return base

  const hex = blockColorHex.value || base[0]?.hex
  if (!hex) return base

  const entry =
    base.find((c) => (c.hex || c).toLowerCase() === hex.toLowerCase()) || { hex, name: hex }
  const rest = base.filter((c) => (c.hex || c).toLowerCase() !== hex.toLowerCase())
  return padToThree([entry, ...rest])
})

/** 已选照片关联色卡，供背景色选择；色带版式额外提供白色 */
const backgroundPalette = computed(() => {
  const list = buildPhotoLinkedPalette()

  if (!TEMPLATES_WITH_COLOR_BAR.has(templateId.value)) {
    return list
  }

  const withWhite = [{ hex: '#FFFFFF', name: '白色' }]
  const whiteSeen = new Set(['#ffffff'])
  for (const item of list) {
    const key = (item.hex || '').toLowerCase()
    if (!key || whiteSeen.has(key)) continue
    whiteSeen.add(key)
    withWhite.push(item)
  }
  return withWhite
})

const hasColorBarTemplate = computed(() => TEMPLATES_WITH_COLOR_BAR.has(templateId.value))

const watermarkSampleText = computed(() => {
  const wm = renderOptions.value.watermark
  const parts = []
  if (wm.prefix) parts.push(wm.prefix)
  parts.push(new Date().toLocaleDateString('zh-CN'))
  return parts.join(' · ')
})

function watermarkPresetPreviewStyle(preset) {
  const font = fontOptions.find((f) => f.id === watermarkFontId.value)
  return {
    fontFamily: font?.family || renderOptions.value.watermark.fontFamily,
    fontWeight: preset.fontWeight,
    fontStyle: preset.fontStyle,
    color: renderOptions.value.watermark.textColor,
  }
}

function isBackgroundActive(hex) {
  return (renderOptions.value.backgroundColor || '').toLowerCase() === (hex || '').toLowerCase()
}

function isBlockColorActive(hex) {
  const active = blockColorHex.value || paletteForRender.value[0]?.hex
  return (active || '').toLowerCase() === (hex || '').toLowerCase()
}

function syncBlockColorFromPalette() {
  if (templateId.value !== 'G') {
    blockColorHex.value = null
    return
  }
  const base = paletteForRender.value
  const cur = (blockColorHex.value || '').toLowerCase()
  if (cur && base.some((c) => c.hex.toLowerCase() === cur)) return
  blockColorHex.value = base[0]?.hex || null
}

function setBlockColor(hex) {
  blockColorHex.value = hex
  schedulePreviewUpdate()
}

const paddingLabel = computed(() => {
  const p = renderOptions.value.padding
  if (p === 0) return '无边距'
  if (p <= 8) return '细'
  if (p <= 16) return '中'
  return '标准'
})

const watermarkPreviewText = computed(() => {
  const wm = renderOptions.value.watermark
  if (!wm.enabled) return '无水印'
  const parts = []
  if (wm.prefix) parts.push(wm.prefix)
  if (wm.showDate) parts.push(new Date().toLocaleDateString('zh-CN'))
  return parts.join(' · ')
})

const photosNeeded = computed(() => PHOTOS_NEEDED_MAP[templateId.value] || 3)

const maxPick = computed(() => {
  const n = pool.value.length
  if (!n) return 0
  return Math.min(20, Math.max(n, photosNeeded.value))
})

const canSave = computed(() => {
  const need = photosNeeded.value
  const n = orderedPhotos.value.length
  return n >= need
})

const previewStatusLine = computed(() => {
  const label = TEMPLATE_LABELS[templateId.value] || templateId.value
  const n = orderedPhotos.value.length
  return `${label} · ${n} 张照片`
})

function findPhotoById(id) {
  return pool.value.find((p) => p.id === id)
}

function syncOrderedFromIds() {
  orderedPhotos.value = selectedIds.value.map((id) => findPhotoById(id)).filter(Boolean)
}

function initFromProps() {
  walkFilterId.value = ''
  step.value = 1
  stepHint.value = ''
  saveError.value = ''
  saveOkHint.value = ''
  if (props.preselectAll && props.photos.length) {
    selectedIds.value = props.photos.map((p) => p.id)
    syncOrderedFromIds()
  } else {
    selectedIds.value = []
    orderedPhotos.value = []
  }
}

function goToStep(target) {
  if (target > 2) return
  stepHint.value = ''

  if (step.value === PREVIEW_STEP) {
    step.value = target
    return
  }

  if (target === step.value) return

  if (target < step.value) {
    step.value = target
    return
  }

  if (target >= 2 && !templateId.value) {
    stepHint.value = '请先选择一种版式'
    return
  }

  step.value = target
}

function goToPreview() {
  stepHint.value = ''
  if (!templateId.value) {
    stepHint.value = '请先选择一种版式'
    return
  }
  if (!canSave.value) {
    stepHint.value = `此版式需要 ${photosNeeded.value} 张照片，当前已选 ${orderedPhotos.value.length} 张`
    return
  }
  step.value = PREVIEW_STEP
}

function togglePhoto(photo) {
  const i = selectedIds.value.indexOf(photo.id)
  if (i >= 0) {
    selectedIds.value = selectedIds.value.filter((id) => id !== photo.id)
  } else if (selectedIds.value.length < maxPick.value) {
    selectedIds.value = [...selectedIds.value, photo.id]
  }
  syncOrderedFromIds()
  stepHint.value = ''
}

function removeFromStrip(index) {
  const photo = orderedPhotos.value[index]
  if (!photo) return
  selectedIds.value = selectedIds.value.filter((id) => id !== photo.id)
  syncOrderedFromIds()
}

function onDragStart(index) {
  dragIndex.value = index
}

function onDragOver(e) {
  e.preventDefault()
}

function onDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...orderedPhotos.value]
  const [item] = list.splice(dragIndex.value, 1)
  list.splice(index, 0, item)
  orderedPhotos.value = list
  selectedIds.value = list.map((p) => p.id)
  dragIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
}

function isPhotoSelected(photo) {
  return selectedIds.value.includes(photo.id)
}

function applyWatermarkPreset(preset) {
  activeWatermarkPreset.value = preset.id
  renderOptions.value.watermark.fontWeight = preset.fontWeight
  renderOptions.value.watermark.fontStyle = preset.fontStyle
  schedulePreviewUpdate()
}

function onWatermarkFontChange() {
  const option = fontOptions.find((f) => f.id === watermarkFontId.value)
  if (option) {
    renderOptions.value.watermark.fontFamily = option.family
    schedulePreviewUpdate()
  }
}

function setBackgroundFromSwatch(hex) {
  renderOptions.value.backgroundColor = hex
  schedulePreviewUpdate()
}

function onPaddingInput(event) {
  renderOptions.value.padding = clampSpacing(
    event.target.value,
    32,
    DEFAULT_COLLAGE_RENDER_OPTIONS.padding
  )
  schedulePreviewUpdate()
}

function onGapInput(event) {
  renderOptions.value.gap = clampSpacing(
    event.target.value,
    16,
    DEFAULT_COLLAGE_RENDER_OPTIONS.gap
  )
  schedulePreviewUpdate()
}

function schedulePreviewUpdate() {
  normalizeRenderOptionsState()
  persistRenderOptions()
  if (step.value === PREVIEW_STEP) updatePreview()
}

function onRenderOptionChange() {
  schedulePreviewUpdate()
}

async function updatePreview() {
  if (!orderedPhotos.value.length) {
    previewUrl.value = null
    return
  }
  const generation = ++previewGeneration
  previewing.value = true
  try {
    normalizeRenderOptionsState()
    const canvas = await renderCollage(
      templateId.value,
      orderedPhotos.value,
      renderPalette.value,
      renderOptions.value
    )
    if (generation !== previewGeneration) return
    previewUrl.value = canvas.toDataURL('image/jpeg', 0.85)
  } catch (e) {
    if (generation !== previewGeneration) return
    console.error('拼贴预览失败', e)
    previewUrl.value = null
  } finally {
    if (generation === previewGeneration) previewing.value = false
  }
}

async function save() {
  saveError.value = ''
  saveOkHint.value = ''
  if (!canSave.value) {
    saveError.value = `需要 ${photosNeeded.value} 张照片，当前 ${orderedPhotos.value.length} 张`
    return
  }
  saving.value = true
  try {
    normalizeRenderOptionsState()
    const canvas = await renderCollage(
      templateId.value,
      orderedPhotos.value,
      renderPalette.value,
      renderOptions.value
    )
    const blob = await canvasToJpegBlob(canvas, 0.92)
    if (!blob || blob.size === 0) {
      saveError.value = '导出失败，请重试或更换版式'
      return
    }

    const date = new Date().toISOString().slice(0, 10)
    const filename = `colorwalk-${date}.jpg`
    const collage = {
      id: generateId(),
      imageBlob: blob,
      templateId: templateId.value,
      photoIds: orderedPhotos.value.map((p) => p.id),
      colors: renderPalette.value.map((c) => c.hex || c),
      createdAt: Date.now(),
    }

    let exportResult = 'skipped'
    try {
      exportResult = await saveCollageBlobToDevice(blob, filename)
    } catch (e) {
      console.warn('导出到本机失败', e)
    }

    try {
      await photoStore.saveCollage(collage)
      await Promise.all([galleryStore.hydrate(), photoStore.hydrate()])
    } catch (e) {
      console.error('写入本地拼贴失败', e)
      saveError.value = formatStorageError(e)
      return
    }

    emit('saved', collage)

    const parts = ['已保存到画廊「拼贴」。']
    if (exportResult === 'picker') {
      parts.push('文件已写入所选位置。')
    } else if (exportResult === 'share') {
      parts.push('已通过系统分享。')
    } else if (exportResult === 'download') {
      parts.push('已触发下载；也可长按预览保存。')
    }
    saveOkHint.value = parts.join('')
  } catch (e) {
    console.error('拼贴保存失败', e)
    saveError.value =
      e?.name === 'SecurityError'
        ? '浏览器禁止导出，请确认照片来源后重试'
        : e?.message || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!photoStore.photos.length) await photoStore.hydrate()
  if (!galleryStore.walks.length) await galleryStore.hydrate()
  initFromProps()
})

watch(
  () => [props.photos, props.preselectAll],
  () => initFromProps(),
  { deep: true }
)

watch(
  [templateId, orderedPhotos, renderPalette, step],
  () => {
    if (step.value === PREVIEW_STEP) updatePreview()
  },
  { deep: true }
)

watch(step, (s) => {
  if (s === PREVIEW_STEP) {
    exportStyleOpen.value = false
    syncBlockColorFromPalette()
    updatePreview()
  } else {
    previewUrl.value = null
  }
})

watch(templateId, () => {
  syncBlockColorFromPalette()
})

watch(paletteForRender, () => {
  if (step.value === PREVIEW_STEP && templateId.value === 'G') {
    syncBlockColorFromPalette()
  }
}, { deep: true })

watch(
  backgroundPalette,
  (list) => {
    if (!list.length) return
    const cur = (renderOptions.value.backgroundColor || '').toLowerCase()
    const inList = list.some((c) => c.hex.toLowerCase() === cur)
    if (!inList) {
      renderOptions.value.backgroundColor = list[0].hex
      schedulePreviewUpdate()
    }
  },
  { deep: true }
)
</script>

<template>
  <Teleport to="body">
    <div class="editor-overlay" @click.self="$emit('close')">
      <div class="editor panel">
        <header class="editor-head">
          <button
            v-if="step === PREVIEW_STEP"
            type="button"
            class="icon-btn icon-btn--back"
            aria-label="返回选图"
            @click="goToStep(2)"
          >
            <ChevronRight :size="20" :stroke-width="1.8" class="icon-back" />
          </button>
          <div v-else class="head-spacer" />
          <h2>{{ step === PREVIEW_STEP ? '拼贴预览' : '照片拼贴' }}</h2>
          <button type="button" class="icon-btn" aria-label="关闭" @click="$emit('close')">
            <X :size="20" :stroke-width="1.8" />
          </button>
        </header>

        <nav v-if="step <= 2" class="step-pills" aria-label="拼贴步骤">
          <button
            v-for="(label, i) in STEP_LABELS"
            :key="label"
            type="button"
            class="step-pill"
            :class="{ active: step === i + 1, done: step > i + 1 }"
            :aria-current="step === i + 1 ? 'step' : undefined"
            @click="goToStep(i + 1)"
          >
            {{ label }}
          </button>
        </nav>

        <!-- Step 1: Template -->
        <section v-show="step === 1" class="step-body step-template">
          <p class="step-lead step-lead--compact">选择版式，底部左右滑动可切换</p>
          <CollageTemplates v-model="templateId" compact />
        </section>

        <!-- Step 2: Photos -->
        <section v-show="step === 2" class="step-body step-pick">
          <div class="pick-toolbar">
            <p class="pick-hint">
              已选 {{ selectedIds.length }} / 需要 {{ photosNeeded }} 张
            </p>
            <div v-if="selectedIds.length" class="palette-dots" aria-label="条带用色">
              <span
                v-for="(c, i) in paletteForRender"
                :key="`${c.hex}-${i}`"
                class="color-dot"
                :style="{ background: c.hex }"
                :title="c.name"
              />
            </div>
          </div>

          <div v-if="showRouteFilter" class="route-chips" role="tablist" aria-label="按路线筛选">
            <button
              type="button"
              role="tab"
              class="route-chip"
              :class="{ active: !walkFilterId }"
              :aria-selected="!walkFilterId"
              @click="walkFilterId = ''"
            >
              全部路线
            </button>
            <button
              v-for="w in walkFilterOptions"
              :key="w.id"
              type="button"
              role="tab"
              class="route-chip"
              :class="{ active: walkFilterId === w.id }"
              :aria-selected="walkFilterId === w.id"
              @click="walkFilterId = w.id"
            >
              {{ w.label }}
            </button>
          </div>

          <div v-if="orderedPhotos.length" class="selected-strip-wrap">
            <p class="strip-label">已选顺序 · 拖动调整 · 点击移除</p>
            <ul class="selected-strip">
              <li
                v-for="(photo, index) in orderedPhotos"
                :key="photo.id"
                class="strip-thumb"
                :class="{ dragging: dragIndex === index }"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover="onDragOver"
                @drop="onDrop(index)"
                @dragend="onDragEnd"
                @click="removeFromStrip(index)"
              >
                <img :src="photo.thumbnail" alt="" />
                <span class="badge">{{ index + 1 }}</span>
              </li>
            </ul>
          </div>

          <p v-if="!pool.length" class="pick-empty">暂无可选照片，请先在采色时添加照片。</p>
          <template v-else>
            <div class="pick-scroll">
              <div class="photo-grid">
                <button
                  v-for="photo in filteredPool"
                  :key="photo.id"
                  type="button"
                  class="grid-photo"
                  :class="{
                    selected: isPhotoSelected(photo),
                    disabled: !isPhotoSelected(photo) && selectedIds.length >= maxPick,
                  }"
                  @click="togglePhoto(photo)"
                >
                  <img :src="photo.thumbnail" alt="" />
                  <span v-if="isPhotoSelected(photo)" class="grid-badge">
                    {{ selectedIds.indexOf(photo.id) + 1 }}
                  </span>
                </button>
              </div>
            </div>
            <p v-if="!filteredPool.length" class="pick-empty">该路线下暂无照片。</p>
          </template>
        </section>

        <!-- Preview (not in nav) -->
        <section
          v-show="step === PREVIEW_STEP"
          class="step-body step-preview"
          :class="{ 'is-export-open': exportStyleOpen }"
        >
          <div class="preview-stage">
            <div class="preview-frame" :class="{ 'is-loading': previewing }">
              <p v-if="previewing" class="preview-placeholder">生成预览中…</p>
              <img
                v-else-if="previewUrl"
                :src="previewUrl"
                alt="拼贴预览"
                class="preview-img"
                width="1080"
                height="1350"
              />
              <p v-else class="preview-placeholder">暂无预览</p>
            </div>

            <div class="preview-meta">
              <span>{{ previewStatusLine }}</span>
              <span class="palette-dots inline" :aria-label="templateId === 'G' ? '选择色块颜色' : undefined">
                <template v-for="(c, i) in paletteForRender" :key="`${c.hex}-${i}`">
                  <button
                    v-if="templateId === 'G'"
                    type="button"
                    class="color-dot sm color-dot-btn"
                    :class="{ active: isBlockColorActive(c.hex) }"
                    :style="{ background: c.hex }"
                    :title="`设为色块：${c.name}`"
                    :aria-label="`色块 ${c.name}`"
                    :aria-pressed="isBlockColorActive(c.hex)"
                    @click="setBlockColor(c.hex)"
                  />
                  <span
                    v-else
                    class="color-dot sm"
                    :style="{ background: c.hex }"
                    :title="c.name"
                  />
                </template>
              </span>
            </div>
          </div>

          <div class="export-style">
            <button type="button" class="export-style-head" @click="exportStyleOpen = !exportStyleOpen">
              <span>{{ exportStyleOpen ? '收起导出样式' : '调整导出样式' }}</span>
              <span class="export-style-summary">{{ paddingLabel }} · {{ watermarkPreviewText }}</span>
              <ChevronRight :size="16" :class="{ open: exportStyleOpen }" />
            </button>
            <div v-show="exportStyleOpen" class="export-style-body">
              <label class="opt-row">
                <span class="opt-label">边距 <em>{{ paddingLabel }} ({{ renderOptions.padding }}px)</em></span>
                <input
                  :value="renderOptions.padding"
                  type="range"
                  min="0"
                  max="32"
                  step="1"
                  @input="onPaddingInput"
                />
              </label>
              <label class="opt-row">
                <span class="opt-label">格间缝隙 <em>{{ renderOptions.gap }}px</em></span>
                <input
                  :value="renderOptions.gap"
                  type="range"
                  min="0"
                  max="16"
                  step="1"
                  @input="onGapInput"
                />
              </label>
              <div class="opt-row">
                <span class="opt-label">
                  {{ hasColorBarTemplate ? '背景色 · 白色或已选照片色卡' : '背景色 · 来自已选照片色卡' }}
                </span>
                <div v-if="backgroundPalette.length" class="bg-palette">
                  <button
                    v-for="(c, i) in backgroundPalette"
                    :key="`${c.hex}-${i}`"
                    type="button"
                    class="bg-swatch"
                    :class="{ active: isBackgroundActive(c.hex), 'bg-swatch--light': c.hex.toLowerCase() === '#ffffff' }"
                    :style="{ background: c.hex }"
                    :title="`${c.name} ${c.hex}`"
                    @click="setBackgroundFromSwatch(c.hex)"
                  >
                    <span class="bg-swatch-name">{{ c.name }}</span>
                  </button>
                </div>
                <p v-else class="bg-palette-hint">请先选图；背景色来自照片关联的采色卡</p>
              </div>
              <label class="opt-check">
                <input
                  v-model="renderOptions.watermark.enabled"
                  type="checkbox"
                  @change="onRenderOptionChange"
                />
                显示底部水印
              </label>
              <template v-if="renderOptions.watermark.enabled">
                <div class="opt-row">
                  <span class="opt-label">水印样式</span>
                  <div class="wm-preset-list">
                    <button
                      v-for="p in watermarkPresets"
                      :key="p.id"
                      type="button"
                      class="wm-preset"
                      :class="{ active: activeWatermarkPreset === p.id }"
                      @click="applyWatermarkPreset(p)"
                    >
                      <span class="wm-preset-strip" aria-hidden="true">
                        <span class="wm-preset-preview" :style="watermarkPresetPreviewStyle(p)">
                          {{ watermarkSampleText }}
                        </span>
                      </span>
                      <span class="wm-preset-label">{{ p.label }}</span>
                    </button>
                  </div>
                </div>
                <label class="opt-row">
                  <span class="opt-label">水印字体</span>
                  <select v-model="watermarkFontId" class="font-select" @change="onWatermarkFontChange">
                    <option v-for="f in fontOptions" :key="f.id" :value="f.id">{{ f.label }}</option>
                  </select>
                </label>
                <label class="opt-row color-field">
                  <span class="opt-label">文字色</span>
                  <input
                    v-model="renderOptions.watermark.textColor"
                    type="color"
                    class="color-input"
                    @change="onRenderOptionChange"
                  />
                </label>
              </template>
            </div>
          </div>

          <p v-if="saveError" class="save-feedback error">{{ saveError }}</p>
          <p v-else-if="saveOkHint" class="save-feedback ok">{{ saveOkHint }}</p>
        </section>

        <p v-if="stepHint" class="step-hint">{{ stepHint }}</p>

        <footer v-if="step === 2" class="editor-foot">
          <button
            type="button"
            class="btn-primary btn-primary--full"
            :disabled="!canSave"
            @click="goToPreview"
          >
            下一步
          </button>
        </footer>

        <footer v-if="step === PREVIEW_STEP" class="editor-foot editor-foot--dual">
          <button type="button" class="btn-outline" @click="goToStep(2)">上一步</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="saving || !canSave"
            @click="save"
          >
            {{ saving ? '合成中…' : '保存拼贴' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-dim);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 10050;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.panel {
  width: 100%;
  max-width: var(--max-width);
  height: min(92vh, 100dvh);
  max-height: 92vh;
  min-height: min(85vh, 100dvh);
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: 8px var(--page-padding) 0;
  border-top: 1px solid var(--divider);
  box-shadow: var(--shadow-sheet);
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.editor-head h2 {
  flex: 1;
  text-align: center;
  font-size: var(--font-title-3);
  font-weight: var(--font-weight-bold);
  margin: 0;
  color: var(--text-primary);
}

.head-spacer,
.icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background 150ms ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
}

.icon-btn--back .icon-back {
  transform: rotate(180deg);
}

.step-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.step-pill {
  flex: 1;
  text-align: center;
  padding: 6px 4px;
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  border: 1.5px solid var(--divider);
  border-radius: var(--radius-chip);
  background: var(--bg-primary);
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.step-pill:hover:not(.active) {
  background: var(--bg-secondary);
}

.step-pill.active {
  background: var(--brand-ink);
  border-color: var(--brand-ink);
  color: var(--brand-label);
  font-weight: var(--font-weight-semibold);
}

.step-pill.done {
  border-color: var(--brand-ink);
  color: var(--brand-ink);
}

.step-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
}

.step-body.step-pick {
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px) + 8px);
}

.step-body.step-template {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px));
}

.step-body.step-template .step-lead--compact {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.step-body.step-template :deep(.tpl-picker) {
  flex: 1;
  min-height: 0;
}

.step-body.step-preview {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.step-body.step-preview.is-export-open {
  overflow-y: auto;
}

.route-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.route-chip {
  padding: 6px 12px;
  border-radius: var(--radius-chip);
  border: 1.5px solid var(--divider);
  background: var(--bg-primary);
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}

.route-chip.active {
  background: var(--brand-ink);
  border-color: var(--brand-ink);
  color: var(--brand-label);
  font-weight: var(--font-weight-semibold);
}

.step-lead {
  font-size: var(--font-callout);
  color: var(--text-secondary);
  line-height: var(--line-relaxed);
  margin: 0 0 12px;
}

.step-hint {
  font-size: var(--font-footnote);
  color: var(--system-red);
  text-align: center;
  margin: 0;
  padding: 0 4px 8px;
}

.editor-foot {
  flex-shrink: 0;
  padding: 12px 0 calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--divider);
  background: var(--bg-surface);
}

.editor-foot--dual {
  display: flex;
  gap: 10px;
}

.editor-foot--dual .btn-outline,
.editor-foot--dual .btn-primary {
  flex: 1;
  min-height: 48px;
}

.btn-primary--full {
  width: 100%;
}

.pick-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.pick-hint {
  font-size: var(--font-callout);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin: 0;
}

.palette-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.palette-dots.inline {
  margin-left: auto;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--bg-surface);
  box-shadow: 0 0 0 1px var(--divider);
  flex-shrink: 0;
}

.color-dot.sm {
  width: 18px;
  height: 18px;
}

.color-dot-btn {
  padding: 0;
  cursor: pointer;
  transition: box-shadow 150ms ease, transform 120ms ease;
}

.color-dot-btn.active {
  box-shadow: 0 0 0 2px var(--brand-ink);
}

.color-dot-btn:active {
  transform: scale(0.92);
}

.selected-strip-wrap {
  margin-bottom: 12px;
}

.strip-label {
  font-size: var(--font-caption-1);
  color: var(--text-muted);
  margin: 0 0 8px;
}

.selected-strip {
  list-style: none;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.selected-strip::-webkit-scrollbar {
  display: none;
}

.strip-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 2px solid var(--divider);
  cursor: grab;
  transition: opacity 150ms ease, border-color 150ms ease;
}

.strip-thumb.dragging {
  opacity: 0.45;
}

.strip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.strip-thumb .badge {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  background: var(--brand-ink);
  color: var(--brand-label);
  border-radius: 50%;
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pick-empty {
  font-size: var(--font-callout);
  color: var(--text-secondary);
  line-height: var(--line-relaxed);
}

.pick-scroll {
  flex: 1;
  min-height: 120px;
  overflow-y: auto;
  border-radius: var(--radius-card);
  -webkit-overflow-scrolling: touch;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.grid-photo {
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
}

.grid-photo.disabled:not(.selected) {
  opacity: 0.45;
  cursor: not-allowed;
}

.grid-photo.selected {
  border-color: var(--brand-ink);
}

.grid-photo img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.grid-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: var(--brand-ink);
  color: var(--brand-label);
  border-radius: 50%;
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  justify-content: center;
}


.preview-stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.preview-frame {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: var(--radius-card);
  border: 1px solid var(--divider);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-frame.is-loading {
  min-height: 200px;
}

.preview-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
  border-radius: calc(var(--radius-card) - 6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.preview-placeholder {
  margin: 0;
  padding: 32px 16px;
  text-align: center;
  font-size: var(--font-callout);
  color: var(--text-muted);
  line-height: var(--line-relaxed);
}

.preview-meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-footnote);
  color: var(--text-secondary);
  padding: 0 2px;
}

.export-style {
  flex-shrink: 0;
  margin-bottom: 8px;
  border: 1px solid var(--divider);
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--bg-surface);
}

.export-style-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: var(--bg-secondary);
  font-size: var(--font-footnote);
  font-weight: var(--font-weight-semibold);
  text-align: left;
}

.export-style-head svg {
  margin-left: auto;
  flex-shrink: 0;
  transition: transform 150ms ease;
}

.export-style-head svg.open {
  transform: rotate(90deg);
}

.export-style-summary {
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-regular);
  color: var(--text-muted);
  flex: 1;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-style-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--divider);
}

.opt-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opt-label {
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.opt-label em {
  font-style: normal;
  font-weight: var(--font-weight-regular);
  color: var(--text-muted);
}

.opt-row input[type='range'] {
  width: 100%;
  accent-color: var(--brand-ink);
  touch-action: pan-x;
  min-height: 28px;
}

.opt-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-footnote);
  color: var(--text-secondary);
}

.bg-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bg-swatch {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  border: 2px solid transparent;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--divider);
  transition: border-color 150ms ease, transform 120ms ease;
}

.bg-swatch.active {
  border-color: var(--brand-ink);
  box-shadow: 0 0 0 2px var(--brand-ink);
}

.bg-swatch--light {
  background: #fff !important;
}

.bg-swatch--light .bg-swatch-name {
  color: var(--text-secondary);
  text-shadow: none;
  background: linear-gradient(transparent, rgba(255, 255, 255, 0.92));
}

.bg-swatch-name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2px 4px;
  font-size: 9px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bg-palette-hint {
  margin: 0;
  font-size: var(--font-caption-1);
  color: var(--text-muted);
  line-height: var(--line-relaxed);
}

.color-input {
  width: 100%;
  max-width: 120px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--divider);
  border-radius: var(--radius-xs);
  cursor: pointer;
}

.wm-preset-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.wm-preset {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--divider);
  background: var(--bg-primary);
  text-align: left;
  transition: border-color 150ms ease, background 150ms ease;
}

.wm-preset.active {
  border-color: var(--brand-ink);
  background: var(--bg-secondary);
}

.wm-preset-strip {
  display: block;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--divider);
}

.wm-preset-preview {
  display: block;
  font-size: 11px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wm-preset-label {
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-align: center;
}

.wm-preset.active .wm-preset-label {
  color: var(--text-primary);
}

.font-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--divider);
  background: var(--bg-primary);
  font-size: var(--font-footnote);
}

.colors-row {
  flex-direction: row;
  gap: 12px;
}

.color-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--font-caption-1);
  color: var(--text-muted);
}

.save-feedback {
  font-size: var(--font-footnote);
  line-height: var(--line-relaxed);
  text-align: center;
  margin: 8px 0 0;
}

.save-feedback.ok {
  color: var(--brand-sage);
}

.save-feedback.error {
  color: var(--system-red);
}
</style>

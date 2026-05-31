<script setup>
import { computed, ref, watch } from 'vue'
import chroma from 'chroma-js'
import { X, Check, Copy, Pencil } from 'lucide-vue-next'

const props = defineProps({
  show: { type: Boolean, default: false },
  colorEntries: { type: Array, default: () => [] },
  description: { type: String, default: '' },
})

const emit = defineEmits(['close', 'rename'])

const PHOTO_RADIUS = 20
const CONTENT_W = 340

const editingCardId = ref(null)
const nameDraft = ref('')
const copiedHex = ref('')

watch(
  () => props.show,
  (open) => {
    if (!open) {
      editingCardId.value = null
      copiedHex.value = ''
    }
  }
)

const entries = computed(() =>
  (props.colorEntries || []).map((entry, index) => ({
    ...entry,
    key: entry.cardId
      ? `${entry.walkId || 'walk'}-${entry.cardId}`
      : `${entry.walkId || 'walk'}-${entry.hex || 'color'}-${index}`,
  }))
)

const hasMultiple = computed(() => entries.value.length > 1)

const walkCount = computed(
  () => new Set(entries.value.map((e) => e.walkId).filter(Boolean)).size
)

const hasMultipleWalks = computed(() => walkCount.value > 1)

const summaryText = computed(() => {
  if (hasMultipleWalks.value) {
    return `本位置共 ${entries.value.length} 色 · ${walkCount.value} 条路线`
  }
  if (hasMultiple.value) {
    return `本位置共采集 ${entries.value.length} 色`
  }
  return ''
})

const primaryHex = computed(() => normalizeHex(entries.value[0]?.hex))

const dialogLabel = computed(() => {
  if (hasMultipleWalks.value) return `采色点 · ${walkCount.value} 条路线`
  if (hasMultiple.value) return `采色点 · ${entries.value.length} 色`
  const first = entries.value[0]
  return first?.colorName || '采色点'
})

function normalizeHex(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  try {
    return chroma(value).hex().toLowerCase()
  } catch {
    return value.startsWith('#') ? value.toLowerCase() : value
  }
}

function entryHex(entry) {
  return normalizeHex(entry.hex)
}

function themeVarsForHex(hex) {
  if (!hex) {
    return {
      '--point-color': '#d9d9d9',
      '--point-glow': 'rgba(180, 176, 171, 0.35)',
      '--point-tint': 'rgba(180, 176, 171, 0.08)',
      '--point-tint-strong': 'rgba(180, 176, 171, 0.14)',
      '--point-border': 'rgba(180, 176, 171, 0.22)',
      '--on-color': '#1a1a1a',
      '--on-color-muted': 'rgba(26, 26, 26, 0.65)',
    }
  }
  try {
    const c = chroma(hex)
    const light = c.luminance() > 0.55
    return {
      '--point-color': hex,
      '--point-glow': c.alpha(0.38).css(),
      '--point-tint': c.alpha(0.1).css(),
      '--point-tint-strong': c.alpha(0.17).css(),
      '--point-border': c.alpha(0.28).css(),
      '--on-color': light ? '#1a1a1a' : '#ffffff',
      '--on-color-muted': light ? 'rgba(26, 26, 26, 0.62)' : 'rgba(255, 255, 255, 0.78)',
    }
  } catch {
    return {}
  }
}

const themeVars = computed(() => themeVarsForHex(primaryHex.value))

const paletteColorsFor = (hex) => {
  if (!hex) return []
  try {
    const base = chroma(hex)
    return [base.darken(0.55).hex(), base.hex(), base.brighten(0.45).hex()]
  } catch {
    return [hex]
  }
}

const cardStyleVars = computed(() => ({
  ...themeVars.value,
  '--content-w': `${CONTENT_W}px`,
  '--photo-radius': `${PHOTO_RADIUS}px`,
}))

function startNameEdit(entry) {
  if (!entry.editable) return
  editingCardId.value = entry.key
  nameDraft.value = entry.colorName || ''
}

function commitNameEdit(entry) {
  if (editingCardId.value !== entry.key) return
  const trimmed = nameDraft.value.trim()
  editingCardId.value = null
  if (trimmed && trimmed !== entry.colorName && entry.cardId) {
    emit('rename', { cardId: entry.cardId, name: trimmed })
  }
}

function cancelNameEdit(entry) {
  if (editingCardId.value !== entry.key) return
  editingCardId.value = null
  nameDraft.value = entry.colorName || ''
}

let copyTimer = null

async function copyHex(hex) {
  const display = normalizeHex(hex)
  if (!display) return
  try {
    await navigator.clipboard.writeText(display)
    copiedHex.value = display
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedHex.value = ''
    }, 1600)
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div
        v-if="show"
        class="overlay"
        :style="themeVars"
        @click.self="emit('close')"
      >
        <article
          class="card"
          role="dialog"
          aria-modal="true"
          :aria-label="dialogLabel"
          :style="cardStyleVars"
        >
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
            <X :size="18" :stroke-width="1.75" />
          </button>

          <div class="card-scroll">
            <p v-if="summaryText" class="multi-summary">{{ summaryText }}</p>

            <section
              v-for="(entry, index) in entries"
              :key="entry.key"
              class="color-entry"
              :class="{ 'color-entry--multi': hasMultiple }"
              :style="themeVarsForHex(entryHex(entry))"
            >
              <p v-if="entry.walkLabel && hasMultipleWalks" class="entry-walk-label">
                {{ entry.walkLabel }}
              </p>
              <div
                v-if="entryHex(entry)"
                class="main-color-block"
                :class="{ 'main-color-block--compact': hasMultiple }"
                :style="{ background: entryHex(entry) }"
              >
                <div class="color-title-row">
                  <input
                    v-if="editingCardId === entry.key"
                    v-model="nameDraft"
                    class="color-name-input"
                    maxlength="20"
                    aria-label="编辑颜色名称"
                    @click.stop
                    @blur="commitNameEdit(entry)"
                    @keyup.enter="commitNameEdit(entry)"
                    @keyup.escape="cancelNameEdit(entry)"
                  />
                  <template v-else>
                    <h2 class="color-title">{{ entry.colorName || entryHex(entry) }}</h2>
                    <button
                      v-if="entry.editable"
                      type="button"
                      class="name-edit-btn"
                      aria-label="修改颜色名称"
                      @click.stop="startNameEdit(entry)"
                    >
                      <Pencil :size="14" :stroke-width="2" />
                    </button>
                  </template>
                </div>
                <button
                  type="button"
                  class="main-color-block__hex"
                  :aria-label="`复制色值 ${entryHex(entry)}`"
                  @click="copyHex(entry.hex)"
                >
                  <Check
                    v-if="copiedHex === entryHex(entry)"
                    :size="14"
                    :stroke-width="2"
                    aria-hidden="true"
                  />
                  <Copy v-else :size="14" :stroke-width="1.75" aria-hidden="true" />
                  {{ copiedHex === entryHex(entry) ? '已复制' : entryHex(entry) }}
                </button>
              </div>

              <div v-else-if="entry.colorName" class="title-only">
                <div class="color-title-row color-title-row--plain">
                  <input
                    v-if="editingCardId === entry.key"
                    v-model="nameDraft"
                    class="color-name-input color-name-input--plain"
                    maxlength="20"
                    aria-label="编辑颜色名称"
                    @blur="commitNameEdit(entry)"
                    @keyup.enter="commitNameEdit(entry)"
                    @keyup.escape="cancelNameEdit(entry)"
                  />
                  <template v-else>
                    <h2 class="color-title color-title--plain">{{ entry.colorName }}</h2>
                    <button
                      v-if="entry.editable"
                      type="button"
                      class="name-edit-btn name-edit-btn--plain"
                      aria-label="修改颜色名称"
                      @click.stop="startNameEdit(entry)"
                    >
                      <Pencil :size="14" :stroke-width="2" />
                    </button>
                  </template>
                </div>
              </div>

              <div class="card-content">
                <template v-if="entry.photoUrl">
                  <div class="photo-wrap photo-wrap--landscape">
                    <img
                      :src="entry.photoUrl"
                      :alt="`${entry.colorName || entryHex(entry)} 采色照片`"
                      class="photo-img"
                      loading="lazy"
                    />
                  </div>

                  <div
                    v-if="paletteColorsFor(entryHex(entry)).length"
                    class="palette-bar"
                    aria-label="色彩层次"
                  >
                    <span
                      v-for="(c, i) in paletteColorsFor(entryHex(entry))"
                      :key="i"
                      class="palette-segment"
                      :style="{ background: c }"
                    />
                  </div>
                </template>

                <p v-if="entry.description" class="story">{{ entry.description }}</p>
                <p v-if="entry.timeLabel" class="meta-time">采集时间 · {{ entry.timeLabel }}</p>
                <p v-if="entry.rgb && entryHex(entry)" class="meta-rgb">RGB {{ entry.rgb }}</p>

                <div
                  v-for="(url, photoIndex) in (entry.photoUrls || []).slice(1)"
                  :key="url"
                  class="photo-wrap photo-wrap--landscape"
                >
                  <img
                    :src="url"
                    :alt="`${entry.colorName || entryHex(entry)} 照片 ${photoIndex + 2}`"
                    class="photo-img"
                    loading="lazy"
                  />
                </div>
              </div>
            </section>

            <p v-if="description" class="story story--global">{{ description }}</p>
          </div>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--point-color, #b5b0ab) 22%, rgba(51, 48, 48, 0.36));
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(92vw, calc(var(--content-w) + 48px));
  max-height: min(88dvh, 640px);
  background: linear-gradient(
    165deg,
    var(--point-tint-strong, rgba(255, 255, 255, 0.14)) 0%,
    #fafafa 38%,
    #fafafa 100%
  );
  border: 1px solid var(--point-border, rgba(0, 0, 0, 0.06));
  border-radius: 28px;
  box-shadow:
    0 0 28px 6px var(--point-glow, rgba(0, 0, 0, 0.08)),
    0 12px 32px rgba(51, 48, 48, 0.14);
  animation: color-bloom-in 320ms cubic-bezier(0.34, 1.25, 0.64, 1);
  overflow: hidden;
}

@keyframes color-bloom-in {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(14px);
    box-shadow: 0 0 0 0 var(--point-glow, transparent);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
    box-shadow:
      0 0 28px 6px var(--point-glow, rgba(0, 0, 0, 0.08)),
      0 12px 32px rgba(51, 48, 48, 0.14);
  }
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 220ms ease;
}

.popup-fade-enter-active .card,
.popup-fade-leave-active .card {
  transition:
    opacity 220ms ease,
    transform 220ms cubic-bezier(0.34, 1.25, 0.64, 1);
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.popup-fade-enter-from .card,
.popup-fade-leave-to .card {
  opacity: 0;
  transform: scale(0.96) translateY(10px);
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
}

.close-btn:active {
  background: #fff;
}

.card-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 20px calc((100% - min(var(--content-w), 100%)) / 2) 24px;
}

.multi-summary {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
}

.entry-walk-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #5a5b57);
}

.color-entry + .color-entry {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed rgba(48, 46, 46, 0.12);
}

.main-color-block {
  width: 100%;
  aspect-ratio: 1.15;
  max-height: 200px;
  border-radius: var(--photo-radius);
  margin-bottom: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 4px;
  border: none;
  text-align: left;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    0 8px 24px color-mix(in srgb, var(--point-color, #ccc) 35%, transparent);
}

.main-color-block--compact {
  max-height: 160px;
  aspect-ratio: 1.35;
}

.color-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.color-title-row--plain {
  margin-bottom: 12px;
}

.color-title-row .color-title {
  flex: 1;
  min-width: 0;
}

.name-edit-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  color: var(--on-color-muted);
  cursor: pointer;
}

.name-edit-btn--plain {
  background: var(--bg-app, rgba(0, 0, 0, 0.06));
  color: var(--text-muted, #888);
}

.name-edit-btn:active {
  transform: scale(0.94);
}

.color-name-input {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 2px 0;
  border: none;
  border-bottom: 2px solid rgba(255, 255, 255, 0.55);
  background: transparent;
  font-family: inherit;
  font-size: clamp(20px, 5vw, 24px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: var(--letter-tight, -0.03em);
  color: var(--on-color);
  outline: none;
}

.color-name-input--plain {
  border-bottom-color: var(--brand-primary, #302e2e);
  color: var(--text-primary);
}

.color-title {
  margin: 0;
  font-family: var(--font-display, inherit);
  font-size: clamp(22px, 5.5vw, 26px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: var(--letter-tight, -0.03em);
  color: var(--on-color);
}

.color-title--plain {
  color: var(--text-primary);
  margin-bottom: 12px;
}

.main-color-block__hex {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--on-color-muted);
}

.main-color-block__hex:active {
  opacity: 0.75;
}

.title-only {
  margin-bottom: 12px;
}

.card-content {
  width: 100%;
  max-width: var(--content-w);
  margin: 0 auto;
}

.photo-wrap {
  width: 100%;
  border-radius: var(--photo-radius);
  overflow: hidden;
  margin-bottom: 12px;
  flex-shrink: 0;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--point-color, #ccc) 22%, transparent);
}

.photo-wrap--landscape {
  aspect-ratio: 340 / 220;
}

.photo-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.palette-bar {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 14px;
  height: 12px;
}

.palette-segment {
  flex: 1;
  border-radius: 999px;
  min-width: 0;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.story {
  margin: 0 0 10px;
  font-size: var(--font-footnote, 13px);
  line-height: 1.65;
  color: var(--text-secondary);
}

.story--global {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed rgba(48, 46, 46, 0.12);
}

.meta-time {
  margin: 0 0 6px;
  font-size: var(--font-caption-1, 12px);
  color: var(--text-muted);
}

.meta-rgb {
  margin: 0 0 12px;
  font-size: var(--font-caption-1, 12px);
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--text-muted);
}
</style>

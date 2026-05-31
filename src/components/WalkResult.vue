<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Dices, Trash2, Pencil } from 'lucide-vue-next'
import TrailMap from './TrailMap.vue'
import GradientBar from './GradientBar.vue'
import ExhibitionCardModal from './ExhibitionCardModal.vue'
import { generatePoeticName } from '../utils/nameGenerator'
import { findNodeById, getNodeCardSections } from '../data/exhibitionNodes.js'
import { useWalkStore } from '../stores/walkStore'
import { useGalleryStore } from '../stores/galleryStore'
import { usePhotoStore } from '../stores/photoStore'
import { useMapStore } from '../stores/mapStore'

const props = defineProps({
  walk: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  saveHint: { type: String, default: '' },
  locationLabel: { type: String, default: '本次漫步' },
  mapCenter: { type: Object, default: null },
  /** 嵌在画廊/半屏弹层内时为 true，不启用平板双栏全屏布局 */
  embedded: { type: Boolean, default: false },
  /** 只读模式下仍允许修改路径名（历史详情） */
  allowPathRename: { type: Boolean, default: undefined },
})

const targetHexes = computed(() =>
  (props.walk.targetColors || []).map((c) => (typeof c === 'string' ? c : c.hex)).filter(Boolean)
)

/** 渐变条用色：优先本次色卡，其次寻色目标色 */
const gradientFallbackColors = computed(() => {
  const seen = new Set()
  const fromCards = []
  for (const card of props.walk.cards || []) {
    if (card?.hex && !seen.has(card.hex)) {
      seen.add(card.hex)
      fromCards.push(card.hex)
    }
  }
  return fromCards.length ? fromCards : targetHexes.value
})

const emit = defineEmits(['save', 'newWalk', 'backMap', 'delete-photo', 'rename-path'])

const titleLabel = computed(
  () => props.walk.pathName || props.locationLabel || '本次漫步'
)

const canRenamePath = computed(() => props.allowPathRename ?? !props.readonly)
const editingPathName = ref(false)
const pathNameDraft = ref('')

const router = useRouter()
const walkStore = useWalkStore()
const galleryStore = useGalleryStore()
const photoStore = usePhotoStore()
const mapStore = useMapStore()

const collageNavError = ref('')
const openingCollage = ref(false)
const editingId = ref(null)
const editName = ref('')
const blobPreviewUrls = new Map()

const showExhibitionCard = ref(false)
const exhibitionNode = ref(null)

const exhibitionCardSections = computed(() =>
  exhibitionNode.value ? getNodeCardSections(exhibitionNode.value) : [],
)

function isExhibitionCardClickable(card) {
  if (!props.walk?.isDemo || !card?.exhibitionNodeId) return false
  return !!findNodeById(card.exhibitionNodeId)
}

function openExhibitionCard(card) {
  if (!isExhibitionCardClickable(card)) return
  const node = findNodeById(card.exhibitionNodeId)
  if (!node) return
  exhibitionNode.value = node
  showExhibitionCard.value = true
}

function closeExhibitionCard() {
  showExhibitionCard.value = false
  exhibitionNode.value = null
}

const walkPhotos = computed(() => {
  const p = props.walk.photos
  return Array.isArray(p) ? p : []
})

const canDeletePhotos = computed(() => !props.walk.isDemo && walkPhotos.value.length > 0)

function thumbForPhoto(photo) {
  if (photo.thumbnail) return photo.thumbnail
  if (photo.blob) {
    if (!blobPreviewUrls.has(photo.id)) {
      blobPreviewUrls.set(photo.id, URL.createObjectURL(photo.blob))
    }
    return blobPreviewUrls.get(photo.id)
  }
  return ''
}

onUnmounted(() => {
  for (const u of blobPreviewUrls.values()) {
    try {
      URL.revokeObjectURL(u)
    } catch {
      /* ignore */
    }
  }
  blobPreviewUrls.clear()
})

const mapPreviewHeight = computed(() =>
  props.embedded ? 'clamp(112px, 20vh, 152px)' : '100%'
)

function confirmDeletePhoto(photo) {
  if (props.walk.isDemo) return
  if (!confirm('确定删除这张照片？关联的采色情卡也会一并移除。')) return
  emit('delete-photo', photo.id)
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function startEdit(card) {
  editingId.value = card.id
  editName.value = card.name
}

function saveEdit(card) {
  card.name = editName.value.trim() || card.name
  editingId.value = null
}

function randomName(card) {
  card.name = generatePoeticName(card.hex)
}

function startPathEdit() {
  pathNameDraft.value = props.walk.pathName || props.locationLabel || ''
  editingPathName.value = true
}

function cancelPathEdit() {
  editingPathName.value = false
}

function savePathEdit() {
  const trimmed = pathNameDraft.value.trim()
  if (!trimmed) return
  emit('rename-path', trimmed)
  editingPathName.value = false
}

/** 先确保画廊中已有本次路线与照片，再跳转画廊拼贴 */
async function goMakeCollage() {
  if (props.readonly) return
  collageNavError.value = ''
  openingCollage.value = true
  try {
    if (!walkStore.savedToGallery) {
      const r = await walkStore.saveWalkToGallery()
      if (!r.ok) {
        collageNavError.value = r.message || '保存失败，请重试后再制作拼贴'
        return
      }
    }
    try {
      await galleryStore.hydrate()
      await photoStore.hydrate()
      await mapStore.refreshWalks()
    } catch (e) {
      console.error('刷新画廊数据失败', e)
    }
    let walkId = walkStore.lastSavedWalkId
    if (!walkId) {
      walkId =
        galleryStore.walks.find((w) => w.startedAt === walkStore.startedAt)?.id || null
    }
    if (!walkId) {
      collageNavError.value = '未找到已保存的路线，请打开画廊在「路线」中确认后重试'
      return
    }
    await router.push({
      path: '/gallery',
      query: { openCollage: '1', walkId: String(walkId) },
    })
  } finally {
    openingCollage.value = false
  }
}
</script>

<template>
  <div
    class="walk-result"
    :class="{ 'walk-result--embedded': embedded }"
  >
    <div class="map-preview">
      <TrailMap
        :trail-points="walk.trailPoints"
        :color-nodes="walk.colorNodes"
        :interactive="false"
        :follow="false"
        :height="mapPreviewHeight"
        :zoom="15"
        :center="mapCenter"
      />
    </div>

    <GradientBar
      class="result-gradient"
      :trail-points="walk.trailPoints"
      :color-nodes="walk.colorNodes"
      :fallback-colors="gradientFallbackColors"
    />

    <div class="walk-bottom">
      <section class="cards-section">
        <h2>本次色卡</h2>
        <div class="cards-scroll tiles-row" role="list">
          <article
            v-for="card in walk.cards || []"
            :key="card.id"
            class="pantone-card tile-card"
            :class="{ 'pantone-card--exhibition': isExhibitionCardClickable(card) }"
            role="listitem"
            :tabindex="isExhibitionCardClickable(card) ? 0 : undefined"
            :aria-label="
              isExhibitionCardClickable(card)
                ? `查看 ${card.name} 展览卡片`
                : undefined
            "
            @click="openExhibitionCard(card)"
            @keydown.enter.prevent="openExhibitionCard(card)"
          >
            <div class="pantone-swatch-wrap">
              <div class="swatch" :style="{ background: card.hex }" />
              <button
                v-if="!readonly"
                type="button"
                class="dice-btn"
                aria-label="随机色名"
                @click.stop="randomName(card)"
              >
                <Dices :size="13" />
              </button>
            </div>
            <div class="pantone-meta">
              <div v-if="editingId === card.id" class="edit-row">
                <input
                  v-model="editName"
                  class="name-input"
                  @click.stop
                  @blur="saveEdit(card)"
                  @keyup.enter="saveEdit(card)"
                />
              </div>
              <button
                v-else-if="!readonly"
                type="button"
                class="name-btn"
                @click.stop="startEdit(card)"
              >
                {{ card.name }}
              </button>
              <p v-else class="name-btn name-btn--static">{{ card.name }}</p>
              <p class="hex">{{ card.hex }}</p>
            </div>
          </article>
        </div>
      </section>

      <section v-if="walkPhotos.length" class="photos-section">
        <h2>路线照片</h2>
        <div class="photos-scroll tiles-row" role="list">
          <article
            v-for="photo in walkPhotos"
            :key="photo.id"
            class="photo-thumb-card tile-card"
            role="listitem"
          >
            <img v-if="thumbForPhoto(photo)" :src="thumbForPhoto(photo)" alt="" class="photo-thumb" />
            <div v-else class="photo-thumb photo-thumb-empty">无预览</div>
            <button
              v-if="canDeletePhotos"
              type="button"
              class="photo-delete-float"
              aria-label="删除照片"
              @click="confirmDeletePhoto(photo)"
            >
              <Trash2 :size="13" :stroke-width="2" />
            </button>
          </article>
        </div>
      </section>

      <section class="meta">
        <div v-if="canRenamePath && editingPathName" class="path-name-edit">
          <input
            v-model="pathNameDraft"
            class="path-name-input"
            maxlength="40"
            aria-label="路径名称"
            @keyup.enter="savePathEdit"
          />
          <div class="path-name-edit-actions">
            <button type="button" class="path-rename-action" @click="savePathEdit">保存</button>
            <button type="button" class="path-rename-action path-rename-action--muted" @click="cancelPathEdit">
              取消
            </button>
          </div>
        </div>
        <div v-else class="path-name-row">
          <p class="path-name">{{ titleLabel }}</p>
          <button
            v-if="canRenamePath"
            type="button"
            class="path-rename-btn"
            aria-label="修改名称"
            @click="startPathEdit"
          >
            <Pencil :size="15" :stroke-width="2" />
          </button>
        </div>
        <p class="date">{{ formatDate(walk.startedAt) }}</p>
        <p class="stats">
          {{ walk.stats?.durationLabel || '00:00:00' }} · {{ walk.stats?.distanceLabel || '0m' }} ·
          {{ walk.stats?.colorCount ?? walk.cards?.length ?? 0 }} 色
        </p>
      </section>

      <p v-if="saveHint" class="save-hint" :class="{ error: saveHint.includes('失败') }">{{ saveHint }}</p>
      <p v-if="collageNavError" class="save-hint error">{{ collageNavError }}</p>

      <div v-if="!readonly" class="actions">
        <button type="button" class="btn-outline" @click="emit('backMap')">返回地图</button>
        <button type="button" class="btn-primary" :disabled="openingCollage" @click="goMakeCollage">
          {{ openingCollage ? '跳转中…' : '制作拼贴' }}
        </button>
      </div>

      <button
        v-if="!readonly && !saved"
        type="button"
        class="btn-text"
        :disabled="saving"
        @click="emit('save')"
      >
        {{ saving ? '保存中…' : '保存到画廊与地图' }}
      </button>
    </div>

    <ExhibitionCardModal
      :show="showExhibitionCard"
      :name="exhibitionNode?.name ?? ''"
      :main-color="exhibitionNode?.mainColor ?? ''"
      :location-label="exhibitionNode?.cardLocation ?? exhibitionNode?.name ?? ''"
      :sections="exhibitionCardSections"
      @close="closeExhibitionCard"
    />
  </div>
</template>

<style scoped>
.walk-result {
  --result-tile-size: clamp(76px, 22vw, 96px);
  width: 100%;
  max-width: none;
  margin: 0;
  padding-bottom: calc(var(--safe-bottom) + 16px);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.walk-result:not(.walk-result--embedded) .map-preview {
  height: clamp(112px, 20vh, 152px);
}
.walk-bottom {
  margin-top: 0;
  flex: 1;
  min-height: 0;
}
.map-preview {
  flex-shrink: 0;
  margin: 0 calc(-1 * var(--page-padding)) 12px;
  border-radius: 0;
  overflow: hidden;
}
.result-gradient {
  flex-shrink: 0;
  margin: 0 0 16px;
  padding: 12px var(--page-padding);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  box-shadow: none;
}
.tiles-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  padding-bottom: 4px;
  margin: 0 calc(-1 * var(--page-padding));
  padding-left: var(--page-padding);
  padding-right: var(--page-padding);
}
.tiles-row > .tile-card {
  scroll-snap-align: start;
}
.save-hint {
  margin-top: 12px;
  font-size: var(--font-footnote);
  color: var(--brand-sage);
  text-align: center;
  line-height: 1.5;
}
.save-hint.error {
  color: var(--accent-coral);
}
.photos-section {
  margin-top: 18px;
  padding-top: 4px;
}
.photos-section h2 {
  font-size: var(--font-title-3);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-tight);
  margin-bottom: 10px;
}
.photo-thumb-card {
  flex: 0 0 var(--result-tile-size);
  width: var(--result-tile-size);
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  background: var(--bg-surface);
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .photo-thumb-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}
.photo-thumb {
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  object-fit: cover;
  display: block;
}
.photo-thumb-empty {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-app);
}
.photo-delete-float {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  color: var(--accent-coral);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-delete-float:active {
  transform: scale(0.92);
}
.cards-section {
  margin-top: 16px;
  padding-top: 4px;
}
.cards-section h2 {
  font-size: var(--font-title-3);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-tight);
  margin-bottom: 10px;
}
.pantone-card {
  flex: 0 0 var(--result-tile-size);
  width: var(--result-tile-size);
  border-radius: var(--radius-lg);
  overflow: visible;
  background: transparent;
  box-shadow: none;
}
.pantone-swatch-wrap {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  background: var(--bg-surface);
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .pantone-card:hover .pantone-swatch-wrap {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}
.swatch {
  width: 100%;
  aspect-ratio: 1;
  display: block;
}
.pantone-meta {
  padding: 6px 2px 0;
  text-align: center;
}
.name-btn {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  width: 100%;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--text-primary);
}
.name-btn:disabled {
  cursor: default;
}
.name-btn--static {
  cursor: inherit;
  pointer-events: none;
}
.pantone-card--exhibition {
  cursor: pointer;
}
.pantone-card--exhibition:focus-visible {
  outline: 2px solid var(--brand-ink);
  outline-offset: 3px;
  border-radius: var(--radius-lg);
}
.pantone-card--exhibition:active .pantone-swatch-wrap {
  transform: scale(0.98);
}
.name-input {
  width: 100%;
  font-size: 11px;
  border: 1.5px solid var(--brand-soft);
  border-radius: var(--radius-sm);
  padding: 4px 6px;
  background: var(--bg-app);
  outline: none;
  text-align: center;
}
.dice-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-xs);
}
.dice-btn:active {
  transform: scale(0.92);
}
.hex {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
  font-family: var(--font-mono);
  line-height: 1.2;
  word-break: break-all;
}
.meta {
  margin-top: 20px;
  text-align: center;
}
.path-name-row {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  margin: 0 auto 6px;
}
.path-name {
  font-size: var(--font-title-2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-tight);
  margin: 0;
  min-width: 0;
}
.path-rename-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-primary);
  border-radius: 50%;
  background: var(--brand-soft);
}
.path-rename-btn:active {
  transform: scale(0.92);
}
.path-name-edit {
  margin-bottom: 6px;
}
.path-name-input {
  width: min(100%, 280px);
  margin: 0 auto 8px;
  display: block;
  font-size: var(--font-headline);
  font-weight: var(--font-weight-semibold);
  text-align: center;
  border: 1.5px solid var(--brand-soft);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  background: var(--bg-surface);
  outline: none;
}
.path-name-edit-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.path-rename-action {
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}
.path-rename-action--muted {
  color: var(--text-muted);
}
.date {
  font-size: var(--font-subhead);
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.stats {
  font-size: var(--font-subhead);
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.actions button {
  flex: 1;
}
.btn-text {
  width: 100%;
  margin-top: 16px;
}

@media (min-width: 768px) {
  .walk-result:not(.walk-result--embedded) {
    --result-tile-size: clamp(88px, 10vw, 112px);
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 16px 28px;
    align-items: stretch;
    padding-bottom: 0;
    min-height: min(100%, calc(100dvh - 48px));
    overflow: hidden;
  }

  .walk-result:not(.walk-result--embedded) .map-preview {
    grid-column: 1;
    grid-row: 1;
    margin: 0;
    min-height: 240px;
    height: 100%;
    border-radius: var(--radius-card);
    overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: none;
  }

  .walk-result:not(.walk-result--embedded) .map-preview :deep(.trail-map),
  .walk-result:not(.walk-result--embedded) .map-preview :deep(.map-canvas) {
    height: 100%;
    min-height: 100%;
  }

  .walk-result:not(.walk-result--embedded) .result-gradient {
    grid-column: 1;
    grid-row: 2;
    margin: 0;
  }

  .walk-result:not(.walk-result--embedded) .walk-bottom {
    grid-column: 2;
    grid-row: 1 / 3;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-right: 4px;
  }

  .walk-result:not(.walk-result--embedded) .cards-section,
  .walk-result:not(.walk-result--embedded) .photos-section {
    width: 100%;
    margin-top: 0;
  }

  .walk-result:not(.walk-result--embedded) .tiles-row {
    flex-wrap: wrap;
    overflow: visible;
    margin: 0;
    padding: 0;
  }

  .walk-result:not(.walk-result--embedded) .meta {
    text-align: left;
    margin-top: 0;
  }

  .walk-result:not(.walk-result--embedded) .actions {
    margin-top: 8px;
  }

  .walk-result:not(.walk-result--embedded) .photos-section h2,
  .walk-result:not(.walk-result--embedded) .cards-section h2 {
    margin-bottom: 10px;
  }

  .walk-result:not(.walk-result--embedded) .save-hint {
    text-align: left;
  }
}
</style>

<script setup>
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import GradientBar from '../components/GradientBar.vue'
import WalkResult from '../components/WalkResult.vue'
import CollageEditor from '../components/CollageEditor.vue'
import { useGalleryStore } from '../stores/galleryStore'
import { usePhotoStore } from '../stores/photoStore'
import { useMapStore } from '../stores/mapStore'
import { getItem } from '../utils/storage'

const route = useRoute()
const router = useRouter()
const startNewWalk = inject('startNewWalk', () => {})
const galleryStore = useGalleryStore()
const photoStore = usePhotoStore()
const mapStore = useMapStore()

const tab = ref('cards')
const detailCard = ref(null)
const detailWalk = ref(null)
const detailCollage = ref(null)
const cardPhotoUrl = ref('')
const isLandscape = ref(false)
let mql = null
let removeLandscapeListener = () => {}
/** 拼贴编辑器：来自某次路线的照片 / 色卡；空则使用画廊全部照片 */
const collageEditorPhotos = ref([])
const collageEditorColors = ref([])
const collageEditorCards = ref([])
/** 从「结束步行」跳转时预勾选全部路线照片；从画廊「创作拼贴」进入则让用户自选 */
const collagePreselectAll = ref(false)
const showCollage = ref(false)

const COLLAGE_TEMPLATE_LABELS = {
  G: '色块单图',
  H: '横排双图',
  A: '色块侧栏',
  B: '色条横排',
  C: '九宫格',
  D: '分栏布局',
  E: '瀑布流', // 旧版式，仅用于历史拼贴展示
  F: '色带双图',
}

const sortedCards = computed(() => {
  const seen = new Set()
  return [...galleryStore.cards]
    .filter((c) => {
      if (!c?.id || seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

async function openCard(card) {
  revokeCardMediaUrls()
  detailCard.value = card
  if (card.sourcePhotoId) {
    const photo = await getItem('photo', card.sourcePhotoId)
    if (photo?.thumbnail) cardPhotoUrl.value = photo.thumbnail
    else if (photo?.blob) cardPhotoUrl.value = URL.createObjectURL(photo.blob)
  }
}

function revokeCardMediaUrls() {
  if (cardPhotoUrl.value?.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(cardPhotoUrl.value)
    } catch {
      /* ignore */
    }
  }
  cardPhotoUrl.value = ''
}

async function openWalk(walk) {
  const cards = []
  for (const id of walk.cardIds || []) {
    const x = galleryStore.cards.find((c) => c.id === id)
    if (x) cards.push(x)
  }
  const photos = []
  for (const id of walk.photoIds || []) {
    const p = await getItem('photo', id)
    if (p) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }
  detailWalk.value = { ...walk, cards, photos }
}

function goNewWalk() {
  startNewWalk?.()
}

async function deleteCard(id) {
  if (!confirm('确定删除这张色卡？')) return
  await galleryStore.removeCard(id)
  closeDetailCard()
}

async function deleteCardById(id) {
  if (!confirm('确定删除这张色卡？')) return
  await galleryStore.removeCard(id)
  if (detailCard.value?.id === id) closeDetailCard()
}

async function deleteWalkRoute(walk) {
  if (!confirm('确定删除这条路线及其色卡、照片？')) return
  await galleryStore.removeWalkCascade(walk)
  if (detailWalk.value?.id === walk.id) detailWalk.value = null
  await mapStore.hydrate()
  await photoStore.hydrate()
}

async function rebuildDetailWalk(walkBase) {
  const cards = []
  for (const id of walkBase.cardIds || []) {
    const c = galleryStore.cards.find((x) => x.id === id)
    if (c) cards.push(c)
  }
  const photos = []
  for (const id of walkBase.photoIds || []) {
    const p = await getItem('photo', id)
    if (p) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }
  return { ...walkBase, cards, photos }
}

async function onWalkDetailDeletePhoto(photoId) {
  if (!detailWalk.value?.id || detailWalk.value.isDemo) return
  const w = galleryStore.walks.find((x) => x.id === detailWalk.value.id) || detailWalk.value
  const updated = await galleryStore.removePhotoFromWalk(w, photoId)
  detailWalk.value = await rebuildDetailWalk(updated)
  await mapStore.refreshWalks()
}

async function deleteDetailWalk() {
  if (!detailWalk.value?.id) return
  if (!confirm('确定删除整条路线及其色卡、照片？')) return
  const w = detailWalk.value
  await galleryStore.removeWalkCascade(w)
  detailWalk.value = null
  await mapStore.hydrate()
  await photoStore.hydrate()
}

async function deleteCollageItem(id) {
  if (!confirm('确定删除这张拼贴？')) return
  await galleryStore.removeCollage(id)
  await photoStore.hydrate()
}

function closeDetailCard() {
  revokeCardMediaUrls()
  detailCard.value = null
}

function formatWalkDate(ts) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

function collageTemplateLabel(collage) {
  return COLLAGE_TEMPLATE_LABELS[collage?.templateId] || collage?.templateId || '拼贴'
}

function openCollageDetail(collage) {
  detailCollage.value = collage
}

function closeDetailCollage() {
  detailCollage.value = null
}

async function deleteDetailCollage() {
  if (!detailCollage.value?.id) return
  if (!confirm('确定删除这张拼贴？')) return
  const id = detailCollage.value.id
  closeDetailCollage()
  await galleryStore.removeCollage(id)
  await photoStore.hydrate()
}

function collageUrl(collage) {
  if (!collage._url && collage.imageBlob) {
    collage._url = URL.createObjectURL(collage.imageBlob)
  }
  return collage._url
}

function colorsFromWalk(walk, cards) {
  if (walk.targetColors?.length) {
    return walk.targetColors.map((c) =>
      typeof c === 'string' ? { hex: c, name: c } : { hex: c.hex, name: c.name || c.hex }
    )
  }
  return cards.slice(0, 12).map((c) => ({ hex: c.hex, name: c.name || c.hex }))
}

/** 从路由进入：成果页「制作拼贴」跳转 */
async function openCollageFromQuery() {
  if (route.query.openCollage !== '1' || !route.query.walkId) return

  const walkId = String(route.query.walkId)
  await galleryStore.hydrate()
  await photoStore.hydrate()

  const walk = galleryStore.getWalk(walkId)
  if (!walk) {
    await router.replace({ path: '/gallery', query: {} })
    return
  }

  const photos = []
  for (const id of walk.photoIds || []) {
    const p = await getItem('photo', id)
    if (p) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }

  const cards = []
  for (const id of walk.cardIds || []) {
    const c = galleryStore.cards.find((x) => x.id === id)
    if (c) cards.push(c)
  }

  collageEditorPhotos.value = photos
  collageEditorColors.value = colorsFromWalk(walk, cards)
  collageEditorCards.value = cards
  collagePreselectAll.value = true
  tab.value = 'collages'
  showCollage.value = true
  await router.replace({ path: '/gallery', query: {} })
}

watch(
  () => ({ o: route.query.openCollage, w: route.query.walkId }),
  () => {
    openCollageFromQuery()
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    await Promise.all([galleryStore.hydrate(), photoStore.hydrate()])
  } catch (e) {
    console.warn('画廊数据加载失败', e)
  }

  if (typeof window === 'undefined') return
  mql = window.matchMedia('(min-width: 1024px) and (orientation: landscape)')

  const sync = () => {
    isLandscape.value = !!mql?.matches
  }

  sync()

  if (mql?.addEventListener) {
    mql.addEventListener('change', sync)
    removeLandscapeListener = () => mql?.removeEventListener?.('change', sync)
  } else if (mql?.addListener) {
    mql.addListener(sync)
    removeLandscapeListener = () => mql?.removeListener?.(sync)
  }
})

onUnmounted(() => {
  removeLandscapeListener()
})

/** 仅使用「色卡」中关联了照片的记录（sourcePhotoId），作为拼贴候选图库 */
async function openCollageLibrary() {
  await galleryStore.hydrate()
  await photoStore.hydrate()
  const cards = [...galleryStore.cards]
  const photoIds = new Set()
  for (const c of cards) {
    if (c.sourcePhotoId) photoIds.add(c.sourcePhotoId)
  }
  const photos = []
  for (const id of photoIds) {
    const p = await getItem('photo', id)
    if (p?.id) photos.push({ ...p, thumbnail: p.thumbnail || '' })
  }
  collageEditorPhotos.value = photos
  collageEditorCards.value = cards.filter((c) => c.sourcePhotoId && photoIds.has(c.sourcePhotoId))
  collageEditorColors.value = []
  collagePreselectAll.value = false
  tab.value = 'collages'
  showCollage.value = true
}

async function onCollageSaved() {
  showCollage.value = false
  collagePreselectAll.value = false
  collageEditorPhotos.value = []
  collageEditorColors.value = []
  collageEditorCards.value = []
  tab.value = 'collages'
  await galleryStore.hydrate()
}

function onCollageClose() {
  showCollage.value = false
  collagePreselectAll.value = false
  collageEditorPhotos.value = []
  collageEditorColors.value = []
  collageEditorCards.value = []
}
</script>

<template>
  <div class="page gallery">
    <header class="gallery-header">
      <button type="button" class="back-btn" @click="router.push('/')">
        <ArrowLeft :size="20" :stroke-width="1.5" />
        返回地图
      </button>
      <h1>画廊</h1>
      <div class="collage-link-placeholder" aria-hidden="true" />
    </header>

    <div class="tabs tabs-underline ios-segmented">
      <button type="button" :class="{ active: tab === 'cards' }" @click="tab = 'cards'">色卡</button>
      <button type="button" :class="{ active: tab === 'routes' }" @click="tab = 'routes'">路线</button>
      <button type="button" :class="{ active: tab === 'collages' }" @click="tab = 'collages'">拼贴</button>
    </div>

    <div
      v-if="isLandscape"
      class="gallery-landscape"
      :class="{ 'gallery-landscape--single': !detailCard && !detailWalk }"
    >
      <div class="land-col land-col--left">
        <!-- 色卡：卡片网格 -->
        <template v-if="tab === 'cards'">
          <p v-if="galleryStore.cards.length" class="cards-stat">
            已收集 {{ galleryStore.cards.length }} 张 · 色相覆盖 {{ galleryStore.hueCoverage }} / 12
          </p>
          <div v-if="sortedCards.length" class="card-grid">
            <div v-for="card in sortedCards" :key="card.id" class="color-card-tile-wrap stagger-in">
              <button type="button" class="color-card-tile" @click="openCard(card)">
                <span class="tile-swatch" :style="{ background: card.hex }" />
                <span class="tile-name">{{ card.name }}</span>
                <span class="tile-hex">{{ card.hex }}</span>
              </button>
              <button
                type="button"
                class="float-del"
                aria-label="删除色卡"
                @click.stop="deleteCardById(card.id)"
              >
                <Trash2 :size="14" :stroke-width="2" />
              </button>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>开始一次漫步，采集你的第一张色卡</p>
            <button type="button" class="btn-primary" @click="goNewWalk">+ 新建漫步</button>
          </div>
        </template>

        <!-- 路线 -->
        <template v-else-if="tab === 'routes'">
          <div v-if="galleryStore.walks.length" class="route-list">
            <div v-for="walk in galleryStore.walks" :key="walk.id" class="route-row stagger-in">
              <div class="route-card-wrap">
                <article class="route-card card" @click="openWalk(walk)">
                  <GradientBar
                    class="route-bar"
                    vertical
                    :trail-points="walk.trailPoints"
                    :color-nodes="walk.colorNodes"
                    :fallback-colors="(walk.targetColors || []).map((c) => c.hex)"
                    height="8px"
                  />
                  <div class="route-info">
                    <p class="route-date">{{ formatWalkDate(walk.startedAt) }}</p>
                    <p class="route-meta">
                      {{ walk.stats?.durationLabel }} · {{ walk.stats?.distanceLabel }} ·
                      {{ walk.stats?.colorCount ?? walk.cardIds?.length ?? 0 }} 色
                    </p>
                  </div>
                </article>
                <button
                  type="button"
                  class="float-del"
                  aria-label="删除路线"
                  @click.stop="deleteWalkRoute(walk)"
                >
                  <Trash2 :size="14" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>完成一次色彩漫步后，路线会出现在这里</p>
            <button type="button" class="btn-primary" @click="goNewWalk">+ 新建漫步</button>
          </div>
        </template>

        <!-- 拼贴 -->
        <template v-else>
          <div class="collage-tab-head">
            <button type="button" class="btn-create" @click="openCollageLibrary">+ 创作拼贴</button>
          </div>
          <div v-if="galleryStore.collages.length" class="collage-grid">
            <div v-for="c in galleryStore.collages" :key="c.id" class="collage-grid-item-wrap">
              <button type="button" class="collage-grid-item" @click="openCollageDetail(c)">
                <img :src="collageUrl(c)" alt="拼贴" />
              </button>
              <button
                type="button"
                class="float-del collage-float-del"
                aria-label="删除拼贴"
                @click.stop="deleteCollageItem(c.id)"
              >
                <Trash2 :size="14" :stroke-width="2" />
              </button>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>还没有拼贴作品</p>
            <p class="empty-sub">从色卡关联的照片中选择并制作拼贴</p>
          </div>
        </template>
      </div>

      <div v-if="detailCard || detailWalk" class="land-col land-col--middle">
        <!-- 色卡详情 -->
        <div v-if="detailCard" class="detail-card-inline card">
          <button type="button" class="float-panel-del" aria-label="删除色卡" @click="deleteCard(detailCard.id)">
            <Trash2 :size="15" :stroke-width="2" />
          </button>
          <div class="detail-swatch" :style="{ background: detailCard.hex }" />
          <h3>{{ detailCard.name }}</h3>
          <p>{{ detailCard.hex }}</p>
          <p v-if="detailCard.hsl" class="muted">
            HSL {{ Math.round(detailCard.hsl[0]) }}° {{ Math.round(detailCard.hsl[1]) }}% {{ Math.round(detailCard.hsl[2]) }}%
          </p>
          <img v-if="cardPhotoUrl" :src="cardPhotoUrl" class="detail-photo" alt="采色照片" />
          <p v-else class="muted no-photo">暂无关联照片（若采色时未拍照则不会显示）</p>
          <button type="button" class="btn-outline btn-inline-close" @click="closeDetailCard">关闭</button>
        </div>

        <!-- 路线详情 -->
        <div v-else-if="detailWalk" class="walk-detail-inline card">
          <button type="button" class="float-panel-del" aria-label="删除整条路线" @click="deleteDetailWalk">
            <Trash2 :size="15" :stroke-width="2" />
          </button>
          <button type="button" class="btn-close btn-inline-close" @click="detailWalk = null">关闭</button>
          <WalkResult :walk="detailWalk" embedded readonly @delete-photo="onWalkDetailDeletePhoto" />
        </div>
      </div>

      <CollageEditor
        v-if="showCollage"
        :photos="collageEditorPhotos"
        :colors="collageEditorColors"
        :cards="collageEditorCards"
        :preselect-all="collagePreselectAll"
        @saved="onCollageSaved"
        @close="onCollageClose"
      />
    </div>

    <template v-else>
      <!-- 色卡：卡片网格 -->
      <template v-if="tab === 'cards'">
        <p v-if="galleryStore.cards.length" class="cards-stat">
          已收集 {{ galleryStore.cards.length }} 张 · 色相覆盖 {{ galleryStore.hueCoverage }} / 12
        </p>
        <div v-if="sortedCards.length" class="card-grid">
          <div v-for="card in sortedCards" :key="card.id" class="color-card-tile-wrap stagger-in">
            <button type="button" class="color-card-tile" @click="openCard(card)">
              <span class="tile-swatch" :style="{ background: card.hex }" />
              <span class="tile-name">{{ card.name }}</span>
              <span class="tile-hex">{{ card.hex }}</span>
            </button>
            <button
              type="button"
              class="float-del"
              aria-label="删除色卡"
              @click.stop="deleteCardById(card.id)"
            >
              <Trash2 :size="14" :stroke-width="2" />
            </button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>开始一次漫步，采集你的第一张色卡</p>
          <button type="button" class="btn-primary" @click="goNewWalk">+ 新建漫步</button>
        </div>
      </template>

      <!-- 路线 -->
      <template v-else-if="tab === 'routes'">
        <div v-if="galleryStore.walks.length" class="route-list">
          <div v-for="walk in galleryStore.walks" :key="walk.id" class="route-row stagger-in">
            <div class="route-card-wrap">
              <article class="route-card card" @click="openWalk(walk)">
                <GradientBar
                  class="route-bar"
                  vertical
                  :trail-points="walk.trailPoints"
                  :color-nodes="walk.colorNodes"
                  :fallback-colors="(walk.targetColors || []).map((c) => c.hex)"
                  height="8px"
                />
                <div class="route-info">
                  <p class="route-date">{{ formatWalkDate(walk.startedAt) }}</p>
                  <p class="route-meta">
                    {{ walk.stats?.durationLabel }} · {{ walk.stats?.distanceLabel }} ·
                    {{ walk.stats?.colorCount ?? walk.cardIds?.length ?? 0 }} 色
                  </p>
                </div>
              </article>
              <button
                type="button"
                class="float-del"
                aria-label="删除路线"
                @click.stop="deleteWalkRoute(walk)"
              >
                <Trash2 :size="14" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>完成一次色彩漫步后，路线会出现在这里</p>
          <button type="button" class="btn-primary" @click="goNewWalk">+ 新建漫步</button>
        </div>
      </template>

      <!-- 拼贴 -->
      <template v-else>
        <div class="collage-tab-head">
          <button type="button" class="btn-create" @click="openCollageLibrary">+ 创作拼贴</button>
        </div>
        <div v-if="galleryStore.collages.length" class="collage-grid">
          <div v-for="c in galleryStore.collages" :key="c.id" class="collage-grid-item-wrap">
            <button type="button" class="collage-grid-item" @click="openCollageDetail(c)">
              <img :src="collageUrl(c)" alt="拼贴" />
            </button>
            <button
              type="button"
              class="float-del collage-float-del"
              aria-label="删除拼贴"
              @click.stop="deleteCollageItem(c.id)"
            >
              <Trash2 :size="14" :stroke-width="2" />
            </button>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>还没有拼贴作品</p>
          <p class="empty-sub">从色卡关联的照片中选择并制作拼贴</p>
        </div>
      </template>

    <!-- 色卡详情 -->
    <div v-if="detailCard" class="detail-overlay" @click.self="closeDetailCard">
      <div class="detail-card card detail-card-inner" @click.stop>
        <button type="button" class="float-panel-del" aria-label="删除色卡" @click="deleteCard(detailCard.id)">
          <Trash2 :size="15" :stroke-width="2" />
        </button>
        <div class="detail-swatch" :style="{ background: detailCard.hex }" />
        <h3>{{ detailCard.name }}</h3>
        <p>{{ detailCard.hex }}</p>
        <p v-if="detailCard.hsl" class="muted">
          HSL {{ Math.round(detailCard.hsl[0]) }}°
          {{ Math.round(detailCard.hsl[1]) }}%
          {{ Math.round(detailCard.hsl[2]) }}%
        </p>
        <img v-if="cardPhotoUrl" :src="cardPhotoUrl" class="detail-photo" alt="采色照片" />
        <p v-else class="muted no-photo">暂无关联照片（若采色时未拍照则不会显示）</p>
      </div>
    </div>

    <!-- 路线详情 -->
    <div v-if="detailWalk" class="detail-overlay walk-overlay" @click.self="detailWalk = null">
      <div class="walk-detail-scroll walk-detail-inner" @click.stop>
        <button type="button" class="float-panel-del" aria-label="删除整条路线" @click="deleteDetailWalk">
          <Trash2 :size="15" :stroke-width="2" />
        </button>
        <WalkResult :walk="detailWalk" embedded readonly @delete-photo="onWalkDetailDeletePhoto" />
        <button type="button" class="btn-close" @click="detailWalk = null">关闭</button>
      </div>
    </div>

    <CollageEditor
      v-if="showCollage"
      :photos="collageEditorPhotos"
      :colors="collageEditorColors"
      :cards="collageEditorCards"
      :preselect-all="collagePreselectAll"
      @saved="onCollageSaved"
      @close="onCollageClose"
    />
  </template>

  <!-- 拼贴详情（横竖屏共用） -->
  <div v-if="detailCollage" class="detail-overlay collage-detail-overlay" @click.self="closeDetailCollage">
    <div class="collage-detail card" @click.stop>
      <button type="button" class="float-panel-del" aria-label="删除拼贴" @click="deleteDetailCollage">
        <Trash2 :size="15" :stroke-width="2" />
      </button>
      <img
        v-if="collageUrl(detailCollage)"
        :src="collageUrl(detailCollage)"
        class="collage-detail-img"
        alt="拼贴"
      />
      <p class="collage-detail-meta">
        {{ collageTemplateLabel(detailCollage) }} · {{ formatWalkDate(detailCollage.createdAt) }}
      </p>
      <button type="button" class="btn-outline btn-inline-close" @click="closeDetailCollage">关闭</button>
    </div>
  </div>
</div>
</template>

<style scoped>
.gallery {
  padding-bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px));
  background: var(--bg-app);
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: calc(-1 * var(--page-padding));
  margin-bottom: 20px;
  padding: calc(8px + env(safe-area-inset-top, 0px)) var(--page-padding) 12px;
  background: var(--bg-app);
  border-bottom: none;
}

.gallery-header h1 {
  font-family: var(--font-display);
  font-size: var(--font-title-3);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-tight);
  flex: 1;
  text-align: center;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--font-body);
  color: var(--brand-primary);
  flex-shrink: 0;
  min-width: 44px;
}

.collage-link {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  background: var(--brand-ink);
  color: var(--brand-label);
  font-size: var(--font-footnote);
  font-weight: var(--font-weight-semibold);
  box-shadow: none;
}

.collage-link:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.collage-link-placeholder {
  flex-shrink: 0;
  width: 76px;
  height: 36px;
}

.tabs {
  margin-bottom: 24px;
}

.cards-stat {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 1024px) and (orientation: landscape) {
  /* 横屏全宽：色卡多列网格 */
  .gallery-landscape--single .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 12px;
  }

  /* 横屏全宽：拼贴网格多列 */
  .gallery-landscape--single .collage-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .gallery-landscape--single .route-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
}

.color-card-tile-wrap {
  position: relative;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: none;
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .color-card-tile-wrap:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }

  .color-card-tile-wrap:hover .float-del {
    opacity: 1;
  }
}

.color-card-tile-wrap:active {
  transform: scale(0.97);
}

.color-card-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  padding: 0;
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
}

.float-del {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent-coral);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: opacity var(--duration-fast) var(--ease-material);
}

@media (hover: hover) {
  .float-del {
    opacity: 0;
  }

  .collage-grid-item-wrap:hover .float-del,
  .route-card-wrap:hover .float-del {
    opacity: 1;
  }
}

.float-del:active {
  transform: scale(0.92);
}

.collage-float-del {
  top: 8px;
  right: 8px;
}

.tile-swatch {
  height: 72px;
  width: 100%;
}

.tile-name {
  padding: 8px 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.tile-hex {
  padding: 2px 10px 10px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: var(--text-muted);
}

.route-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.route-row {
  display: block;
}

.route-card-wrap {
  position: relative;
  border-radius: var(--radius-card);
  border: 1px solid var(--border);
  box-shadow: none;
  background: var(--bg-surface);
  overflow: hidden;
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .route-card-wrap:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}

.route-card-wrap:active {
  transform: scale(0.97);
}

.route-card {
  display: flex;
  gap: 16px;
  padding: 14px 16px;
  cursor: pointer;
}

.route-card-wrap .float-del {
  top: 10px;
  right: 10px;
}
.route-bar {
  width: 12px;
  flex-shrink: 0;
}
.route-date {
  font-weight: 600;
  font-size: 14px;
}
.route-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.collage-tab-head {
  margin-bottom: 16px;
}

.btn-create {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 52px;
  padding: 14px;
  border-radius: var(--radius-button);
  font-size: var(--font-headline);
  font-weight: var(--font-weight-semibold);
  background: var(--brand-ink);
  color: var(--brand-label);
  box-shadow: none;
  transition: transform var(--transition-bounce);
}

.btn-create:active {
  transform: scale(0.97);
}

.collage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.collage-grid-item-wrap {
  position: relative;
}

.collage-grid-item {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

@media (hover: hover) {
  .collage-grid-item-wrap:hover .collage-grid-item {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}

.collage-grid-item img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  display: block;
  pointer-events: none;
}

.collage-detail-overlay {
  z-index: 160;
}

.collage-detail {
  position: relative;
  width: 100%;
  max-width: min(420px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  padding: 16px;
}

.collage-detail-img {
  width: 100%;
  display: block;
  border-radius: var(--radius-lg);
}

.collage-detail-meta {
  margin: 12px 0 0;
  font-size: var(--font-footnote);
  color: var(--text-secondary);
  text-align: center;
}

.collage-detail .btn-inline-close {
  width: 100%;
  margin-top: 14px;
}
.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-muted);
}
.empty-sub {
  font-size: 13px;
  margin-top: 8px;
  line-height: 1.5;
}
.empty-state .btn-primary {
  margin-top: 16px;
  width: auto;
  padding-inline: 28px;
}
.detail-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-dim);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.detail-card {
  width: 100%;
  max-width: 320px;
  padding: 20px;
}

.detail-card-inner {
  position: relative;
}

.float-panel-del {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-app);
  color: var(--accent-coral);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.float-panel-del:active {
  transform: scale(0.94);
}
.detail-swatch {
  height: 120px;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}
.detail-photo {
  width: 100%;
  border-radius: var(--radius-lg);
  margin: 12px 0;
}
.no-photo {
  margin: 12px 0;
  line-height: 1.5;
}
.muted {
  font-size: 12px;
  color: var(--text-muted);
}
.walk-overlay {
  align-items: flex-end;
}
.walk-detail-scroll {
  width: 100%;
  max-width: var(--max-width);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  border-top: 1px solid var(--border);
  padding: var(--page-padding);
  box-shadow: var(--shadow-sheet);
}

.walk-detail-inner {
  position: relative;
  padding-top: 8px;
}

.walk-detail-inner .float-panel-del {
  top: 8px;
  right: 8px;
}
.btn-close {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  color: var(--brand-primary);
  font-weight: var(--font-weight-medium);
}

.gallery-landscape {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 0;
}

.land-col {
  min-width: 0;
}

.land-col--left,
.land-col--middle {
  overflow-y: auto;
  max-height: none;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

/* 横屏未选中详情时：左侧列表占满屏幕 */
.gallery-landscape--single {
  grid-template-columns: 1fr;
}

.detail-card-inline,
.walk-detail-inline {
  position: relative;
  padding: var(--page-padding);
}

.btn-inline-close {
  width: 100%;
  margin-top: 12px;
}

</style>

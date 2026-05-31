<script setup>
import { onMounted, ref, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PathNamingDialog from './components/PathNamingDialog.vue'
import { useWalkStore } from './stores/walkStore'
import { useGalleryStore } from './stores/galleryStore'
import { useMapStore } from './stores/mapStore'
import { usePhotoStore } from './stores/photoStore'
import { migrateLegacyData } from './utils/migrate'
import { seedGalleryMapPhotos } from './utils/seedGalleryMapPhotos.js'
import { defaultPathName } from './utils/pathName.js'

const route = useRoute()
const router = useRouter()
const walkStore = useWalkStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const photoStore = usePhotoStore()

const showNaming = ref(false)
const startError = ref('')
const startWarning = ref('')

async function beginNewWalk(pathName, options = {}) {
  startError.value = ''
  startWarning.value = ''
  const result = await walkStore.startWalk(pathName, options)
  if (!result.ok) {
    startError.value = result.message
    return false
  }
  if (result.locationWarning) startWarning.value = result.locationWarning
  if (route.path !== '/') await router.push('/')
  return true
}

function openNewWalkDialog() {
  if (walkStore.phase === 'walking') return
  walkStore.newWalk()
  walkStore.requestColorSelect()
  if (route.path !== '/') router.push('/')
}

async function onNamingConfirm(name) {
  showNaming.value = false
  await beginNewWalk(name)
}

async function onNamingSkipGps(name) {
  showNaming.value = false
  await beginNewWalk(name, { skipGps: true })
}

provide('startNewWalk', openNewWalkDialog)

onMounted(async () => {
  try {
    await Promise.all([photoStore.hydrate(), mapStore.hydrate(), galleryStore.hydrate()])
    await migrateLegacyData()
    try {
      await seedGalleryMapPhotos()
    } catch (e) {
      console.warn('画廊种子同步失败', e)
    }
    await photoStore.hydrate()
    await mapStore.refreshWalks()
    await galleryStore.hydrate()
    const restored = await walkStore.restoreDraft()
    if (restored && route.path !== '/') {
      await router.push('/')
    }
  } catch (e) {
    console.error('加载本地数据失败', e)
  }
})

function isLightAccent(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return false
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 168
}

watch(
  () => walkStore.accentHex,
  (hex) => {
    document.documentElement.style.setProperty('--walk-accent', hex)
    document.documentElement.style.setProperty('--walk-accent-label', isLightAccent(hex) ? '#000000' : '#ffffff')
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <!-- 不用 out-in：异步路由加载时 Component 为空会导致整页透明（iPad 上常见白屏） -->
      <component v-if="Component" :is="Component" :key="route.path" />
      <p v-else class="route-loading" role="status">加载页面…</p>
    </router-view>

    <div v-if="walkStore.locating" class="locating-overlay" aria-live="polite">
      正在尝试定位（约 6 秒）…
    </div>
    <p v-if="startError" class="start-error">{{ startError }}</p>
    <p v-if="startWarning" class="start-warning">{{ startWarning }}</p>

    <PathNamingDialog
      :show="showNaming"
      :default-name="defaultPathName()"
      @close="showNaming = false"
      @confirm="onNamingConfirm"
      @skip-gps="onNamingSkipGps"
    />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  max-width: var(--max-width);
  margin: 0 auto;
  position: relative;
  background: var(--bg-app);
}

@media (min-width: 1024px) and (orientation: landscape) {
  .app-shell {
    max-width: none;
  }
}
.start-error,
.start-warning {
  position: fixed;
  bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px) + 12px);
  left: var(--page-padding);
  right: var(--page-padding);
  max-width: calc(var(--max-width) - var(--page-padding) * 2);
  margin: 0 auto;
  padding: 12px 16px;
  font-size: var(--font-footnote);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-lg);
  z-index: 90;
  text-align: center;
  line-height: 1.45;
  box-shadow: none;
}
.start-error {
  background: var(--bg-surface);
  color: var(--system-red);
  border: 1px solid color-mix(in srgb, var(--system-red) 20%, transparent);
  box-shadow: none;
}
.locating-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-material);
  -webkit-backdrop-filter: var(--blur-material);
  font-size: var(--font-subhead);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}
.start-warning {
  background: var(--bg-surface);
  color: var(--brand-stone);
  border: 1px solid color-mix(in srgb, var(--brand-sage) 35%, transparent);
  box-shadow: none;
}
.route-loading {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: var(--font-subhead);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  text-align: center;
}
</style>

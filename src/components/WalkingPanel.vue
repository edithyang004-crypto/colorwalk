<script setup>
import { ref } from 'vue'
import { Image } from 'lucide-vue-next'
import TrailMap from './TrailMap.vue'
import CameraButton from './CameraButton.vue'
import ColorPickerSheet from './ColorPickerSheet.vue'
import { useWalkStore } from '../stores/walkStore'
import { formatDuration } from '../utils/gps'

const emit = defineEmits(['end'])

const walkStore = useWalkStore()
const cameraRef = ref(null)
const showSheet = ref(false)
const pendingFile = ref(null)
const previewUrl = ref('')
const showEndConfirm = ref(false)
const albumInput = ref(null)

function onCapture(file) {
  pendingFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  showSheet.value = true
}

function onAlbumClick() {
  albumInput.value?.click()
}

function onAlbumFile(e) {
  const file = e.target.files?.[0]
  if (file) onCapture(file)
  e.target.value = ''
}

async function onSheetConfirm({ hexes, file }) {
  showSheet.value = false
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  await walkStore.addPhotoWithColors(file, hexes, walkStore.currentPosition)
  pendingFile.value = null
}

function onSheetClose() {
  showSheet.value = false
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  pendingFile.value = null
}

function confirmEnd() {
  showEndConfirm.value = false
  emit('end')
}
</script>

<template>
  <div class="walking-panel">
    <header class="path-title material-bar">
      {{ walkStore.pathName || '今天的漫步' }}
    </header>

    <div class="map-area">
      <TrailMap
        :trail-points="walkStore.trailPoints"
        :color-nodes="walkStore.colorNodes"
        :current-position="walkStore.currentPosition"
        :follow="true"
        :interactive="true"
        height="100%"
      />
    </div>

    <div class="status-bar">
      已采集 {{ walkStore.collectedCount }} 色 ·
      {{ formatDuration(walkStore.elapsedSec) }}
    </div>

    <footer class="action-bar">
      <button type="button" class="btn-outline" @click="showEndConfirm = true">结束</button>
      <CameraButton ref="cameraRef" @capture="onCapture" />
      <button type="button" class="btn-outline icon-btn" aria-label="相册" @click="onAlbumClick">
        <Image :size="20" :stroke-width="1.5" />
      </button>
      <input ref="albumInput" type="file" accept="image/*" class="hidden" @change="onAlbumFile" />
    </footer>

    <ColorPickerSheet
      :show="showSheet"
      :file="pendingFile"
      :preview-url="previewUrl"
      @close="onSheetClose"
      @confirm="onSheetConfirm"
    />

    <Teleport to="body">
      <div v-if="showEndConfirm" class="end-dialog-overlay" @click.self="showEndConfirm = false">
        <div class="end-dialog ios-alert" role="dialog" aria-modal="true">
          <p class="ios-alert-title">结束本次漫步？</p>
          <div class="end-dialog-actions">
            <button type="button" class="btn-outline" @click="showEndConfirm = false">取消</button>
            <button type="button" class="btn-primary" @click="confirmEnd">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.walking-panel {
  position: fixed;
  inset: 0;
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  z-index: 50;
}
.path-title {
  flex-shrink: 0;
  z-index: 2;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--divider);
  font-family: var(--font-display);
}
.map-area {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 0;
}
.status-bar {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: var(--font-footnote);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  background: var(--bg-surface);
  border-top: 1px solid var(--divider);
}

.status-bar::before {
  content: '🎨';
  font-size: 14px;
}

.action-bar {
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px 24px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  gap: 12px;
  box-shadow: var(--shadow-sheet);
}
.btn-outline {
  min-height: 42px;
  padding: 9px 18px;
  font-size: var(--font-subhead);
}
.icon-btn {
  padding: 9px 14px;
  color: var(--walk-accent, var(--brand-primary));
}
.hidden {
  display: none;
}
.end-dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.end-dialog-actions .btn-primary,
.end-dialog-actions .btn-outline {
  flex: 1;
  min-height: 44px;
  padding: 10px;
}
</style>

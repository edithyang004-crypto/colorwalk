<script setup>
import { ref } from 'vue'
import ColorWheel from '../components/ColorWheel.vue'
import WalkingPanel from '../components/WalkingPanel.vue'
import WalkResult from '../components/WalkResult.vue'
import { useWalkStore } from '../stores/walkStore'
import { useGalleryStore } from '../stores/galleryStore'
import { useMapStore } from '../stores/mapStore'

const walkStore = useWalkStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()

const gpsError = ref('')
const gpsWarning = ref('')
const saveHint = ref('')

async function onStart() {
  gpsError.value = ''
  gpsWarning.value = ''
  const result = await walkStore.startWalk()
  if (!result.ok) gpsError.value = result.message
  else if (result.locationWarning) gpsWarning.value = result.locationWarning
}

async function onEndWalk() {
  await walkStore.endWalk()
}

async function onSaveGallery() {
  saveHint.value = ''
  const result = await walkStore.saveWalkToGallery()
  if (!result.ok) {
    saveHint.value = result.message || '保存失败，请重试'
    return
  }
  try {
    await galleryStore.hydrate()
    await mapStore.refreshWalks()
  } catch (e) {
    console.error('刷新画廊列表失败', e)
  }
  saveHint.value =
    result.message ||
    (result.already ? '已在画廊中' : '已保存色卡与路线，可在底部「画廊」查看')
}

function onNewWalk() {
  saveHint.value = ''
  walkStore.newWalk()
}
</script>

<template>
  <div class="page watch">
    <!-- idle: 转盘选色 -->
    <section v-if="walkStore.phase === 'idle'" class="idle">
      <h2 class="wheel-headline">
        转动转盘，抽取你的
        <span class="wheel-headline-accent">今日寻色</span>
      </h2>

      <div class="wheel-area">
        <ColorWheel
          :rotation="walkStore.wheelRotation"
          :spinning="walkStore.isSpinning"
          :disabled="walkStore.locating"
          @spin="walkStore.spinToRandom"
        />
      </div>

      <div v-if="walkStore.selectedColor" class="color-preview">
        <span class="color-preview-label">指针选中</span>
        <span class="color-preview-chip">
          <i :style="{ background: walkStore.selectedColor.hex }" />
          {{ walkStore.selectedColor.name }}
        </span>
      </div>

      <button
        type="button"
        class="btn-start"
        :disabled="walkStore.locating"
        @click="onStart"
      >
        {{ walkStore.locating ? '定位中…' : '开始漫步' }}
      </button>

      <p v-if="gpsError" class="gps-error">
        {{ gpsError }}
        <button type="button" class="retry" @click="onStart">重试</button>
      </p>
      <p v-if="gpsWarning" class="gps-warning">{{ gpsWarning }}</p>
    </section>

    <!-- walking -->
    <WalkingPanel v-else-if="walkStore.phase === 'walking'" @end="onEndWalk" />

    <!-- result -->
    <WalkResult
      v-else-if="walkStore.phase === 'result'"
      :walk="walkStore.currentWalk"
      :saved="walkStore.savedToGallery"
      :saving="walkStore.savingGallery"
      :save-hint="saveHint"
      @save="onSaveGallery"
      @new-walk="onNewWalk"
      @delete-photo="walkStore.removeSessionPhoto"
    />
  </div>
</template>

<style scoped>
.watch {
  min-height: 100vh;
}
.watch:has(.idle),
.watch:has(.walk-result) {
  padding: var(--page-padding);
  padding-bottom: var(--safe-bottom);
}
.idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - var(--nav-height) - var(--safe-bottom));
  background: var(--bg-app);
  color: var(--text-primary);
  margin: calc(-1 * var(--page-padding));
  padding: var(--page-padding);
  padding-bottom: var(--safe-bottom);
}
.wheel-headline {
  margin: 0 0 16px;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.3;
}
.wheel-headline-accent {
  color: var(--brand-ink);
}
.wheel-area {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.color-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  width: 100%;
  max-width: 340px;
  padding: 18px 22px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: none;
}
.color-preview-label {
  font-size: var(--font-footnote);
  color: var(--text-secondary);
}
.color-preview-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-headline);
  font-weight: 700;
  color: var(--text-primary);
}
.color-preview-chip i {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.btn-start {
  width: 100%;
  max-width: 340px;
  min-height: 52px;
  border: none;
  border-radius: var(--radius-button);
  background: var(--brand-ink);
  color: var(--brand-label);
  font-weight: 600;
  box-shadow: none;
}
.gps-error {
  margin-top: 16px;
  font-size: var(--font-footnote);
  color: var(--system-red);
  text-align: center;
}
.gps-warning {
  margin-top: 16px;
  font-size: var(--font-footnote);
  color: #8a6d00;
  text-align: center;
  line-height: 1.5;
}
.retry {
  display: block;
  margin: 8px auto 0;
  color: var(--system-blue);
  font-weight: var(--font-weight-medium);
}
</style>

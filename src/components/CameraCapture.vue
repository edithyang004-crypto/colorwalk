<script setup>
import { ref } from 'vue'
import { Camera, ImagePlus } from 'lucide-vue-next'

const emit = defineEmits(['capture', 'capture-batch'])
const fileInput = ref(null)
const galleryInput = ref(null)
const busy = ref(false)

defineProps({
  disabled: { type: Boolean, default: false },
})

async function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'))
  if (!files.length) return

  busy.value = true
  try {
    if (files.length === 1) {
      emit('capture', files[0])
    } else {
      emit('capture-batch', files)
    }
  } finally {
    busy.value = false
    if (fileInput.value) fileInput.value.value = ''
    if (galleryInput.value) galleryInput.value.value = ''
  }
}

function onCameraChange(e) {
  handleFiles(e.target.files)
}

function onGalleryChange(e) {
  handleFiles(e.target.files)
}
</script>

<template>
  <div class="capture-bar">
    <input
      ref="galleryInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onGalleryChange"
    />
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onCameraChange"
    />

    <button
      type="button"
      class="side-btn"
      :disabled="busy || disabled"
      aria-label="从相册选择多张"
      @click="galleryInput?.click()"
    >
      <ImagePlus :size="22" :stroke-width="1.5" />
    </button>

    <button
      type="button"
      class="shutter"
      :disabled="busy || disabled"
      :style="{ borderColor: 'var(--walk-accent)' }"
      aria-label="拍照"
      @click="fileInput?.click()"
    >
      <Camera :size="28" :stroke-width="1.5" />
    </button>

    <div class="side-btn placeholder" />
  </div>
</template>

<style scoped>
.capture-bar {
  position: fixed;
  bottom: calc(var(--safe-bottom) + env(safe-area-inset-bottom, 0px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--max-width);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 0 24px;
  z-index: 50;
}

.hidden {
  display: none;
}

.shutter {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2.5px solid var(--walk-accent, var(--brand-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  transition: transform 150ms var(--ease-spring);
  color: var(--text-primary);
}

.shutter:active:not(:disabled) {
  transform: scale(0.96);
}

.shutter:disabled,
.side-btn:disabled {
  opacity: 0.4;
}

.side-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background 150ms ease;
}

.side-btn:hover {
  background: var(--bg-active);
}

.side-btn.placeholder {
  visibility: hidden;
}
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { extractColorsFromFile } from '../utils/colorExtract'
import { generatePoeticName } from '../utils/nameGenerator'

const props = defineProps({
  show: { type: Boolean, default: false },
  file: { type: Object, default: null },
  previewUrl: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const colors = ref([])
const selected = ref([])
const loading = ref(false)

const selectedPreviews = computed(() =>
  selected.value.map((hex) => ({ hex, name: generatePoeticName(hex) }))
)

watch(
  () => props.file,
  async (file) => {
    if (!file) return
    loading.value = true
    selected.value = []
    try {
      colors.value = await extractColorsFromFile(file)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

function toggle(hex) {
  const i = selected.value.indexOf(hex)
  if (i >= 0) selected.value = selected.value.filter((h) => h !== hex)
  else selected.value = [...selected.value, hex]
}

function confirm() {
  emit('confirm', { hexes: [...selected.value], file: props.file })
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="show" class="sheet-overlay" @click.self="close">
        <div class="sheet sheet-panel">
          <div class="handle ios-grabber" />
          <div v-if="previewUrl" class="preview-wrap">
            <img :src="previewUrl" alt="预览" class="preview" />
          </div>
          <p v-if="loading" class="loading">提取色彩中…</p>
          <template v-else>
            <p class="label">提取色彩：</p>
            <div class="swatches">
              <button
                v-for="hex in colors"
                :key="hex"
                type="button"
                class="swatch"
                :class="{ on: selected.includes(hex) }"
                :style="{ background: hex }"
                @click="toggle(hex)"
              >
                <span v-if="selected.includes(hex)" class="check">✓</span>
              </button>
            </div>
            <p class="hint">点击选择要保留的颜色</p>
            <div v-if="selectedPreviews.length" class="picked">
              <p class="label">已选中：</p>
              <div class="picked-row">
                <span v-for="p in selectedPreviews" :key="p.hex" class="chip">
                  <i :style="{ background: p.hex }" /> {{ p.name }}
                </span>
              </div>
            </div>
          </template>
          <button type="button" class="btn-primary btn-confirm" @click="confirm">确认</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay-dim);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: var(--max-width);
  max-height: 65vh;
  background: var(--bg-surface);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  padding: 8px var(--page-padding) calc(20px + env(safe-area-inset-bottom));
  overflow-y: auto;
  box-shadow: var(--shadow-sheet);
  border-top: 1px solid var(--border);
}
.handle {
  margin-bottom: 12px;
}
.preview-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.preview {
  max-width: 90%;
  max-height: 200px;
  border-radius: var(--radius-lg);
  object-fit: contain;
}
.label {
  font-size: var(--font-subhead);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 10px;
}
.swatches {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--separator-opaque);
  position: relative;
  transition:
    transform 150ms var(--ease-spring),
    width 150ms var(--ease-spring),
    height 150ms var(--ease-spring);
}
.swatch.on {
  width: 42px;
  height: 42px;
  border-color: #fff;
  box-shadow: 0 0 0 2.5px var(--walk-accent, var(--brand-primary));
}
.check {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--walk-accent, var(--brand-primary));
}
.hint {
  font-size: var(--font-footnote);
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 16px;
}
.picked {
  margin-bottom: 16px;
}
.picked-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  font-size: var(--font-caption-1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--fill-tertiary);
  border-radius: var(--radius-pill);
}
.chip i {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.btn-confirm {
  width: 100%;
  margin-top: 8px;
}
.loading {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--font-subhead);
  padding: 24px;
}
</style>

<script setup>
import { computed } from 'vue'

const TEMPLATE_PHOTOS_NEEDED = { G: 1, H: 2, A: 2, B: 3, C: 9, D: 3, F: 2 }

const templates = [
  { id: 'G', label: '色块单图', desc: '上半色块 · 下半大图' },
  { id: 'H', label: '横排双图', desc: '双图上下 · 纯色底' },
  { id: 'F', label: '色带双图', desc: '顶色带 + 双图并排' },
  { id: 'A', label: '色块侧栏', desc: '左色块 + 右双图' },
  { id: 'B', label: '色条横排', desc: '顶色条 + 三图' },
  { id: 'D', label: '分栏布局', desc: '左大图 + 右双图' },
  { id: 'C', label: '九宫格', desc: '九格照片 · 色块底' },
].sort((a, b) => TEMPLATE_PHOTOS_NEEDED[a.id] - TEMPLATE_PHOTOS_NEEDED[b.id])

const props = defineProps({
  modelValue: { type: String, default: 'G' },
  compact: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const activeTemplate = computed(() => templates.find((t) => t.id === props.modelValue) || templates[0])
</script>

<template>
  <div class="tpl-picker" :class="{ 'tpl-picker--compact': compact }">
    <div class="tpl-preview-large" aria-live="polite">
      <div class="wireframe lg" :class="`wire-${modelValue}`" aria-hidden="true">
        <span v-for="n in 9" :key="n" class="ph" />
        <span class="accent-block" />
        <span class="color-bar" />
      </div>
      <p class="tpl-preview-caption">
        {{ activeTemplate.label }} · {{ TEMPLATE_PHOTOS_NEEDED[modelValue] }} 张
        <span class="tpl-preview-desc">{{ activeTemplate.desc }}</span>
      </p>
    </div>

    <div class="templates-scroll" role="listbox" aria-label="拼贴版式">
      <button
        v-for="t in templates"
        :key="t.id"
        type="button"
        role="option"
        class="tpl"
        :class="{ active: modelValue === t.id }"
        :aria-selected="modelValue === t.id"
        :title="t.desc"
        @click="$emit('update:modelValue', t.id)"
      >
        <div class="wireframe sm" :class="`wire-${t.id}`" aria-hidden="true">
          <span v-for="n in 9" :key="n" class="ph" />
          <span class="accent-block" />
          <span class="color-bar" />
        </div>
        <span class="tpl-label">{{ t.label }}</span>
        <span class="tpl-count">{{ TEMPLATE_PHOTOS_NEEDED[t.id] }} 张</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tpl-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 拼贴编辑器内：大图 + 底部横滑，一屏内展示 */
.tpl-picker--compact {
  flex: 1;
  min-height: 0;
  gap: 8px;
}

.tpl-picker--compact .tpl-preview-large {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  overflow: hidden;
}

.tpl-picker--compact .wireframe.lg {
  flex: 1 1 auto;
  width: auto;
  max-width: min(168px, 44vw);
  max-height: min(34vh, 260px);
  min-height: 0;
  margin: 0 auto;
}

.tpl-picker--compact .tpl-preview-caption {
  flex-shrink: 0;
  margin-top: 6px;
  font-size: var(--font-footnote);
}

.tpl-picker--compact .tpl-preview-desc {
  display: inline;
  margin-top: 0;
  margin-left: 4px;
}

.tpl-picker--compact .templates-scroll {
  flex-shrink: 0;
}

.tpl-picker--compact .tpl {
  width: 80px;
  padding: 6px 6px 8px;
}

.tpl-picker--compact .tpl-label {
  margin-top: 4px;
  font-size: 10px;
}

.tpl-picker--compact .tpl-count {
  font-size: 9px;
}

.tpl-preview-large {
  border-radius: var(--radius-card);
  border: 1px solid var(--divider);
  background: var(--bg-secondary);
  padding: 12px;
}

.tpl-preview-caption {
  margin: 10px 0 0;
  font-size: var(--font-callout);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  text-align: center;
  line-height: 1.4;
}

.tpl-preview-desc {
  display: block;
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-regular);
  color: var(--text-muted);
  margin-top: 2px;
}

.templates-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 6px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.templates-scroll::-webkit-scrollbar {
  display: none;
}

.tpl {
  flex: 0 0 auto;
  width: 96px;
  scroll-snap-align: start;
  text-align: center;
  padding: 8px 8px 10px;
  border-radius: var(--radius-card);
  border: 1.5px solid var(--divider);
  background: var(--bg-primary);
  transition:
    border-color 150ms ease,
    background 150ms ease,
    transform 120ms ease;
}

.tpl:hover {
  background: var(--bg-secondary);
}

.tpl.active {
  border-color: var(--brand-ink);
  background: var(--bg-secondary);
  box-shadow: var(--shadow-xs);
}

.tpl:active {
  transform: scale(0.97);
}

.tpl-label {
  display: block;
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  line-height: 1.3;
  margin-top: 6px;
}

.tpl-count {
  display: inline-block;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  margin-top: 2px;
}

/* ── Wireframe base ── */
.wireframe {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  border-radius: 6px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--brand-sage) 35%, #fff);
  overflow: hidden;
}

.wireframe.sm {
  border-radius: 4px;
}

.wireframe .ph {
  position: absolute;
  background: color-mix(in srgb, var(--brand-sage) 22%, #fff);
  border-radius: 2px;
  display: none;
}

.wireframe .accent-block {
  position: absolute;
  background: color-mix(in srgb, var(--brand-ink) 18%, #fff);
  border-radius: 2px;
  display: none;
}

.wireframe .color-bar {
  position: absolute;
  background: color-mix(in srgb, var(--brand-ink) 28%, #fff);
  border-radius: 1px;
  display: none;
}

/* G: top color block + bottom photo */
.wire-G .accent-block {
  display: block;
  left: 6%;
  top: 6%;
  width: 88%;
  height: 42%;
}

.wire-G .ph:nth-child(1) {
  display: block;
  left: 6%;
  bottom: 6%;
  width: 88%;
  height: 42%;
}

/* A: left color + right 2 photos */
.wire-A .accent-block {
  display: block;
  left: 6%;
  top: 6%;
  width: 32%;
  height: 88%;
}

.wire-A .ph:nth-child(1) {
  display: block;
  right: 6%;
  top: 6%;
  width: 52%;
  height: 42%;
}

.wire-A .ph:nth-child(2) {
  display: block;
  right: 6%;
  bottom: 6%;
  width: 52%;
  height: 42%;
}

.wire-A .color-bar {
  display: block;
  left: 10%;
  bottom: 12%;
  width: 24%;
  height: 6%;
}

/* B: top bar + 3 photos */
.wire-B .color-bar {
  display: block;
  left: 6%;
  top: 6%;
  width: 88%;
  height: 10%;
}

.wire-B .ph:nth-child(1),
.wire-B .ph:nth-child(2),
.wire-B .ph:nth-child(3) {
  display: block;
  bottom: 6%;
  width: 27%;
  height: 72%;
}

.wire-B .ph:nth-child(1) { left: 6%; }
.wire-B .ph:nth-child(2) { left: 36.5%; }
.wire-B .ph:nth-child(3) { right: 6%; }

/* C: color background + full 3×3 portrait grid + bottom watermark strip */
.wire-C {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 5%;
  padding: 6%;
  padding-bottom: 14%;
  background: color-mix(in srgb, var(--brand-ink) 16%, #fff);
}

.wire-C::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 10%;
  background: #fff;
  border-top: 1px solid color-mix(in srgb, var(--brand-sage) 20%, #fff);
}

.wire-C .ph {
  position: relative;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  display: block;
  width: auto;
  height: auto;
  min-height: 0;
  border-radius: 8%;
}

/* D: big left + 2 small right */
.wire-D .ph:nth-child(1) {
  display: block;
  left: 6%;
  top: 6%;
  width: 52%;
  height: 88%;
}

.wire-D .ph:nth-child(2) {
  display: block;
  right: 6%;
  top: 6%;
  width: 32%;
  height: 42%;
}

.wire-D .ph:nth-child(3) {
  display: block;
  right: 6%;
  top: 52%;
  width: 32%;
  height: 42%;
}

/* H: two photos stacked vertically, no color bar */
.wire-H .ph:nth-child(1) {
  display: block;
  left: 6%;
  top: 6%;
  width: 88%;
  height: 42%;
}

.wire-H .ph:nth-child(2) {
  display: block;
  left: 6%;
  bottom: 6%;
  width: 88%;
  height: 42%;
}

/* F: top color bar + two photos */
.wire-F .color-bar {
  display: block;
  left: 6%;
  top: 6%;
  width: 88%;
  height: 10%;
}

.wire-F .ph:nth-child(1),
.wire-F .ph:nth-child(2) {
  display: block;
  bottom: 6%;
  width: 42%;
  height: 72%;
}

.wire-F .ph:nth-child(1) { left: 6%; }
.wire-F .ph:nth-child(2) { right: 6%; }

.wireframe.lg {
  max-width: 200px;
  margin: 0 auto;
}
</style>

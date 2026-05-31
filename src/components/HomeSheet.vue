<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import WelcomeSheet from './WelcomeSheet.vue'
import HistorySheet from './HistorySheet.vue'

const props = defineProps({
  walks: { type: Array, default: () => [] },
  demoCard: { type: Object, default: null },
})

const emit = defineEmits(['select-walk', 'select-demo', 'state-change', 'about', 'delete-walk', 'rename-walk'])

const sheetRef = ref(null)
const expanded = ref(false)
const dragY = ref(0)
const dragging = ref(false)
const isLandscapePanel = ref(false)

let startY = 0
let startExpanded = false
let isTouchDrag = false
let isPointerDrag = false

const sheetHeight = computed(() =>
  isLandscapePanel.value ? '100dvh' : expanded.value ? 'var(--sheet-expanded-height)' : 'var(--sheet-peek-height)'
)

const translateY = computed(() => {
  if (isLandscapePanel.value) return 0
  if (!dragging.value) return 0
  return Math.max(-120, Math.min(80, dragY.value))
})

function setExpanded(val) {
  if (isLandscapePanel.value) return
  expanded.value = val
  emit('state-change', val ? 'expanded' : 'peek')
}

function isNoDragTarget(target) {
  if (target?.closest?.('.sheet-handle-hit')) return false
  return !!target?.closest?.('a, button, input, textarea, [data-no-drag]')
}

function canStartDrag(target) {
  if (isLandscapePanel.value) return false
  if (isNoDragTarget(target)) return false
  const fromHandle = !!target?.closest?.('.sheet-handle-hit')
  if (!expanded.value) return true
  if (fromHandle) return true
  const historyScroll = target?.closest?.('.history-sheet')
  return !historyScroll || historyScroll.scrollTop <= 2
}

function beginDrag(clientY, mode) {
  if (isLandscapePanel.value) return
  dragging.value = true
  startY = clientY
  startExpanded = expanded.value
  dragY.value = 0
  isTouchDrag = mode === 'touch'
  isPointerDrag = mode === 'pointer'
}

function onTouchStart(e) {
  if (e.touches.length !== 1) return
  if (!canStartDrag(e.target)) return
  e.preventDefault()
  beginDrag(e.touches[0].clientY, 'touch')
}

function onTouchMove(e) {
  if (!isTouchDrag || !dragging.value || e.touches.length !== 1) return
  const dy = e.touches[0].clientY - startY
  dragY.value = dy
  if (Math.abs(dy) > 4) e.preventDefault()
}

function onPointerDown(e) {
  if (e.pointerType === 'touch') return
  if (!canStartDrag(e.target)) return
  beginDrag(e.clientY, 'pointer')
}

function onPointerMove(e) {
  if (!isPointerDrag) return
  if (!dragging.value) return
  const dy = e.clientY - startY
  dragY.value = dy
  if (Math.abs(dy) > 8) e.preventDefault()
}

function onTouchEnd() {
  if (!isTouchDrag && !isPointerDrag) return
  if (!dragging.value) return
  const dy = dragY.value
  dragging.value = false
  dragY.value = 0
  isTouchDrag = false
  isPointerDrag = false
  if (!startExpanded && dy < -80) setExpanded(true)
  else if (startExpanded && dy > 80) setExpanded(false)
  else setExpanded(startExpanded)
}

function onHandleClick() {
  if (isLandscapePanel.value) return
  setExpanded(!expanded.value)
}

function showWelcome() {
  if (isLandscapePanel.value) return
  setExpanded(false)
}

defineExpose({ showWelcome, setExpanded })

let mql = null
let removeMqlListener = () => {}
let dragBound = false

function bindDragEvents() {
  if (dragBound) return
  dragBound = true
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('touchcancel', onTouchEnd)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onTouchEnd)
  window.addEventListener('pointercancel', onTouchEnd)
}

function unbindDragEvents() {
  if (!dragBound) return
  dragBound = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onTouchEnd)
  window.removeEventListener('pointercancel', onTouchEnd)
}

onMounted(() => {
  emit('state-change', 'peek')

  mql = window.matchMedia('(min-width: 1024px) and (orientation: landscape)')

  const sync = () => {
    const matched = mql?.matches
    isLandscapePanel.value = !!matched

    // 横屏：固定右侧面板，不再需要半屏展开/收起逻辑。
    if (isLandscapePanel.value) {
      dragging.value = false
      dragY.value = 0
      expanded.value = false
      unbindDragEvents()
      emit('state-change', 'landscape')
    } else {
      bindDragEvents()
      emit('state-change', 'peek')
    }
  }

  // 初次同步
  sync()

  if (mql?.addEventListener) {
    mql.addEventListener('change', sync)
    removeMqlListener = () => mql.removeEventListener('change', sync)
  } else if (mql?.addListener) {
    mql.addListener(sync)
    removeMqlListener = () => mql.removeListener(sync)
  }
})

onUnmounted(() => {
  unbindDragEvents()
  removeMqlListener()
})
</script>

<template>
  <div
    ref="sheetRef"
    class="home-sheet"
    :class="{ expanded, dragging, 'home-sheet--peek': !expanded && !isLandscapePanel, 'home-sheet--landscape': isLandscapePanel }"
    :style="{
      height: sheetHeight,
      transform: dragging ? `translateY(${translateY}px)` : undefined,
    }"
    @touchstart="onTouchStart"
    @pointerdown="onPointerDown"
  >
    <button
      v-if="!isLandscapePanel"
      type="button"
      class="ios-grabber sheet-handle-hit"
      aria-label="展开或收起"
      @click="onHandleClick"
    />
    <div class="sheet-scroll">
      <WelcomeSheet v-if="!isLandscapePanel && !expanded" @about="$emit('about')" />
      <HistorySheet
        v-else
        :walks="walks"
        :demo-card="demoCard"
        @select-walk="(w) => $emit('select-walk', w)"
        @delete-walk="(w) => $emit('delete-walk', w)"
        @rename-walk="(w, name) => $emit('rename-walk', w, name)"
        @select-demo="$emit('select-demo')"
        @about="$emit('about')"
      />
    </div>
  </div>
</template>

<style scoped>
.home-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 220;
  max-width: var(--max-width);
  margin: 0 auto;
  background: var(--bg-app);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  border-top: 1px solid var(--border);
  box-shadow: var(--shadow-sheet);
  padding: 8px var(--page-padding) max(20px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  transition:
    height var(--duration-normal) var(--ease-spring),
    transform var(--duration-normal) var(--ease-spring);
}

.home-sheet--landscape {
  top: 0;
  bottom: 0;
  left: auto;
  right: 0;
  width: var(--right-panel-width);
  max-width: none;
  margin: 0;
  border-radius: 0;
  border-top: none;
  border-left: 1px solid var(--separator-opaque);
  padding: 16px;
  transition: none;
}

.home-sheet.dragging {
  transition: height var(--duration-normal) var(--ease-spring);
}

.home-sheet--peek {
  touch-action: none;
}

.sheet-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.home-sheet--peek .sheet-scroll {
  touch-action: none;
}

.home-sheet.expanded .sheet-scroll {
  touch-action: pan-y;
}

@media (min-width: 1024px) and (orientation: landscape) {
  .sheet-scroll {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>

<script setup>
import { computed } from 'vue'
import colorsData from '../assets/colors.json'
import { WHEEL_SIZE } from '../utils/wheelGeometry.js'

const props = defineProps({
  rotation: { type: Number, default: 0 },
  spinning: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

defineEmits(['spin'])

const colors = colorsData
const n = colors.length
const size = WHEEL_SIZE
const cx = size / 2
const cy = size / 2

/* ── 几何 ── */
const INNER_R = 70   // 较大内孔：GO 按钮对应
const OUTER_R = 190  // 较大外径：色块更饱满

function polarXY(r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

/**
 * 构建无缝扇形路径（色块之间无间隙）。
 */
function buildSectorPath(index) {
  const sectorDeg = 360 / n
  const startDeg = -90 + index * sectorDeg
  const endDeg = -90 + (index + 1) * sectorDeg
  const spanDeg = endDeg - startDeg
  if (spanDeg <= 0) return ''

  const [xi0, yi0] = polarXY(INNER_R, startDeg)
  const [xo0, yo0] = polarXY(OUTER_R, startDeg)
  const [xo1, yo1] = polarXY(OUTER_R, endDeg)
  const [xi1, yi1] = polarXY(INNER_R, endDeg)
  const large = spanDeg > 180 ? 1 : 0

  return [
    `M ${xi0} ${yi0}`,
    `L ${xo0} ${yo0}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${xo1} ${yo1}`,
    `L ${xi1} ${yi1}`,
    `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${xi0} ${yi0}`,
    'Z',
  ].join(' ')
}

const segmentMeta = computed(() =>
  colors.map((c, i) => ({ ...c, i, path: buildSectorPath(i) }))
)
</script>

<template>
  <div class="wheel-panel">
    <div class="wheel-frame">
      <!-- 指针：一半叠在转盘 12 点边缘 -->
      <div class="wheel-pointer" aria-hidden="true">
        <svg viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ptrShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#302E2E" flood-opacity="0.12"/>
            </filter>
          </defs>
          <path
            d="M14 32.5c-1 0-1.9-.7-2.2-1.7C10 24.4 4 16.8 4 10.5 4 6 8.5 2.5 14 2.5s10 3.5 10 8c0 6.3-6 13.9-7.8 20.3-.3 1-.8 1.7-2.2 1.7z"
            fill="#fff"
            filter="url(#ptrShadow)"
          />
        </svg>
      </div>

      <div
        class="wheel-rotor"
        :class="{ 'is-spinning': props.spinning }"
        :style="{ transform: `rotate(${props.rotation}deg)` }"
      >
        <svg
          class="wheel-svg"
          :viewBox="`0 0 ${size} ${size}`"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <!-- 整体柔和阴影 -->
            <filter id="wf" x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="4" stdDeviation="6"
                flood-color="#302E2E" flood-opacity="0.1"/>
            </filter>
          </defs>

          <!-- 各色扇形（无缝拼接） -->
          <path
            v-for="seg in segmentMeta"
            :key="seg.hex"
            :d="seg.path"
            :fill="seg.hex"
            filter="url(#wf)"
          />
        </svg>
      </div>

      <!-- GO! 按钮：悬浮在 SVG 上层，遮住内弧形成视觉孔洞 -->
      <button
        type="button"
        class="wheel-btn"
        :disabled="props.disabled || props.spinning"
        aria-label="转动转盘"
        @click="$emit('spin')"
      >
        <span class="wheel-btn-label">{{ props.spinning ? '…' : 'GO!' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wheel-panel {
  position: relative;
  width: 100%;
  margin-inline: auto;
  /* 指针上半露出转盘 */
  padding-top: clamp(14px, 4vw, 20px);
  overflow: visible;
}

/* ── 指针 ─────────────────────────────────── */
.wheel-pointer {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 30;
  width: 28px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.wheel-pointer svg {
  display: block;
  width: 100%;
  height: auto;
}

/* ── 色环容器 ────────────────────────────── */
.wheel-frame {
  position: relative;
  z-index: 2;
  width: 100%;
  aspect-ratio: 1;
  overflow: visible;
}

/* ── 可旋转 SVG 层 ───────────────────────── */
.wheel-rotor {
  width: 100%;
  height: 100%;
  will-change: transform;
  transform-origin: 50% 50%;
}
.is-spinning {
  opacity: 0.92;
  transition: opacity 0.2s ease-out;
}

.wheel-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

/* ── GO! 按钮 ──────────────────────────────
   直径 = 2 * INNER_R / WHEEL_SIZE * 100% = 2*70/400 = 35%
   使中心白圆覆盖内弧，形成视觉孔洞。
────────────────────────────────────────── */
.wheel-btn {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 35%;
  height: 35%;
  border: none;
  border-radius: 50%;
  background: var(--brand-cream);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--brand-ink);
  box-shadow: none;
  transition:
    transform 0.12s cubic-bezier(0.34,1.56,0.64,1),
    box-shadow 0.12s ease;
  z-index: 12;
}
.wheel-btn:not(:disabled):active {
  transform: scale(0.94);
  box-shadow: var(--shadow-glow-accent);
}
.wheel-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.wheel-btn-label {
  font-family: var(--font-display);
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 900;
  letter-spacing: 0.04em;
  color: var(--brand-ink);
  line-height: 1;
  margin-top: -1px;
}

/* ── 无障碍动画关闭 ────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .is-spinning {
    opacity: 1;
    transition: none;
  }
}

/* ── 大屏横屏 ──────────────────────────── */
@media (min-width: 1024px) and (orientation: landscape) {
  .wheel-panel {
    width: min(46vw, 480px);
    margin: 0;
  }
}
</style>

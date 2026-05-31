<script setup>
import { computed } from 'vue'
import { buildGradientStops, gradientCssFromStops } from '../utils/trailRender'

const props = defineProps({
  trailPoints: { type: Array, default: () => [] },
  colorNodes: { type: Array, default: () => [] },
  fallbackColors: { type: Array, default: () => [] },
  vertical: { type: Boolean, default: false },
  height: { type: String, default: '12px' },
})

const stops = computed(() =>
  buildGradientStops(props.trailPoints, props.colorNodes, props.fallbackColors)
)

const gradient = computed(() => gradientCssFromStops(stops.value))
</script>

<template>
  <div class="gradient-bar-wrap" :class="{ vertical }">
    <div class="gradient-bar" :style="{ background: gradient, height: vertical ? '100%' : height, width: vertical ? height : '100%' }">
      <span
        v-for="(n, i) in stops"
        :key="i"
        class="node-dot"
        :style="{
          left: vertical ? '50%' : `${n.offset * 100}%`,
          top: vertical ? `${n.offset * 100}%` : '50%',
          background: n.color,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.gradient-bar-wrap {
  width: 100%;
  padding: 4px 0;
}
.gradient-bar-wrap.vertical {
  width: auto;
  height: 120px;
  padding: 0 4px;
}
.gradient-bar {
  position: relative;
  border-radius: 999px;
  min-height: 14px;
  box-shadow: var(--shadow-xs);
  background-color: var(--surface-container, #efeded);
}
.vertical .gradient-bar {
  min-width: 12px;
  min-height: 80px;
}
.node-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
}
</style>

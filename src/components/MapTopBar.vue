<script setup>
import { MapPin, Crosshair } from 'lucide-vue-next'

defineProps({
  locationLabel: { type: String, default: '七彩洞头村 · 展览路线' },
})

const emit = defineEmits(['locate'])
</script>

<template>
  <header class="map-top-bar" aria-label="地图导航">
    <div class="location-pill">
      <span class="pill-icon" aria-hidden="true">
        <MapPin :size="15" :stroke-width="2" />
      </span>
      <div class="pill-text">
        <span class="pill-label">当前漫游</span>
        <span class="pill-value">{{ locationLabel }}</span>
      </div>
    </div>
    <button
      type="button"
      class="icon-circle"
      aria-label="回到当前位置"
      @click="emit('locate')"
    >
      <Crosshair :size="18" :stroke-width="1.75" />
    </button>
  </header>
</template>

<style scoped>
.map-top-bar {
  position: fixed;
  top: var(--map-top-offset);
  left: 50%;
  transform: translateX(-50%);
  width: min(
    calc(100vw - var(--page-padding) * 2),
    calc(var(--max-width) - var(--page-padding) * 2)
  );
  z-index: 210;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.location-pill,
.icon-circle {
  pointer-events: auto;
}

.location-pill {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-button);
  box-shadow: none;
}

.pill-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--brand-sage) 18%, var(--brand-cream));
  color: var(--brand-stone);
}

.pill-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pill-label {
  font-size: var(--font-caption-2);
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.pill-value {
  font-size: var(--font-footnote);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: var(--letter-tight);
}

.icon-circle {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--brand-primary);
  box-shadow: none;
  transition: transform 150ms var(--ease-spring);
}

.icon-circle:active {
  transform: scale(0.92);
}
</style>

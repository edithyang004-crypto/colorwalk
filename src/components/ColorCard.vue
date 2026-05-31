<script setup>
defineProps({
  card: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <article class="color-card" :class="{ compact }">
    <div class="swatch" :style="{ background: card.hex }" />
    <div class="info">
      <h3>{{ card.name }}</h3>
      <p class="hex">{{ card.hex }}</p>
      <p v-if="!compact && card.createdAt" class="date">
        {{ new Date(card.createdAt).toLocaleDateString('zh-CN') }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.color-card {
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  background: var(--bg-primary);
  transition: box-shadow 200ms ease;
}

.color-card:hover {
  box-shadow: var(--shadow-glow-accent);
}

.swatch {
  aspect-ratio: 1.2;
}

.compact .swatch {
  aspect-ratio: 1;
}

.info {
  padding: 12px 14px;
}

.info h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.hex {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
}

.date {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
</style>

<template>
  <div class="welcome-sheet">
    <div class="welcome-header stagger-in">
      <div class="brand-block">
        <h2 class="brand">Colorwalk</h2>
        <span class="status-pill">漫步中 · 随时采色</span>
      </div>
    </div>
    <div class="progress-hint stagger-in" aria-hidden="true">
      <div class="progress-track">
        <div class="progress-fill" />
      </div>
      <span class="progress-label">上滑展开查看历史路径</span>
    </div>
    <button type="button" class="about-link btn-plain stagger-in" data-no-drag @click="$emit('about')">
      关于 Colorwalk →
    </button>
  </div>
</template>

<script setup>
defineEmits(['about'])
</script>

<style scoped>
.welcome-sheet {
  padding: 4px 4px 12px;
}

.welcome-header {
  display: flex;
  align-items: center;
  margin: 0 0 16px;
}

.brand-block {
  min-width: 0;
}

.brand {
  font-family: var(--font-display);
  font-size: var(--font-title-2);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-tight);
  margin: 0 0 6px;
  color: var(--text-primary);
}

.status-pill {
  display: inline-block;
  padding: 4px 10px;
  font-size: var(--font-caption-2);
  font-weight: var(--font-weight-medium);
  color: var(--brand-stone);
  background: color-mix(in srgb, var(--brand-sage) 18%, var(--brand-cream));
  border-radius: var(--radius-pill);
}

.progress-hint {
  margin-bottom: 4px;
}

.progress-track {
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--fill-tertiary);
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  width: 38%;
  height: 100%;
  border-radius: inherit;
  background: var(--brand-ink);
  animation: progress-shimmer 2.8s var(--ease-out) infinite;
}

@keyframes progress-shimmer {
  0%, 100% { opacity: 0.85; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.02); }
}

.progress-label {
  font-size: var(--font-caption-1);
  color: var(--text-muted);
}

.about-link {
  margin-top: 14px;
  text-align: left;
  font-size: var(--font-footnote);
  color: var(--brand-primary);
}
</style>

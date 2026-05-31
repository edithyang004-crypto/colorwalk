<script setup>
import { Plus, Images } from 'lucide-vue-next'

defineEmits(['new-walk', 'gallery'])
</script>

<template>
  <div class="floating-buttons">
    <button type="button" class="float-btn float-btn--primary" @click="$emit('new-walk')">
      <Plus :size="18" :stroke-width="2.5" />
      新建路径
    </button>
    <button type="button" class="float-btn float-btn--secondary" @click="$emit('gallery')">
      <Images :size="17" :stroke-width="1.75" />
      画廊
    </button>
  </div>
</template>

<style scoped>
.floating-buttons {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  width: min(
    calc(100vw - var(--page-padding) * 2),
    calc(var(--max-width) - var(--page-padding) * 2)
  );
  bottom: var(--float-buttons-bottom);
  z-index: 230;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  pointer-events: none;
}

.float-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 12px 20px;
  border-radius: var(--radius-button);
  font-size: var(--font-subhead);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-smooth);
}

.float-btn:active {
  transform: scale(0.97);
}

@media (hover: hover) {
  .float-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }

  .float-btn--secondary:hover {
    box-shadow: var(--shadow-card-hover);
  }

  .float-btn:active:hover {
    transform: scale(0.97);
  }
}

.float-btn--primary {
  flex: 1;
  max-width: 58%;
  color: var(--brand-label);
  background: var(--brand-ink);
  border: none;
  box-shadow: none;
}

.float-btn--primary:active {
  opacity: 0.88;
}

.float-btn--secondary {
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--separator-opaque);
  box-shadow: var(--shadow-card);
}

@media (min-width: 1024px) and (orientation: landscape) {
  .floating-buttons {
    position: absolute;
    left: max(16px, env(safe-area-inset-left));
    bottom: max(16px, env(safe-area-inset-bottom));
    top: auto;
    right: auto;
    transform: none;
    width: auto;
    max-width: none;
    margin: 0;
    padding: 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    pointer-events: none;
    gap: 10px;
  }

  .float-btn--primary {
    max-width: none;
    flex: none;
    order: 2;
  }

  .float-btn--secondary {
    order: 1;
  }

  .float-btn {
    pointer-events: auto;
  }
}
</style>

<script setup>
import { useRouter } from 'vue-router'
import { EXHIBITION_MAP_PATH } from '../constants/exhibition.js'

const router = useRouter()

/** 点击箭头：进入展览地图，首点位由 ExhibitionMap 自动标记并居中 */
function enterExhibition() {
  router.push({ path: EXHIBITION_MAP_PATH })
}
</script>

<template>
  <div class="page exhibition-entrance">
    <header class="header">
      <h1 class="title">七彩洞头村</h1>
      <p class="subtitle">Colorwalk 展览模式</p>
    </header>

    <div class="visual" aria-hidden="true">
      <span class="visual-emoji">🌈</span>
      <div class="dots">
        <span class="dot dot-1" />
        <span class="dot dot-2" />
        <span class="dot dot-3" />
        <span class="dot dot-4" />
        <span class="dot dot-5" />
      </div>
    </div>

    <div class="enter-section">
      <button
        type="button"
        class="enter-btn"
        aria-label="点击进入七彩洞头村之旅"
        @click="enterExhibition"
      >
        <span class="enter-arrow" aria-hidden="true">→</span>
      </button>
      <p class="enter-hint">点击进入七彩洞头村之旅</p>
    </div>
  </div>
</template>

<style scoped>
.exhibition-entrance {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-top: max(24px, env(safe-area-inset-top));
  padding-bottom: max(var(--safe-bottom), env(safe-area-inset-bottom));
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.visual {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 120px;
}

.visual-emoji {
  font-size: clamp(48px, 12vw, 72px);
  line-height: 1;
}

.dots {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: dot-pulse 1.6s ease-in-out infinite;
}

.dot-1 {
  background: #e74c3c;
  animation-delay: 0s;
}
.dot-2 {
  background: #f39c12;
  animation-delay: 0.15s;
}
.dot-3 {
  background: #2ecc71;
  animation-delay: 0.3s;
}
.dot-4 {
  background: #3498db;
  animation-delay: 0.45s;
}
.dot-5 {
  background: #9b59b6;
  animation-delay: 0.6s;
}

@keyframes dot-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

/* 中下方圆形箭头入口 */
.enter-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding-bottom: max(32px, env(safe-area-inset-bottom));
}

.enter-btn {
  width: clamp(80px, 22vw, 96px);
  height: clamp(80px, 22vw, 96px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-ink);
  color: var(--brand-cream);
  box-shadow: none;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.enter-btn:hover {
  transform: scale(1.08);
  box-shadow: var(--shadow-glow-accent);
}

.enter-btn:active {
  transform: scale(0.94);
  opacity: 0.88;
}

.enter-arrow {
  font-size: clamp(32px, 8vw, 40px);
  font-weight: 300;
  line-height: 1;
  transform: translateX(2px);
}

.enter-hint {
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  text-align: center;
}

@media (max-width: 360px) {
  .title {
    font-size: 20px;
  }
  .subtitle {
    font-size: 13px;
  }
  .enter-hint {
    font-size: 13px;
  }
  .exhibition-entrance {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>

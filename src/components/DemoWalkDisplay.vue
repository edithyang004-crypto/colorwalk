<script setup>
import { computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import WalkResult from './WalkResult.vue'
import { demoWalk, demoWalkToResultWalk } from '../data/demoWalk'
import { markFirstVisitDone } from '../utils/firstVisit'

const router = useRouter()
const startNewWalk = inject('startNewWalk')

const walk = computed(() => demoWalkToResultWalk(demoWalk))

const headerMeta = computed(() => {
  const m = Math.floor(demoWalk.duration / 60)
  const dist =
    demoWalk.distance >= 1000
      ? `${(demoWalk.distance / 1000).toFixed(1)} km`
      : `${demoWalk.distance} m`
  return `${m} 分钟 · ${dist} · ${demoWalk.colorNodes.length} 色`
})

function formatDisplayDate(dateStr) {
  return dateStr.replace(/-/g, '.')
}

function backToMap() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  router.push('/')
}

function startMyWalk() {
  markFirstVisitDone()
  startNewWalk?.()
}
</script>

<template>
  <div class="demo-walk page">
    <header class="demo-header">
      <button type="button" class="back-btn" @click="backToMap">
        <ArrowLeft :size="18" :stroke-width="1.5" />
        返回地图
      </button>
      <h1>{{ demoWalk.title }}</h1>
      <p class="demo-date">{{ formatDisplayDate(demoWalk.date) }}</p>
      <p class="demo-meta">{{ headerMeta }}</p>
      <p class="demo-location">{{ demoWalk.location }}</p>
    </header>

    <WalkResult
      :walk="walk"
      readonly
      :location-label="demoWalk.location"
      :map-center="{ lat: demoWalk.trackPoints[0]?.lat, lng: demoWalk.trackPoints[0]?.lng }"
    />

    <section class="collages-section">
      <h2>我的拼贴</h2>
      <div class="collage-grid">
        <figure v-for="c in demoWalk.collages" :key="c.id" class="collage-item">
          <img :src="c.url" :alt="c.description" loading="lazy" />
          <figcaption>{{ c.description }}</figcaption>
        </figure>
      </div>
    </section>

    <section class="demo-footer">
      <div class="footer-actions">
        <button type="button" class="btn-outline" @click="backToMap">返回地图</button>
        <button type="button" class="btn-primary" @click="startMyWalk">开始我的 Colorwalk</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.demo-walk {
  padding-bottom: calc(var(--safe-bottom) + 24px);
}

.demo-header {
  margin-bottom: 8px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 10px;
}

.demo-header h1 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 6px;
}

.demo-date {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.demo-meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.demo-location {
  font-size: 13px;
  color: var(--text-muted);
}

.collages-section {
  margin-top: 28px;
}

.collages-section h2 {
  font-size: 16px;
  margin-bottom: 12px;
}

.collage-item {
  margin: 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: none;
  background: var(--bg-surface);
}

.collage-item img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.collage-item figcaption {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 10px;
  line-height: 1.4;
}

.collage-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collage-item img {
  aspect-ratio: 4 / 5;
}

.demo-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--divider);
  text-align: center;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.footer-actions button {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
}

.btn-outline {
  border: 1px solid var(--border);
  color: var(--text-primary);
  background: #fff;
}

.btn-primary {
  background: #1a1a1a;
  color: #fff;
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>

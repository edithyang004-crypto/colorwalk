<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { X, Plus, Footprints, Camera, MapPin, ChevronRight } from 'lucide-vue-next'
import { getDemoSummary } from '../data/demoWalk'
import { markFirstVisitDone } from '../utils/firstVisit'

defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const router = useRouter()
const startNewWalk = inject('startNewWalk')
const demoSummary = getDemoSummary()

const steps = [
  { icon: Plus, title: '点击「+ 新建路径」', desc: '为这条花园小路起个名字，开始漫步' },
  { icon: Footprints, title: '步行寻找色彩', desc: '在你熟悉的街道、校园或海边随意行走' },
  { icon: Camera, title: '拍照采色', desc: '遇见心动颜色就拍照，从画面中提取主色' },
  { icon: MapPin, title: '留在地图上', desc: '每次采色都会在地图留下一朵色彩小花' },
]

function viewDemo() {
  markFirstVisitDone()
  emit('close')
  router.push('/demo')
}

function onStart() {
  markFirstVisitDone()
  emit('close')
  startNewWalk?.()
}
</script>

<template>
  <transition name="fade">
    <div v-if="show" class="about-overlay" @click.self="emit('close')">
      <div class="about-panel">
        <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
          <X :size="22" :stroke-width="1.5" />
        </button>

        <div class="banner">
          <div class="banner-gradient" />
          <div class="banner-text">
            <h1>Colorwalk</h1>
            <span class="banner-tag">花园中的小路 · 色彩漫步</span>
          </div>
        </div>

        <section class="section">
          <h2>Colorwalk 是什么？</h2>
          <p class="intro-text">
            Colorwalk 是一种开放的色彩漫步方式：地图上的路径像花园中的小路，你采集的色彩像花朵一样开在路边。
            每一次漫步都会在地图上留下彩色足迹，多次漫步之后，整张地图会渐渐变成一座绚烂的「色彩花园」。
          </p>
          <p class="intro-text">
            这个工具不绑定任何地点——你可以在任意城市、校园或街区使用；所有数据仅保存在你的浏览器本地。
            网页中内置了设计者在温州洞头村完成的一次 Colorwalk 作为示范。
          </p>
        </section>

        <section class="section">
          <h2>怎样进行 Colorwalk？</h2>
          <div class="steps">
            <div v-for="(s, i) in steps" :key="i" class="step-item">
              <div class="step-icon">
                <component :is="s.icon" :size="22" :stroke-width="1.5" />
              </div>
              <div>
                <h3>{{ s.title }}</h3>
                <p>{{ s.desc }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <button type="button" class="demo-card" @click="viewDemo">
            <div class="demo-card-bg" />
            <div class="demo-card-body">
              <p class="demo-card-title">{{ demoSummary.title }} Colorwalk</p>
              <p class="demo-card-date">{{ demoSummary.date }}</p>
              <p class="demo-card-meta">{{ demoSummary.meta }}</p>
              <span class="demo-card-link">查看路线 <ChevronRight :size="16" /></span>
            </div>
          </button>
        </section>

        <section class="section cta-section">
          <button type="button" class="btn-primary btn-start" @click="onStart">开始我的 Colorwalk</button>
        </section>

        <section class="section credits">
          <p>Colorwalk 网页工具</p>
          <p class="muted">纯前端 · 数据仅存于本地浏览器</p>
        </section>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.about-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(48, 46, 46, 0.28);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.about-panel {
  width: 100%;
  max-width: var(--max-width);
  max-height: 92vh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: var(--brand-cream);
  border-radius: 24px 24px 0 0;
  border-top: none;
  padding: 0 var(--page-padding) max(28px, env(safe-area-inset-bottom));
  position: relative;
  animation: slide-up var(--duration-normal) var(--ease-spring);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-stone);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(48, 46, 46, 0.1);
  border-radius: var(--radius-pill);
}

.banner {
  position: relative;
  height: 148px;
  margin: 0 calc(-1 * var(--page-padding)) 24px;
  overflow: hidden;
  border-radius: 24px 24px 24px 24px;
}

.banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    #f63d3d 0%,
    #fcdf5e 20%,
    #74e4db 40%,
    #4dc4eb 55%,
    #748eed 70%,
    #ab4eb6 85%,
    #f63d3d 100%
  );
  background-size: 200% 200%;
  animation: banner-rainbow 12s ease infinite;
}

@keyframes banner-rainbow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.banner-text {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.16);
}

.banner-text h1 {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

.banner-tag {
  display: inline-block;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #302e2e;
  background: #f4efe4;
  border-radius: var(--radius-pill);
}

.section {
  margin-bottom: 32px;
}

.section h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
  color: #302e2e;
}

.intro-text {
  font-size: 15px;
  line-height: 1.65;
  color: #5a5b57;
  margin-bottom: 10px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  background: #faf8f3;
  border: 1px solid rgba(48, 46, 46, 0.1);
  border-radius: 20px;
}

.step-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-pill);
  background: #ffffff;
  color: #302e2e;
  border: 1px solid rgba(48, 46, 46, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-item h3 {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #302e2e;
}

.step-item p {
  font-size: 13px;
  color: #5a5b57;
  line-height: 1.55;
}

.demo-card {
  width: 100%;
  text-align: left;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  min-height: 110px;
  border: 1px solid rgba(48, 46, 46, 0.12);
  transition: transform 150ms var(--ease-spring);
}

.demo-card:active {
  transform: scale(0.98);
}

.demo-card-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #c62828, #0277bd, #748eed);
  opacity: 0.82;
}

.demo-card-body {
  position: relative;
  z-index: 1;
  padding: 16px 18px;
  color: #fff;
}

.demo-card-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}

.demo-card-date,
.demo-card-meta {
  font-size: 12px;
  opacity: 0.92;
  margin-bottom: 4px;
}

.demo-card-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-pill);
}

.btn-start {
  width: 100%;
  background: #302e2e;
  color: #f4efe4;
  box-shadow: none;
  font-weight: 700;
}

.btn-start:active {
  opacity: 0.88;
}

.cta-section {
  margin-bottom: 24px;
}

.credits {
  text-align: center;
  padding-top: 16px;
  border-top: 1px dashed rgba(146, 145, 133, 0.55);
}

.credits p {
  font-size: var(--font-caption-1);
  margin-bottom: 4px;
  color: #302e2e;
}

.muted {
  color: #929185;
}
</style>

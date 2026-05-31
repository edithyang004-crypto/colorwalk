import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'
import './styles/responsive.css'
import './styles/animations.css'

const READY_SELECTORS =
  '#app .map-page, #app .home-sheet, #app .floating-buttons, #app .route-loading, #app .exhibition-map, #app .exhibition-entrance'

function setStatus(text, kind) {
  if (typeof window.__cwSetStatus === 'function') {
    window.__cwSetStatus(text, kind)
  }
}

function markReady() {
  window.__cwAppReady = true
  const build = document.querySelector('meta[name="cw-build"]')?.getAttribute('content')
  if (build) {
    setStatus(`已就绪 · 版本 ${build}`, 'ok')
    window.setTimeout(() => setStatus('', 'ok'), 2800)
  } else {
    setStatus('', 'ok')
  }
}

async function waitForVisibleApp(maxMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await nextTick()
    await new Promise((r) => requestAnimationFrame(r))
    const el = document.querySelector(READY_SELECTORS)
    if (el && el.getBoundingClientRect().height > 0) return true
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

setStatus('第 2 步：正在启动应用…')

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.config.errorHandler = (err) => {
  console.error('[Colorwalk]', err)
  setStatus('应用出错：' + (err?.message || '请刷新重试'), 'err')
}

router.onError((err) => {
  console.error('[Colorwalk] 路由', err)
  setStatus('页面加载失败：' + (err?.message || '请重新上传 dist'), 'err')
})

app.mount('#app')

router
  .isReady()
  .then(() => waitForVisibleApp())
  .then((ok) => {
    if (!ok) {
      setStatus('地图界面未出现。请刷新或重新上传完整 dist。', 'err')
      return
    }
    markReady()
  })
  .catch((err) => {
    console.error('[Colorwalk] 启动失败', err)
    setStatus('无法启动：' + (err?.message || '请刷新'), 'err')
  })

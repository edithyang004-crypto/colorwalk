import { createRouter, createWebHistory } from 'vue-router'
import { markFirstVisitDone } from './utils/firstVisit.js'
import MapView from './views/MapView.vue'

const routes = [
  {
    path: '/',
    name: 'map',
    component: MapView,
    beforeEnter() {
      markFirstVisitDone()
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('./views/About.vue'),
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: () => import('./views/Gallery.vue'),
  },
  {
    path: '/walking',
    name: 'walking',
    component: () => import('./views/WalkingView.vue'),
  },
  {
    path: '/demo',
    name: 'demo',
    component: () => import('./views/DemoView.vue'),
  },
  { path: '/watch', redirect: '/walking' },
  { path: '/map', redirect: '/' },
  {
    path: '/exhibition/entrance',
    name: 'exhibition-entrance',
    component: () => import('./views/ExhibitionEntrance.vue'),
  },
  /** 短链，便于 NFC 标签写入较短网址 */
  { path: '/e', redirect: '/exhibition/entrance' },
  {
    path: '/exhibition/map',
    name: 'exhibition-map',
    component: () => import('./views/ExhibitionMap.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router

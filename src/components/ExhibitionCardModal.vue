<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import chroma from 'chroma-js'
import { MapPin, X, Check, Copy } from 'lucide-vue-next'
import { slideMediaType } from '../utils/videoMedia.js'
import { resolveAssetUrl } from '../utils/assetUrl.js'

const PHOTO_RADIUS = 20

const props = defineProps({
  show: { type: Boolean, default: false },
  name: { type: String, default: '' },
  /** 地图标记主色（用于弹层光晕） */
  mainColor: { type: String, default: '' },
  locationLabel: { type: String, default: '' },
  /** @type {{ colorName: string, mainColor: string, colors: string[], story: string, photoSlides: { url: string, orientation: string, type?: string }[] }[]} */
  sections: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const displayLocation = computed(
  () => props.locationLabel?.trim() || props.name?.trim() || '',
)

/** 名称较长时改在色块外展示，避免 iPad 横屏左栏挤压 */
const isLongLocation = computed(() => displayLocation.value.length > 7)

const cardSections = computed(() =>
  (props.sections || []).filter((s) => s && (s.colorName || s.mainColor || s.photoSlides?.length)),
)

const dialogLabel = computed(
  () => cardSections.value.map((s) => s.colorName).filter(Boolean).join(' · ') || props.name || '采色点',
)

const overlayHex = computed(() => {
  const raw = String(props.mainColor || cardSections.value[0]?.mainColor || '').trim()
  if (!raw) return ''
  try {
    return chroma(raw).hex().toLowerCase()
  } catch {
    return raw.startsWith('#') ? raw.toLowerCase() : raw
  }
})

const themeVars = computed(() => {
  const hex = overlayHex.value
  if (!hex) {
    return {
      '--point-color': '#d9d9d9',
      '--point-glow': 'rgba(146, 145, 133, 0.28)',
      '--point-tint': 'rgba(146, 145, 133, 0.08)',
      '--point-border': 'rgba(48, 46, 46, 0.1)',
    }
  }
  try {
    const c = chroma(hex)
    return {
      '--point-color': hex,
      '--point-glow': c.alpha(0.32).css(),
      '--point-tint': c.alpha(0.12).css(),
      '--point-border': c.alpha(0.22).css(),
    }
  } catch {
    return {}
  }
})

const cardStyleVars = computed(() => ({
  ...themeVars.value,
  '--photo-radius': `${PHOTO_RADIUS}px`,
}))

const copiedIndex = ref(-1)
const lightboxSlide = ref(null)
let copyTimer = null

watch(
  () => props.show,
  (visible) => {
    if (!visible) lightboxSlide.value = null
  },
)

function mediaType(slide) {
  return slideMediaType(slide)
}

function slideSrc(slide) {
  return resolveAssetUrl(slide?.url)
}

function slidePoster(slide) {
  return resolveAssetUrl(slide?.poster)
}

function openLightbox(slide) {
  if (!slide?.url) return
  if (mediaType(slide) === 'video') return
  lightboxSlide.value = slide
}

function closeLightbox() {
  lightboxSlide.value = null
}

function photoWrapClass(orientation) {
  return orientation === 'portrait' ? 'photo-wrap--portrait' : 'photo-wrap--landscape'
}

function hexForSection(section) {
  const raw = String(section?.mainColor ?? '').trim()
  if (!raw) return ''
  try {
    return chroma(raw).hex().toLowerCase()
  } catch {
    return raw.startsWith('#') ? raw.toLowerCase() : raw
  }
}

function swatchTheme(hex) {
  if (!hex) {
    return {
      '--on-color': '#302e2e',
      '--on-color-muted': 'rgba(48, 46, 46, 0.72)',
    }
  }
  try {
    const light = chroma(hex).luminance() > 0.55
    return {
      '--on-color': light ? '#302e2e' : '#ffffff',
      '--on-color-muted': light ? 'rgba(48, 46, 46, 0.72)' : 'rgba(255, 255, 255, 0.82)',
    }
  } catch {
    return {}
  }
}

function sectionColors(section) {
  const list = (section.colors || []).filter(Boolean).slice(0, 3)
  if (list.length >= 3) return list
  const hex = hexForSection(section)
  if (!hex) return list
  try {
    const base = chroma(hex)
    const derived = [
      base.darken(0.45).desaturate(0.1).hex(),
      base.hex(),
      base.brighten(0.5).saturate(0.08).hex(),
    ]
    return [...new Set([...list, ...derived])].slice(0, 3)
  } catch {
    while (list.length < 3) list.push(hex)
    return list.slice(0, 3)
  }
}

onUnmounted(() => {
  if (copyTimer) clearTimeout(copyTimer)
})

async function copyHex(index, hex) {
  if (!hex) return
  try {
    await navigator.clipboard.writeText(hex)
    copiedIndex.value = index
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedIndex.value = -1
    }, 1600)
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="card-fade">
      <div
        v-if="show"
        class="overlay"
        :style="themeVars"
        @click.self="emit('close')"
      >
        <article
          class="exhibition-card"
          role="dialog"
          aria-modal="true"
          :aria-label="dialogLabel"
          :style="cardStyleVars"
        >
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
            <X :size="18" :stroke-width="1.75" />
          </button>

          <div class="exhibition-card__body">
            <section
              v-for="(section, sIndex) in cardSections"
              :key="`${section.colorName}-${sIndex}`"
              class="card-section"
            >
              <button
                v-if="hexForSection(section)"
                type="button"
                class="swatch"
                :style="{ background: hexForSection(section), ...swatchTheme(hexForSection(section)) }"
                :aria-label="`复制色值 ${hexForSection(section)}`"
                @click="copyHex(sIndex, hexForSection(section))"
              >
                <div class="swatch__info">
                  <div class="swatch__meta">
                    <h2 class="swatch__title">{{ section.colorName }}</h2>
                    <span class="swatch__hex">
                      <Check
                        v-if="copiedIndex === sIndex"
                        :size="14"
                        :stroke-width="2"
                        aria-hidden="true"
                      />
                      <Copy v-else :size="14" :stroke-width="1.75" aria-hidden="true" />
                      {{ copiedIndex === sIndex ? '已复制' : hexForSection(section) }}
                    </span>
                  </div>
                  <p
                    v-if="sIndex === 0 && displayLocation"
                    class="location-chip location-chip--on-swatch"
                    :class="{ 'location-chip--hide-mobile-long': isLongLocation }"
                  >
                    <MapPin class="location-chip__icon" :size="14" :stroke-width="1.75" aria-hidden="true" />
                    <span class="location-chip__text">{{ displayLocation }}</span>
                  </p>
                </div>
              </button>

              <div v-else-if="section.colorName" class="swatch swatch--plain">
                <h2 class="swatch__title swatch__title--ink">{{ section.colorName }}</h2>
              </div>

              <div class="section-main">
                <div class="section-stack">
                  <p
                    v-if="sIndex === 0 && displayLocation && isLongLocation"
                    class="location-chip location-chip--header"
                  >
                    <MapPin class="location-chip__icon" :size="14" :stroke-width="1.75" aria-hidden="true" />
                    <span class="location-chip__text">{{ displayLocation }}</span>
                  </p>

                  <template v-if="section.photoSlides?.[0]">
                    <div
                      v-if="mediaType(section.photoSlides[0]) === 'video'"
                      class="media-block photo-wrap photo-wrap--video photo-wrap--hero"
                      :class="photoWrapClass(section.photoSlides[0].orientation)"
                    >
                      <video
                        :src="slideSrc(section.photoSlides[0])"
                        :poster="slidePoster(section.photoSlides[0]) || undefined"
                        class="photo-img photo-video"
                        controls
                        playsinline
                        webkit-playsinline
                        preload="metadata"
                        :aria-label="`${section.colorName || name} 展示视频`"
                      />
                    </div>
                    <button
                      v-else
                      type="button"
                      class="media-block photo-wrap photo-wrap--hero"
                      :class="photoWrapClass(section.photoSlides[0].orientation)"
                      :aria-label="`查看${section.colorName || name}照片原图`"
                      @click="openLightbox(section.photoSlides[0])"
                    >
                      <img
                        :src="slideSrc(section.photoSlides[0])"
                        :alt="`${section.colorName || name} 采色照片`"
                        class="photo-img"
                        loading="lazy"
                      />
                    </button>

                    <div
                      v-if="sectionColors(section).length"
                      class="palette-bar palette-bar--body"
                      aria-label="色彩层次"
                    >
                      <span
                        v-for="(c, i) in sectionColors(section)"
                        :key="`body-${sIndex}-${i}`"
                        class="palette-segment"
                        :style="{ background: c }"
                      />
                    </div>
                  </template>

                  <div
                    v-if="section.photoSlides?.length > 1"
                    class="section-gallery"
                  >
                    <div
                      v-for="(slide, pIndex) in section.photoSlides.slice(1)"
                      :key="`${slide.url}-${pIndex}`"
                    >
                      <div
                        v-if="mediaType(slide) === 'video'"
                        class="media-block photo-wrap photo-wrap--video"
                        :class="photoWrapClass(slide.orientation)"
                      >
                        <video
                          :src="slideSrc(slide)"
                          :poster="slidePoster(slide) || undefined"
                          class="photo-img photo-video"
                          controls
                          playsinline
                          webkit-playsinline
                          preload="metadata"
                          :aria-label="`${section.colorName || name} 展示视频 ${pIndex + 2}`"
                        />
                      </div>
                      <button
                        v-else
                        type="button"
                        class="media-block photo-wrap"
                        :class="photoWrapClass(slide.orientation)"
                        :aria-label="`查看${section.colorName || name}照片 ${pIndex + 2} 原图`"
                        @click="openLightbox(slide)"
                      >
                        <img
                          :src="slideSrc(slide)"
                          :alt="`${section.colorName || name} 照片 ${pIndex + 2}`"
                          class="photo-img"
                          loading="lazy"
                        />
                      </button>
                    </div>
                  </div>

                  <p v-if="section.story" class="story">{{ section.story }}</p>
                </div>
              </div>
            </section>
          </div>
        </article>
      </div>
    </Transition>

    <Transition name="lightbox-fade">
      <div
        v-if="lightboxSlide?.url"
        class="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="照片原图"
        @click.self="closeLightbox"
      >
        <button type="button" class="photo-lightbox__close" aria-label="关闭原图" @click="closeLightbox">
          <X :size="22" :stroke-width="1.75" />
        </button>
        <img :src="slideSrc(lightboxSlide)" alt="照片原图" class="photo-lightbox__img" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * 展览卡片版式（iPhone / iPad 统一）
 * - 遮罩 .overlay 滚动，卡片随内容增高
 * - 单列：色块 → 主媒体 → 色条 → 附图 → 文字
 * - 附图区用更大的 --gallery-gap，避免图片贴在一起
 */
.overlay {
  --card-pad-x: max(18px, env(safe-area-inset-right));
  --card-pad-y: max(16px, env(safe-area-inset-top));
  --card-width: min(calc(100vw - 2 * var(--card-pad-x)), 580px);
  --card-body-pad: 24px;
  --section-gap: 20px;
  --gallery-gap: 22px;
  --swatch-max-h: 168px;
  --media-landscape-h: 228px;

  position: fixed;
  inset: 0;
  z-index: 400;
  display: block;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
  padding:
    var(--card-pad-y)
    var(--card-pad-x)
    max(12px, env(safe-area-inset-bottom))
    var(--card-pad-x);
  background: color-mix(in srgb, var(--point-color, #929185) 18%, rgba(48, 46, 46, 0.42));
  backdrop-filter: blur(8px) saturate(130%);
  -webkit-backdrop-filter: blur(8px) saturate(130%);
}

.exhibition-card {
  position: relative;
  display: block;
  width: var(--card-width);
  max-width: 100%;
  margin: 0 auto 32px;
  box-sizing: border-box;
  background: linear-gradient(
    168deg,
    color-mix(in srgb, var(--brand-cream, #f4efe4) 92%, #ffffff) 0%,
    var(--bg-surface, #ffffff) 42%,
    var(--bg-surface, #ffffff) 100%
  );
  border: 1px solid var(--point-border, color-mix(in srgb, var(--brand-ink, #302e2e) 10%, transparent));
  border-radius: 28px;
  box-shadow:
    0 0 32px 8px var(--point-glow, rgba(48, 46, 46, 0.08)),
    0 8px 24px rgba(48, 46, 46, 0.08);
  overflow: visible;
  animation: card-rise 320ms var(--ease-spring, cubic-bezier(0.34, 1.4, 0.64, 1));
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 220ms ease;
}

.card-fade-enter-active .exhibition-card,
.card-fade-leave-active .exhibition-card {
  transition:
    opacity 220ms ease,
    transform 220ms var(--ease-spring, cubic-bezier(0.34, 1.4, 0.64, 1));
}

.card-fade-enter-from,
.card-fade-leave-to {
  opacity: 0;
}

.card-fade-enter-from .exhibition-card,
.card-fade-leave-to .exhibition-card {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--brand-ink, #302e2e) 8%, transparent);
  border-radius: var(--radius-pill, 999px);
  background: var(--glass-bg, rgba(255, 255, 255, 0.94));
  color: var(--text-secondary, #5a5b57);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-xs, 0 1px 4px rgba(48, 46, 46, 0.06));
}

.close-btn:active {
  background: #fff;
  transform: scale(0.96);
}

.exhibition-card__body {
  padding: var(--card-body-pad);
  padding-bottom: max(36px, calc(var(--card-body-pad) + env(safe-area-inset-bottom, 0px)));
  width: 100%;
  box-sizing: border-box;
}

.card-section {
  width: 100%;
  box-sizing: border-box;
}

.card-section + .card-section {
  margin-top: 8px;
  padding-top: 32px;
  border-top: 1px dashed color-mix(in srgb, var(--brand-sage, #929185) 40%, transparent);
}

.section-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-stack {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
  min-width: 0;
}

.section-gallery {
  display: flex;
  flex-direction: column;
  gap: var(--gallery-gap);
  width: 100%;
  margin-top: 2px;
}

.swatch {
  width: 100%;
  aspect-ratio: 16 / 10;
  max-height: var(--swatch-max-h);
  margin: 0 0 calc(var(--section-gap) + 4px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  border: none;
  border-radius: var(--photo-radius);
  cursor: pointer;
  text-align: left;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.14),
    0 8px 24px color-mix(in srgb, var(--point-color, #ccc) 32%, transparent);
  transition: transform 120ms ease;
}

.swatch__info {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.swatch__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.swatch:active {
  transform: scale(0.985);
}

.swatch--plain {
  aspect-ratio: auto;
  max-height: none;
  min-height: 0;
  padding: 4px 0 12px;
  background: transparent;
  box-shadow: none;
  cursor: default;
}

.swatch__title {
  margin: 0;
  font-size: clamp(20px, 5.2vw, 24px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.2;
  letter-spacing: var(--letter-tight, -0.02em);
  color: var(--on-color);
  word-break: break-word;
}

.swatch__title--ink {
  color: var(--text-primary, #302e2e);
}

.swatch__hex {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-footnote, 13px);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--on-color-muted);
}

.palette-bar {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  height: 14px;
}

.palette-bar--body {
  max-width: none;
  width: 100%;
  margin: 2px 0 0;
  flex-shrink: 0;
}

.palette-segment {
  flex: 1;
  border-radius: var(--radius-pill, 999px);
  min-width: 0;
  box-shadow: inset 0 0 0 1px rgba(48, 46, 46, 0.08);
}

.location-chip {
  margin: 0;
  display: inline-flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-pill, 999px);
  font-size: var(--font-caption-1, 12px);
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.35;
  max-width: 100%;
}

.location-chip__text {
  min-width: 0;
  word-break: break-word;
}

.location-chip--on-swatch {
  flex-shrink: 1;
  margin: 0;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: var(--text-primary, #302e2e);
  box-shadow: 0 2px 8px rgba(48, 46, 46, 0.1);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.location-chip--header {
  width: 100%;
  margin: 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--brand-cream, #f4efe4) 55%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--brand-ink, #302e2e) 8%, transparent);
  color: var(--text-primary, #302e2e);
  box-shadow: none;
}

/* 手机端：名称过长时改在色块下方展示 */
@media (max-width: 743px) {
  .location-chip--hide-mobile-long {
    display: none;
  }
}

.location-chip__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--text-secondary, #5a5b57);
}

.media-block,
.photo-wrap {
  width: 100%;
  padding: 0;
  border-radius: var(--photo-radius);
  overflow: hidden;
  margin: 0;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--brand-ink, #302e2e) 5%, transparent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--point-color, #ccc) 14%, transparent);
  background: transparent;
  cursor: zoom-in;
  display: block;
  text-align: left;
}

.photo-wrap:active {
  opacity: 0.92;
}

.photo-wrap--landscape,
.photo-wrap--hero.photo-wrap--landscape,
.photo-wrap--video {
  height: var(--media-landscape-h);
  max-height: var(--media-landscape-h);
  aspect-ratio: auto;
}

.photo-wrap--hero.photo-wrap--portrait,
.photo-wrap--portrait:not(.photo-wrap--hero) {
  width: 100%;
  aspect-ratio: 3 / 4;
  height: auto;
  max-height: min(400px, 85vw);
  background: color-mix(in srgb, var(--brand-cream, #f4efe4) 40%, #ffffff);
}

.photo-wrap--portrait .photo-img {
  object-fit: contain;
}

.photo-wrap--video {
  cursor: default;
  background: #0c0c0c;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-wrap--video:active {
  opacity: 1;
}

.photo-video {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: contain;
  background: #0c0c0c;
  vertical-align: top;
}

.photo-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.photo-wrap--hero.photo-wrap--landscape .photo-img {
  object-fit: cover;
}

.section-gallery .photo-wrap--landscape {
  background: color-mix(in srgb, var(--brand-cream, #f4efe4) 40%, #ffffff);
}

.section-gallery .photo-wrap--landscape .photo-img,
.section-gallery .photo-wrap--portrait .photo-img {
  object-fit: contain;
}

.story {
  margin: 0;
  padding-top: calc(var(--section-gap) + 4px);
  border-top: 1px solid color-mix(in srgb, var(--brand-sage, #929185) 28%, transparent);
  font-size: var(--font-footnote, 14px);
  line-height: 1.72;
  color: var(--text-secondary, #5a5b57);
}

.photo-lightbox {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  background: rgba(12, 12, 12, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.photo-lightbox__close {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  right: max(14px, env(safe-area-inset-right));
  z-index: 1;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-pill, 999px);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.photo-lightbox__close:active {
  background: rgba(255, 255, 255, 0.24);
}

.photo-lightbox__img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 200ms ease;
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}

/* 平板及以上：更舒展的内边距与图间距 */
@media (min-width: 744px) {
  .overlay {
    --card-pad-x: max(24px, env(safe-area-inset-right));
    --card-pad-y: max(20px, env(safe-area-inset-top));
    --card-body-pad: 32px;
    --section-gap: 24px;
    --gallery-gap: 28px;
    --swatch-max-h: 180px;
    --media-landscape-h: 252px;
  }

  .exhibition-card__body {
    padding: var(--card-body-pad);
    padding-bottom: max(44px, calc(var(--card-body-pad) + env(safe-area-inset-bottom, 0px)));
  }

  .card-section + .card-section {
    margin-top: 12px;
    padding-top: 40px;
  }

  .swatch {
    justify-content: flex-start;
    align-items: stretch;
    padding: 20px 22px;
    margin-bottom: calc(var(--section-gap) + 6px);
  }

  .swatch__info {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
  }

  .swatch__meta {
    gap: 6px;
  }

  .swatch__title {
    font-size: clamp(22px, 2.6vw, 28px);
    line-height: 1.15;
  }

  .swatch__hex {
    font-size: 14px;
  }

  .location-chip--on-swatch {
    align-self: flex-start;
    width: auto;
    max-width: 100%;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.4;
    padding: 7px 11px;
    white-space: normal;
  }

  .location-chip--hide-mobile-long {
    display: inline-flex;
  }

  .location-chip--header {
    display: none;
  }

  .story {
    font-size: 15px;
    line-height: 1.75;
    padding-top: calc(var(--section-gap) + 8px);
  }

  .close-btn {
    top: 18px;
    right: 18px;
  }
}
</style>

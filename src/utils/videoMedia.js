/** 展览模式内置视频 / 图片幻灯片类型判断 */

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i

export function isVideoMime(type) {
  return typeof type === 'string' && type.startsWith('video/')
}

export function isVideoUrl(url) {
  return typeof url === 'string' && VIDEO_EXT.test(url)
}

/** @param {{ type?: string, url?: string } | null | undefined} slide */
export function slideMediaType(slide) {
  if (!slide) return 'image'
  if (slide.type === 'video' || slide.type === 'image') return slide.type
  return isVideoUrl(slide.url) ? 'video' : 'image'
}

/** 静态资源 URL（兼容 Vite base 与子路径部署） */
export function resolveAssetUrl(path) {
  if (!path) return ''
  if (/^(https?:|blob:|data:)/i.test(path)) return path
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`.replace(/\/+/g, '/').replace(':/', '://')
}

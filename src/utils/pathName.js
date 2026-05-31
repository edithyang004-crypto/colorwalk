/** 默认路径名，如「2026.05.19 的漫步」 */
export function defaultPathName(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d} 的漫步`
}

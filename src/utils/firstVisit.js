export const FIRST_VISIT_KEY = 'colorwalk-first-visit'

export function markFirstVisitDone() {
  try {
    localStorage.setItem(FIRST_VISIT_KEY, '1')
  } catch {
    /* Safari 无痕 / 存储受限 */
  }
}

export function hasVisitedBefore() {
  try {
    return !!localStorage.getItem(FIRST_VISIT_KEY)
  } catch {
    return false
  }
}

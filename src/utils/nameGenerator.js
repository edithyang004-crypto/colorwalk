import names from '../assets/names.json'
import { hexToHsl, hueCategory } from './colorUtils'

export function generatePoeticName(hex) {
  const [h, s, l] = hexToHsl(hex)
  const category = hueCategory(h, s, l)
  const pool = names[category] || names.neutral
  return pool[Math.floor(Math.random() * pool.length)]
}

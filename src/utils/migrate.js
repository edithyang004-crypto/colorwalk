import { listByType, saveItem, generateId } from './storage'

/** Migrate legacy markers+cards into pseudo-walk records */
export async function migrateLegacyData() {
  const walks = await listByType('walk')
  if (walks.length > 0) return 0

  const markers = await listByType('marker')
  const cards = await listByType('card')
  if (!markers.length && !cards.length) return 0

  const byDay = {}
  for (const m of markers) {
    const day = new Date(m.createdAt).toDateString()
    if (!byDay[day]) byDay[day] = { markers: [], cards: [] }
    byDay[day].markers.push(m)
  }
  for (const c of cards) {
    const day = new Date(c.createdAt).toDateString()
    if (!byDay[day]) byDay[day] = { markers: [], cards: [] }
    byDay[day].cards.push(c)
  }

  let count = 0
  for (const [day, data] of Object.entries(byDay)) {
    const sorted = [...data.markers].sort((a, b) => a.createdAt - b.createdAt)
    const trailPoints = sorted.map((m) => ({
      lat: m.lat,
      lng: m.lng,
      ts: m.createdAt,
    }))
    const colorNodes = data.cards
      .filter((c) => c.location)
      .map((c) => ({
        lat: c.location.lat,
        lng: c.location.lng,
        colorHex: c.hex,
        cardId: c.id,
        ts: c.createdAt,
      }))
    const t0 = sorted[0]?.createdAt || data.cards[0]?.createdAt || Date.now()
    const walk = {
      id: generateId(),
      targetColors: [],
      startedAt: t0,
      endedAt: t0 + 3600000,
      trailPoints,
      colorNodes,
      cardIds: data.cards.map((c) => c.id),
      photoIds: [],
      stats: {
        durationSec: 0,
        distanceM: 0,
        colorCount: data.cards.length,
        durationLabel: '00:00:00',
        distanceLabel: '0m',
      },
      legacy: true,
      legacyDay: day,
      savedAt: Date.now(),
    }
    await saveItem('walk', walk.id, walk)
    count++
  }
  return count
}

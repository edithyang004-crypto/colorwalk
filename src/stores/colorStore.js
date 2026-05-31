import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import colorsData from '../assets/colors.json'
import { indexAtPointer } from '../utils/wheelGeometry.js'

export const useColorStore = defineStore('color', () => {
  const colors = ref(colorsData)
  const wheelRotation = ref(0)
  const locked = ref(false)
  const lockedColors = ref(null)
  const step = ref(1)

  const windowColors = computed(() => {
    const n = colors.value.length
    const startIndex = indexAtPointer(wheelRotation.value, n)
    const result = []
    for (let i = 0; i < 3; i++) {
      result.push(colors.value[(startIndex + i) % n])
    }
    return result
  })

  const activeColors = computed(() => lockedColors.value || windowColors.value)

  const accentHex = computed(() => activeColors.value[0]?.hex || '#1A1A1A')

  function lockSelection() {
    lockedColors.value = [...windowColors.value]
    locked.value = true
    step.value = 2
  }

  function setRotation(deg) {
    if (!locked.value) wheelRotation.value = deg
  }

  function resetWalk() {
    locked.value = false
    lockedColors.value = null
    step.value = 1
  }

  function goToStep(s) {
    step.value = s
  }

  return {
    colors,
    wheelRotation,
    locked,
    lockedColors,
    step,
    windowColors,
    activeColors,
    accentHex,
    lockSelection,
    setRotation,
    resetWalk,
    goToStep,
  }
})

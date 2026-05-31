<script setup>
defineProps({
  colors: { type: Array, default: () => [] },
  selected: { type: String, default: null },
})
defineEmits(['select'])
</script>

<template>
  <div class="extractor">
    <button
      v-for="(hex, i) in colors"
      :key="i"
      type="button"
      class="chip"
      :class="{ selected: selected === hex }"
      :style="{ background: hex }"
      @click="$emit('select', hex)"
    />
  </div>
</template>

<style scoped>
.extractor {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.chip {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 2.5px solid transparent;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}

.chip:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.chip.selected {
  border-color: var(--text-primary);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.chip:active {
  transform: scale(0.96);
}
</style>

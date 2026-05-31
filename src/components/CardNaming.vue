<script setup>
import { ref, watch } from 'vue'
import { Pencil } from 'lucide-vue-next'

const props = defineProps({
  name: { type: String, required: true },
})
const emit = defineEmits(['update:name'])

const editing = ref(false)
const draft = ref(props.name)

watch(
  () => props.name,
  (v) => {
    draft.value = v
  }
)

function startEdit() {
  editing.value = true
  draft.value = props.name
}

function commit() {
  editing.value = false
  emit('update:name', draft.value.trim() || props.name)
}
</script>

<template>
  <div class="naming">
    <template v-if="editing">
      <input v-model="draft" class="name-input" maxlength="20" @blur="commit" @keyup.enter="commit" />
    </template>
    <template v-else>
      <span class="name-text">{{ name }}</span>
      <button type="button" class="edit-btn" aria-label="编辑名称" @click="startEdit">
        <Pencil :size="16" :stroke-width="1.5" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.naming {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-text {
  font-size: 18px;
  font-weight: 600;
}

.name-input {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  border: none;
  border-bottom: 2px solid var(--walk-accent, var(--brand-primary));
  padding: 4px 0;
  outline: none;
  background: transparent;
  color: var(--text-primary);
}

.edit-btn {
  color: var(--text-muted);
  padding: 6px;
  border-radius: 6px;
  transition: background 150ms ease, color 150ms ease;
}

.edit-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
</style>

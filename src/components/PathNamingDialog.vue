<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  defaultName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm', 'skip-gps'])

const name = ref('')

watch(
  () => props.show,
  (visible) => {
    if (visible) name.value = props.defaultName
  }
)

function onConfirm() {
  emit('confirm', name.value.trim() || props.defaultName)
}

function onCancel() {
  emit('close')
}

function onSkipGps() {
  emit('skip-gps', name.value.trim() || props.defaultName)
}
</script>

<template>
  <div v-if="show" class="ios-overlay" @click.self="onCancel">
    <div class="dialog ios-alert">
      <h2 class="ios-alert-title">给这条路径起个名字</h2>
      <input
        v-model="name"
        type="text"
        class="ios-input"
        :placeholder="defaultName"
        maxlength="40"
        @keyup.enter="onConfirm"
      />
      <div class="actions">
        <button type="button" class="btn-outline" @click="onCancel">取消</button>
        <button type="button" class="btn-primary" @click="onConfirm">开始</button>
      </div>
      <button type="button" class="skip-gps btn-plain" @click="onSkipGps">
        无法定位？从洞头村示范区域直接开始
      </button>
    </div>
  </div>
</template>

<style scoped>
.dialog {
  text-align: left;
}

.dialog .ios-alert-title {
  text-align: center;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  flex: 1;
  min-height: 44px;
}

.skip-gps {
  display: block;
  width: 100%;
  margin-top: 16px;
  text-align: center;
  font-size: var(--font-footnote);
  line-height: 1.55;
  color: var(--text-secondary);
}
</style>

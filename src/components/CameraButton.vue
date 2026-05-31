<script setup>
import { ref } from 'vue'
import { Camera } from 'lucide-vue-next'

const emit = defineEmits(['capture', 'album'])
const cameraInput = ref(null)
const albumInput = ref(null)

function openCamera() {
  cameraInput.value?.click()
}

function openAlbum() {
  albumInput.value?.click()
}

function onFile(e) {
  const file = e.target.files?.[0]
  if (file) emit('capture', file)
  e.target.value = ''
}

defineExpose({ openCamera, openAlbum })
</script>

<template>
  <input
    ref="cameraInput"
    type="file"
    accept="image/*"
    capture="environment"
    class="hidden"
    @change="onFile"
  />
  <input ref="albumInput" type="file" accept="image/*" class="hidden" @change="onFile" />
  <button type="button" class="camera-btn" aria-label="拍照" @click="openCamera">
    <Camera :size="26" :stroke-width="1.5" />
  </button>
</template>

<style scoped>
.hidden {
  display: none;
}
.camera-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #1a1a1a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms ease;
}
.camera-btn:active {
  transform: scale(0.96);
}
</style>
